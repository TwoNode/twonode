import prisma from "@/lib/prisma";

/**
 * Migrated from app/(projects)/(surfboard)/actions/subscriptionAnalyticsActions.ts
 * — a small dev-only debug widget (SubscriptionAdminFAB.tsx, rendered only
 * when NODE_ENV === "development"), not part of the larger subscriptionActions.ts
 * extraction proxy.ts's getUserAndActiveSub dependency needs.
 */

export async function getSubscriptionAnalytics() {
  const activeCount = await prisma.subscription.count({ where: { status: "active" } });
  const canceledCount = await prisma.subscription.count({ where: { status: "canceled" } });

  const invalidSubscriptions = await prisma.subscription.findMany({
    where: { status: "active", OR: [{ subCode: null }, { emailToken: null }] },
    select: { id: true, userId: true, status: true, subCode: true, emailToken: true },
  });

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const webhookEvents = await prisma.webhookEvent.groupBy({
    by: ["event", "status"],
    where: { receivedAt: { gte: oneDayAgo } },
    _count: true,
  });

  return {
    activeCount,
    canceledCount,
    invalidSubscriptions,
    recentWebhookEvents: webhookEvents.map((event) => ({ event: event.event, status: event.status, count: event._count })),
  };
}

/** Self-service — clears the caller's own subscription. Debug-tool only, mirrors clearUserSubscription in subscriptionActions.ts. */
export async function clearUserSubscription(userId: string) {
  await prisma.subscriptionHistory.deleteMany({ where: { userId } });
  const deleted = await prisma.subscription.deleteMany({ where: { userId } });
  return { deletedCount: deleted.count };
}
