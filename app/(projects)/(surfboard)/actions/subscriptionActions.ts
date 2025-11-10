"use server";

// ────────────────────────────────────────────────────────────────────────────────
// File: app/(projects)/(surfboard)/actions/subscriptionActions.ts
// Purpose: Prisma helpers for `Subscription` + `SubscriptionHistory` with history alignment
// ────────────────────────────────────────────────────────────────────────────────

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { revalidatePath } from "next/cache";
import { SUBSCRIPTION_PLANS, type PlanId } from "../utils/paystackSubscription";
import { getAndRefreshUserSession } from "@/utils/encryptedCookies";

export async function getUserActiveSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) return null;

    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: "active" }, // prioritize active subscription
      orderBy: { createdAt: "desc" },
    });

    return sub;
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}

// This function is now primarily called from the webhook after a subscription is confirmed.
export async function createOrUpdateSubscription({
  planId,
  reference,
  subCode,
  customerCode,
  customerId,
  authorization,
  emailToken,
  paidAt,
  nextPaymentDate,
  status = "active",
}: {
  planId: PlanId;
  reference: string;
  subCode?: string;
  customerCode: string;
  customerId: string;
  authorization: string;
  emailToken: string;
  status?: string;
  paidAt?: string | Date;
  nextPaymentDate?: string | Date;
}) {
  try {
    const session = await getAndRefreshUserSession();
    const user = session?.userData;
    const userId = user?.userId;
    if (!userId) throw new Error("User not authenticated");

    const plan = SUBSCRIPTION_PLANS[planId];
    const { s, e, c } = computePeriod(plan.interval, paidAt);

    // Upsert main subscri

    if (!plan) throw new Error("Invalid subscription plan");

    const now = new Date();

    let _nextPaymentDate = nextPaymentDate || c;

    const sub = await prisma.subscription.upsert({
      where: { userId },
      update: {
        status,
        planCode: plan.planCode,
        planName: plan.name,
        interval: plan.interval,
        amount: plan.price * 100,
        currency: "NGN",
        customerCode,
        customerId,
        authorization,
        emailToken,
        nextPaymentDate: _nextPaymentDate,
      },
      create: {
        userId,
        subCode: subCode || "",
        planCode: plan.planCode,
        planName: plan.name,
        interval: plan.interval,
        amount: plan.price * 100,
        status,
        customerCode,
        customerId,
        authorization,
        emailToken,
        currentStart: now,
        currentEnd: _nextPaymentDate,
        nextPaymentDate: _nextPaymentDate,
      },
    });

    // Append a history row for the initial successful charge (if not already there)
    const exists = await prisma.subscriptionHistory.findFirst({
      where: {
        userId,
        eventType: "subscription.success",
        startDate: paidAt,
      },
    });

    if (!exists) {
      await prisma.subscriptionHistory.create({
        data: {
          userId,
          reference,
          planCode: plan.planCode,
          planName: plan.name,
          amount: plan.price * 100, // kobo
          interval: plan.interval,
          lastPaymentDate: paidAt,
          startDate: paidAt,
          endDate: e,
          status: "active",
          eventType: "subscription.success",
        },
      });
    }

    revalidatePath("/surfboard/dashboard/subscription");
    return sub;
  } catch (error) {
    console.error("Error creating or updating subscription:", error);
    return null;
  }
}

export async function cancelSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    const userId = user?.userId;
    if (!userId) throw new Error("User not authenticated");

    const sub = await prisma.subscription.update({
      where: { userId },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    revalidatePath("/surfboard/dashboard/subscription");
    return sub;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return null;
  }
}

export async function isUserSubscribed(): Promise<boolean> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user) {
      console.log("User not authenticated for Subscription");
      return false;
    }

    // First check if user has an active subscription from the user object
    if (user?.subscription?.status === "active") return true;
    if (user?.subscription?.status === "past_due") return true;

    // If not in user object, check the database
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["active", "past_due"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!sub) {
      console.log("No active subscription found for user");
      return false;
    }

    // Check if subscription is still within the valid period
    const now = new Date();
    const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;

    // Add a 1-day grace period for subscription end
    const gracePeriod = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const endDateWithGrace = currentEnd
      ? new Date(currentEnd.getTime() + gracePeriod)
      : null;

    return endDateWithGrace ? now <= endDateWithGrace : false;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Computes the subscription period based on interval and reference date
 * @param interval - The subscription interval (monthly, quarterly, annually)
 * @param _ref - Optional reference date (defaults to current time)
 * @returns Object containing start (s), end (e), and next charge date (c)
 */
function computePeriod(
  interval: "monthly" | "quarterly" | "annually",
  _ref?: string | Date
) {
  const timeZone = "Africa/Lagos"; // Default timezone, consider making this configurable
  const now = _ref ? new Date(_ref) : new Date();

  // Create Intl.DateTimeFormat instance for consistent timezone handling
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  // Helper to get start of day in the specified timezone
  const startOfDay = (date: Date) => {
    const [year, month, day] = formatter
      .formatToParts(date)
      .filter(
        (part) =>
          part.type === "year" || part.type === "month" || part.type === "day"
      )
      .map((part) => parseInt(part.value));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  };

  // Helper to get end of day in the specified timezone
  const endOfDay = (date: Date) => {
    const [year, month, day] = formatter
      .formatToParts(date)
      .filter(
        (part) =>
          part.type === "year" || part.type === "month" || part.type === "day"
      )
      .map((part) => parseInt(part.value));
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  };

  const start = startOfDay(now);

  if (interval === "monthly") {
    const end = endOfDay(
      new Date(start.getFullYear(), start.getMonth() + 1, 0)
    );
    return {
      s: start,
      e: end,
      c: startOfDay(new Date(end.getFullYear(), end.getMonth() + 1, 1)),
    };
  }

  if (interval === "quarterly") {
    const quarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
    const endOfQuarter = endOfDay(
      new Date(now.getFullYear(), (quarter + 1) * 3, 0)
    );

    return {
      s: startOfQuarter,
      e: endOfQuarter,
      c: startOfDay(
        new Date(endOfQuarter.getFullYear(), endOfQuarter.getMonth() + 1, 1)
      ),
    };
  }

  // Annually
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = endOfDay(new Date(now.getFullYear(), 11, 31));

  return {
    s: startOfYear,
    e: endOfYear,
    c: startOfDay(new Date(now.getFullYear() + 1, 0, 1)),
  };
}

export async function listSubscriptionHistory(userId: string) {
  return prisma.subscriptionHistory.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: 50,
  });
}

/**
 * Clears the current user's subscription from the database
 * WARNING: This is a destructive action that permanently deletes subscription data
 * Use with caution, especially in production environments
 */
export async function clearUserSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    const userId = user?.userId;

    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Delete subscription history first (due to foreign key constraints)
    await prisma.subscriptionHistory.deleteMany({
      where: { userId },
    });

    // Delete the main subscription record
    const deletedSubscription = await prisma.subscription.deleteMany({
      where: { userId },
    });

    // Revalidate the subscription page to reflect changes
    revalidatePath("/surfboard/dashboard/subscription");

    return {
      success: true,
      message: "Subscription cleared successfully",
      deletedCount: deletedSubscription.count,
    };
  } catch (error) {
    console.error("Error clearing subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to clear subscription",
    };
  }
}
