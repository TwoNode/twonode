import { addBaseUrl } from "@/utils/addBaseUrl";
import prisma from "@/lib/prisma";
import { sendNotificationMail } from "@/utils/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { SurfboardNotificationType, SurfboardNotificationAudience, SurfboardRole } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import { paginatedResult } from "@/lib/api/pagination";

/**
 * Migrated from app/(projects)/(surfboard)/actions/notificationActions.ts —
 * a shared-dependency file 4 services (qrEarningsService.ts, planService.ts,
 * remitaVerificationService.ts, batchApprovalService.ts) already import
 * createNotification/notify* directly. notifyBatchSubmitted/notifyMDAApproval
 * were NOT migrated — grep-confirmed dead (zero call sites anywhere).
 *
 * The source's createNotification/getUserNotifications/etc. all called
 * getAuthenticatedSurfUserFromCookie() themselves — meaning every notify*
 * helper (triggered internally by services using the native JWT session, no
 * legacy cookie) silently failed whenever the caller had no legacy cookie
 * session, since the failure was swallowed by each helper's own try/catch.
 * That auth check is dropped entirely here — callers now pass userId/role
 * explicitly, same pattern as every other migrated service this phase.
 */

export type CreateNotificationInput = {
  type: SurfboardNotificationType;
  title: string;
  message: string;
  audience: SurfboardNotificationAudience;
  userIds?: string[];
  link?: string;
  metadata?: any;
  sendEmail?: boolean;
  /** Best-effort WhatsApp copy of the notification — silently a no-op for
   * recipients with no phone on file, or when no provider is configured. */
  sendWhatsApp?: boolean;
  /** Shown as a blocking modal on login (not just the bell dropdown), only
   * while active between startsAt/endsAt — for announcements important
   * enough that a dropdown item could easily be missed. */
  showAsModal?: boolean;
  startsAt?: Date;
  endsAt?: Date;
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

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.surfboardNotification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      audience: input.audience,
      userIds: input.userIds || [],
      link: input.link,
      metadata: input.metadata || {},
      showAsModal: input.showAsModal ?? false,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    },
  });

  if (input.sendEmail) {
    await sendNotificationEmails(notification.id);
  }
  if (input.sendWhatsApp) {
    sendNotificationWhatsApp(notification.id).catch((error) =>
      console.error("Error sending notification WhatsApp messages:", error)
    );
  }

  return { id: notification.id };
}

async function sendNotificationEmails(notificationId: string): Promise<void> {
  try {
    const notification = await prisma.surfboardNotification.findUnique({ where: { id: notificationId } });
    if (!notification) {
      console.error("Notification not found:", notificationId);
      return;
    }

    const recipients = await getNotificationRecipients(notification);
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

async function getNotificationRecipients(notification: {
  audience: SurfboardNotificationAudience;
  userIds: string[];
}): Promise<Array<{ id: string; email: string; firstName: string; lastName: string; phoneNumber: string | null }>> {
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
      break;
  }

  return prisma.surfboardUser.findMany({ where, select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true } });
}

async function sendNotificationWhatsApp(notificationId: string): Promise<void> {
  const notification = await prisma.surfboardNotification.findUnique({ where: { id: notificationId } });
  if (!notification) {
    console.error("Notification not found:", notificationId);
    return;
  }

  const recipients = await getNotificationRecipients(notification);
  const sends = recipients
    .filter((r) => r.phoneNumber)
    .map((r) => sendWhatsAppMessage(r.phoneNumber!, `${notification.title}\n\n${notification.message}`));

  await Promise.allSettled(sends);
}

function generateNotificationEmailHtml(
  notification: { title: string; message: string; type: SurfboardNotificationType; link: string | null },
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
                <tr>
                  <td style="background-color: ${color}; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                      Surfboard Notification
                    </h1>
                  </td>
                </tr>
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
                    ${notification.link
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

export async function getUserNotifications(
  userId: string,
  role: SurfboardRole,
  options?: { includeRead?: boolean; includeDismissed?: boolean; limit?: number }
): Promise<NotificationWithUser[]> {
  const { includeRead = true, includeDismissed = false, limit = 50 } = options || {};

  const where: any = { OR: [{ audience: "ALL_USERS" }, { userIds: { has: userId } }] };
  if (role === "ADMIN" || role === "SUPERADMIN") where.OR.push({ audience: "GENERAL_ADMINS" });
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const notifications = await prisma.surfboardNotification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });

  return notifications
    .map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      audience: notification.audience,
      link: notification.link,
      createdAt: notification.createdAt,
      isRead: notification.readBy.includes(userId),
      isDismissed: notification.dismissedBy.includes(userId),
    }))
    .filter((n) => {
      if (!includeRead && n.isRead) return false;
      if (!includeDismissed && n.isDismissed) return false;
      return true;
    });
}

