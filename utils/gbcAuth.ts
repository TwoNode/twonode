"use server";
import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { canAccessGBCAdminPanel, canAccessGBCUserPanel } from "@/permissions";
import { getAndRefreshUserSession } from "./encryptedCookies";
import { cache } from "react";

export async function getUserFromGBCDB(userId: string) {
  try {
    const user = await prisma.gBCUser.findUnique({
      where: { kindeId: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from GBC DB:", error);
    return null;
  }
}

export async function getAuthenticatedGBCUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();
  const user = await getUser();

  if (!UserIsAuthenticated || !user || !user.id) {
    throw new Error("Not Authenticated");
  }

  const gbcUser = await getUserFromGBCDB(user.id);

  if (!gbcUser) {
    throw new Error("User not found in GBC DB");
  }

  return { ...user, ...gbcUser };
}

export const getAuthenticatedGBCUserFromCookie = cache(async () => {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    const UserIsAuthenticated = await isAuthenticated();
    const user = await getUser();

    if (!UserIsAuthenticated || !user || !user.id) {
      throw new Error("Not Authenticated");
    }

    const sessionData = await getAndRefreshUserSession();
    const gbcUser = sessionData?.userData;

    if (!gbcUser) {
      throw new Error("User not found in GBC session");
    }

    return { ...user, ...gbcUser, id: gbcUser.userId };
  } catch (error) {
    console.error("Error getting authenticated GBC user from cookie:", error);
    throw error;
  }
});

// Function to verify if user can access admin panel
export async function verifyGBCAdminAccess() {
  try {
    const user = await getAuthenticatedGBCUserFromCookie();

    if (!user || !user.role) {
      return {
        hasAccess: false,
        message: "User not authenticated or role not found",
      };
    }

    const hasAccess = canAccessGBCAdminPanel(user.role);

    return {
      hasAccess,
      message: hasAccess ? "Access granted" : "Insufficient permissions",
      user,
    };
  } catch (error) {
    console.error("Error verifying admin access:", error);
    return { hasAccess: false, message: "Error verifying permissions" };
  }
}

// Function to verify if user can access user panel
export async function verifyGBCUserAccess() {
  try {
    const user = await getAuthenticatedGBCUserFromCookie();

    if (!user || !user.role) {
      return {
        hasAccess: false,
        message: "User not authenticated or role not found",
      };
    }

    const hasAccess = canAccessGBCUserPanel(user.role);

    return {
      hasAccess,
      message: hasAccess ? "Access granted" : "Insufficient permissions",
      user,
    };
  } catch (error) {
    console.error("Error verifying user access:", error);
    return { hasAccess: false, message: "Error verifying permissions" };
  }
}
