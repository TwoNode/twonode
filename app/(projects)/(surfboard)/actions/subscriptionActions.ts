"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { revalidatePath } from "next/cache";
import { SUBSCRIPTION_PLANS, type PlanId } from "../utils/paystackSubscription";
import { getAndRefreshUserSession } from "@/utils/encryptedCookies";
import { getOrCreatePaystackPlan } from "./paystackActions";
import { computePeriodPerTimestamp } from "../utils/computePeriod";

export async function getUserActiveSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) return null;

    // Check if user object already has an active subscription from the session
    const userSub = user.subscription;
    if (userSub) {
      const isActive =
        userSub.status === "active" || userSub.status === "past_due";
      const isCancelledButValid =
        userSub.status === "canceled" &&
        userSub.expiresAt &&
        new Date(userSub.expiresAt) >= new Date();

      if (isActive || isCancelledButValid) {
        // Return subscription from session, no need for DB call
        return {
          status: userSub.status,
          interval: userSub.interval,
          currentEnd: userSub.expiresAt ? new Date(userSub.expiresAt) : null,
          subCode: userSub.subCode,
          planCode: userSub.planCode,
          emailToken: userSub.emailToken,
          user,
        };
      }
    }

    // Fallback to database call if no valid subscription in session
    const sub = await prisma.subscription.findUnique({
      where: {
        userId: user.id,
        OR: [
          { status: "active" },
          {
            // Include cancelled subscriptions still in grace period
            AND: [{ status: "canceled" }, { currentEnd: { gte: new Date() } }],
          },
        ],
      },
    });

    // Refresh session with updated subscription data from DB
    await getAndRefreshUserSession(undefined, true);

    return { ...sub, user };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}

export async function getUserAndActiveSub() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) return null;

    // Check if user object already has an active subscription from the session
    const userSub = user.subscription;
    if (userSub) {
      const isActive =
        userSub.status === "active" || userSub.status === "past_due";
      const isCancelledButValid =
        userSub.status === "canceled" &&
        userSub.expiresAt &&
        new Date(userSub.expiresAt) >= new Date();

      if (isActive || isCancelledButValid) {
        // Return subscription from session, no need for DB call
        return {
          subscription: {
            status: userSub.status,
            interval: userSub.interval,
            currentEnd: userSub.expiresAt ? new Date(userSub.expiresAt) : null,
            subCode: userSub.subCode,
            planCode: userSub.planCode,
            emailToken: userSub.emailToken,
          },
          user,
        };
      }
    }

    // Fallback to database call if no valid subscription in session
    try {
      const sub = await prisma.subscription.findUnique({
        where: {
          userId: user.id,
          OR: [
            { status: "active" },
            {
              // Include cancelled subscriptions still in grace period
              AND: [
                { status: "canceled" },
                { currentEnd: { gte: new Date() } },
              ],
            },
          ],
        },
      });

      // Refresh session with updated subscription data from DB
      await getAndRefreshUserSession(undefined, true);

      return { subscription: sub, user };
    } catch (error) {
      return { subscription: null, user };
    }
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}

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
  skipHistory,
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
  skipHistory?: boolean;
}) {
  try {
    const session = await getAndRefreshUserSession();
    const userId = session?.userData?.userId;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const selectedPlan = SUBSCRIPTION_PLANS[planId];
    if (!selectedPlan) {
      throw new Error("Invalid subscription plan");
    }

    const isLive = process.env.NODE_ENV === "production";

    const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

    const now = new Date();
    const paidDate = paidAt ? new Date(paidAt) : now;

    // Calculate subscription period
    const { currentStart, currentEnd, nextCharge } = computePeriodPerTimestamp(
      plan.interval,
      paidDate
    );

    const _nextPaymentDate = nextPaymentDate
      ? new Date(nextPaymentDate)
      : nextCharge;

    console.log("My Plan", plan);
    // Upsert subscription
    const sub = await prisma.subscription.upsert({
      where: { userId },
      update: {
        status,
        planCode: plan.plan_code,
        planName: plan.name,
        interval: plan.interval,
        amount: plan.amount,
        currency: "NGN",
        customerCode,
        customerId,
        authorization,
        emailToken,
        subCode: subCode || undefined,
        currentStart,
        currentEnd,
        nextPaymentDate: _nextPaymentDate,
        cancelledAt: status === "canceled" ? now : null,
        updatedAt: now,
      },
      create: {
        userId,
        subCode: subCode || "",
        planCode: plan.plan_code,
        planName: plan.name,
        interval: plan.interval,
        amount: plan.amount,
        status,
        currency: plan.currency,
        customerCode,
        customerId,
        authorization,
        emailToken,
        currentStart,
        currentEnd,
        nextPaymentDate: _nextPaymentDate,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Create history entry if it doesn't exist
    const historyExists = await prisma.subscriptionHistory.findFirst({
      where: {
        userId,
        reference,
        eventType: "subscription.create",
      },
    });

    if (!historyExists && !skipHistory) {
      await prisma.subscriptionHistory.create({
        data: {
          userId,
          reference,
          planCode: plan.plan_code,
          planName: plan.name,
          amount: plan.amount * 100, // Convert to Kobo
          interval: plan.interval,
          status: "active",
          eventType: "subscription.create",
          startDate: currentStart,
          endDate: currentEnd,
          lastPaymentDate: paidDate,
        },
      });
    }

    console.log("My Subscriptioon", sub);

    revalidatePath("/surfboard/dashboard/subscription");
    return sub;
  } catch (error) {
    console.error("Error creating or updating subscription:", error);
    throw error;
  }
}

export async function cancelSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // Get current subscription to check for subCode
    const currentSub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!currentSub) throw new Error("No subscription found");

    if (!currentSub.subCode) {
      // Possible "zombie" state - active locally but missing link to Paystack
      // Attempt to fetch from Paystack using email just in case
      // For now, we abort to prevent giving false hope of cancellation
      throw new Error(
        "Subscription synchronization pending. Please try again in a few minutes or contact support."
      );
    }

    const sub = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: "canceled",
        cancelledAt: new Date(),
        nextPaymentDate: null,
      },
    });

    await getAndRefreshUserSession(undefined, true);

    revalidatePath("/surfboard/dashboard/subscription");
    return sub;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

export async function isUserSubscribed(): Promise<boolean> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return false;
    }

    // Check user object first
    if (user?.subscription?.status === "active") return true;
    if (user?.subscription?.status === "past_due") return true;

    // Check database
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["active", "past_due"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!sub) return false;

    // Check if within valid period (with grace period)
    const now = new Date();
    const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;

    if (!currentEnd) return false;

    // 1-day grace period
    const gracePeriodMs = 24 * 60 * 60 * 1000;
    const endDateWithGrace = new Date(currentEnd.getTime() + gracePeriodMs);

    return now <= endDateWithGrace;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

export async function listSubscriptionHistory(userId: string) {
  return prisma.subscriptionHistory.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: 50,
  });
}

/**
 * DANGER: Permanently deletes all subscription data for current user
 */
export async function clearUserSubscription() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Delete history first (foreign key constraint)
    await prisma.subscriptionHistory.deleteMany({
      where: { userId: user.id },
    });

    // Delete subscription
    const deleted = await prisma.subscription.deleteMany({
      where: { userId: user.id },
    });

    revalidatePath("/surfboard/dashboard/subscription");

    await getAndRefreshUserSession(undefined, true);

    return {
      success: true,
      message: "Subscription cleared successfully",
      deletedCount: deleted.count,
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