/**
 * The current active (showAsModal, now between startsAt/endsAt, audience
 * matches this user, not yet dismissed by them) announcement, if any —
 * shown as a blocking modal rather than left in the bell dropdown. Reuses
 * dismissedBy as the "seen" marker so it doesn't reappear every page nav
 * within the same session once acknowledged.
 */
export async function getActiveModalAnnouncement(
  userId: string,
  role: SurfboardRole
): Promise<NotificationWithUser | null> {
  const now = new Date();
  const where: any = {
    showAsModal: true,
    OR: [{ audience: "ALL_USERS" }, { userIds: { has: userId } }],
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
  if (role === "ADMIN" || role === "SUPERADMIN") where.OR.push({ audience: "GENERAL_ADMINS" });
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const notification = await prisma.surfboardNotification.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (!notification || notification.dismissedBy.includes(userId)) return null;

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    audience: notification.audience,
    link: notification.link,
    createdAt: notification.createdAt,
    isRead: notification.readBy.includes(userId),
    isDismissed: false,
  };
}

/**
 * Server-paginated sibling of getUserNotifications, for the admin
 * Notification Management page — kept separate from getUserNotifications
 * (used by NotificationBell.tsx, which expects a plain array and never
 * passes page/pageSize) rather than changing that function's return shape,
 * to avoid breaking the bell's existing consumption. Unlike
 * getUserNotifications, isRead/isDismissed filtering happens IN the Prisma
 * where clause instead of after a fixed-size fetch — filtering post-fetch
 * would make skip/take paginate over the wrong (pre-filter) row count.
 */
export async function getUserNotificationsPaginated(
  userId: string,
  role: SurfboardRole,
  options: {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
    includeRead?: boolean;
    includeDismissed?: boolean;
    type?: SurfboardNotificationType;
    audience?: SurfboardNotificationAudience;
    search?: string;
  }
) {
  const { includeRead = true, includeDismissed = false } = options;

  const audienceOr: any[] = [{ audience: "ALL_USERS" }, { userIds: { has: userId } }];
  if (role === "ADMIN" || role === "SUPERADMIN") audienceOr.push({ audience: "GENERAL_ADMINS" });
  if (role === "SUPERADMIN") audienceOr.push({ audience: "SUPERADMIN" });

  const where: any = { AND: [{ OR: audienceOr }] };
  if (!includeRead) where.AND.push({ NOT: { readBy: { has: userId } } });
  if (!includeDismissed) where.AND.push({ NOT: { dismissedBy: { has: userId } } });
  if (options.type) where.AND.push({ type: options.type });
  if (options.audience) where.AND.push({ audience: options.audience });
  if (options.search) {
    where.AND.push({
      OR: [
        { title: { contains: options.search, mode: "insensitive" } },
        { message: { contains: options.search, mode: "insensitive" } },
      ],
    });
  }

  const [total, notifications] = await Promise.all([
    prisma.surfboardNotification.count({ where }),
    prisma.surfboardNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    }),
  ]);

  const data: NotificationWithUser[] = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    audience: notification.audience,
    link: notification.link,
    createdAt: notification.createdAt,
    isRead: notification.readBy.includes(userId),
    isDismissed: notification.dismissedBy.includes(userId),
  }));

  return paginatedResult(data, total, options.page, options.pageSize);
}

