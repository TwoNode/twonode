"use server";

import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GBCRole } from "@/prisma/generated";
import { revalidatePath } from "next/cache";

export async function getAllAdmins() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current user's role
    const currentUser = await prisma.gBCUser.findFirst({
      where: { OR: [{ kindeId: user.id }, { email: user.email || "" }] },
    });

    if (currentUser && currentUser?.kindeId !== user.id) {
      await prisma.gBCUser.update({
        where: { id: currentUser?.id },
        data: { kindeId: user.id },
      });
    }

    if (!currentUser || currentUser.role === "USER") {
      return { success: false, error: "Not authorized" };
    }

    const admins = await prisma.gBCUser.findMany({
      where: {
        NOT: {
          email: {
            in: ["rojitech9@gmail.com"],
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        kindeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
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
  firstName: string;
  lastName: string;
  phone: string;
  role: "ADMIN" | "SUPERADMIN";
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

    if (!currentUser || currentUser.role !== "SUPERADMIN") {
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
        firstName: data.firstName || null,
        lastName: data.lastName || null,
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
  newRole: "ADMIN" | "SUPERADMIN" | GBCRole
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

    if (!currentUser || currentUser.role !== "SUPERADMIN") {
      return { success: false, error: "Only Super Admins can change roles" };
    }

    // Prevent self-demotion
    if (currentUser.id === adminId && newRole !== "SUPERADMIN") {
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

    if (!currentUser || currentUser.role !== "SUPERADMIN") {
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

export async function toggleAdminStatus(adminId: string, isActive: boolean) {
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

    if (!currentUser || currentUser.role !== "SUPERADMIN") {
      return {
        success: false,
        error: "Only Super Admins can activate/deactivate admins",
      };
    }

    // Prevent self-deactivation
    if (currentUser.id === adminId && !isActive) {
      return { success: false, error: "You cannot deactivate yourself" };
    }

    const updatedAdmin = await prisma.gBCUser.update({
      where: { id: adminId },
      data: { isActive },
    });

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: isActive ? "ACTIVATE_ADMIN" : "DEACTIVATE_ADMIN",
        entity: "GBCUser",
        entityId: adminId,
        changes: JSON.stringify({ isActive }),
      },
    });

    revalidatePath("/admin/users");

    return { success: true, data: updatedAdmin };
  } catch (error) {
    console.error("Error toggling admin status:", error);
    return { success: false, error: "Failed to update admin status" };
  }
}
