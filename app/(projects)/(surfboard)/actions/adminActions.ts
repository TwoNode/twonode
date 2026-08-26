"use server";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import prisma from "@/lib/prisma";
import { Prisma, SurfboardRole } from "@/prisma/generated";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/surfboard/utils/surfAuth";
import { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";
import {
  logAuditAction,
  createChangeLog,
  formatChanges,
} from "../utils/auditLogger";

// Type definitions
interface UpdateUserRoleInput {
  userId: string;
  newRole: SurfboardRole;
}

interface UpdateUserStatusInput {
  userId: string;
  isActive: boolean;
}

interface UpdateSubscriptionInput {
  userId: string;
  planCode: string;
  planName: string;
  amount: number;
  interval: string;
  status: string;
  currentEnd?: Date | string | null;
}

interface CreateAdminInput {
  email: string;
  firstName: string;
  lastName: string;
  role: SurfboardRole;
}

// Helper function to check if user is admin or superadmin
async function requireAdmin() {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser) {
    throw new Error("Unauthorized: Not authenticated");
  }

  const user = await prisma.surfboardUser.findUnique({
    where: { kindeId: kindeUser.id },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Unauthorized: User not found or inactive");
  }

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  return { kindeUser, userRole: user.role };
}

// Helper function to check if user is superadmin
async function requireSuperAdmin() {
  const { kindeUser, userRole } = await requireAdmin();

  if (userRole !== "SUPERADMIN") {
    throw new Error("Unauthorized: SuperAdmin access required");
  }

  return kindeUser;
}

/**
 * Get current user's role
 * Accessible by: ADMIN, SUPERADMIN
 */
export async function getCurrentUserRole() {
  try {
    const { userRole } = await requireAdmin();
    return {
      success: true,
      role: userRole,
    };
  } catch (error: any) {
    console.error("Error getting current user role:", error);
    return {
      success: false,
      error: error.message || "Failed to get current user role",
    };
  }
}

/**
 * Get all users with their subscriptions
 * Accessible by: ADMIN (can only view USER subscriptions), SUPERADMIN (can view all)
 */
export async function getAllUsers() {
  try {
    const { userRole } = await requireAdmin();

    const users = await prisma.surfboardUser.findMany({
      include: {
        subscription: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            plans: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      users: users.map((user) => ({
        id: user.id,
        kindeId: user.kindeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        companyName: user.companyName,
        surconRegNumber: user.surconRegNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        plansCount: user._count.plans,
        // ADMINs can only see subscriptions for USER role
        subscription:
          userRole === "ADMIN" && user.role !== "USER"
            ? null
            : user.subscription[0] || null,
      })),
    };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch users",
    };
  }
}

/**
 * Get user statistics
 * Accessible by: ADMIN, SUPERADMIN
 */
export async function getUserStats() {
  try {
    await requireAdmin();

    const [
      totalUsers,
      activeUsers,
      admins,
      superAdmins,
      usersWithSubscriptions,
    ] = await Promise.all([
      prisma.surfboardUser.count(),
      prisma.surfboardUser.count({ where: { isActive: true } }),
      prisma.surfboardUser.count({ where: { role: "ADMIN" } }),
      prisma.surfboardUser.count({ where: { role: "SUPERADMIN" } }),
      prisma.subscription.count({ where: { status: "active" } }),
    ]);

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        admins,
        superAdmins,
        regularUsers: totalUsers - admins - superAdmins,
        usersWithActiveSubscriptions: usersWithSubscriptions,
      },
    };
  } catch (error: any) {
    console.error("Error fetching user stats:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch user statistics",
    };
  }
}

/**
 * Update user role
 * Accessible by: SUPERADMIN only (ADMINs cannot change any roles)
 */
export async function updateUserRole({ userId, newRole }: UpdateUserRoleInput) {
  try {
    const { userRole } = await requireAdmin();

    // Only SUPERADMIN can change roles
    if (userRole === "ADMIN") {
      throw new Error("Only SuperAdmins can change user roles");
    }

    // Get the target user
    const targetUser = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    const updatedUser = await prisma.surfboardUser.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Log audit action
    await logAuditAction({
      userId,
      action: "UPDATE_USER_ROLE",
      entity: "SurfboardUser",
      entityId: userId,
      changes: formatChanges({ role: targetUser.role }, { role: newRole }),
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      user: updatedUser,
      message: `User role updated to ${newRole}`,
    };
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: error.message || "Failed to update user role",
    };
  }
}

/**
 * Update user active status
 * Accessible by: ADMIN, SUPERADMIN
 */
