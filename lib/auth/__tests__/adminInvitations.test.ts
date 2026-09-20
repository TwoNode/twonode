import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const p: Record<string, any> = {
    adminInvitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(p));
  return p;
});
const mockLookup = vi.hoisted(() => ({
  emailInUse: vi.fn(),
  findUserById: vi.fn(),
  createInvitedUser: vi.fn(),
}));
const mockAudit = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const mockEmail = vi.hoisted(() => ({ sendAdminInvitationEmail: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/audit", () => mockAudit);
vi.mock("@/utils/email", () => mockEmail);
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async (p: string) => `hashed:${p}`) } }));

const { Platform } = await import("@/utils/platform");
const {
  createInvitation,
  resendInvitation,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
  invitationStatus,
  loginPathFor,
  INVITATION_TTL_MS,
} = await import("@/lib/auth/adminInvitations");
const { roleLabel } = await import("@/lib/api/adminInvitationTypes");

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const tokenFromEmail = () => new URL(mockEmail.sendAdminInvitationEmail.mock.calls.at(-1)![0].acceptUrl).searchParams.get("token")!;
const day = 24 * 60 * 60 * 1000;

const inviterUser = { id: "actor-1", email: "boss@x.com", firstName: "Bo", lastName: "Ss" };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    platform: Platform.GBC,
    email: "new@x.com",
    firstName: "New",
    lastName: "Admin",
    phone: null,
    role: "ADMIN",
    tokenHash: "hash",
    invitedById: "actor-1",
    invitedByName: "Bo Ss",
    invitedByEmail: "boss@x.com",
    expiresAt: new Date(Date.now() + day),
    lastSentAt: new Date(),
    acceptedAt: null,
    acceptedUserId: null,
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DEV_EMAIL;
  mockLookup.emailInUse.mockResolvedValue(false);
  mockLookup.findUserById.mockResolvedValue(inviterUser);
  mockEmail.sendAdminInvitationEmail.mockResolvedValue({ success: true });
  mockPrisma.adminInvitation.findMany.mockResolvedValue([]);
  mockPrisma.adminInvitation.create.mockImplementation(async ({ data }: any) => row({ ...data, id: "inv-new" }));
});

