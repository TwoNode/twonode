"use server";

import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GBCRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getAllAdmins() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current user's role
    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role === "USER") {
      return { success: false, error: "Not authorized" };
    }

    const admins = await prisma.gBCUser.findMany({
      where: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: admins.map((admin) => ({
        ...admin,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return { success: false, error: "Failed to fetch admins" };
  }
}

export async function addNewAdmin(data: {
  email: string;
  name: string;
  phone: string;
  role: "ADMIN" | "SUPER_ADMIN";
}) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if current user is authorized
    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only Super Admins can add new admins" };
    }

    // Check if email already exists
    const existingUser = await prisma.gBCUser.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Create new admin (Note: In production, you'd integrate with Kinde to create the actual user)
    const newAdmin = await prisma.gBCUser.create({
      data: {
        kindeId: `temp_${Date.now()}`, // Temporary - should be replaced with actual Kinde ID
        email: data.email,
        name: data.name || null,
        phone: data.phone || null,
        role: data.role,
      },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: "ADD_ADMIN",
        entity: "GBCUser",
        entityId: newAdmin.id,
        changes: JSON.stringify({ email: data.email, role: data.role }),
      },
    });

    revalidatePath("/admin/users");

    return { success: true, data: newAdmin };
  } catch (error) {
    console.error("Error adding admin:", error);
    return { success: false, error: "Failed to add admin" };
  }
}

export async function updateAdminRole(
  adminId: string,
  newRole: "ADMIN" | "SUPER_ADMIN" | GBCRole
) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if current user is authorized
    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only Super Admins can change roles" };
    }

    // Prevent self-demotion
    if (currentUser.id === adminId && newRole !== "SUPER_ADMIN") {
      return { success: false, error: "You cannot change your own role" };
    }

    const updatedAdmin = await prisma.gBCUser.update({
      where: { id: adminId },
      data: { role: newRole },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE_ADMIN_ROLE",
        entity: "GBCUser",
        entityId: adminId,
        changes: JSON.stringify({ newRole }),
      },
    });

    revalidatePath("/admin/users");

    return { success: true, data: updatedAdmin };
  } catch (error) {
    console.error("Error updating admin role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deleteAdmin(adminId: string) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if current user is authorized
    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only Super Admins can remove admins" };
    }

    // Prevent self-deletion
    if (currentUser.id === adminId) {
      return { success: false, error: "You cannot remove yourself" };
    }

    await prisma.gBCUser.delete({
      where: { id: adminId },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: "DELETE_ADMIN",
        entity: "GBCUser",
        entityId: adminId,
      },
    });

    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error deleting admin:", error);
    return { success: false, error: "Failed to remove admin" };
  }
}
