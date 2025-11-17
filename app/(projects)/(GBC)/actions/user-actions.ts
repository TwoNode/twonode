import prisma from "@/lib/prisma";
import { GBCRole as GBCRoleType } from "@prisma/client";

export interface GBCUserData {
  id: string;
  kindeId: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: GBCRoleType;
  createdAt: Date;
  updatedAt: Date;
}

export const GBCRole = GBCRoleType;

export async function getGBCUsers() {
  try {
    const users = await prisma.gBCUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function getGBCUserById(id: string) {
  try {
    const user = await prisma.gBCUser.findUnique({
      where: { id },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user" };
  }
}

export async function updateGBCUserRole(id: string, role: GBCRoleType) {
  try {
    const updatedUser = await prisma.gBCUser.update({
      where: { id },
      data: { role },
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function deleteGBCUser(id: string) {
  try {
    await prisma.gBCUser.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
