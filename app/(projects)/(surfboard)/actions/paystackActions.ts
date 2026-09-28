"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { SUBSCRIPTION_PLANS, type PlanId } from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import { createOrUpdateSubscription } from "./subscriptionActions";
import {
  createPaystackInstance,
  logPaystackEnvironment,
  getPaystackSecretForWebhook,
} from "@/utils/paystackConfig";
import prisma from "@/lib/prisma";
import { getAndRefreshUserSession } from "@/utils/encryptedCookies";

const PAYSTACK_SECRET_KEY = getPaystackSecretForWebhook();

export type VerificationResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    receipt_number: string | null;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      custom_fields: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    log: {
      start_time: number;
      time_spent: number;
      attempts: number;
      errors: number;
      success: boolean;
      mobile: boolean;
      input: Array<any>;
      history: Array<{
        time_spent: number;
        type: string;
        name: string;
        message: string;
        success: boolean;
      }>;
    };
    fees: number;
    fees_split: null | object;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
      receiver_bank_account_number: string | null;
      receiver_bank: string | null;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: object | null;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: string;
    split: object;
    order_id: string | null;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: object | null;
    source: string | null;
    fees_breakdown: object | null;
    connect: object | null;
    transaction_date: string;
    plan_object: {
      id: number;
      name: string;
      plan_code: string;
      description: string;
      amount: number;
      interval: string;
      send_invoices: boolean;
      send_sms: boolean;
      currency: string;
    };
    subaccount: object;
  };
};

export type Plan = {
  subscriptions?: {
    customer: number;
    plan: number;
    integration: number;
    domain: string;
    start: number;
    status: string;
    quantity: number;
    amount: number;
    subscription_code: string;
    email_token: string;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string;
    };
    easy_cron_id: null | string;
    cron_expression: string;
    next_payment_date: string;
    open_invoice: null | string;
    id: number;
    createdAt: string;
    updatedAt: string;
  }[];
  description?: null | string;
  hosted_page_url?: null | string;
  hosted_page_summary?: null | string;

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

export type PaystackPlanCreateResponse = {
  status: boolean;
  message: string;
  data: Plan;
};

export type PaystackPlansList = {
  status: boolean;
  message: string;
  data: Plan[];
  meta: {
    total: number;
    skipped: number;
    perPage: number;
    page: number;
    pageCount: number;
  };
};

