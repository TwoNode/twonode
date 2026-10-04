import prisma from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  type PlanId,
} from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import {
  computeExtendedPeriod,
  type SubscriptionInterval,
} from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { getOrCreatePaystackPlan } from "@/surfboard/services/paystackSubscriptionService";
import { ApiError, SubscriptionRequiredError } from "@/lib/api/errors";

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

/** Exported for bulk classification (e.g. analyticsService's sharedAccessStats) — getUserActiveSubscription/getUserAndActiveSub apply this same rule one row at a time via findUnique. */
export function isSubActiveOrGrace(
  status: string | null | undefined,
  expiresAt: Date | null
) {
  const isValid = expiresAt
    ? new Date() <= new Date(expiresAt.getTime() + GRACE_PERIOD_MS)
    : true;
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
    OR: [
      { currentEnd: null },
      { currentEnd: { gte: new Date(now.getTime() - GRACE_PERIOD_MS) } },
    ],
  };
}

export async function getUserActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return null;

  const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;
  if (!isSubActiveOrGrace(sub.status, currentEnd)) return null;

  return sub;
}

/**
 * Server-side gate for capability-only actions (create/edit/share plans, QR
 * create/withdraw) — per the "Shared Access" vision (subscription determines
 * capability, access determines visibility), read paths must NOT call this;
 * only actions that create/change content should. proxy.ts's middleware gate
 * covers most of these at the page level already, but this is the actual
 * enforcement a direct API call can't bypass.
 */
export async function requireActiveSubscription(userId: string): Promise<void> {
  const sub = await getUserActiveSubscription(userId);
  if (!sub) throw new SubscriptionRequiredError();
}

export async function getUserAndActiveSub(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { subscription: null };

  const currentEnd = sub.currentEnd ? new Date(sub.currentEnd) : null;
  if (!isSubActiveOrGrace(sub.status, currentEnd))
    return { subscription: null };

  return { subscription: sub };
}

/** What the history ledger calls a payment that bought time. Both are matched when looking for "has this payment already been applied?". */
export type PaymentEventType = "subscription.create" | "subscription.success";
const PAYMENT_EVENT_TYPES: PaymentEventType[] = [
  "subscription.create",
  "subscription.success",
];

export type PaymentRowFields = {
  provider?: string;
  status: string;
  planCode?: string;
  planName?: string;
  interval?: string;
  /** Kobo. */
  amountKobo?: number;
  currency?: string;
  email?: string | null;
  customerCode?: string | null;
  customerId?: string | null;
  authorization?: string | null;
  emailToken?: string | null;
  subCode?: string | null;
  /** What Paystack says the next charge is; defaults to the end of the period bought. */
  nextPaymentDate?: Date | null;
};

export type ApplyPaymentResult = {
  status: "applied" | "already_applied" | "used_by_another_account";
  subscription: Awaited<ReturnType<typeof prisma.subscription.upsert>> | null;
};

/**
 * THE one place a payment buys subscription time. Every path that credits a
 * payment — the client's verify call, the Paystack webhook for a renewal, a
 * one-time payment — goes through here, so they all behave the same:
 *
 * - **Purchases add.** The period is computeExtendedPeriod's: a payment made
 *   while paid time remains starts when that time ends instead of replacing
 *   it, so no paid days are lost (whoever pays, whenever).
 * - **A payment is applied at most once.** Its Paystack `reference` is the
 *   key, recorded in SubscriptionHistory (the ledger). The verify call and the
 *   webhook both fire for the same payment, and with additive periods a
 *   second application would double-credit, so a reference already in the
 *   ledger is a no-op for the same user and refused for another one.
 * - **Concurrent payments can't corrupt each other.** One transaction holds
 *   an advisory lock on the reference (the two paths for ONE payment run
 *   one after the other, the second seeing the first's ledger row) and on the
 *   user (two DIFFERENT payments for one account can't both read the same
 *   `currentEnd` and each extend from it). Locks are taken in that fixed
 *   order, so they can't deadlock.
 */
