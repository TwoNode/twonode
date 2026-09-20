import crypto from "crypto";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { ApiError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { createInvitedUser, emailInUse, findUserById, type NativeAuthUser } from "@/lib/auth/userLookup";
import { writeAudit } from "@/lib/audit";
import { sendAdminInvitationEmail } from "@/utils/email";
import { roleLabel } from "@/lib/api/adminInvitationTypes";

/**
 * Inviting a new admin/staff member. Nothing is created in a product's user
 * table up front: the superadmin's invitation is a row here plus an emailed
 * single-use link, and the account only comes into existence when the invitee
 * follows the link and sets a password. Every step is audited with the acting
 * user, and following the link also proves the invitee owns the address.
 */

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const INVALID_LINK = "This invitation link is invalid or has expired. Ask the person who invited you to send a new one.";

/** An ApiError rather than a ValidationError: the latter always reports "Invalid request" and hides its message in `details`, and this one is meant to be read by the invitee. */
const invalidLink = () => new ApiError(400, "INVALID_INVITATION", INVALID_LINK);

/** What each product's "add admin" screen already offered; an invitation can grant nothing beyond it. */
const INVITABLE_ROLES: Partial<Record<Platform, readonly string[]>> = {
  [Platform.GBC]: ["ADMIN", "SUPERADMIN"],
  [Platform.REVA]: ["ADMIN", "SUPERADMIN"],
  [Platform.SURFBOARD]: ["ADMIN", "SUPERADMIN", "RECORDS_I", "INTAKE", "RECORDS_II", "ACCOUNTS", "CHARTING", "SURCON", "ARCHIVE"],
};

const ACCEPT_PATH: Partial<Record<Platform, string>> = {
  [Platform.GBC]: "/gbc-restricted/accept-invite",
  [Platform.REVA]: "/reva/accept-invite",
  [Platform.SURFBOARD]: "/surfboard/accept-invite",
};

export function loginPathFor(platform: Platform, role: string): string {
  if (platform === Platform.GBC) return "/gbc-restricted/login";
  if (platform === Platform.REVA) return "/reva-restricted/login";
  return role === "ADMIN" || role === "SUPERADMIN" ? "/surfboard-restricted/login" : "/surfboard-mda/login";
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export function invitationStatus(
  inv: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date()
): InvitationStatus {
  if (inv.acceptedAt) return "ACCEPTED";
  if (inv.revokedAt) return "REVOKED";
  return inv.expiresAt <= now ? "EXPIRED" : "PENDING";
}

export interface InvitationSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: InvitationStatus;
  invitedByName: string;
  invitedByEmail: string;
  expiresAt: Date;
  lastSentAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

type InvitationRow = NonNullable<Awaited<ReturnType<typeof prisma.adminInvitation.findUnique>>>;

function toSummary(row: InvitationRow): InvitationSummary {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    role: row.role,
    status: invitationStatus(row),
    invitedByName: row.invitedByName,
    invitedByEmail: row.invitedByEmail,
    expiresAt: row.expiresAt,
    lastSentAt: row.lastSentAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  };
}

const hashToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");
const newToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
};

function assertNotDevAccount(email: string) {
  if (process.env.DEV_EMAIL && email === process.env.DEV_EMAIL.toLowerCase()) throw new ForbiddenError();
}

function assertInvitable(platform: Platform, role: string) {
  const roles = INVITABLE_ROLES[platform];
  if (!roles) throw new ValidationError({ platform: "Invitations aren't supported for this platform" });
  if (!roles.includes(role)) throw new ValidationError({ role: "That role can't be granted by invitation" });
}

/** Returns whether the email actually went out; a delivery failure never loses the invitation, it can be resent. */
async function deliver(
  platform: Platform,
  invitation: { email: string; firstName: string; role: string; expiresAt: Date },
  rawToken: string,
  inviterName: string
): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com";
  const acceptUrl = `${siteUrl}${ACCEPT_PATH[platform]}?token=${rawToken}`;

  // Local/dev convenience only — the raw token is never persisted, so this is
  // the one place it is ever visible after generation.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] admin invitation link for ${invitation.email}: ${acceptUrl}`);
  }

  const result = await sendAdminInvitationEmail({
    to: invitation.email,
    firstName: invitation.firstName,
    inviterName,
    roleLabel: roleLabel(invitation.role),
    acceptUrl,
    expiresAt: invitation.expiresAt,
    platform,
  });
  return !!result.success;
}

