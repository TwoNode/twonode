// src/lib/auth.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
// import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

/**
 * Interim security hotfix (2026-08-28): both functions in this file used to
 * be hardcoded stubs — requireAuth() returned a fake user with the real
 * Kinde check commented out, and requireAdmin() unconditionally returned a
 * fake "James Bond, ADMIN" with zero authorization check at all. Every
 * admin mutation across the 10 action files that call requireAdmin() was
 * therefore callable by anyone who could reach the server action's
 * reference (no session, no role, nothing) — Next.js Server Actions are
 * directly invokable without visiting the gating page. This restores a
 * real check ahead of Phase 4's full migration to typed withAuth<GBCRole>
 * routes, which will replace requireAdmin() entirely; until that lands,
 * this is the only thing standing between an anonymous request and every
 * ticket/sponsor/speaker/gallery/settings mutation in the product.
 */
export async function requireAuth() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized: authentication required");
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    throw new Error("Unauthorized: authentication required");
  }

  return kindeUser;
}

export async function requireAdmin() {
  const kindeUser = await requireAuth();

  let user = await prisma.gBCUser.findUnique({
    where: { kindeId: kindeUser.id },
  });

  // Reconcile a pre-provisioned account (created by email via addNewAdmin's
  // placeholder kindeId, ahead of that person's first real login) with the
  // real Kinde id — same email-or-kindeId reconciliation admin-actions.ts's
  // getAllAdmins already does for the admin list itself.
  if (!user && kindeUser.email) {
    const byEmail = await prisma.gBCUser.findUnique({
      where: { email: kindeUser.email },
    });
    if (byEmail && byEmail.kindeId !== kindeUser.id) {
      user = await prisma.gBCUser.update({
        where: { id: byEmail.id },
        data: { kindeId: kindeUser.id },
      });
    } else {
      user = byEmail;
    }
  }

  if (!user) {
    throw new Error("Unauthorized: not a registered GBC user");
  }

  // Not checked at all before this fix — a deactivated admin's account
  // could still pass every requireAdmin() call in the product.
  if (!user.isActive) {
    throw new Error("Unauthorized: account is deactivated");
  }

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: admin access required");
  }

  return user;
}

export async function getCurrentGBCUser() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return null;
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return null;
  }

  // Get or create user in database
  let user = await prisma.gBCUser.findUnique({
    where: { kindeId: kindeUser.id },
  });

  if (!user) {
    user = await prisma.gBCUser.create({
      data: {
        kindeId: kindeUser.id,
        email: kindeUser.email || "",
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
        phone: kindeUser.phone_number || undefined,
        role: "USER",
      },
    });
  }

  return user;
}

export async function checkIsAdmin() {
  const user = await getCurrentGBCUser();
  return user?.role === "ADMIN" || user?.role === "SUPERADMIN";
}

export async function checkIsSuperAdmin() {
  const user = await getCurrentGBCUser();
  return user?.role === "SUPERADMIN";
}