type SubscriptionListResponse = {
  status: boolean;
  message: string;
  data: Array<{
    id: number;
    domain: string;
    status: string;
    start: number;
    quantity: number;
    subscription_code: string;
    email_token: string;
    amount: number;
    cron_expression: string;
    next_payment_date: string;
    open_invoice: null | string;
    createdAt: string;
    integration: number;
    plan: {
      name: string;
      amount: number;
      interval: string;
      integration: number;
      domain: string;
      currency: string;
      plan_code: string;
      invoice_limit: number;
      send_invoices: boolean;
      send_sms: boolean;
      hosted_page: boolean;
      migrate: boolean;
      id: number;
      createdAt: string;
      updatedAt: string;
    };
    authorization: {
      authorization_code: string;
      reference: string;
      domain: string;
      status: string;
      method: string;
      currency: string;
      amount: number;
      message: string;
      gateway_response: string;
      paid_at: string;
      createdAt: string;
      channel: string;
      ip_address: string;
      log: string;
      channel_data: string;
      reauthorise: boolean;
      id: number;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      metadata: null | string;
      customer_code: string;
      RiskAction: string;
      account_id: number;
      domain: string;
      createdAt: string;
      updatedAt: string;
    };
    invoice_limit: number;
    split_code: null | string;
    metadata: null | string;
    payments_count: number;
    most_recent_invoice: {
      id: number;
      integration: number;
      domain: string;
      subaccount_code: null | string;
      amount: number;
      paid_at: string;
      invoice_number: string;
      currency: string;
      status: string;
      reference: string;
      customer: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        metadata: null | string;
        customer_code: string;
        RiskAction: string;
        account_id: number;
        domain: string;
        createdAt: string;
        updatedAt: string;
      };
      plan: {
        name: string;
        amount: number;
        interval: string;
        integration: number;
        domain: string;
        currency: string;
        plan_code: string;
        invoice_limit: number;
        send_invoices: boolean;
        send_sms: boolean;
        hosted_page: boolean;
        migrate: boolean;
        id: number;
        createdAt: string;
        updatedAt: string;
      };
      invoice_limit: number;
      split_code: null | string;
      metadata: null | string;
      paidAt: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
};

export async function initiateSubscription(
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const selectedPlan = SUBSCRIPTION_PLANS[planId];
    if (!selectedPlan) {
      throw new Error("Invalid subscription plan");
    }

    const isLive = process.env.NODE_ENV === "production";
    await logPaystackEnvironment(isLive);

    const reference = `SURFBOARD_SUB_${isLive ? "live" : "test"
      }_${Date.now()}_${user.id}`;
    const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

    /**
     * No server-side paystack.transaction.initialize() call here — this
     * checkout is entirely popup-driven via @paystack/inline-js's
     * newTransaction() on the client (SubscriptionManager.tsx), which does
     * its own initialize call under the hood using this reference. Calling
     * transaction.initialize() here too registered the same reference with
     * Paystack twice, surfacing as a "Duplicate Transaction Reference"
     * error from the client popup — most reliably reproduced by cancelling
     * one checkout attempt and immediately starting another (Paystack's own
     * "resume abandoned transaction with the same parameters" logic
     * collides with the reference already registered here).
     */
    return {
      success: true,
      data: {
        reference,
        email: user.email,
        amount: plan.amount,
        plan,
        currency: "NGN",
        userId: user.id,
        metadata: {
          custom_fields: [
            {
              display_name: "Platform",
              variable_name: "platform",
              value: "surfboard",
            },
            {
              display_name: "Subscription Plan",
              variable_name: "subscription_plan",
              value: plan.name,
            },
            {
              display_name: "Subscription Plan ID",
              variable_name: "subscription_plan_id",
              value: plan.id,
            },
            {
              display_name: "Plan Code",
              variable_name: "plan_code",
              value: plan.plan_code,
            },
            {
              display_name: "Reference",
              variable_name: "reference",
              value: reference,
            },
            { display_name: "User ID", variable_name: "user_id", value: user.id },
            { display_name: "Email", variable_name: "email", value: user.email },
          ],
        },
      },
    };
  } catch (error) {
    console.error("Error initiating subscription:", error);
    return {
      success: false,
      error: (error as Error).message || "initiation_failed",
    };
  }
}

/**
 * Non-recurring counterpart to initiateSubscription — same pricing, no
 * Paystack `plan` attached to the transaction. Attaching a `plan` makes a
 * transaction recurring, and Paystack automatically restricts checkout to
 * channels that can create a reusable charge authorization (Card, some
 * wallets); Bank Transfer is excluded since a transfer can't authorize
 * future auto-charges. This path exists so a facilitator who wants to pay
 * via Transfer has a working option, alongside (not replacing) the
 * recurring flow above.
 */
