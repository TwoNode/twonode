"use server";

import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getServerSession } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";
import { canAccessRevaAdminPanel, canAccessRevaUserPanel } from "@/permissions";

export async function getUserFromRevaDB(userId: string) {
  try {
    const user = await prisma.revaUser.findUnique({
      where: { kindeId: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from Reva DB:", error);
    return null;
  }
}

/**
 * Native email+password login never creates a Kinde session, so a
 * Kinde-only check here left every natively-authenticated user unable to
 * load their own settings/profile page (getKindeServerSession().isAuthenticated()
 * is false for them, throwing "Not Authenticated" even though they're
 * signed in). Falls back to the native JWT session, looked up by internal
 * id rather than kindeId. Only the plain RevaUser row is spread back either
 * way — callers here (settings/UserProfile, admin notifications) only ever
 * read DB columns, never Kinde-SDK-only fields like `picture`.
 */
export async function getAuthenticatedRevaUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();
  const kindeUser = await getUser();

  if (UserIsAuthenticated && kindeUser?.id) {
    const revaUser = await getUserFromRevaDB(kindeUser.id);
    if (!revaUser) {
      throw new Error("User not found in Reva DB");
    }
    return { ...kindeUser, ...revaUser };
  }

  const nativeSession = await getServerSession(Platform.REVA);
  if (!nativeSession) {
    throw new Error("Not Authenticated");
  }

  const revaUser = await prisma.revaUser.findUnique({ where: { id: nativeSession.sub } });
  if (!revaUser) {
    throw new Error("User not found in Reva DB");
  }

  return revaUser;
}

// Function to verify if user can access admin panel
export async function _verifyRevaAdminAccess() {
  try {
    const user = await getAuthenticatedRevaUser();
    
    if (!user || !user.role) {
      return { hasAccess: false, message: "User not authenticated or role not found" };
    }

    const hasAccess = canAccessRevaAdminPanel(user.role);
    
    return { 
      hasAccess, 
      message: hasAccess ? "Access granted" : "Insufficient permissions",
      user 
    };
  } catch (error) {
    console.error("Error verifying admin access:", error);
    return { hasAccess: false, message: "Error verifying permissions" };
  }
}

// Function to verify if user can access user panel
export async function _verifyRevaUserAccess() {
  try {
    const user = await getAuthenticatedRevaUser();
    
    if (!user || !user.role) {
      return { hasAccess: false, message: "User not authenticated or role not found" };
    }

    const hasAccess = canAccessRevaUserPanel(user.role);
    
    return { 
      hasAccess, 
      message: hasAccess ? "Access granted" : "Insufficient permissions",
      user 
    };
  } catch (error) {
    console.error("Error verifying user access:", error);
    return { hasAccess: false, message: "Error verifying permissions" };
  }
}

// Legacy function for backward compatibility
export const verifyRevaAdminAccess = _verifyRevaAdminAccess;
export const verifyRevaUserAccess = _verifyRevaUserAccess;
