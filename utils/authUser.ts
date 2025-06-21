"use server";
import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
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

export async function getAuthenticatedUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();
  const user = await getUser();

  if (!UserIsAuthenticated || !user || !user.id) {
    throw new Error("Not Authenticated");
  }

  const revaUser = await getUserFromRevaDB(user.id);

  if (!revaUser) {
    throw new Error("User not found in Reva DB");
  }

  return { ...user, ...revaUser };
}

// Function to verify if user can access admin panel
export async function verifyRevaAdminAccess() {
  try {
    const user = await getAuthenticatedUser();
    
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
export async function verifyRevaUserAccess() {
  try {
    const user = await getAuthenticatedUser();
    
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
export const verifyAdminAccess = verifyRevaAdminAccess;
export const verifyUserAccess = verifyRevaUserAccess;