/** Same audience-visibility scoping as getUserNotificationsPaginated, so the admin page's stat cards always agree with what the table can actually show. */
export async function getNotificationStats(userId: string, role: SurfboardRole) {
  const audienceOr: any[] = [{ audience: "ALL_USERS" }, { userIds: { has: userId } }];
  if (role === "ADMIN" || role === "SUPERADMIN") audienceOr.push({ audience: "GENERAL_ADMINS" });
  if (role === "SUPERADMIN") audienceOr.push({ audience: "SUPERADMIN" });
  const baseWhere = { OR: audienceOr };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, unread, sentToday, broadcastToAllUsers] = await Promise.all([
    prisma.surfboardNotification.count({ where: baseWhere }),
    prisma.surfboardNotification.count({ where: { AND: [baseWhere, { NOT: { readBy: { has: userId } } }] } }),
    prisma.surfboardNotification.count({ where: { AND: [baseWhere, { createdAt: { gte: startOfToday } }] } }),
    prisma.surfboardNotification.count({ where: { AND: [baseWhere, { audience: "ALL_USERS" }] } }),
  ]);

  return { total, unread, sentToday, broadcastToAllUsers };
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const notification = await prisma.surfboardNotification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification");

  const readBy = [...new Set([...notification.readBy, userId])];
  await prisma.surfboardNotification.update({ where: { id: notificationId }, data: { readBy } });

  return { success: true };
}

export async function dismissNotification(userId: string, notificationId: string) {
  const notification = await prisma.surfboardNotification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification");

  const dismissedBy = [...new Set([...notification.dismissedBy, userId])];
  await prisma.surfboardNotification.update({ where: { id: notificationId }, data: { dismissedBy } });

  return { success: true };
}

export async function getUnreadNotificationCount(userId: string, role: SurfboardRole) {
  const where: any = {
    OR: [{ audience: "ALL_USERS" }, { userIds: { has: userId } }],
    NOT: [{ readBy: { has: userId } }, { dismissedBy: { has: userId } }],
  };
  if (role === "ADMIN" || role === "SUPERADMIN") where.OR.push({ audience: "GENERAL_ADMINS" });
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const count = await prisma.surfboardNotification.count({ where });
  return { count };
}

/** ADMIN/SUPERADMIN only, enforced by the caller (route-level withAuth). */
export async function deleteNotification(notificationId: string) {
  await prisma.surfboardNotification.delete({ where: { id: notificationId } });
  return { success: true };
}

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
      metadata: { planId: params.planId, planNumber: params.planNumber },
      sendEmail: params.sendEmail,
    });
  } catch (error) {
    console.error("Error sending plan notification:", error);
  }
}

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
      metadata: { planId: params.planId, planNumber: params.planNumber, sharedBy: params.sharedByUser },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending sharing notification:", error);
  }
}

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
      message: `Payment of ₦${params.amount.toLocaleString()} received for batch ${params.batchCode} from ${params.paidBy.firstName} ${params.paidBy.lastName}.`,
      audience: "GENERAL_ADMINS",
      link: `/surfboard-restricted/dashboard/cod/batches`,
      metadata: { batchId: params.batchId, batchCode: params.batchCode, amount: params.amount },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending payment notification:", error);
  }
}

export async function notifyLASGReceiptUploaded(params: {
  batchId: string;
  batchCode: string;
  planCount: number;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    const mdaUsers = await prisma.surfboardUser.findMany({
      where: { role: { in: ["ACCOUNTS", "CHARTING", "SURCON", "RECORDS_I", "RECORDS_II"] }, isActive: true },
      select: { id: true },
    });

    if (mdaUsers.length > 0) {
      await createNotification({
        type: "SYSTEM",
        title: "LASG Receipt Uploaded",
        message: `LASG payment receipt uploaded for batch ${params.batchCode} with ${params.planCount} plan(s). Ready for review.`,
        audience: "SPECIFIC_USERS",
        userIds: mdaUsers.map((u) => u.id),
        link: `/surfboard-mda/dashboard`,
        metadata: { batchId: params.batchId, batchCode: params.batchCode, planCount: params.planCount },
        sendEmail: params.sendEmail ?? true,
      });
    }
  } catch (error) {
    console.error("Error sending LASG receipt notification:", error);
  }
}

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
      message: `Batch ${params.batchCode} was disapproved by Accounts. ${params.comment ? `Reason: ${params.comment}` : ""}`,
      audience: "GENERAL_ADMINS",
      link: `/surfboard-restricted/dashboard/cod/batches`,
      metadata: { batchId: params.batchId, batchCode: params.batchCode, comment: params.comment },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending accounts disapproval notification:", error);
  }
}

