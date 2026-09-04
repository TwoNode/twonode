// src/lib/auth.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
// import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";

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
 *
 * requireAuth() was Kinde-exclusive, so every natively-authenticated GBC
 * admin 500'd on any page that calls requireAdmin() (speakers, sponsors,
 * tickets, gallery, attendees, the dashboard root, ...) even though the
 * proxy middleware had already let them through — same auth-asymmetry bug
 * found and fixed for REVA's getAuthenticatedRevaUser() and the Surfboard/
 * REVA nav-role resolution. Falls back to the native JWT session, looked
 * up by internal id, when there's no Kinde session.
 */
export async function requireAuth() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (await isAuthenticated()) {
    const kindeUser = await getUser();
    if (kindeUser) return kindeUser;
  }

  const nativeSession = await getServerSession(Platform.GBC);
  if (!nativeSession) {
    throw new Error("Unauthorized: authentication required");
  }

  return { id: nativeSession.sub, email: undefined as string | undefined };
}

export async function requireAdmin() {
  const authUser = await requireAuth();

  let user = await prisma.gBCUser.findUnique({
    where: { kindeId: authUser.id },
  });

  // Reconcile a pre-provisioned account (created by email via addNewAdmin's
  // placeholder kindeId, ahead of that person's first real login) with the
  // real Kinde id — same email-or-kindeId reconciliation admin-actions.ts's
  // getAllAdmins already does for the admin list itself.
  if (!user && authUser.email) {
    const byEmail = await prisma.gBCUser.findUnique({
      where: { email: authUser.email },
    });
    if (byEmail && byEmail.kindeId !== authUser.id) {
      user = await prisma.gBCUser.update({
        where: { id: byEmail.id },
        data: { kindeId: authUser.id },
      });
    } else {
      user = byEmail;
    }
  }

  // requireAuth()'s native-session branch has no Kinde id to look up by —
  // the JWT's sub is the GBCUser's own primary key.
  if (!user) {
    user = await prisma.gBCUser.findUnique({ where: { id: authUser.id } });
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
