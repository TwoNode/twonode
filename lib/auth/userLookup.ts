import prisma from "@/lib/prisma";
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
  passwordHash: string | null;
  role: string;
  isActive: boolean;
};

export async function findUserByEmail(
  platform: Platform,
  email: string
): Promise<NativeAuthUser | null> {
  switch (platform) {
    case Platform.REVA: {
      const u = await prisma.revaUser.findUnique({ where: { email } });
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.is_active }
        : null;
    }
    case Platform.SURFBOARD: {
      const u = await prisma.surfboardUser.findUnique({ where: { email } });
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive }
        : null;
    }
    case Platform.GBC: {
      const u = await prisma.gBCUser.findUnique({ where: { email } });
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive }
        : null;
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
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.is_active }
        : null;
    }
    case Platform.SURFBOARD: {
      const u = await prisma.surfboardUser.findUnique({ where: { id } });
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive }
        : null;
    }
    case Platform.GBC: {
      const u = await prisma.gBCUser.findUnique({ where: { id } });
      return u
        ? { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Registration is native-auth-only: creates a brand new user row with no
 * kindeId. `role` is never accepted from the caller — always the lowest
 * privilege (USER on every product's Role enum), since these routes are
 * public and an accepted `role` field would be a privilege-escalation bug.
 */
export async function createNativeUser(
  platform: Platform,
  data: { email: string; passwordHash: string; firstName: string; lastName: string }
): Promise<NativeAuthUser> {
  switch (platform) {
    case Platform.REVA: {
      const u = await prisma.revaUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["PASSWORD"],
          kindeId: `native:${crypto.randomUUID()}`, // kindeId is required+unique; native-only accounts get a placeholder, never a real Kinde id
        },
      });
      return { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.is_active };
    }
    case Platform.SURFBOARD: {
      const u = await prisma.surfboardUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["PASSWORD"],
          kindeId: `native:${crypto.randomUUID()}`,
        },
      });
      return { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive };
    }
    case Platform.GBC: {
      const u = await prisma.gBCUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          authProviders: ["PASSWORD"],
          kindeId: `native:${crypto.randomUUID()}`,
        },
      });
      return { id: u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, isActive: u.isActive };
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
      await prisma.surfboardUser.update({ where: { id }, data: { passwordHash } });
      return;
    case Platform.GBC:
      await prisma.gBCUser.update({ where: { id }, data: { passwordHash } });
      return;
  }
}
