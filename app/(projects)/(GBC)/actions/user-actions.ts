"use server";

import prisma from "@/lib/prisma";
import { GBCRole as GBCRoleType } from "@/prisma/generated";
import { requireAdmin } from "@/gbc/utils/auth";
import { revalidatePath } from "next/cache";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

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
    await requireAdmin();

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
    await requireAdmin();

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
    const admin = await requireAdmin();

    const updatedUser = await prisma.gBCUser.update({
      where: { id },
      data: { role },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE_USER_ROLE",
        entity: "GBCUser",
        entityId: id,
        changes: JSON.stringify({ role }),
      },
    });

    revalidatePath("/gbc-restricted/users");

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function deleteGBCUser(id: string) {
  try {
    const admin = await requireAdmin();

    await prisma.gBCUser.delete({
      where: { id },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: admin.id,
        action: "DELETE_USER",
        entity: "GBCUser",
        entityId: id,
      },
    });

    revalidatePath("/gbc-restricted/users");

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
