"use server";
import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { canAccessSurfAdminPanel, canAccessSurfUserPanel } from "@/permissions";
import { getAndRefreshUserSession } from "./encryptedCookies";
import { cache } from "react";
import { Platform } from "./platform";

export async function getUserFromSurfDB(userId: string) {
  try {
    const user = await prisma.surfboardUser.findUnique({
      where: { kindeId: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from Surfboard DB:", error);
    return null;
  }
}

export async function getAuthenticatedSurfUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();
  const user = await getUser();

  if (!UserIsAuthenticated || !user || !user.id) {
    throw new Error("Not Authenticated");
  }

  const surfUser = await getUserFromSurfDB(user.id);

  if (!surfUser) {
    throw new Error("User not found in Surfboard DB");
  }

  return { ...user, ...surfUser };
}

export const getAuthenticatedSurfUserFromCookie = cache(async () => {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    const UserIsAuthenticated = await isAuthenticated();
    const user = await getUser();

    if (!UserIsAuthenticated || !user || !user.id) {
      throw new Error("Not Authenticated");
    }

    const sessionData = await getAndRefreshUserSession();
    if (!sessionData) {
      throw new Error("No active session found");
    }

    const userData = sessionData.userData;

    // Multi-platform awareness: specifically find the Surfboard session
    const surfboardSession =
      userData.platforms[Platform.SURFBOARD] ||
      (userData.platform === Platform.SURFBOARD
        ? { role: userData.role, subscription: userData.subscription }
        : null);

    if (!surfboardSession) {
      throw new Error("User not found in Surfboard session");
    }

    return {
      ...user,
      userId: userData.userId,
      role: surfboardSession.role,
      subscription: surfboardSession.subscription,
    };
  } catch (error) {
    console.error(
      "Error getting authenticated Surfboard user from cookie:",
      error,
    );
    throw error;
  }
});

// Function to verify if user can access admin panel
export async function verifySurfAdminAccess() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        hasAccess: false,
        message: "User not authenticated or role not found",
      };
    }

    const hasAccess = canAccessSurfAdminPanel(user.role);

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
export async function verifySurfUserAccess() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        hasAccess: false,
        message: "User not authenticated or role not found",
      };
    }

    const hasAccess = canAccessSurfUserPanel(user.role);

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
