"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { SUBSCRIPTION_PLANS } from "@/app/(projects)/(surfboard)/utils/paystackSubscription";
import { createOrUpdateSubscription } from "./subscriptionActions";
import {
  createPaystackInstance,
  logPaystackEnvironment,
  getPaystackSecretForWebhook,
} from "@/utils/paystackConfig";
import prisma from "@/lib/prisma";
import { getAndRefreshUserSession } from "@/utils/encryptedCookies";
import { findSubscriptionsByCustomerRefUser } from "./paystackSubscriptions";

const PAYSTACK_SECRET_KEY = getPaystackSecretForWebhook();

export async function initiateSubscription(
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error("Invalid subscription plan");
    }

    const isLive = process.env.NODE_ENV === "production";
    const paystack = await createPaystackInstance(isLive);
    await logPaystackEnvironment(isLive);

    const reference = `SURFBOARD_SUB_${
      isLive ? "live" : "test"
    }_${Date.now()}_${user.id}`;

    const planCode = await getOrCreatePaystackPlan(plan, isLive);

    const response = await paystack.transaction.initialize({
      email: user.email,
      amount: plan.price * 100,
      reference,
      callback_url: `${process.env.BASE_URL}/surfboard/dashboard/subscription/callback?reference=${reference}`,
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
            display_name: "Reference",
            variable_name: "reference",
            value: reference,
          },
          { display_name: "User ID", variable_name: "user_id", value: user.id },
          { display_name: "Email", variable_name: "email", value: user.email },
        ],
      },
      plan: planCode,
    });

    if (!response.status || !response.data?.authorization_url) {
      console.log("Paystack initiateSubscription Error response:", response);
      throw new Error(response.message || "Failed to initialize payment");
    }

    console.log("Paystack initiateSubscription response:", response);

    // Instead of returning the URL, we redirect from the server action
    return {
      success: true,
      data: {
        ...response.data,
        planCode,
        email: user.email,
        amount: plan.price,
        reference,
        userId: user.id,
      },
    };
  } catch (error) {
    console.error("Error initiating Paystack subscription:", error);
    // In case of an error, redirect back with an error message
    return {
      success: false,
      error: "initiation_failed",
    };
  }
}

async function getOrCreatePaystackPlan(
  plan: {
    id: string;
    planCode: string;
    name: string;
    price: number;
    description: string;
    interval: string;
  },
  isLive: boolean
): Promise<string> {
  const paystack = await createPaystackInstance(isLive);
  const amountInKobo = plan.price * 100; // Convert to kobo for Paystack

  // {"status":true,"message":"Plans retrieved","data":[{"subscriptions":[],"pages":[],"domain":"live","name":"yearly","plan_code":"PLN_sp36u33nqqxe6mr","description":"Postpaid, billed yearly (charged on Jan 1 for the previous year","amount":20000000,"interval":"annually","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2740357,"integration":1410813,"createdAt":"2025-08-14T11:57:21.000Z","updatedAt":"2025-08-14T11:57:21.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0},{"subscriptions":[],"pages":[],"domain":"live","name":"quarterly","plan_code":"PLN_op8wb4hoxs9v96b","description":"Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter","amount":5000000,"interval":"quarterly","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2740348,"integration":1410813,"createdAt":"2025-08-14T11:55:19.000Z","updatedAt":"2025-08-14T11:55:19.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0},{"subscriptions":[],"pages":[],"domain":"live","name":"monthly","plan_code":"PLN_55ftd3cu1vuhy7v","description":"Postpaid, billed monthly (charged on the 1st of the next month","amount":1670000,"interval":"monthly","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2740340,"integration":1410813,"createdAt":"2025-08-14T11:52:55.000Z","updatedAt":"2025-08-14T11:52:55.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0}],"meta":{"total":3,"skipped":0,"perPage":50,"page":1,"pageCount":1}}
  //

  // {"status":true,"message":"Plans retrieved","data":[{"subscriptions":[],"pages":[],"domain":"test","name":"yearly","plan_code":"PLN_8tim0wubm0jope1","description":"Postpaid, billed yearly (charged on Jan 1 for the previous year","amount":20000000,"interval":"annually","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2745849,"integration":1410813,"createdAt":"2025-08-15T11:56:01.000Z","updatedAt":"2025-08-15T11:56:01.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0},{"subscriptions":[],"pages":[],"domain":"test","name":"quarterly","plan_code":"PLN_j8rkhp2u9s9gndu","description":"Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter","amount":5000000,"interval":"quarterly","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2745843,"integration":1410813,"createdAt":"2025-08-15T11:55:17.000Z","updatedAt":"2025-08-15T11:55:17.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0},{"subscriptions":[],"pages":[],"domain":"test","name":"Monthly","plan_code":"PLN_vm2mrnqlo44s9jv","description":"Monthly subscription","amount":1670000,"interval":"monthly","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":true,"is_archived":false,"id":2745565,"integration":1410813,"createdAt":"2025-08-15T10:40:10.000Z","updatedAt":"2025-08-15T11:54:26.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0},{"subscriptions":[],"pages":[],"domain":"test","name":"Monthly","plan_code":"PLN_f0ypt743xzpoejs","description":"Monthly subscription","amount":1670000,"interval":"monthly","invoice_limit":0,"send_invoices":true,"send_sms":true,"hosted_page":false,"hosted_page_url":null,"hosted_page_summary":null,"currency":"NGN","migrate":false,"is_deleted":false,"is_archived":false,"id":2745517,"integration":1410813,"createdAt":"2025-08-15T10:26:08.000Z","updatedAt":"2025-08-15T10:26:08.000Z","total_subscriptions":0,"active_subscriptions":0,"total_subscriptions_revenue":0}],"meta":{"total":4,"skipped":0,"perPage":50,"page":1,"pageCount":1}}

  try {
    // List all plans with pagination
    const plansResponse = await paystack.plan.list({
      perPage: 50,
      page: 1,
    });

    console.log("\n\n\n\n", plansResponse, "\n\n\n\n\n");

    // Find existing plan by name and amount (converted to kobo)
    const existingPlan = plansResponse.data.find(
      (p: any) =>
        (p.plan_code.toLowerCase() === plan.planCode.toLowerCase() ||
          (p.amount === amountInKobo &&
            p.interval === plan.interval.toLowerCase())) &&
        !p.is_deleted
    );

    console.log("\n\n\n\n", existingPlan, "\n\n\n\n");

    if (existingPlan) {
      return existingPlan.plan_code;
    }
  } catch (error) {
    console.warn("Error fetching existing plans:", error);
    // Continue to create a new plan if listing fails
  }

  // Create new plan if no existing one found
  const planResponse = await paystack.plan.create({
    name: plan.name,
    amount: amountInKobo,
    interval: plan.interval,
    description: plan.description || `${plan.name} subscription`,
    currency: "NGN",
    send_invoices: true,
    send_sms: true,
    metadata: {
      planId: plan.id,
      planName: plan.name,
    },
  });

  if (!planResponse.status) {
    throw new Error(
      planResponse.message || "Failed to create subscription plan"
    );
  }

  return planResponse.data.plan_code;
}

