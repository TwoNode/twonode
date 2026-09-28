import prisma from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import { createPaystackInstance, logPaystackEnvironment, getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import { createOrUpdateSubscription } from "@/surfboard/services/subscriptionService";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/(surfboard)/actions/paystackActions.ts (the
 * subscription-plan half — not to be confused with the QR-earnings
 * Paystack flow already migrated in Phase 1, or the COD Paystack flow in
 * remitaVerificationService.ts).
 */

export type Plan = {
  name: string;
  amount: number;
  interval: "monthly" | "quarterly" | "annually";
  integration: number;
  domain: string;
  plan_code: string;
  send_invoices: boolean;
  send_sms: boolean;
  hosted_page: boolean;
  currency: string;
  id: number;
  createdAt: string;
  updatedAt: string;
};

export async function initiateSubscription(userId: string, email: string, planId: keyof typeof SUBSCRIPTION_PLANS) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new ValidationError({ planId: "Invalid subscription plan" });

  const isLive = process.env.NODE_ENV === "production";
  await logPaystackEnvironment(isLive);

  const reference = `SURFBOARD_SUB_${isLive ? "live" : "test"}_${Date.now()}_${userId}`;
  const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

  /**
   * No server-side `paystack.transaction.initialize()` call here — this
   * checkout is entirely popup-driven via `@paystack/inline-js`'s
   * `newTransaction()` on the client (see SubscriptionManager.tsx), which
   * does its own initialize call under the hood using this `reference`.
   * Calling `transaction.initialize()` here too would register the same
   * reference with Paystack twice, and surfaced as a "Duplicate Transaction
   * Reference" error from the client-side popup, most reliably reproduced
   * by cancelling one checkout attempt and immediately starting another
   * (Paystack's own "resume abandoned transaction with the same
   * parameters" logic collides with our own already-registered reference).
   * The QR-paywall flow (qrEarningsService.ts's initiateQRServicePayment)
   * already follows this correct pattern — reference generated locally,
   * never pre-registered with Paystack, client popup is the sole thing
   * that creates the transaction.
   */
  return {
    reference,
    email,
    amount: plan.amount,
    plan,
    currency: "NGN",
    userId,
    metadata: {
      custom_fields: [
        { display_name: "Platform", variable_name: "platform", value: "surfboard" },
        { display_name: "Subscription Plan", variable_name: "subscription_plan", value: plan.name },
        { display_name: "Subscription Plan ID", variable_name: "subscription_plan_id", value: plan.id },
        { display_name: "Plan Code", variable_name: "plan_code", value: plan.plan_code },
        { display_name: "Reference", variable_name: "reference", value: reference },
        { display_name: "User ID", variable_name: "user_id", value: userId },
        { display_name: "Email", variable_name: "email", value: email },
      ],
    },
  };
}

/**
 * Same pricing as initiateSubscription, but no `plan` attached to the
 * Paystack transaction — a recurring `plan` makes Paystack restrict checkout
 * to channels that can create a reusable charge authorization (Card, some
 * wallets), silently dropping Bank Transfer since a transfer can't authorize
 * future auto-charges. Without `plan`, the full channel set (including
 * Transfer) is available. No Paystack subscription object is ever created
 * for this payment — access simply expires at the end of the period unless
 * the user pays again.
 */
export async function initiateOneTimeSubscription(
  userId: string,
  email: string,
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new ValidationError({ planId: "Invalid subscription plan" });

  const isLive = process.env.NODE_ENV === "production";
  await logPaystackEnvironment(isLive);

  const reference = `SURFBOARD_ONETIME_SUB_${isLive ? "live" : "test"}_${Date.now()}_${userId}`;
  const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

  // No server-side `paystack.transaction.initialize()` call — see
  // initiateSubscription's identical comment for why (duplicate-reference
  // collision with the client's own newTransaction() popup call).
  return {
    reference,
    email,
    amount: plan.amount,
    plan,
    currency: "NGN",
    userId,
    metadata: {
      type: "surfboard_onetime_subscription",
      platform: "surfboard",
      plan_id: planId,
      custom_fields: [
        { display_name: "Platform", variable_name: "platform", value: "surfboard" },
        { display_name: "Payment Type", variable_name: "payment_type", value: "one-time subscription" },
        { display_name: "Subscription Plan", variable_name: "subscription_plan", value: plan.name },
        { display_name: "Subscription Plan ID", variable_name: "subscription_plan_id", value: plan.id },
        { display_name: "Reference", variable_name: "reference", value: reference },
        { display_name: "User ID", variable_name: "user_id", value: userId },
        { display_name: "Email", variable_name: "email", value: email },
      ],
    },
  };
}