describe("createInvitation", () => {
  const input = { email: "  New@X.com ", firstName: " New ", lastName: "Admin", role: "ADMIN" };

  it("stores only the token's hash and emails a link carrying the raw token", async () => {
    await createInvitation(Platform.GBC, input, "actor-1");

    const created = mockPrisma.adminInvitation.create.mock.calls[0][0].data;
    const raw = tokenFromEmail();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(created.tokenHash).toBe(sha256(raw));
    expect(JSON.stringify(created)).not.toContain(raw);
    expect(mockEmail.sendAdminInvitationEmail.mock.calls[0][0].acceptUrl).toContain("/gbc-restricted/accept-invite?token=");
  });

  it("normalises the email, records who invited, and expires in 7 days", async () => {
    const before = Date.now();
    await createInvitation(Platform.GBC, input, "actor-1");

    const created = mockPrisma.adminInvitation.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      platform: Platform.GBC,
      email: "new@x.com",
      firstName: "New",
      invitedById: "actor-1",
      invitedByName: "Bo Ss",
      invitedByEmail: "boss@x.com",
    });
    expect(created.expiresAt.getTime() - before).toBeGreaterThanOrEqual(INVITATION_TTL_MS - 1000);
    expect(created.expiresAt.getTime() - before).toBeLessThanOrEqual(INVITATION_TTL_MS + 5000);
    expect(mockLookup.emailInUse).toHaveBeenCalledWith(Platform.GBC, "new@x.com");
  });

  it("audits the invitation with the acting superadmin as the performer", async () => {
    await createInvitation(Platform.GBC, input, "actor-1");

    expect(mockAudit.writeAudit).toHaveBeenCalledWith(Platform.GBC, {
      userId: "actor-1",
      action: "INVITE_ADMIN",
      entity: "AdminInvitation",
      entityId: "inv-new",
      changes: expect.objectContaining({ email: "new@x.com", role: "ADMIN", supersededInvitationIds: [] }),
    });
  });

  it("revokes any still-open invitation for the same address so an older link stops working", async () => {
    mockPrisma.adminInvitation.findMany.mockResolvedValue([{ id: "old-1" }, { id: "old-2" }]);

    await createInvitation(Platform.GBC, input, "actor-1");

    expect(mockPrisma.adminInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { platform: Platform.GBC, email: "new@x.com", acceptedAt: null, revokedAt: null } })
    );
    expect(mockPrisma.adminInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-1", "old-2"] } },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockAudit.writeAudit.mock.calls[0][1].changes.supersededInvitationIds).toEqual(["old-1", "old-2"]);
  });

  it("returns the invitation as PENDING without ever exposing the token hash", async () => {
    const { invitation, emailSent } = await createInvitation(Platform.GBC, input, "actor-1");

    expect(invitation.status).toBe("PENDING");
    expect(emailSent).toBe(true);
    expect(invitation).not.toHaveProperty("tokenHash");
  });

  it("keeps the invitation (and reports emailSent: false) when the email fails to send", async () => {
    mockEmail.sendAdminInvitationEmail.mockResolvedValue({ success: false });

    const { invitation, emailSent } = await createInvitation(Platform.GBC, input, "actor-1");

    expect(emailSent).toBe(false);
    expect(invitation.id).toBe("inv-new");
    expect(mockAudit.writeAudit).toHaveBeenCalled();
  });

  it("refuses an address that already has an account, creating nothing", async () => {
    mockLookup.emailInUse.mockResolvedValue(true);

    await expect(createInvitation(Platform.GBC, input, "actor-1")).rejects.toMatchObject({ status: 409 });

    expect(mockPrisma.adminInvitation.create).not.toHaveBeenCalled();
    expect(mockEmail.sendAdminInvitationEmail).not.toHaveBeenCalled();
    expect(mockAudit.writeAudit).not.toHaveBeenCalled();
  });

  it("refuses the dev account", async () => {
    process.env.DEV_EMAIL = "New@X.com";
    await expect(createInvitation(Platform.GBC, input, "actor-1")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.adminInvitation.create).not.toHaveBeenCalled();
  });

  it.each([
    [Platform.GBC, "USER"],
    [Platform.REVA, "USER"],
    [Platform.SURFBOARD, "USER"],
    [Platform.SURFBOARD, "MDA_SUPERADMIN"],
  ])("won't grant a role outside the product's admin roles (%s / %s)", async (platform, role) => {
    await expect(createInvitation(platform, { ...input, role }, "actor-1")).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.adminInvitation.create).not.toHaveBeenCalled();
  });

  it("supports Surfboard's staff roles and links them to the right accept page", async () => {
    await createInvitation(Platform.SURFBOARD, { ...input, role: "RECORDS_I" }, "actor-1");
    expect(mockEmail.sendAdminInvitationEmail.mock.calls[0][0].acceptUrl).toContain("/surfboard/accept-invite?token=");
    expect(mockEmail.sendAdminInvitationEmail.mock.calls[0][0].roleLabel).toBe("Records I");
  });

  it("rejects a platform with no invitation flow", async () => {
    await expect(createInvitation(Platform.SCRAM, input, "actor-1")).rejects.toMatchObject({ status: 400 });
  });

  it("refuses when the acting user can't be found", async () => {
    mockLookup.findUserById.mockResolvedValue(null);
    await expect(createInvitation(Platform.GBC, input, "ghost")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.adminInvitation.create).not.toHaveBeenCalled();
  });
});