export async function verifySubscription(reference: string) {
  try {
    console.log("\n\n\n\n", reference, "\n\n\n\n");
    const sessionData = await getAndRefreshUserSession();

    const isLive = process.env.NODE_ENV === "production";
    const paystack = await createPaystackInstance(isLive);
    await logPaystackEnvironment(isLive);
    const verification = await paystack.transaction.verify({ reference });

    const userId = sessionData?.userData?.userId || "";
    const planCode = verification.data.plan_object.plan_code || "";
    const planObject = verification.data.plan_object;
    const customerId = verification.data.customer.id;
    const customerCode = verification.data.customer.customer_code;
    const authorization = verification.data.authorization.authorization_code;
    const paidAt = verification.data.paid_at;

    console.log(
      "\n\n\n\n",
      verification,
      planCode,
      customerId,
      customerCode,
      authorization,
      paidAt,
      "\n\n\n\n"
    );
    if (!planCode) throw new Error("Invalid plan in transaction");

    let plan = Object.values(SUBSCRIPTION_PLANS).find(
      (p) => p.planCode === planCode
    );

    if (!plan) {
      plan = {
        id: planObject.interval,
        name: planObject.name,
        planCode: planObject.plan_code,
        interval: planObject.interval,
        price: planObject.amount,
        description: planObject.description,
      };
    }

    const sub = await findSubscriptionsByCustomerRefUser(customerId, {
      reference,
      userId,
    });

    console.log("\n\n\n\n", sub, "\n\n\n\n");

    const subCode = sub?.firstMatch?.subscription_code;
    const emailToken = sub?.firstMatch?.email_token || "";
    const nextPaymentDate = sub?.firstMatch?.next_payment_date || "";

    if (verification.data?.status !== "success") {
      throw new Error(
        verification.data?.gateway_response || "Payment verification failed"
      );
    }

    // Create or update the subscription
    await createOrUpdateSubscription({
      reference,
      subCode,
      planId: plan.id,
      customerCode,
      customerId: String(customerId),
      authorization,
      emailToken,
      status: "active",
      paidAt,
      nextPaymentDate,
    });

    // Create subscription history if it doesn't exist
    const historyExists = await prisma.subscriptionHistory.findFirst({
      where: {
        userId,
        reference,
        eventType: "subscription.success",
        startDate: paidAt,
      },
    });

    if (!historyExists) {
      const now = new Date();
      await prisma.subscriptionHistory.create({
        data: {
          userId,
          reference,
          planCode: planCode,
          planName: plan.name,
          amount: plan.price * 100,
          interval: plan.interval,
          status: "active",
          eventType: "subscription.create",
          startDate: paidAt,
          ...(nextPaymentDate ? { endDate: nextPaymentDate } : {}),
        },
      });
    }

    // {
    //   status: true,
    //   message: 'Verification successful',
    //   data: {
    //     id: 5247515175,
    //     domain: 'test',
    //     status: 'success',
    //     reference: 'SURFBOARD_SUB_test_1755429242049_e764640e-c5c9-405a-8525-e77118807b55',
    //     receipt_number: null,
    //     amount: 5000000,
    //     message: null,
    //     gateway_response: 'Successful',
    //     paid_at: '2025-08-17T11:14:20.000Z',
    //     created_at: '2025-08-17T11:14:08.000Z',
    //     channel: 'card',
    //     currency: 'NGN',
    //     ip_address: '102.91.101.84',
    //     metadata: { custom_fields: [Array] },
    //     log: {
    //       start_time: 1755429252,
    //       time_spent: 9,
    //       attempts: 1,
    //       errors: 0,
    //       success: true,
    //       mobile: false,
    //       input: [],
    //       history: [Array]
    //     },
    //     fees: 85000,
    //     fees_split: null,
    //     authorization: {
    //       authorization_code: 'AUTH_tw9q9ve5ng',
    //       bin: '408408',
    //       last4: '4081',
    //       exp_month: '12',
    //       exp_year: '2030',
    //       channel: 'card',
    //       card_type: 'visa ',
    //       bank: 'TEST BANK',
    //       country_code: 'NG',
    //       brand: 'visa',
    //       reusable: true,
    //       signature: 'SIG_wkAaGsI0EEXUmCX7fcNj',
    //       account_name: null,
    //       receiver_bank_account_number: null,
    //       receiver_bank: null
    //     },
    //     customer: {
    //       id: 256979707,
    //       first_name: '',
    //       last_name: '',
    //       email: 'rojitech9@gmail.com',
    //       customer_code: 'CUS_o766tgq8j92klql',
    //       phone: '',
    //       metadata: null,
    //       risk_action: 'default',
    //       international_format_phone: null
    //     },
    //     plan: 'PLN_j8rkhp2u9s9gndu',
    //     split: {},
    //     order_id: null,
    //     paidAt: '2025-08-17T11:14:20.000Z',
    //     createdAt: '2025-08-17T11:14:08.000Z',
    //     requested_amount: 5000000,
    //     pos_transaction_data: null,
    //     source: null,
    //     fees_breakdown: null,
    //     connect: null,
    //     transaction_date: '2025-08-17T11:14:08.000Z',
    //     plan_object: {
    //       id: 2745843,
    //       name: 'quarterly',
    //       plan_code: 'PLN_j8rkhp2u9s9gndu',
    //       description: 'Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter',
    //       amount: 5000000,
    //       interval: 'quarterly',
    //       send_invoices: true,
    //       send_sms: true,
    //       currency: 'NGN'
    //     },
    //     subaccount: {}
    //   }
    // }

    revalidatePath("/surfboard/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return { success: false, error: (error as Error).message };
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
        message: "User not found",
        error: "user_not_found",
      };
    }

    if (!subscription?.status) {
      return {
        success: false,
        message: "No active subscription found",
        error: "no_active_subscription",
      };
    }

    // If already cancelled, return the current end date
    if (subscription?.status === "canceled" || subscription?.cancelledAt) {
      return {
        success: true,
        message:
          "Subscription is already set to cancel at the end of the billing period",
        data: {
          currentEnd: subscription?.currentEnd || new Date(),
          nextPaymentDate: subscription?.nextPaymentDate,
        },
      };
    }

    // Disable the subscription in Paystack
    const response = await fetch(
      `https://api.paystack.co/subscription/disable`,
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
      console.error("Error disabling Paystack subscription:", result);
      return {
        success: false,
        message: result.message || "Failed to disable subscription",
        error: "disable_failed",
      };
    }

    // Update the subscription in our database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: userData.userId },
      data: {
        status: "canceled",
        cancelledAt: new Date(),
        nextPaymentDate: null, // No next payment as it's being canceled
      },
    });

    // Record this action in the subscription history
    await prisma.subscriptionHistory.create({
      data: {
        userId: userData.userId,
        reference: `cancel_${Date.now()}`,
        planCode: subscription.planCode,
        planName: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        status: "canceled",
        eventType: "subscription.disable",
        startDate: subscription?.currentStart,
        endDate: subscription?.currentEnd,
      },
    });

    return {
      success: true,
      message:
        "Subscription will be canceled at the end of the current billing period",
      data: {
        currentEnd: updatedSubscription?.currentEnd || new Date(),
        nextPaymentDate: null,
      },
    };
  } catch (error) {
    console.error("Error in disableSubscription:", error);
    return {
      success: false,
      message: "An error occurred while disabling the subscription",
      error: "internal_error",
    };
  }
}