export async function applyPaymentPeriod(args: {
  userId: string;
  reference: string;
  eventType: PaymentEventType;
  paidAt: Date;
  /** The interval that decides how much time this payment buys. */
  periodInterval: SubscriptionInterval;
  row: PaymentRowFields;
}): Promise<ApplyPaymentResult> {
  const { userId, reference, eventType, periodInterval, row } = args;
  const paidAt = Number.isNaN(args.paidAt.getTime()) ? new Date() : args.paidAt;

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-payment-ref:${reference}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-payment-user:${userId}`}))`;

      const prior = await tx.subscriptionHistory.findFirst({
        where: { reference, eventType: { in: PAYMENT_EVENT_TYPES } },
        select: { userId: true },
      });
      if (prior && prior.userId !== userId) {
        return { status: "used_by_another_account", subscription: null };
      }
      if (prior) {
        const subscription = await tx.subscription.findUnique({
          where: { userId },
        });
        return { status: "already_applied", subscription };
      }

      const existing = await tx.subscription.findUnique({ where: { userId } });
      const period = computeExtendedPeriod(periodInterval, paidAt, existing);
      const now = new Date();
      const nextPaymentDate = row.nextPaymentDate ?? period.nextCharge;

      const subscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          status: row.status,
          provider: row.provider,
          planCode: row.planCode,
          planName: row.planName,
          interval: row.interval,
          amount: row.amountKobo,
          currency: row.currency,
          email: row.email ?? undefined,
          customerCode: row.customerCode ?? undefined,
          customerId: row.customerId ?? undefined,
          authorization: row.authorization ?? undefined,
          emailToken: row.emailToken ?? undefined,
          subCode: row.subCode || undefined,
          currentStart: period.currentStart,
          currentEnd: period.currentEnd,
          nextPaymentDate,
          cancelledAt: row.status === "canceled" ? now : null,
          updatedAt: now,
        },
        create: {
          userId,
          provider: row.provider ?? "paystack",
          email: row.email ?? null,
          subCode: row.subCode || "",
          planCode: row.planCode ?? "",
          planName: row.planName ?? "",
          interval: row.interval ?? periodInterval,
          amount: row.amountKobo ?? 0,
          status: row.status,
          currency: row.currency ?? "NGN",
          customerCode: row.customerCode ?? null,
          customerId: row.customerId ?? null,
          authorization: row.authorization ?? null,
          emailToken: row.emailToken ?? null,
          currentStart: period.currentStart,
          currentEnd: period.currentEnd,
          nextPaymentDate,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          userId,
          reference,
          planCode: subscription.planCode,
          planName: subscription.planName,
          amount: row.amountKobo ?? subscription.amount,
          interval: subscription.interval,
          status: "active",
          eventType,
          startDate: period.windowStart,
          endDate: period.currentEnd,
          lastPaymentDate: paidAt,
        },
      });

      return { status: "applied", subscription };
    },
    // Two lock waits plus a handful of queries; Prisma's 5s default is tight
    // when a verify call and a webhook for the same payment queue behind each
    // other.
    { maxWait: 10_000, timeout: 20_000 }
  ) as Promise<ApplyPaymentResult>;
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
  /** @deprecated Ignored. The ledger row is what makes a payment apply once; it is no longer optional. */
  skipHistory?: boolean;
  /** "paystack" (default, recurring — has a real Paystack subscription object) or "paystack_onetime" (one-off payment, no auto-renew, no subscription object to look up/disable). */
  provider?: string;
}) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new Error("Invalid subscription plan");

  const isLive = process.env.NODE_ENV === "production";
  const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

  const result = await applyPaymentPeriod({
    userId,
    reference,
    eventType: "subscription.create",
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    periodInterval: plan.interval,
    row: {
      status,
      provider,
      planCode: plan.plan_code,
      planName: plan.name,
      interval: plan.interval,
      // Paystack's Plan API amount is already kobo.
      amountKobo: plan.amount,
      currency: "NGN",
      customerCode,
      customerId,
      authorization,
      emailToken,
      subCode,
      nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : undefined,
    },
  });

  if (result.status === "used_by_another_account") {
    throw new ApiError(
      409,
      "PAYMENT_ALREADY_USED",
      "This payment has already been applied to another account."
    );
  }
  // `already_applied`: a repeat of a payment that was already credited (the
  // verify call and the webhook both run for every payment) — nothing changes.
  return result.subscription!;
}
