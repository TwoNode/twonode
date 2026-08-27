import prisma from "@/lib/prisma";
import { NotificationAudience, NotificationType, Role } from "@/prisma/generated";
import { sendEmailToAdmin } from "@/utils/email";
// sendEmailToAllAdmins still lives in adminDbActions.ts today — the
// consolidation into utils/email.ts (resolved decision, see the Phase 3
// spec) happens when reportService.ts/adminUserService.ts are built, not
// here, to keep this commit's scope to propertyRequestService/paymentService.
import { sendEmailToAllAdmins } from "@/app/(projects)/reva-restricted/actions/adminDbActions";

/**
 * Migrated from revaActions.ts's notification CRUD + trigger functions.
 * Not in the plan's original 3-service split (propertyRequestService/
 * paymentService/reportService) — REVA's notification system is
 * substantial enough (7 CRUD functions + 4 triggers) to warrant its own
 * service rather than being folded into whichever caller happens to fire
 * first. testNotificationAccessControl/testNotificationCreation (dev-only,
 * zero route call sites in the source) are not migrated, same treatment
 * as Surfboard's deleteAllBatches.
 */

export interface NotificationCreateInput {
  type: NotificationType;
  title: string;
  message: string;
  userIds?: string[];
  audience?: NotificationAudience;
  link?: string;
  metadata?: unknown;
}

export async function createNotification(data: NotificationCreateInput) {
  return prisma.notification.create({
    data: {
      type: data.type,
      title: data.title,
      message: data.message,
      userIds: data.userIds || [],
      audience: data.audience || NotificationAudience.SPECIFIC_USERS,
      link: data.link,
      metadata: data.metadata as any,
    },
  });
}