export async function initiateOneTimeSubscription(planId: PlanId) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const selectedPlan = SUBSCRIPTION_PLANS[planId];
    if (!selectedPlan) {
      throw new Error("Invalid subscription plan");
    }

    const isLive = process.env.NODE_ENV === "production";
    await logPaystackEnvironment(isLive);

    const reference = `SURFBOARD_ONETIME_SUB_${isLive ? "live" : "test"
      }_${Date.now()}_${user.id}`;
    const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

    // No server-side paystack.transaction.initialize() call — see
    // initiateSubscription's identical comment for why (duplicate-reference
    // collision with the client's own newTransaction() popup call).
    return {
      success: true,
      data: {
        reference,
        email: user.email,
        amount: plan.amount,
        plan,
        currency: "NGN",
        userId: user.id,
        metadata: {
          type: "surfboard_onetime_subscription",
          platform: "surfboard",
          plan_id: planId,
          custom_fields: [
            {
              display_name: "Platform",
              variable_name: "platform",
              value: "surfboard",
            },
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "surfboard_onetime_subscription",
            },
            {
              display_name: "Subscription Plan",
              variable_name: "subscription_plan",
              value: plan.name,
            },
            {
              display_name: "Subscription Plan ID",
              variable_name: "subscription_plan_id",
              value: plan.id,
            },
            {
              display_name: "Plan ID",
              variable_name: "plan_id",
              value: planId,
            },
            {
              display_name: "Reference",
              variable_name: "reference",
              value: reference,
            },
            { display_name: "User ID", variable_name: "user_id", value: user.id },
            { display_name: "Email", variable_name: "email", value: user.email },
          ],
        },
      },
    };
  } catch (error) {
    console.error("Error initiating one-time subscription:", error);
    return {
      success: false,
      error: (error as Error).message || "initiation_failed",
    };
  }
}

export async function getOrCreatePaystackPlan(
  plan: {
    id: string;
    planCode: string;
    name: string;
    amount: number;
    description: string;
    interval: string;
  },
  isLive: boolean
): Promise<Plan> {
  const paystack = await createPaystackInstance(isLive);
  const amountInKobo = plan.amount * 100;

  try {
    // List all plans
    const plansResponse: PaystackPlansList = await paystack.plan.list({
      perPage: 50,
      page: 1,
      filter: {
        interval: plan.interval,
      },
    });

    // Find existing plan by plan_code (most reliable)
    const existingPlan = plansResponse.data.find(
      (p: any) => p.name === plan.name && !p.is_deleted && !p.is_archived
    );

    if (existingPlan) {
      console.log("\n\n\n\n Found existing plan:", existingPlan.plan_code);
      return existingPlan;
    }

    // // If plan code doesn't exist, check by name and amount as fallback
    // const matchingPlan = plansResponse.data.find(
    //   (p: any) =>
    //     p.name.toLowerCase() === plan.name.toLowerCase() &&
    //     p.amount === amountInKobo &&
    //     p.interval === plan.interval.toLowerCase() &&
    //     !p.is_deleted &&
    //     !p.is_archived
    // );

    // if (matchingPlan) {
    //   console.log("Found matching plan by attributes:", matchingPlan.plan_code);
    //   return matchingPlan;
    // }
  } catch (error) {
    console.warn("Error fetching existing plans:", error);
  }

  // Create new plan if none exists
  console.log("Creating new plan:", plan.name);
  const planResponse: {
    status: boolean;
    message: string;
    data: {
      name: string;
      interval: "monthly" | "quarterly" | "annually";
      amount: number;
      integration: number;
      domain: string;
      currency: string;
      plan_code: string;
      invoice_limit: number;
      send_invoices: boolean;
      send_sms: boolean;
      hosted_page: boolean;
      migrate: boolean;
      id: number;
      createdAt: string;
      updatedAt: string;
    };
  } = await paystack.plan.create({
    name: plan.name,
    amount: amountInKobo,
    interval: plan.interval.toLowerCase(),
    description: plan.description,
    currency: "NGN",
    send_invoices: true,
    send_sms: true,
  });

  if (!planResponse.status) {
    throw new Error(planResponse.message || "Failed to create plan");
  }

  console.log("Created plan:", planResponse.data.plan_code);
  return planResponse.data;
}