describe("resendInvitation", () => {
  it("issues a fresh token and expiry, invalidating the old link, and audits the actor", async () => {
    const existing = row({ tokenHash: "old-hash", expiresAt: new Date(Date.now() - day) });
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(existing);
    mockPrisma.adminInvitation.update.mockImplementation(async ({ data }: any) => row({ ...existing, ...data }));

    const { invitation, emailSent } = await resendInvitation(Platform.GBC, "inv-1", "actor-1");

    const data = mockPrisma.adminInvitation.update.mock.calls[0][0].data;
    expect(data.tokenHash).not.toBe("old-hash");
    expect(data.tokenHash).toBe(sha256(tokenFromEmail()));
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + INVITATION_TTL_MS - 5000);
    expect(invitation.status).toBe("PENDING");
    expect(emailSent).toBe(true);
    expect(mockAudit.writeAudit).toHaveBeenCalledWith(
      Platform.GBC,
      expect.objectContaining({ userId: "actor-1", action: "RESEND_ADMIN_INVITE", entityId: "inv-1" })
    );
  });

  it("looks the invitation up within the caller's own platform", async () => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(null);
    await expect(resendInvitation(Platform.REVA, "inv-1", "actor-1")).rejects.toMatchObject({ status: 404 });
    expect(mockPrisma.adminInvitation.findFirst).toHaveBeenCalledWith({ where: { id: "inv-1", platform: Platform.REVA } });
  });

  it.each([
    ["accepted", { acceptedAt: new Date() }],
    ["revoked", { revokedAt: new Date() }],
  ])("refuses to resend an invitation that was already %s", async (_label, state) => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(row(state));
    await expect(resendInvitation(Platform.GBC, "inv-1", "actor-1")).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.adminInvitation.update).not.toHaveBeenCalled();
    expect(mockEmail.sendAdminInvitationEmail).not.toHaveBeenCalled();
  });

  it("refuses if the address has since become an account", async () => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(row());
    mockLookup.emailInUse.mockResolvedValue(true);
    await expect(resendInvitation(Platform.GBC, "inv-1", "actor-1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("revokeInvitation", () => {
  it("marks it revoked and audits the acting superadmin", async () => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(row());
    mockPrisma.adminInvitation.update.mockImplementation(async ({ data }: any) => row(data));

    const result = await revokeInvitation(Platform.GBC, "inv-1", "actor-1");

    expect(result.status).toBe("REVOKED");
    expect(mockAudit.writeAudit).toHaveBeenCalledWith(
      Platform.GBC,
      expect.objectContaining({ userId: "actor-1", action: "REVOKE_ADMIN_INVITE", entityId: "inv-1" })
    );
  });

  it("can't revoke one that was already accepted", async () => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(row({ acceptedAt: new Date() }));
    await expect(revokeInvitation(Platform.GBC, "inv-1", "actor-1")).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.adminInvitation.update).not.toHaveBeenCalled();
  });

  it("is idempotent for one that is already revoked, without a second audit entry", async () => {
    mockPrisma.adminInvitation.findFirst.mockResolvedValue(row({ revokedAt: new Date() }));
    const result = await revokeInvitation(Platform.GBC, "inv-1", "actor-1");
    expect(result.status).toBe("REVOKED");
    expect(mockPrisma.adminInvitation.update).not.toHaveBeenCalled();
    expect(mockAudit.writeAudit).not.toHaveBeenCalled();
  });
});

describe("token lookup (getInvitationByToken)", () => {
  it("returns what the accept page needs for a pending invitation", async () => {
    mockPrisma.adminInvitation.findUnique.mockResolvedValue(row());

    const info = await getInvitationByToken(Platform.GBC, "raw-token");

    expect(mockPrisma.adminInvitation.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256("raw-token") } });
    expect(info).toEqual({
      email: "new@x.com",
      firstName: "New",
      lastName: "Admin",
      role: "ADMIN",
      roleLabel: "Admin",
      expiresAt: expect.any(Date),
      loginPath: "/gbc-restricted/login",
    });
  });

  const invalidStates: [string, () => unknown][] = [
    ["unknown token", () => null],
    ["another platform's token", () => row({ platform: Platform.REVA })],
    ["expired", () => row({ expiresAt: new Date(Date.now() - 1000) })],
    ["revoked", () => row({ revokedAt: new Date() })],
    ["already accepted", () => row({ acceptedAt: new Date() })],
  ];

  it.each(invalidStates)("gives the same generic error for %s, so a link can't be probed for its state", async (_label, make) => {
    mockPrisma.adminInvitation.findUnique.mockResolvedValue(make());

    const err = await getInvitationByToken(Platform.GBC, "raw-token").catch((e) => e);

    expect(err).toMatchObject({ status: 400, code: "INVALID_INVITATION" });
    expect(err.message).toBe("This invitation link is invalid or has expired. Ask the person who invited you to send a new one.");
  });
});