export async function updateUserStatus({
  userId,
  isActive,
}: UpdateUserStatusInput) {
  try {
    const { userRole } = await requireAdmin();

    // Get the target user
    const targetUser = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Only SUPERADMIN can deactivate ADMIN or SUPERADMIN accounts
    if (
      userRole === "ADMIN" &&
      (targetUser.role === "ADMIN" || targetUser.role === "SUPERADMIN")
    ) {
      throw new Error("Only SuperAdmins can modify admin account status");
    }

    const updatedUser = await prisma.surfboardUser.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Log audit action
    await logAuditAction({
      userId,
      action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entity: "SurfboardUser",
      entityId: userId,
      changes: createChangeLog({
        isActive,
        userEmail: targetUser.email,
      }),
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      user: updatedUser,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    };
  } catch (error: any) {
    console.error("Error updating user status:", error);
    return {
      success: false,
      error: error.message || "Failed to update user status",
    };
  }
}

/**
 * Create or update user subscription
 * Accessible by: SUPERADMIN only
 */
export async function updateUserSubscription(input: UpdateSubscriptionInput) {
  try {
    await requireSuperAdmin();

    const { userId, planCode, planName, amount, interval, status, currentEnd } =
      input;

    // Check if user exists
    const user = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          planCode,
          planName,
          amount,
          interval,
          status,
          ...{ currentEnd: currentEnd ? new Date(currentEnd) : null },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new subscription
      subscription = await prisma.subscription.create({
        data: {
          userId,
          email: user.email,
          planCode,
          planName,
          amount,
          interval,
          status,
          ...{ currentEnd: currentEnd ? new Date(currentEnd) : null },
          currency: "NGN",
          platform: "surfboard",
        },
      });
    }

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      subscription,
      message: `Subscription ${existingSubscription ? "updated" : "created"} successfully`,
    };
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return {
      success: false,
      error: error.message || "Failed to update subscription",
    };
  }
}

/**
 * Cancel user subscription
 * Accessible by: SUPERADMIN only
 */
export async function cancelUserSubscription(userId: string) {
  try {
    await requireSuperAdmin();

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        status: "canceled",
        cancelledAt: new Date(),
      },
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      subscription: updatedSubscription,
      message: "Subscription canceled successfully",
    };
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error: error.message || "Failed to cancel subscription",
    };
  }
}

/**
 * Promote user to admin
 * Accessible by: SUPERADMIN only
 */
export async function promoteToAdmin(userId: string) {
  try {
    await requireSuperAdmin();

    const updatedUser = await prisma.surfboardUser.update({
      where: { id: userId },
      data: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      user: updatedUser,
      message: "User promoted to Admin successfully",
    };
  } catch (error: any) {
    console.error("Error promoting user:", error);
    return {
      success: false,
      error: error.message || "Failed to promote user",
    };
  }
}

/**
 * Get user details by ID
 * Accessible by: ADMIN, SUPERADMIN
 */
export async function getUserById(userId: string) {
  try {
    await requireAdmin();

    const user = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          orderBy: { createdAt: "desc" },
        },
        subscriptionHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        plans: {
          select: {
            id: true,
            planNumber: true,
            surveyTitle: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch user details",
    };
  }
}

/**
 * Delete user (soft delete by setting isActive to false)
 * Accessible by: SUPERADMIN only
 */
export async function deleteUser(userId: string) {
  try {
    await requireSuperAdmin();

    const user = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Prevent deleting SUPERADMIN accounts
    if (user.role === "SUPERADMIN") {
      throw new Error("Cannot delete SuperAdmin accounts");
    }

    await prisma.surfboardUser.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Log audit action
    await logAuditAction({
      userId,
      action: "DELETE_USER",
      entity: "SurfboardUser",
      entityId: userId,
      changes: createChangeLog({
        userRole: user.role,
        deleted: true,
      }),
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: error.message || "Failed to delete user",
    };
  }
}

/**
 * Create a new admin user
 * Accessible by: SUPERADMIN only
 */
export async function createAdmin(input: CreateAdminInput) {
  try {
    await requireSuperAdmin();

    const { email, firstName, lastName, role } = input;

    // Check if user with email already exists
    const existingUser = await prisma.surfboardUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create new user with temporary kindeId
    const newUser = await prisma.surfboardUser.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        kindeId: `temp_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`,
        isActive: true,
        emailVerified: false,
      },
    });

    // Log audit action
    await logAuditAction({
      userId: newUser.id,
      action: "CREATE_ADMIN",
      entity: "SurfboardUser",
      entityId: newUser.id,
      changes: createChangeLog({
        email,
        firstName,
        lastName,
        role,
      }),
    });

    revalidatePath("/surfboard-restricted/dashboard/user-management");

    return {
      success: true,
      user: newUser,
      message: "Admin user created successfully",
    };
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return {
      success: false,
      error: error.message || "Failed to create admin user",
    };
  }
}

/**
 * Fetches all surf plans for admin map viewing
 * Requires ADMIN or SUPERADMIN role
 * Returns minimal plan data with geometry for map rendering
 */
export async function getAllSurfPlansForAdmin(): Promise<
  ApiResult<{
    plans: Array<{
      id: string;
      planNumber: string;
      surveyTitle: string;
      location: string | null;
      status: string;
      geometry: any;
      ward: string | null;
      lga: string | null;
      owner: {
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !user.role || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        deleted: false,
        geometry: {
          not: Prisma.DbNull as any,
        },
      },
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        ward: true,
        lga: true,
        status: true,
        geometry: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to include location and rename user to owner
    const mappedPlans = plans.map((plan) => ({
      id: plan.id,
      planNumber: plan.planNumber,
      surveyTitle: plan.surveyTitle,
      location:
        plan.ward && plan.lga
          ? `${plan.ward}, ${plan.lga}`
          : plan.ward || plan.lga,
      status: plan.status,
      geometry: plan.geometry,
      ward: plan.ward,
      lga: plan.lga,
      owner: plan.user ?? null,
    }));

    return { success: true, data: { plans: mappedPlans } };
  } catch (error) {
    console.error("Error fetching admin plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAllSurfPlansForAdmin"),
    };
  }
}