/** For USER role, GENERAL_USERS notifications are intentionally excluded — matches the source's own commented-out note on this exact asymmetry. */
export async function getUserNotifications(userId: string, role: Role) {
  const conditions: any[] = [{ userIds: { has: userId } }];

  if (role === Role.SUPERADMIN) {
    conditions.push(
      { audience: NotificationAudience.SUPERADMIN },
      { audience: NotificationAudience.GENERAL_ADMINS },
      { audience: NotificationAudience.ALL_USERS }
    );
  } else if (role === Role.ADMIN) {
    conditions.push(
      { audience: NotificationAudience.GENERAL_ADMINS },
      { audience: NotificationAudience.ALL_USERS }
    );
  }

  return prisma.notification.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminNotifications() {
  return prisma.notification.findMany({
    where: {
      OR: [
        { audience: NotificationAudience.GENERAL_ADMINS },
        { audience: NotificationAudience.ALL_USERS },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSuperAdminNotifications() {
  return prisma.notification.findMany({
    where: {
      OR: [
        { audience: NotificationAudience.SUPERADMIN },
        { audience: NotificationAudience.GENERAL_ADMINS },
        { audience: NotificationAudience.ALL_USERS },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) return null;

  const readBy = notification.readBy.includes(userId) ? notification.readBy : [...notification.readBy, userId];
  return prisma.notification.update({ where: { id: notificationId }, data: { readBy } });
}

export async function dismissNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) return null;

  const dismissedBy = notification.dismissedBy.includes(userId)
    ? notification.dismissedBy
    : [...notification.dismissedBy, userId];
  return prisma.notification.update({ where: { id: notificationId }, data: { dismissedBy } });
}

export async function getUnreadNotificationCount(userId: string, role: Role) {
  const notifications = await getUserNotifications(userId, role);
  return notifications.filter((n) => !n.readBy.includes(userId) && !n.dismissedBy.includes(userId)).length;
}

// ===== Notification triggers =====

export async function notifyNewPropertyRequest(propertyData: any, userId?: string) {
  const isOneTimeRequest = !!propertyData?.requester;
  let requesterName = propertyData?.requester || propertyData?.email || "Unknown";

  if (!isOneTimeRequest && propertyData?.userId) {
    const user = await prisma.revaUser.findUnique({
      where: { id: propertyData.userId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (user) requesterName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  await createNotification({
    type: "PROPERTY" as NotificationType,
    title: `New ${isOneTimeRequest ? "OneTime " : ""}Property Request`,
    message: `New due diligence request received for ${propertyData.address}`,
    link: `/reva-restricted/dashboard/viewdetails?reference=${propertyData.reference}`,
    audience: NotificationAudience.GENERAL_ADMINS,
    metadata: {
      propertyReference: propertyData.reference,
      address: propertyData.address,
      requester: requesterName,
      oneTimeRequest: isOneTimeRequest,
    },
  });

  if (userId) {
    await createNotification({
      type: "SUCCESS" as NotificationType,
      title: "Request Submitted Successfully",
      message: `Your due diligence request for ${propertyData.address} has been submitted and is being processed.`,
      userIds: [userId],
      link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
      metadata: { propertyReference: propertyData.reference, address: propertyData.address, oneTimeRequest: isOneTimeRequest },
    });
  }

  try {
    await sendEmailToAllAdmins({
      subject: `New ${isOneTimeRequest ? "OneTime " : ""}Property Request`,
      text: `New due diligence request received for ${propertyData.address}`,
      html: `<h3>New ${isOneTimeRequest ? "OneTime " : ""}Property Request</h3><p>A new due diligence request has been received:</p><ul><li>Property: ${propertyData.address}</li><li>Reference: ${propertyData.reference}</li><li>Requester: ${requesterName}</li></ul><p>Please review this request in the admin dashboard.</p>`,
    });
  } catch (emailError) {
    console.error("Error sending emails to admins:", emailError);
    if (process.env.ADMIN_EMAIL) {
      await sendEmailToAdmin({
        to: process.env.ADMIN_EMAIL,
        subject: `New ${isOneTimeRequest ? "OneTime " : ""}Property Request`,
        text: `New due diligence request received for ${propertyData.address}`,
        html: `<h3>New ${isOneTimeRequest ? "OneTime " : ""}Property Request</h3><p>A new due diligence request has been received:</p><ul><li>Property: ${propertyData.address}</li><li>Reference: ${propertyData.reference}</li><li>Requester: ${requesterName}</li></ul>`,
      });
    }
  }
}

export async function notifyPaymentReceived(propertyData: any, userId?: string) {
  await createNotification({
    type: "PAYMENT" as NotificationType,
    title: "Payment Received",
    message: `Payment of ₦${propertyData.totalCost?.toLocaleString()} received for property ${propertyData.reference}`,
    link: `/reva-restricted/dashboard/viewdetails?reference=${propertyData.reference}`,
    audience: NotificationAudience.GENERAL_ADMINS,
    metadata: { propertyReference: propertyData.reference, amount: propertyData.totalCost, address: propertyData.address },
  });

  if (userId) {
    await createNotification({
      type: "SUCCESS" as NotificationType,
      title: "Payment Confirmed",
      message: `Your payment of ₦${propertyData.totalCost?.toLocaleString()} for property ${propertyData.reference} has been confirmed.`,
      userIds: [userId],
      link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
      metadata: { propertyReference: propertyData.reference, amount: propertyData.totalCost },
    });
  }
}

/**
 * OneTimeUserProperty branch built for real here (resolved open question —
 * the source had this entirely commented out, since a guest has no user.id
 * to key a Notification off of). Uses the guest's email as the `userIds`
 * entry instead — Notification.userIds is a plain String[] with no FK
 * constraint, so this is a legitimate, if unconventional, identity key, and
 * is exactly what the source's own commented-out sketch had started to do.
 * Also echoes to admins via notifySystemAlert, mirroring the parallel
 * regular-Property path's notifyReportReady + notifySystemAlert pair.
 */
export async function notifyReportReady(propertyData: any, userId?: string) {
  const isOneTimeRequest = !!propertyData?.requester;

  if (userId && !isOneTimeRequest) {
    await createNotification({
      type: "SUCCESS" as NotificationType,
      title: "Report Ready",
      message: `Your due diligence report for property ${propertyData.reference} is now available.`,
      userIds: [userId],
      link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
      metadata: { propertyReference: propertyData.reference, address: propertyData.address, oneTimeRequest: false },
    });
  } else if (isOneTimeRequest && propertyData?.email) {
    await createNotification({
      type: "SUCCESS" as NotificationType,
      title: "OneTime Report Ready",
      message: `Your OneTime due diligence report for property ${propertyData.reference} is now available.`,
      audience: NotificationAudience.SPECIFIC_USERS,
      userIds: [propertyData.email],
      link: `/reva/onetimerequest?reference=${propertyData.reference}&email=${encodeURIComponent(propertyData.email)}`,
      metadata: {
        propertyReference: propertyData.reference,
        address: propertyData.address,
        oneTimeRequest: true,
        email: propertyData.email,
      },
    });

    await notifySystemAlert(
      "OneTime Report Approved",
      `The due diligence report for OneTime request ${propertyData.reference} (${propertyData.address}) was approved and the requester notified.`
    );
  }
}

export async function notifySystemAlert(title: string, message: string, userIds?: string[]) {
  await createNotification({
    type: "SYSTEM" as NotificationType,
    title,
    message,
    userIds,
    audience: userIds?.length ? NotificationAudience.SPECIFIC_USERS : NotificationAudience.ALL_USERS,
  });
}
