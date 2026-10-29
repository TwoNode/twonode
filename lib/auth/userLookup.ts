import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import { Platform } from "@/utils/platform";

/**
 * Each product has its own User model (RevaUser/SurfboardUser/GBCUser) with
 * differently-named fields (is_active vs isActive) and its own Role enum —
 * there's no single shared "User" to query generically. This is the one
 * place that dispatches on platform so the /api/v1/auth/* routes (§4.2)
 * don't each re-implement the same three-way switch.
 *
 * Deliberately NOT abstracted further (e.g. a generic findByEmail<T>) —
 * three genuinely different Prisma models with different field names don't
 * collapse into one generic without more indirection than the 3-way switch
 * itself costs. Note: none of the three products track `lastLoginAt` today
 * (unlike proplity's User model), so it's not referenced here.
 */

export type NativeAuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedVia: string | null;
  createdAt: Date;
  /** Not tracked on RevaUser today, so always null for Platform.REVA. */
  phone: string | null;
};

const toNativeAuthUser = {
  reva: (u: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string | null;
    role: string;
    is_active: boolean;
    emailVerified: boolean;
    emailVerifiedVia?: string | null;
    createdAt: Date;
  }): NativeAuthUser => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    passwordHash: u.passwordHash,
    role: u.role,
    isActive: u.is_active,
    emailVerified: u.emailVerified,
    emailVerifiedVia: u.emailVerifiedVia ?? null,
    createdAt: u.createdAt,
    phone: null,
  }),
  surfboard: (u: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    emailVerifiedVia?: string | null;
    phoneNumber: string | null;
    createdAt: Date;
  }): NativeAuthUser => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    passwordHash: u.passwordHash,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    emailVerifiedVia: u.emailVerifiedVia ?? null,
    createdAt: u.createdAt,
    phone: u.phoneNumber,
  }),
  gbc: (u: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    emailVerifiedVia?: string | null;
    phone: string | null;
    createdAt: Date;
  }): NativeAuthUser => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    passwordHash: u.passwordHash,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    emailVerifiedVia: u.emailVerifiedVia ?? null,
    createdAt: u.createdAt,
    phone: u.phone,
  }),
};

/**
 * Emails are matched exactly first (hits the unique index and keeps working
 * for any legacy row whose stored casing differs), then case-insensitively —
 * so "John@Gmail.com" at login finds the account registered as
 * "john@gmail.com". Registration stores lowercase; everything that looks an
 * account up by email goes through here, so none of them need to normalize.
 */
export async function findUserByEmail(
  platform: Platform,
  email: string
): Promise<NativeAuthUser | null> {
  const exact = email.trim();
  const loose = { equals: exact, mode: "insensitive" as const };
  switch (platform) {
    case Platform.REVA: {
      const u =
        (await prisma.revaUser.findUnique({ where: { email: exact } })) ??
        (await prisma.revaUser.findFirst({ where: { email: loose } }));
      return u ? toNativeAuthUser.reva(u) : null;
    }
    case Platform.SURFBOARD: {
      const u =
        (await prisma.surfboardUser.findUnique({ where: { email: exact } })) ??
        (await prisma.surfboardUser.findFirst({ where: { email: loose } }));
      return u ? toNativeAuthUser.surfboard(u) : null;
    }
    case Platform.GBC: {
      const u =
        (await prisma.gBCUser.findUnique({ where: { email: exact } })) ??
        (await prisma.gBCUser.findFirst({ where: { email: loose } }));
      return u ? toNativeAuthUser.gbc(u) : null;
    }
    default:
      return null;
  }
}

export async function findUserById(
  platform: Platform,
  id: string
): Promise<NativeAuthUser | null> {
  switch (platform) {
    case Platform.REVA: {
      const u = await prisma.revaUser.findUnique({ where: { id } });
      return u ? toNativeAuthUser.reva(u) : null;
    }
    case Platform.SURFBOARD: {
      const u = await prisma.surfboardUser.findUnique({ where: { id } });
      return u ? toNativeAuthUser.surfboard(u) : null;
    }
    case Platform.GBC: {
      const u = await prisma.gBCUser.findUnique({ where: { id } });
      return u ? toNativeAuthUser.gbc(u) : null;
    }
    default:
      return null;
  }
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Registration is native-auth-only: creates a brand new user row with no
 * kindeId. `role` is never accepted from the caller — always the lowest
 * privilege (USER on every product's Role enum), since these routes are
 * public and an accepted `role` field would be a privilege-escalation bug.
 */
export async function createNativeUser(
  platform: Platform,
  data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    /** Set when the address was already proven before the account exists (OTP-first registration), so the row is born verified in a single write. */
    emailVerifiedVia?: "OTP" | "LINK";
  },
  db: TxClient | typeof prisma = prisma
): Promise<NativeAuthUser> {
  const verified = data.emailVerifiedVia
    ? { emailVerified: true, emailVerifiedVia: data.emailVerifiedVia }
    : {};
  switch (platform) {
    case Platform.REVA: {
      const u = await db.revaUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["NATIVE"],
          ...verified,
          kindeId: `native:${crypto.randomUUID()}`, // kindeId is required+unique; native-only accounts get a placeholder, never a real Kinde id
        },
      });
      return toNativeAuthUser.reva(u);
    }
    case Platform.SURFBOARD: {
      const u = await db.surfboardUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["NATIVE"],
          ...verified,
          kindeId: `native:${crypto.randomUUID()}`,
        },
      });
      return toNativeAuthUser.surfboard(u);
    }
    case Platform.GBC: {
      const u = await db.gBCUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["NATIVE"],
          ...verified,
          kindeId: `native:${crypto.randomUUID()}`,
        },
      });
      return toNativeAuthUser.gbc(u);
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function updatePasswordHash(
  platform: Platform,
  id: string,
  passwordHash: string
): Promise<void> {
  switch (platform) {
    case Platform.REVA:
      await prisma.revaUser.update({ where: { id }, data: { passwordHash } });
      return;
    case Platform.SURFBOARD:
      await prisma.surfboardUser.update({
        where: { id },
        data: { passwordHash },
      });
      return;
    case Platform.GBC:
      await prisma.gBCUser.update({ where: { id }, data: { passwordHash } });
      return;
  }
}

