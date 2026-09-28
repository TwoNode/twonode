import prisma from "@/lib/prisma";
import { SUBSCRIPTION_PLANS, type PlanId } from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import { computePeriodPerTimestamp } from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { getOrCreatePaystackPlan } from "@/surfboard/services/paystackSubscriptionService";

/**
 * Migrated from app/(projects)/(surfboard)/actions/subscriptionActions.ts.
 * cancelSubscription/isUserSubscribed/listSubscriptionHistory were NOT
 * migrated — grep-confirmed dead (zero consumers repo-wide). clearUserSubscription
 * already has its own migrated copy in subscriptionAnalyticsService.ts (the
 * dev-only debug widget it backs), not duplicated here.
 *
 * Note: proxy.ts middleware imports getUserAndActiveSub from the source
 * file but never actually calls it (grep-confirmed) — a dead import, not a
 * real middleware dependency. No proxy.ts-safe extraction was needed.
 */

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

function isSubActiveOrGrace(status: string | null | undefined, expiresAt: Date | null) {
  const isValid = expiresAt ? new Date() <= new Date(expiresAt.getTime() + GRACE_PERIOD_MS) : true;
  const isActive = (status === "active" || status === "past_due") && isValid;
  const isCancelledButValid = status === "canceled" && isValid;
  return isActive || isCancelledButValid;
}

/**
 * Prisma `where` shape for the same "really active" rule as
 * isSubActiveOrGrace above, for callers that need a COUNT rather than a
 * single row (e.g. adminUserService.getUserStats' "Active Subscriptions"
 * card) — a raw `status: "active"` filter would count rows whose
 * `currentEnd` has already passed but were never flipped to "expired",
 * silently drifting from what getUserActiveSubscription (and therefore
 * proxy.ts's real subscription gate) considers active.
 */
export function activeSubscriptionWhereClause(now: Date = new Date()) {
  return {
    status: { in: ["active", "past_due", "canceled"] },
    OR: [{ currentEnd: null }, { currentEnd: { gte: new Date(now.getTime() - GRACE_PERIOD_MS) } }],
  };
}

export async function getUserActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return null;

  const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;
  if (!isSubActiveOrGrace(sub.status, currentEnd)) return null;

  return sub;
}

export async function getUserAndActiveSub(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { subscription: null };

  const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;
  if (!isSubActiveOrGrace(sub.status, currentEnd)) return { subscription: null };

  return { subscription: sub };
}

export async function createOrUpdateSubscription({
  userId,
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
  provider = "paystack",
}: {
  userId: string;
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
  /** "paystack" (default, recurring — has a real Paystack subscription object) or "paystack_onetime" (one-off payment, no auto-renew, no subscription object to look up/disable). */
  provider?: string;
}) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new Error("Invalid subscription plan");

  const isLive = process.env.NODE_ENV === "production";
  const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

  const now = new Date();
  const paidDate = paidAt ? new Date(paidAt) : now;

  const { currentStart, currentEnd, nextCharge } = computePeriodPerTimestamp(plan.interval, paidDate);
  const _nextPaymentDate = nextPaymentDate ? new Date(nextPaymentDate) : nextCharge;

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      status,
      provider,
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
      provider,
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

  const historyExists = await prisma.subscriptionHistory.findFirst({
    where: { userId, reference, eventType: "subscription.create" },
  });

  if (!historyExists && !skipHistory) {
    await prisma.subscriptionHistory.create({
      data: {
        userId,
        reference,
        planCode: plan.plan_code,
        planName: plan.name,
        amount: plan.amount * 100,
        interval: plan.interval,
        status: "active",
        eventType: "subscription.create",
        startDate: currentStart,
        endDate: currentEnd,
        lastPaymentDate: paidDate,
      },
    });
  }

  return sub;
}