describe("acceptInvitation", () => {
  const input = { platform: Platform.GBC, token: "raw-token", password: "correct horse" };

  beforeEach(() => {
    mockPrisma.adminInvitation.findUnique.mockResolvedValue(row({ phone: "0800", role: "SUPERADMIN" }));
    mockPrisma.adminInvitation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.adminInvitation.update.mockResolvedValue({});
    mockLookup.createInvitedUser.mockResolvedValue({ id: "user-9", email: "new@x.com", role: "SUPERADMIN" });
  });

  it("creates the account with the invited role from a hashed password and marks the invitation used", async () => {
    const { user, loginPath } = await acceptInvitation(input);

    expect(mockLookup.createInvitedUser).toHaveBeenCalledWith(
      Platform.GBC,
      { email: "new@x.com", firstName: "New", lastName: "Admin", phone: "0800", role: "SUPERADMIN", passwordHash: "hashed:correct horse" },
      mockPrisma
    );
    expect(mockPrisma.adminInvitation.update).toHaveBeenCalledWith({ where: { id: "inv-1" }, data: { acceptedUserId: "user-9" } });
    expect(user.id).toBe("user-9");
    expect(loginPath).toBe("/gbc-restricted/login");
  });

  it("claims the invitation only if it is still open, so a second use of the link matches nothing", async () => {
    await acceptInvitation(input);

    expect(mockPrisma.adminInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", acceptedAt: null, revokedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { acceptedAt: expect.any(Date) },
    });
  });

  it("creates no account when a concurrent request already claimed the link", async () => {
    mockPrisma.adminInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(acceptInvitation(input)).rejects.toMatchObject({ status: 400 });

    expect(mockLookup.createInvitedUser).not.toHaveBeenCalled();
    expect(mockAudit.writeAudit).not.toHaveBeenCalled();
  });

  it("audits the acceptance with the new admin as the performer and the inviter in the details", async () => {
    await acceptInvitation(input);

    expect(mockAudit.writeAudit).toHaveBeenCalledWith(Platform.GBC, {
      userId: "user-9",
      action: "ACCEPT_ADMIN_INVITE",
      entity: "AdminInvitation",
      entityId: "inv-1",
      changes: { email: "new@x.com", role: "SUPERADMIN", invitedById: "actor-1", invitedByEmail: "boss@x.com" },
    });
  });

  it("lets the invitee correct their name", async () => {
    await acceptInvitation({ ...input, firstName: " Nia ", lastName: "Okoro" });
    expect(mockLookup.createInvitedUser.mock.calls[0][1]).toMatchObject({ firstName: "Nia", lastName: "Okoro" });
  });

  it("refuses when an account with that address appeared since the invitation was sent", async () => {
    mockLookup.emailInUse.mockResolvedValue(true);

    await expect(acceptInvitation(input)).rejects.toMatchObject({ status: 409 });

    expect(mockPrisma.adminInvitation.updateMany).not.toHaveBeenCalled();
    expect(mockLookup.createInvitedUser).not.toHaveBeenCalled();
  });

  it("rejects an expired or wrong-platform token without creating anything", async () => {
    mockPrisma.adminInvitation.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(acceptInvitation(input)).rejects.toMatchObject({ status: 400 });
    mockPrisma.adminInvitation.findUnique.mockResolvedValue(row({ platform: Platform.SURFBOARD }));
    await expect(acceptInvitation(input)).rejects.toMatchObject({ status: 400 });
    expect(mockLookup.createInvitedUser).not.toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("derives status from the timestamps", () => {
    const base = { acceptedAt: null, revokedAt: null, expiresAt: new Date(Date.now() + day) };
    expect(invitationStatus(base)).toBe("PENDING");
    expect(invitationStatus({ ...base, expiresAt: new Date(Date.now() - 1) })).toBe("EXPIRED");
    expect(invitationStatus({ ...base, revokedAt: new Date() })).toBe("REVOKED");
    expect(invitationStatus({ ...base, acceptedAt: new Date(), revokedAt: new Date() })).toBe("ACCEPTED");
  });

  it("sends each product's invitee to the right sign-in page", () => {
    expect(loginPathFor(Platform.GBC, "ADMIN")).toBe("/gbc-restricted/login");
    expect(loginPathFor(Platform.REVA, "ADMIN")).toBe("/reva-restricted/login");
    expect(loginPathFor(Platform.SURFBOARD, "SUPERADMIN")).toBe("/surfboard-restricted/login");
    expect(loginPathFor(Platform.SURFBOARD, "ACCOUNTS")).toBe("/surfboard-mda/login");
  });

  it("labels roles for humans", () => {
    expect(roleLabel("SUPERADMIN")).toBe("Super Admin");
    expect(roleLabel("ADMIN")).toBe("Admin");
    expect(roleLabel("RECORDS_I")).toBe("Records I");
    expect(roleLabel("RECORDS_II")).toBe("Records II");
    expect(roleLabel("SURCON")).toBe("SURCON");
    expect(roleLabel("ACCOUNTS")).toBe("Accounts");
  });
});