/**
 * Removes an account's password so it can no longer sign in with one (it can
 * still use Kinde, and can set a fresh password through the reset flow, which
 * treats a passwordless account as a first-time setup).
 */
export async function clearPasswordHash(
  platform: Platform,
  id: string
): Promise<void> {
  switch (platform) {
    case Platform.REVA:
      await prisma.revaUser.update({
        where: { id },
        data: { passwordHash: null },
      });
      return;
    case Platform.SURFBOARD:
      await prisma.surfboardUser.update({
        where: { id },
        data: { passwordHash: null },
      });
      return;
    case Platform.GBC:
      await prisma.gBCUser.update({
        where: { id },
        data: { passwordHash: null },
      });
      return;
  }
}

export async function markEmailVerified(
  platform: Platform,
  id: string,
  via: "OTP" | "LINK" | "OAUTH" = "LINK"
): Promise<void> {
  switch (platform) {
    case Platform.REVA:
      await prisma.revaUser.update({
        where: { id },
        data: { emailVerified: true, emailVerifiedVia: via },
      });
      return;
    case Platform.SURFBOARD:
      await prisma.surfboardUser.update({
        where: { id },
        data: { emailVerified: true, emailVerifiedVia: via },
      });
      return;
    case Platform.GBC:
      await prisma.gBCUser.update({
        where: { id },
        data: { emailVerified: true, emailVerifiedVia: via },
      });
      return;
  }
}

/** Case-insensitive, so an invitation can't create a second account that differs from an existing one only by capitalisation. */
export async function emailInUse(
  platform: Platform,
  email: string
): Promise<boolean> {
  const where = { email: { equals: email, mode: "insensitive" as const } };
  const select = { id: true };
  switch (platform) {
    case Platform.REVA:
      return !!(await prisma.revaUser.findFirst({ where, select }));
    case Platform.SURFBOARD:
      return !!(await prisma.surfboardUser.findFirst({ where, select }));
    case Platform.GBC:
      return !!(await prisma.gBCUser.findFirst({ where, select }));
    default:
      return false;
  }
}

/**
 * Creates the account for an accepted admin invitation. Separate from
 * createNativeUser on purpose: self-registration must never be able to choose
 * a role, while an invitation is exactly the case where a superadmin already
 * has. The invitation link is delivered to the invited address, so following
 * it proves ownership and the email is marked verified.
 */
export async function createInvitedUser(
  platform: Platform,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    passwordHash: string;
  },
  db: TxClient | typeof prisma = prisma
): Promise<NativeAuthUser> {
  const common = {
    email: data.email,
    passwordHash: data.passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    authProviders: ["NATIVE" as const],
    emailVerified: true,
    emailVerifiedVia: "LINK",
    kindeId: `native:${crypto.randomUUID()}`,
  };

  switch (platform) {
    case Platform.REVA: {
      const u = await db.revaUser.create({
        data: {
          ...common,
          role: data.role as "ADMIN" | "SUPERADMIN",
          is_active: true,
        },
      });
      return toNativeAuthUser.reva(u);
    }
    case Platform.SURFBOARD: {
      const u = await db.surfboardUser.create({
        data: {
          ...common,
          role: data.role as Prisma.SurfboardUserCreateInput["role"],
          isActive: true,
          phoneNumber: data.phone,
        },
      });
      return toNativeAuthUser.surfboard(u);
    }
    case Platform.GBC: {
      const u = await db.gBCUser.create({
        data: {
          ...common,
          role: data.role as "ADMIN" | "SUPERADMIN",
          isActive: true,
          phone: data.phone,
        },
      });
      return toNativeAuthUser.gbc(u);
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
