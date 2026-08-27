import prisma from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/reva/actions/profileActions.ts — a real
 * implementation, not a port, since the source's two functions were
 * TODO stubs (`// TODO: Implement actual update logic`) that always
 * returned `{ success: true }` without touching the database. Resolved
 * Phase 3 decision: `UserProfile.tsx`'s edit-profile UI was found
 * disabled client-side too (not just stubbed server-side), so REVA's
 * settings page has been silently read-only. Shaped after Surfboard's
 * working profile.ts (getProfile/updateProfile against the platform's
 * own user table), the one difference being REVA's form also lets the
 * user edit their email, which Surfboard's doesn't — so this adds a
 * uniqueness check and resets emailVerified on change, neither of which
 * Surfboard's version needed.
 */

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  emailVerified: true,
  is_active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type RevaProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getProfile(userId: string): Promise<RevaProfile> {
  const user = await prisma.revaUser.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  if (!user) throw new NotFoundError("User");
  return user;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function updateProfile(userId: string, data: ProfileUpdateInput): Promise<RevaProfile> {
  const current = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!current) throw new NotFoundError("User");

  const updates: Record<string, unknown> = {};

  if (data.firstName !== undefined) {
    if (!data.firstName.trim()) throw new ValidationError({ firstName: "First name cannot be empty" });
    updates.firstName = data.firstName.trim();
  }

  if (data.lastName !== undefined) {
    if (!data.lastName.trim()) throw new ValidationError({ lastName: "Last name cannot be empty" });
    updates.lastName = data.lastName.trim();
  }

  // Only touch email/emailVerified if the address is actually changing —
  // resending the current value (the client sends all three fields
  // unconditionally) must not spuriously reset verification.
  if (data.email !== undefined && data.email !== current.email) {
    const existing = await prisma.revaUser.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError("Email is already in use");
    updates.email = data.email;
    updates.emailVerified = false;
  }

  if (Object.keys(updates).length === 0) {
    return getProfile(userId);
  }

  return prisma.revaUser.update({ where: { id: userId }, data: updates, select: PROFILE_SELECT });
}