async function getInviter(platform: Platform, actorId: string) {
  const inviter = await findUserById(platform, actorId);
  if (!inviter) throw new ForbiddenError();
  const name = [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") || inviter.email;
  return { id: inviter.id, name, email: inviter.email };
}

export async function createInvitation(
  platform: Platform,
  input: { email: string; firstName: string; lastName: string; phone?: string | null; role: string },
  actorId: string
): Promise<{ invitation: InvitationSummary; emailSent: boolean }> {
  assertInvitable(platform, input.role);
  const email = input.email.trim().toLowerCase();
  assertNotDevAccount(email);

  if (await emailInUse(platform, email)) {
    throw new ConflictError("A user with this email already exists. To give them admin access, promote their existing account instead.");
  }

  const inviter = await getInviter(platform, actorId);
  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  // A newer invitation for the same address supersedes any still-open one, so
  // an older link that was forwarded or leaked stops working.
  const { row, superseded } = await prisma.$transaction(async (tx) => {
    const open = await tx.adminInvitation.findMany({
      where: { platform, email, acceptedAt: null, revokedAt: null },
      select: { id: true },
    });
    if (open.length) {
      await tx.adminInvitation.updateMany({ where: { id: { in: open.map((o) => o.id) } }, data: { revokedAt: new Date() } });
    }
    const created = await tx.adminInvitation.create({
      data: {
        platform,
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        role: input.role,
        tokenHash: token.hash,
        invitedById: inviter.id,
        invitedByName: inviter.name,
        invitedByEmail: inviter.email,
        expiresAt,
      },
    });
    return { row: created, superseded: open.map((o) => o.id) };
  });

  await writeAudit(platform, {
    userId: inviter.id,
    action: "INVITE_ADMIN",
    entity: "AdminInvitation",
    entityId: row.id,
    changes: { email, role: input.role, firstName: row.firstName, lastName: row.lastName, supersededInvitationIds: superseded },
  });

  const emailSent = await deliver(platform, row, token.raw, inviter.name);
  return { invitation: toSummary(row), emailSent };
}

async function getOwnedInvitation(platform: Platform, id: string) {
  const row = await prisma.adminInvitation.findFirst({ where: { id, platform } });
  if (!row) throw new NotFoundError("Invitation");
  return row;
}

export async function resendInvitation(
  platform: Platform,
  id: string,
  actorId: string
): Promise<{ invitation: InvitationSummary; emailSent: boolean }> {
  const existing = await getOwnedInvitation(platform, id);
  if (existing.acceptedAt) throw new ConflictError("This invitation has already been accepted.");
  if (existing.revokedAt) throw new ConflictError("This invitation was revoked. Send a new invitation instead.");
  if (await emailInUse(platform, existing.email)) {
    throw new ConflictError("A user with this email already exists.");
  }

  const inviter = await getInviter(platform, actorId);
  const token = newToken();
  const row = await prisma.adminInvitation.update({
    where: { id },
    data: { tokenHash: token.hash, expiresAt: new Date(Date.now() + INVITATION_TTL_MS), lastSentAt: new Date() },
  });

  await writeAudit(platform, {
    userId: inviter.id,
    action: "RESEND_ADMIN_INVITE",
    entity: "AdminInvitation",
    entityId: id,
    changes: { email: row.email, role: row.role },
  });

  const emailSent = await deliver(platform, row, token.raw, inviter.name);
  return { invitation: toSummary(row), emailSent };
}

export async function revokeInvitation(platform: Platform, id: string, actorId: string): Promise<InvitationSummary> {
  const existing = await getOwnedInvitation(platform, id);
  if (existing.acceptedAt) throw new ConflictError("This invitation has already been accepted, so it can't be revoked.");
  if (existing.revokedAt) return toSummary(existing);

  const inviter = await getInviter(platform, actorId);
  const row = await prisma.adminInvitation.update({ where: { id }, data: { revokedAt: new Date() } });

  await writeAudit(platform, {
    userId: inviter.id,
    action: "REVOKE_ADMIN_INVITE",
    entity: "AdminInvitation",
    entityId: id,
    changes: { email: row.email, role: row.role },
  });

  return toSummary(row);
}

export async function listInvitations(platform: Platform): Promise<InvitationSummary[]> {
  const rows = await prisma.adminInvitation.findMany({
    where: { platform },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toSummary);
}

async function findUsableInvitation(platform: Platform, rawToken: string) {
  const row = await prisma.adminInvitation.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  // One message for every failure (unknown, wrong product, used, revoked,
  // expired) so the link can't be probed for which state it is in.
  if (!row || row.platform !== platform || invitationStatus(row) !== "PENDING") {
    throw invalidLink();
  }
  return row;
}

/** What the accept page shows before the invitee sets a password. */
export async function getInvitationByToken(platform: Platform, rawToken: string) {
  const row = await findUsableInvitation(platform, rawToken);
  return {
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    roleLabel: roleLabel(row.role),
    expiresAt: row.expiresAt,
    loginPath: loginPathFor(platform, row.role),
  };
}

export async function acceptInvitation(input: {
  platform: Platform;
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user: NativeAuthUser; loginPath: string }> {
  const { platform } = input;
  const invitation = await findUsableInvitation(platform, input.token);

  if (await emailInUse(platform, invitation.email)) {
    throw new ConflictError("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    // Claim first: a second request racing on the same link matches no row.
    const claimed = await tx.adminInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
    });
    if (claimed.count !== 1) throw invalidLink();

    const created = await createInvitedUser(
      platform,
      {
        email: invitation.email,
        firstName: input.firstName?.trim() || invitation.firstName,
        lastName: input.lastName?.trim() || invitation.lastName,
        phone: invitation.phone,
        role: invitation.role,
        passwordHash,
      },
      tx
    );
    await tx.adminInvitation.update({ where: { id: invitation.id }, data: { acceptedUserId: created.id } });
    return created;
  });

  // Here the actor is the person who just accepted; who invited them is in `changes`.
  await writeAudit(platform, {
    userId: user.id,
    action: "ACCEPT_ADMIN_INVITE",
    entity: "AdminInvitation",
    entityId: invitation.id,
    changes: { email: invitation.email, role: invitation.role, invitedById: invitation.invitedById, invitedByEmail: invitation.invitedByEmail },
  });

  return { user, loginPath: loginPathFor(platform, invitation.role) };
}