export async function verifySubscription(reference: string) {
  try {
    const sessionData = await getAndRefreshUserSession();
    const userId = sessionData?.userData?.userId;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const isLive = process.env.NODE_ENV === "production";
    const paystack = await createPaystackInstance(isLive);

    // Verify the transaction
    const verification: VerificationResponse =
      await paystack.transaction.verify({ reference });

    console.log("\n\n\n\n\n Subscription verification:", verification);

    if (verification.data?.status !== "success") {
      throw new Error(
        verification.data?.gateway_response || "Payment verification failed"
      );
    }

    const { data } = verification;

    // Extract subscription data
    const planObject = data.plan_object;
    if (!planObject) {
      throw new Error("No subscription plan found in transaction");
    }

    const customerId = data.customer.id;
    const customerCode = data.customer.customer_code;
    const authorization = data.authorization.authorization_code;
    const paidAt = data.paid_at;

    // Find matching plan in our system
    const availablePlan = Object.values(SUBSCRIPTION_PLANS).find(
      (p) => p.name === planObject.name
    );

    const plan = {
      ...planObject,
      ...availablePlan,
      id: planObject.id,
    };

    console.log("\n\n\n\n\n Plan:", plan);

    if (!plan) {
      throw new Error("No matching plan found in transaction");
    }

    // Fetch subscription details from Paystack
    let subscriptionCode = "";
    let emailToken = "";
    let nextPaymentDate = "";

    try {
      // List subscriptions for this customer for the specific plan
      const subscriptionsResponse: SubscriptionListResponse =
        await paystack.subscription.list({
          customer: customerId,
          plan: planObject.plan_code,
        });

      console.log(
        "\n\n\n\n\n\n Subscriptions response:",
        subscriptionsResponse,
        "\n\n\n\n\n\n"
      );

      // Find the most recent active subscription
      const activeSubscription = subscriptionsResponse.data.find(
        (sub: any) => sub.status === "active"
      );

      if (activeSubscription) {
        subscriptionCode = activeSubscription.subscription_code;
        emailToken = activeSubscription.email_token;
        nextPaymentDate = activeSubscription.next_payment_date;
      }
    } catch (error) {
      console.warn("Error fetching subscription details:", error);
      // Continue without subscription details - they'll be updated via webhook
    }

    // Create or update subscription in database
    const sub = await createOrUpdateSubscription({
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
      skipHistory: true, // We rely on webhook for history to avoid duplicates
    });

    revalidatePath("/surfboard/dashboard/subscription");

    return {
      success: true,
      data: {
        subscriptionCode,
        nextPaymentDate,
        planName: plan.name,
        subscription: sub,
      },
    };
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Verifies a one-time subscription payment. Unlike verifySubscription,
 * there's no `plan_object`/`subscription` on this transaction (nothing was
 * attached at initiate time), so the plan is resolved from the `planId`
 * the client already knows (passed straight through from initiate), not
 * extracted from the transaction response.
 */
export async function verifyOneTimeSubscription(
  reference: string,
  planId: PlanId
) {
  try {
    const sessionData = await getAndRefreshUserSession();
    const userId = sessionData?.userData?.userId;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const selectedPlan = SUBSCRIPTION_PLANS[planId];
    if (!selectedPlan) {
      throw new Error("Invalid subscription plan");
    }

    const isLive = process.env.NODE_ENV === "production";
    const paystack = await createPaystackInstance(isLive);

    const verification: VerificationResponse =
      await paystack.transaction.verify({ reference });

    if (verification.data?.status !== "success") {
      throw new Error(
        verification.data?.gateway_response || "Payment verification failed"
      );
    }

    const { data } = verification;
    const paidAt = data.paid_at;

    const plan = await getOrCreatePaystackPlan(selectedPlan, isLive);

    const sub = await createOrUpdateSubscription({
      reference,
      subCode: "",
      planId,
      customerCode: data.customer?.customer_code ?? "",
      customerId: String(data.customer?.id ?? ""),
      authorization: data.authorization?.authorization_code ?? "",
      emailToken: "",
      status: "active",
      paidAt,
      provider: "paystack_onetime",
      skipHistory: true, // avoid double-counting alongside the webhook backstop
    });

    revalidatePath("/surfboard/dashboard/subscription");

    return {
      success: true,
      data: {
        subscriptionCode: "",
        nextPaymentDate: null,
        planName: plan.name,
        subscription: sub,
      },
    };
  } catch (error) {
    console.error("Error verifying one-time subscription:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function disableSubscription(): Promise<{
  success: boolean;
  message: string;
  data?: {
    currentEnd: Date;
    nextPaymentDate: Date | null;
  };
  error?: string;
}> {
  try {
    const sessionData = await getAndRefreshUserSession();

    if (!sessionData) {
      return {
        success: false,
        message: "User not authenticated",
        error: "user_not_authenticated",
      };
    }

    const { userData } = sessionData;
    const subscription = await prisma.subscription.findUnique({
      where: { userId: userData.userId },
    });

    if (!subscription) {
      return {
        success: false,
        message: "No subscription found",
        error: "subscription_not_found",
      };
    }

    // A one-time subscription never has a Paystack subscription object to
    // disable — its empty subCode is permanent by design, not a "webhook
    // hasn't landed yet" state like a genuinely recurring subscription's
    // would be. Skip straight past the sync-pending guard below (which
    // exists specifically for that transient recurring case) and the
    // Paystack disable call entirely.
    if (subscription.provider === "paystack_onetime") {
      return {
        success: true,
        message:
          "This was a one-time payment with no auto-renewal — nothing to cancel. Access continues until it expires.",
        data: {
          currentEnd: subscription.currentEnd || new Date(),
          nextPaymentDate: null,
        },
      };
    }

    if (!subscription.subCode && subscription.status === "active") {
      return {
        success: false,
        message: "Subscription sync pending. Please try again soon.",
        error: "sync_pending"
      }
    }

    if (subscription.status !== "active") {
      await getAndRefreshUserSession(undefined, true);

      return {
        success: false,
        message: "No active subscription to cancel",
        error: "no_active_subscription",
      };
    }

    // If already cancelled, return current status
    if (subscription.cancelledAt) {
      await getAndRefreshUserSession(undefined, true);

      return {
        success: true,
        message: "Subscription is already cancelled",
        data: {
          currentEnd: subscription.currentEnd || new Date(),
          nextPaymentDate: subscription.nextPaymentDate,
        },
      };
    }

    // Disable subscription in Paystack
    if (subscription.subCode && subscription.emailToken) {
      try {
        const response = await fetch(
          "https://api.paystack.co/subscription/disable",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
            body: JSON.stringify({
              code: subscription.subCode,
              token: subscription.emailToken,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Paystack disable error:", result);
          // If Paystack says it's already disabled or not found, we can proceed to update our DB.
          // Otherwise, we should fail to prevent "orphan" active subs in Paystack.
          const isSafeToIgnore =
            result.message?.toLowerCase().includes("disabled") ||
            result.message?.toLowerCase().includes("not found");

          if (!isSafeToIgnore) {
            return {
              success: false,
              message: `Paystack Error: ${result.message || "Failed to disable subscription"}`,
              error: "paystack_error",
            };
          }
        }
      } catch (error) {
        console.error("Error calling Paystack disable API:", error);
        return {
          success: false,
          message: "Failed to reach payment provider. Please try again.",
          error: "network_error",
        };
      }
    }


    await getAndRefreshUserSession(undefined, true);

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: userData.userId },
      data: {
        status: "canceled",
        cancelledAt: new Date(),
        nextPaymentDate: null,
      },
    });

    // Record in history
    await prisma.subscriptionHistory.create({
      data: {
        userId: userData.userId,
        reference: `cancel_${Date.now()}`,
        planCode: subscription.planCode,
        planName: subscription.planName,
        amount: subscription.amount * 100, // Convert to Kobo
        interval: subscription.interval,
        status: "canceled",
        eventType: "subscription.disable",
        startDate: subscription.currentStart || new Date(),
        endDate: subscription.currentEnd || new Date(),
      },
    });

    revalidatePath("/surfboard/dashboard/subscription");

    return {
      success: true,
      message:
        "Subscription cancelled. Access continues until end of billing period",
      data: {
        currentEnd: updatedSubscription.currentEnd || new Date(),
        nextPaymentDate: null,
      },
    };
  } catch (error) {
    console.error("Error in disableSubscription:", error);
    return {
      success: false,
      message: "An error occurred while cancelling the subscription",
      error: "internal_error",
    };
  }
}