export async function notifyPlanQueried(params: {
  userId: string;
  planId: string;
  planNumber: string;
  queriedBy: string;
  comment?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "WARNING",
      title: "Plan Queried",
      message: `Your plan ${params.planNumber} was queried by ${params.queriedBy}. ${params.comment ? `Comment: ${params.comment}` : "Please review and resubmit."}`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans?tab=queried`,
      metadata: { planId: params.planId, planNumber: params.planNumber, queriedBy: params.queriedBy, comment: params.comment },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending plan query notification:", error);
  }
}

export async function notifyConsolidatedQueries(params: {
  userId: string;
  planId: string;
  planNumber: string;
  queries: Array<{ role: string; comment?: string }>;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    const queryList = params.queries.map((q) => `- **${q.role}**: ${q.comment || "Please review."}`).join("\n");

    await createNotification({
      type: "WARNING",
      title: "Plan Queried by MDA",
      message: `Your plan ${params.planNumber} has been queried following MDA review. Please see details below:\n\n${queryList}`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans?tab=queried`,
      metadata: { planId: params.planId, planNumber: params.planNumber, queries: params.queries },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending consolidated query notification:", error);
  }
}

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
      message: `Congratulations! Your plan ${params.planNumber} has been successfully lodged. ${params.batchCode ? `Batch: ${params.batchCode}` : ""}`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans`,
      metadata: { planId: params.planId, planNumber: params.planNumber, batchCode: params.batchCode },
      sendEmail: params.sendEmail ?? true,
      sendWhatsApp: true,
    });
  } catch (error) {
    console.error("Error sending plan approval notification:", error);
  }
}

export async function notifyPlanCreated(params: {
  userId: string;
  planId: string;
  planNumber: string;
  surveyTitle: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SUCCESS",
      title: "Plan Created Successfully",
      message: `Your plan ${params.planNumber} - ${params.surveyTitle} has been created successfully.`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plan?planId=${params.planId}`,
      metadata: { planId: params.planId, planNumber: params.planNumber, surveyTitle: params.surveyTitle },
      sendEmail: params.sendEmail ?? true,
      sendWhatsApp: true,
    });
  } catch (error) {
    console.error("Error sending plan created notification:", error);
  }
}

export async function notifyPlanUpdated(params: {
  userId: string;
  planId: string;
  planNumber: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "INFO",
      title: "Plan Updated",
      message: `Your plan ${params.planNumber} has been updated successfully.`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plan?planId=${params.planId}`,
      metadata: { planId: params.planId, planNumber: params.planNumber },
      sendEmail: params.sendEmail ?? false,
    });
  } catch (error) {
    console.error("Error sending plan updated notification:", error);
  }
}

export async function notifyRecordCopySubmitted(params: {
  userId: string;
  batchId: string;
  batchCode: string;
  planCount: number;
  totalAmount: number;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "INFO",
      title: "Record Copy Batch Submitted",
      message: `Your batch ${params.batchCode} with ${params.planCount} plan(s) has been submitted for processing. Total amount: ₦${params.totalAmount.toLocaleString()}.`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plans`,
      metadata: { batchId: params.batchId, batchCode: params.batchCode, planCount: params.planCount, totalAmount: params.totalAmount },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending record copy submitted notification:", error);
  }
}

export async function notifyReadyForPhysicalSubmission(params: {
  userId: string;
  planId: string;
  planNumber: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    await createNotification({
      type: "SUCCESS",
      title: "Ready for Physical Submission",
      message: `Great news! Your plan ${params.planNumber} has been approved by all reviewing departments. You can now submit the physical record copy to the Office of the State Surveyor General.`,
      audience: "SPECIFIC_USERS",
      userIds: [params.userId],
      link: `/surfboard/dashboard/plan?planId=${params.planId}`,
      metadata: { planId: params.planId, planNumber: params.planNumber },
      sendEmail: params.sendEmail ?? true,
    });
  } catch (error) {
    console.error("Error sending ready for physical submission notification:", error);
  }
}
