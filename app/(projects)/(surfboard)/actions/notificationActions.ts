"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { sendMail } from "@/utils/email";
import { revalidatePath } from "next/cache";
import {
  SurfboardNotificationType,
  SurfboardNotificationAudience,
} from "@prisma/client";

export type ApiResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CreateNotificationInput = {
  type: SurfboardNotificationType;
  title: string;
  message: string;
  audience: SurfboardNotificationAudience;
  userIds?: string[];
  link?: string;
  metadata?: any;
  sendEmail?: boolean; // Whether to also send email notification
};

export type NotificationWithUser = {
  id: string;
  type: SurfboardNotificationType;
  title: string;
  message: string;
  audience: SurfboardNotificationAudience;
  link: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
};

/**
 * Creates a new notification in the system
 * Optionally sends email notifications to recipients
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<ApiResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Create the notification
    const notification = await prisma.surfboardNotification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        audience: input.audience,
        userIds: input.userIds || [],
        link: input.link,
        metadata: input.metadata || {},
      },
    });

    // Send email notifications if requested
    if (input.sendEmail) {
      await sendNotificationEmails(notification.id);
    }

    revalidatePath("/surfboard/dashboard/notifications");
    return { success: true, data: { id: notification.id } };
  } catch (error) {
    console.error("Error creating notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create notification",
    };
  }
}

/**
 * Sends email notifications to all recipients of a notification
 */
async function sendNotificationEmails(notificationId: string): Promise<void> {
  try {
    const notification = await prisma.surfboardNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      console.error("Notification not found:", notificationId);
      return;
    }

    // Get recipient emails based on audience
    const recipients = await getNotificationRecipients(notification);

    // Send emails to all recipients
    const emailPromises = recipients.map((recipient) =>
      sendMail({
        to: recipient.email,
        subject: notification.title,
        text: notification.message,
        html: generateNotificationEmailHtml(notification, recipient),
      })
    );

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error("Error sending notification emails:", error);
  }
}

/**
 * Gets the list of recipients for a notification based on audience
 */
async function getNotificationRecipients(notification: {
  audience: SurfboardNotificationAudience;
  userIds: string[];
}): Promise<
  Array<{ id: string; email: string; firstName: string; lastName: string }>
> {
  const where: any = { isActive: true };

  switch (notification.audience) {
    case "SPECIFIC_USERS":
      where.id = { in: notification.userIds };
      break;
    case "GENERAL_ADMINS":
      where.role = { in: ["ADMIN", "SUPERADMIN"] };
      break;
    case "SUPERADMIN":
      where.role = "SUPERADMIN";
      break;
    case "ALL_USERS":
      // No additional filter needed
      break;
  }

  return await prisma.surfboardUser.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
}

/**
 * Generates HTML content for notification emails
 */
function generateNotificationEmailHtml(
  notification: {
    title: string;
    message: string;
    type: SurfboardNotificationType;
    link: string | null;
  },
  recipient: { firstName: string; lastName: string }
): string {
  const typeColors: Record<SurfboardNotificationType, string> = {
    INFO: "#3b82f6",
    SUCCESS: "#10b981",
    WARNING: "#f59e0b",
    ERROR: "#ef4444",
    SYSTEM: "#6366f1",
    PLAN: "#8b5cf6",
    SHARING: "#ec4899",
  };

  const color = typeColors[notification.type] || "#3b82f6";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: ${color}; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                      Surfboard Notification
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                      Hello ${recipient.firstName} ${recipient.lastName},
                    </p>
                    
                    <h2 style="margin: 0 0 15px; color: #111827; font-size: 20px; font-weight: 600;">
                      ${notification.title}
                    </h2>
                    
                    <p style="margin: 0 0 25px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      ${notification.message}
                    </p>
                    
                    ${
                      notification.link
                        ? `
                    <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                      <tr>
                        <td style="background-color: ${color}; border-radius: 6px; padding: 12px 30px;">
                          <a href="${notification.link}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                            View Details
                          </a>
                        </td>
                      </tr>
                    </table>
                    `
                        : ""
                    }
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                      This is an automated notification from Surfboard. Please do not reply to this email.
                    </p>
                    <p style="margin: 10px 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                      © ${new Date().getFullYear()} Surfboard. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Gets all notifications for the current user
 */
export async function getUserNotifications(options?: {
  includeRead?: boolean;
  includeDismissed?: boolean;
  limit?: number;
}): Promise<ApiResult<NotificationWithUser[]>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const {
      includeRead = true,
      includeDismissed = false,
      limit = 50,
    } = options || {};

    // Build the where clause
    const where: any = {
      OR: [{ audience: "ALL_USERS" }, { userIds: { has: user.id } }],
    };

    // Add role-based filters
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") {
      where.OR.push({ audience: "GENERAL_ADMINS" });
    }
    if (user.role === "SUPERADMIN") {
      where.OR.push({ audience: "SUPERADMIN" });
    }

    const notifications = await prisma.surfboardNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Transform notifications to include user-specific read/dismissed status
    const transformedNotifications: NotificationWithUser[] = notifications
      .map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        audience: notification.audience,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: notification.readBy.includes(user.id),
        isDismissed: notification.dismissedBy.includes(user.id),
      }))
      .filter((n) => {
        if (!includeRead && n.isRead) return false;
        if (!includeDismissed && n.isDismissed) return false;
        return true;
      });

    return { success: true, data: transformedNotifications };
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get notifications",
    };
  }
}

