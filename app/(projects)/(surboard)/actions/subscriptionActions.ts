"use server";

// ────────────────────────────────────────────────────────────────────────────────
// File: app/(projects)/(surboard)/actions/subscriptionActions.ts
// Purpose: Prisma helpers for `Subscription` + `SubscriptionHistory` with history alignment
// ────────────────────────────────────────────────────────────────────────────────

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUser } from "@/utils/surfAuth";
import { revalidatePath } from "next/cache";
import { SUBSCRIPTION_PLANS, type PlanId } from "../utils/paystackSubscription";
import { getAndRefreshUserSession } from "@/utils/encryptedCookies";

export async function getUserActiveSubscription() {
  try {
    const user = await getAuthenticatedSurfUser();
    if (!user) return null;
    return prisma.subscription.findFirst({
      where: { userId: user.id, status: "active" }, // prioritize active subscription
      orderBy: { createdAt: "desc" },
    });
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
    const session = await getAndRefreshUserSession();
    const userId = session?.userData?.userId;
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
    const session = await getAndRefreshUserSession();

    console.log("userData before", session?.userData);

    const userData = session?.userData;
    if (userData && userData?.subscription?.status === "active") return true;
    if (userData && userData?.subscription?.status === "past_due") return true;

    console.log("userData after", userData);

    const user = await getAuthenticatedSurfUser();
    if (!user) return false;

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["active", "past_due"] }, // show limited even if a single failure
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!sub) return false;
    // Visible if we are still in the current usage period
    const now = new Date();
    return now <= new Date(sub?.currentEnd!);
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}

function computePeriod(
  interval: "monthly" | "quarterly" | "annually",
  _ref: string | Date | undefined
) {
  const ref = _ref ? new Date(_ref) : new Date();
  const add = (d: Date, days: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const som = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const eom = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const soq = (d: Date) =>
    new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  const eoq = (d: Date) =>
    new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
  const soy = (d: Date) => new Date(d.getFullYear(), 0, 1);
  const eoy = (d: Date) => new Date(d.getFullYear(), 12, 0);
  if (interval === "monthly") {
    const s = som(ref),
      e = eom(ref);
    return { s, e, c: add(e, 1) };
  }
  if (interval === "quarterly") {
    const s = soq(ref),
      e = eoq(ref);
    return { s, e, c: add(e, 1) };
  }
  const s = soy(ref),
    e = eoy(ref);
  return { s, e, c: add(e, 1) };
}

export async function listSubscriptionHistory(userId: string) {
  return prisma.subscriptionHistory.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: 50,
  });
}