/**
 * Same pricing as initiateSubscription, but no `plan` attached to the
 * Paystack transaction — a recurring `plan` makes Paystack restrict checkout
 * to channels that can create a reusable charge authorization (Card, some
 * wallets), silently dropping Bank Transfer since a transfer can't authorize
 * future auto-charges. Without `plan`, the full channel set (including
 * Transfer) is available. No Paystack subscription object is ever created
 * for this payment — access simply expires at the end of the period unless
 * the user pays again.
 */
export async function initiateOneTimeSubscription(
  userId: string,
  email: string,
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new ValidationError({ planId: "Invalid subscription plan" });

  const isLive = process.env.NODE_ENV === "production";
  const paystack = await createPaystackInstance(isLive);
  await logPaystackEnvironment(isLive);

  const reference = `SURFBOARD_ONETIME_SUB_${isLive ? "live" : "test"}_${Date.now()}_${userId}`;
  const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

  const response = await paystack.transaction.initialize({
    email,
    amount: plan.amount,
    reference,
    metadata: {
      type: "surfboard_onetime_subscription",
      platform: "surfboard",
      plan_id: planId,
      custom_fields: [
        { display_name: "Platform", variable_name: "platform", value: "surfboard" },
        { display_name: "Payment Type", variable_name: "payment_type", value: "one-time subscription" },
        { display_name: "Subscription Plan", variable_name: "subscription_plan", value: plan.name },
        { display_name: "Subscription Plan ID", variable_name: "subscription_plan_id", value: plan.id },
        { display_name: "Reference", variable_name: "reference", value: reference },
        { display_name: "User ID", variable_name: "user_id", value: userId },
        { display_name: "Email", variable_name: "email", value: email },
      ],
    },
  });

  if (!response.status) {
    console.error("Paystack initialization error:", response);
    throw new Error(response.message || "Failed to initialize payment");
  }

  return {
    reference,
    email,
    amount: plan.amount,
    plan,
    currency: "NGN",
    userId,
    authorization_url: response.data.authorization_url,
  };
}

export async function getOrCreatePaystackPlan(
  plan: { id: string; planCode: string; name: string; amount: number; description: string; interval: string },
  isLive: boolean
): Promise<Plan> {
  const paystack = await createPaystackInstance(isLive);
  const amountInKobo = plan.amount * 100;

  try {
    const plansResponse = await paystack.plan.list({ perPage: 50, page: 1, filter: { interval: plan.interval } });
    const existingPlan = plansResponse.data.find((p: any) => p.name === plan.name && !p.is_deleted && !p.is_archived);
    if (existingPlan) return existingPlan;
  } catch (error) {
    console.warn("Error fetching existing plans:", error);
  }

  const planResponse = await paystack.plan.create({
    name: plan.name,
    amount: amountInKobo,
    interval: plan.interval.toLowerCase(),
    description: plan.description,
    currency: "NGN",
    send_invoices: true,
    send_sms: true,
  });

  if (!planResponse.status) throw new Error(planResponse.message || "Failed to create plan");

  return planResponse.data;
}

export async function verifySubscription(userId: string, reference: string) {
  const isLive = process.env.NODE_ENV === "production";
  const paystack = await createPaystackInstance(isLive);

  const verification: any = await paystack.transaction.verify({ reference });

  if (verification.data?.status !== "success") {
    throw new Error(verification.data?.gateway_response || "Payment verification failed");
  }

  const { data } = verification;
  const planObject = data.plan_object;
  if (!planObject) throw new Error("No subscription plan found in transaction");

  const customerId = data.customer.id;
  const customerCode = data.customer.customer_code;
  const authorization = data.authorization.authorization_code;
  const paidAt = data.paid_at;

  const availablePlan = Object.values(SUBSCRIPTION_PLANS).find((p) => p.name === planObject.name);
  const plan = { ...planObject, ...availablePlan, id: planObject.id };

  let subscriptionCode = "";
  let emailToken = "";
  let nextPaymentDate = "";

  try {
    const subscriptionsResponse: any = await paystack.subscription.list({
      customer: customerId,
      plan: planObject.plan_code,
    });

    const activeSubscription = subscriptionsResponse.data.find((sub: any) => sub.status === "active");
    if (activeSubscription) {
      subscriptionCode = activeSubscription.subscription_code;
      emailToken = activeSubscription.email_token;
      nextPaymentDate = activeSubscription.next_payment_date;
    }
  } catch (error) {
    console.warn("Error fetching subscription details:", error);
  }

  const sub = await createOrUpdateSubscription({
    userId,
    reference,
    subCode: subscriptionCode,
    planId: plan.interval as keyof typeof SUBSCRIPTION_PLANS,
    customerCode,
    customerId: String(customerId),
    authorization,
    emailToken,
    status: "active",
    paidAt,
    nextPaymentDate: nextPaymentDate || undefined,
    skipHistory: true,
  });

  return { subscriptionCode, nextPaymentDate, planName: plan.name, subscription: sub };
}

