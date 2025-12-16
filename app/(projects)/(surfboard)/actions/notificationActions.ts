"use server";

import { addBaseUrl } from "@/utils/addBaseUrl";
import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { sendNotificationMail } from "@/utils/email";
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
      sendNotificationMail({
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

  const withBaseUrl = addBaseUrl(notification.link || "");

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
                          <a href="${withBaseUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
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
      NOT: [{ readBy: { has: user.id } }, { dismissedBy: { has: user.id } }],
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

/**
 * Helper function to notify admins when a batch is submitted
 */
export async function notifyBatchSubmitted(params: {
  batchId: string;
  batchCode: string;
  planCount: number;
  submittedBy: { firstName: string; lastName: string };
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SYSTEM",
      title: "New Batch Submitted",
      message: `${params.submittedBy.firstName} ${params.submittedBy.lastName} submitted batch ${params.batchCode} with ${params.planCount} plan(s).`,
      audience: "GENERAL_ADMINS",
      link: `/surf-restricted/dashboard/cod`,
      metadata: {
        batchId: params.batchId,
        batchCode: params.batchCode,
        planCount: params.planCount,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending batch submission notification:", error);
  }
}

/**
 * Helper function to notify admins when payment is received
 */
export async function notifyPaymentReceived(params: {
  batchId: string;
  batchCode: string;
  amount: number;
  paidBy: { firstName: string; lastName: string };
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SYSTEM",
      title: "Payment Received",
      message: `Payment of ₦${params.amount.toLocaleString()} received for batch ${
        params.batchCode
      } from ${params.paidBy.firstName} ${params.paidBy.lastName}.`,
      audience: "GENERAL_ADMINS",
      link: `/surf-restricted/dashboard/cod`,
      metadata: {
        batchId: params.batchId,
        batchCode: params.batchCode,
        amount: params.amount,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending payment notification:", error);
  }
}

/**
 * Helper function to notify MDA roles when LASG receipt is uploaded
 */
export async function notifyLASGReceiptUploaded(params: {
  batchId: string;
  batchCode: string;
  planCount: number;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    // Get all MDA role users
    const mdaUsers = await prisma.surfboardUser.findMany({
      where: {
        role: {
          in: ["ACCOUNTS", "CHARTING", "SURCON", "RECORDS_I", "RECORDS_II"],
        },
        isActive: true,
      },
      select: { id: true },
    });

    if (mdaUsers.length > 0) {
      await createNotification({
        type: "SYSTEM",
        title: "LASG Receipt Uploaded",
        message: `LASG payment receipt uploaded for batch ${params.batchCode} with ${params.planCount} plan(s). Ready for review.`,
        audience: "SPECIFIC_USERS",
        userIds: mdaUsers.map((u) => u.id),
        link: `/surf-mda/dashboard`,
        metadata: {
          batchId: params.batchId,
          batchCode: params.batchCode,
          planCount: params.planCount,
        },
        sendEmail: params.sendEmail ?? true,
      });
    }
  } catch (error) {
    console.error("Error sending LASG receipt notification:", error);
  }
}

/**
 * Helper function to notify admins when accounts disapproves a batch
 */
export async function notifyAccountsDisapproval(params: {
  batchId: string;
  batchCode: string;
  comment?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "WARNING",
      title: "Batch Disapproved by Accounts",
      message: `Batch ${params.batchCode} was disapproved by Accounts. ${
        params.comment ? `Reason: ${params.comment}` : ""
      }`,
      audience: "GENERAL_ADMINS",
      link: `/surf-restricted/dashboard/cod`,
      metadata: {
        batchId: params.batchId,
        batchCode: params.batchCode,
        comment: params.comment,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending accounts disapproval notification:", error);
  }
}

/**
 * Helper function to notify user when their plan is queried
 */
export async function notifyPlanQueried(params: {
  userId: string;
  planId: string;
  planNumber: string;
  queriedBy: string; // Role name (e.g., "SURCON", "Records I")
  comment?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "WARNING",
      title: "Plan Queried",
      message: `Your plan ${params.planNumber} was queried by ${
        params.queriedBy
      }. ${
        params.comment
          ? `Comment: ${params.comment}`
          : "Please review and resubmit."
      }`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans`,
      metadata: {
        planId: params.planId,
        planNumber: params.planNumber,
        queriedBy: params.queriedBy,
        comment: params.comment,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending plan query notification:", error);
  }
}

/**
 * Helper function to notify user when their plan is approved/lodged
 */
export async function notifyPlanApproved(params: {
  userId: string;
  planId: string;
  planNumber: string;
  batchCode?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SUCCESS",
      title: "Plan Successfully Lodged",
      message: `Congratulations! Your plan ${
        params.planNumber
      } has been successfully lodged. ${
        params.batchCode ? `Batch: ${params.batchCode}` : ""
      }`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans`,
      metadata: {
        planId: params.planId,
        planNumber: params.planNumber,
        batchCode: params.batchCode,
      },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending plan approval notification:", error);
  }
}

/**
 * Helper function for generic MDA approval notifications
 */
export async function notifyMDAApproval(params: {
  planId: string;
  planNumber: string;
  role: string;
  approved: boolean;
  comment?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    // This can be used to notify admins about MDA approvals
    await createNotification({
      type: params.approved ? "SUCCESS" : "WARNING",
      title: `${params.role} ${params.approved ? "Approved" : "Queried"} Plan`,
      message: `Plan ${params.planNumber} was ${
        params.approved ? "approved" : "queried"
      } by ${params.role}. ${params.comment || ""}`,
      audience: "GENERAL_ADMINS",
      link: `/surf-restricted/dashboard/cod`,
      metadata: {
        planId: params.planId,
        planNumber: params.planNumber,
        role: params.role,
        approved: params.approved,
        comment: params.comment,
      },
      sendEmail: params.sendEmail ?? false, // Don't spam admins with every approval
    });
  } catch (error) {
    console.error("Error sending MDA approval notification:", error);
  }
}
