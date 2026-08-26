"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/surfboard/utils/surfAuth";

type SubscriptionAnalytics = {
  activeCount: number;
  canceledCount: number;
  invalidSubscriptions: Array<{
    id: string;
    userId: string;
    status: string;
    subCode: string | null;
    emailToken: string | null;
  }>;
  recentWebhookEvents: Array<{
    event: string;
    status: string;
    count: number;
  }>;
};

export async function getSubscriptionAnalytics(): Promise<{
  data?: SubscriptionAnalytics;
  error?: string;
}> {
  try {
    // Check if user is admin (you might want to implement proper admin check)
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get active subscriptions count
    const activeCount = await prisma.subscription.count({
      where: { status: "active" },
    });

    // Get canceled subscriptions count
    const canceledCount = await prisma.subscription.count({
      where: { status: "canceled" },
    });

    // Get subscriptions with missing critical data
    const invalidSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "active",
        OR: [{ subCode: null }, { emailToken: null }],
      },
      select: {
        id: true,
        userId: true,
        status: true,
        subCode: true,
        emailToken: true,
      },
    });

    // Get recent webhook events (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const webhookEvents = await prisma.webhookEvent.groupBy({
      by: ["event", "status"],
      where: {
        receivedAt: {
          gte: oneDayAgo,
        },
      },
      _count: true,
    });

    const recentWebhookEvents = webhookEvents.map((event) => ({
      event: event.event,
      status: event.status,
      count: event._count,
    }));

    return {
      data: {
        activeCount,
        canceledCount,
        invalidSubscriptions,
        recentWebhookEvents,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription analytics:", error);
    return { error: "Failed to fetch subscription analytics" };
  }
}