/**
 * Counterpart to verifySubscription for a one-time (no-`plan`) payment —
 * Paystack's verify response has no plan_object/subscription for these, so
 * this doesn't try to read one. planId is passed in by the caller (the
 * client already knows which plan it initiated payment for) rather than
 * round-tripped through Paystack metadata.
 */
export async function verifyOneTimeSubscription(
  userId: string,
  reference: string,
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  const selectedPlan = SUBSCRIPTION_PLANS[planId];
  if (!selectedPlan) throw new ValidationError({ planId: "Invalid subscription plan" });

  const isLive = process.env.NODE_ENV === "production";
  const paystack = await createPaystackInstance(isLive);

  const verification: any = await paystack.transaction.verify({ reference });

  if (verification.data?.status !== "success") {
    throw new Error(verification.data?.gateway_response || "Payment verification failed");
  }

  const { data } = verification;
  const customerId = data.customer.id;
  const customerCode = data.customer.customer_code;
  const authorization = data.authorization?.authorization_code ?? "";
  const paidAt = data.paid_at;

  const sub = await createOrUpdateSubscription({
    userId,
    reference,
    subCode: "",
    emailToken: "",
    planId,
    customerCode,
    customerId: String(customerId),
    authorization,
    status: "active",
    paidAt,
    skipHistory: true,
    provider: "paystack_onetime",
  });

  return { planName: sub.planName, subscription: sub };
}

export async function disableSubscription(userId: string): Promise<{
  message: string;
  data?: { currentEnd: Date; nextPaymentDate: Date | null };
}> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) throw new NotFoundError("Subscription");

  // A one-time payment never has (or will ever get) a Paystack subscription
  // object to disable — it just expires naturally at currentEnd. Distinct
  // from the "sync pending" case below, where an empty subCode is transient
  // (the webhook hasn't landed yet) for a genuinely recurring subscription.
  if (subscription.provider === "paystack_onetime") {
    return {
      message: "This was a one-time payment with no auto-renewal — nothing to cancel. Access continues until it expires.",
      data: { currentEnd: subscription.currentEnd || new Date(), nextPaymentDate: null },
    };
  }

  if (!subscription.subCode && subscription.status === "active") {
    throw new ValidationError({ subscription: "Subscription sync pending. Please try again soon." });
  }

  if (subscription.status !== "active") {
    throw new ValidationError({ subscription: "No active subscription to cancel" });
  }

  if (subscription.cancelledAt) {
    return {
      message: "Subscription is already cancelled",
      data: { currentEnd: subscription.currentEnd || new Date(), nextPaymentDate: subscription.nextPaymentDate },
    };
  }

  if (subscription.subCode && subscription.emailToken) {
    const response = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getPaystackSecretForWebhook()}` },
      body: JSON.stringify({ code: subscription.subCode, token: subscription.emailToken }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Paystack disable error:", result);
      const isSafeToIgnore =
        result.message?.toLowerCase().includes("disabled") || result.message?.toLowerCase().includes("not found");

      if (!isSafeToIgnore) {
        throw new Error(`Paystack Error: ${result.message || "Failed to disable subscription"}`);
      }
    }
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { userId },
    data: { status: "canceled", cancelledAt: new Date(), nextPaymentDate: null },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: `cancel_${Date.now()}`,
      planCode: subscription.planCode,
      planName: subscription.planName,
      amount: subscription.amount * 100,
      interval: subscription.interval,
      status: "canceled",
      eventType: "subscription.disable",
      startDate: subscription.currentStart || new Date(),
      endDate: subscription.currentEnd || new Date(),
    },
  });

  return {
    message: "Subscription cancelled. Access continues until end of billing period",
    data: { currentEnd: updatedSubscription.currentEnd || new Date(), nextPaymentDate: null },
  };
}