/**
 * Marks a notification as read for the current user
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const notification = await prisma.surfboardNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    // Add user to readBy array if not already present
    const readBy = [...new Set([...notification.readBy, user.id])];

    await prisma.surfboardNotification.update({
      where: { id: notificationId },
      data: { readBy },
    });

    revalidatePath("/surfboard/dashboard/notifications");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as read",
    };
  }
}

/**
 * Marks a notification as dismissed for the current user
 */
export async function dismissNotification(
  notificationId: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const notification = await prisma.surfboardNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    // Add user to dismissedBy array if not already present
    const dismissedBy = [...new Set([...notification.dismissedBy, user.id])];

    await prisma.surfboardNotification.update({
      where: { id: notificationId },
      data: { dismissedBy },
    });

    revalidatePath("/surfboard/dashboard/notifications");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to dismiss notification",
    };
  }
}

/**
 * Gets the count of unread notifications for the current user
 */
export async function getUnreadNotificationCount(): Promise<
  ApiResult<{ count: number }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const where: any = {
      OR: [{ audience: "ALL_USERS" }, { userIds: { has: user.id } }],
      readBy: {
        not: {
          has: user.id,
        },
      },
      dismissedBy: {
        not: {
          has: user.id,
        },
      },
    };

    // Add role-based filters
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") {
      where.OR.push({ audience: "GENERAL_ADMINS" });
    }
    if (user.role === "SUPERADMIN") {
      where.OR.push({ audience: "SUPERADMIN" });
    }

    const count = await prisma.surfboardNotification.count({ where });

    return { success: true, data: { count } };
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get count",
    };
  }
}

/**
 * Deletes a notification (admin only)
 */
export async function deleteNotification(
  notificationId: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.surfboardNotification.delete({
      where: { id: notificationId },
    });

    revalidatePath("/surfboard/dashboard/notifications");
    revalidatePath("/surf-restricted/dashboard/notifications");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete notification",
    };
  }
}

/**
 * Helper function to send plan-related notifications
 */
export async function notifyPlanUpdate(params: {
  planId: string;
  planNumber: string;
  title: string;
  message: string;
  type: SurfboardNotificationType;
  userIds?: string[];
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: params.type,
      title: params.title,
      message: params.message,
      audience: params.userIds ? "SPECIFIC_USERS" : "GENERAL_ADMINS",
      userIds: params.userIds,
      link: `/surfboard/dashboard/plan?planId=${params.planId}`,
      metadata: {
        planId: params.planId,
        planNumber: params.planNumber,
      },
      sendEmail: params.sendEmail,
    });
  } catch (error) {
    console.error("Error sending plan notification:", error);
  }
}

/**
 * Helper function to send sharing notifications
 */
export async function notifyPlanShared(params: {
  planId: string;
  planNumber: string;
  sharedWithUserId: string;
  sharedByUser: { firstName: string; lastName: string };
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SHARING",
      title: "Plan Shared With You",
      message: `${params.sharedByUser.firstName} ${params.sharedByUser.lastName} has shared plan ${params.planNumber} with you.`,
      audience: "SPECIFIC_USERS",
      userIds: [params.sharedWithUserId],
      link: `/surfboard/dashboard/plan?planId=${params.planId}`,
      metadata: {
        planId: params.planId,
        planNumber: params.planNumber,
        sharedBy: params.sharedByUser,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending sharing notification:", error);
  }
}
