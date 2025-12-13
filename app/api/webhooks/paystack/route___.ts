import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import { SUBSCRIPTION_PLANS } from "@/app/(projects)/(surfboard)/utils/paystackSubscription";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Verifies Paystack webhook signature
 */
// ─────────────────────────── Verify ───────────────────────────
function verify_Webhook_Signature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  // const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  return hash === signature;
}

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  console.log(
    "\n\n\n verify_Webhook_Signature",
    verify_Webhook_Signature(rawBody, signature, secret)
  );

  if (!signature) return false;

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a as any, b as any);
  } catch {
    return false;
  }
}

/**
 * POST handler for Paystack webhooks
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Missing Paystack signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await req.text();

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, PAYSTACK_SECRET || "")) {
      console.error("Invalid Paystack signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, data } = event;

    console.log(
      `Received webhook: ${eventType}`,
      JSON.stringify(data, null, 2)
    );

    // Handle different webhook events
    switch (eventType) {
      case "subscription.create":
        await handleSubscriptionCreate(data);
        break;

      case "subscription.disable":
      case "subscription.not_renew":
        await handleSubscriptionCancel(data);
        break;

      case "charge.success":
        await handleChargeSuccess(data);
        break;

      case "invoice.create":
        await handleInvoiceCreate(data);
        break;

      case "invoice.update":
      case "invoice.payment_failed":
        await handleInvoiceUpdate(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription.create event
 */
async function handleSubscriptionCreate(data: any) {
  try {
    const {
      subscription_code,
      customer,
      plan,
      authorization,
      email_token,
      status,
      next_payment_date,
    } = data;

    // Find user by email or customer code
    const user = await prisma.surfboardUser.findFirst({
      where: {
        OR: [
          { email: customer.email },
          {
            subscription: {
              some: {
                customerCode: customer.customer_code,
              },
            },
          },
        ],
      },
      include: {
        subscription: true, // Include the subscription if needed
      },
    });

    if (!user) {
      console.error("User not found for subscription:", customer.email);
      return;
    }

    // Find matching plan
    const matchingPlan = Object.values(SUBSCRIPTION_PLANS).find(
      (p) => p.planCode === plan.plan_code
    );

    if (!matchingPlan) {
      console.error("Unknown plan:", plan.plan_code);
      return;
    }

    // Calculate period
    const now = new Date();
    const { currentStart, currentEnd, nextCharge } = computePeriod(
      matchingPlan.interval as any,
      now
    );

    // Upsert subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        subCode: subscription_code,
        status: status === "active" ? "active" : status,
        planCode: plan.plan_code,
        planName: matchingPlan.name,
        interval: matchingPlan.interval,
        amount: plan.amount,
        customerCode: customer.customer_code,
        customerId: String(customer.id),
        authorization: authorization.authorization_code,
        emailToken: email_token,
        nextPaymentDate: next_payment_date
          ? new Date(next_payment_date)
          : nextCharge,
        currentStart,
        currentEnd,
        updatedAt: now,
      },
      create: {
        userId: user.id,
        subCode: subscription_code,
        status: status === "active" ? "active" : status,
        planCode: plan.plan_code,
        planName: matchingPlan.name,
        interval: matchingPlan.interval,
        amount: plan.amount,
        currency: "NGN",
        customerCode: customer.customer_code,
        customerId: String(customer.id),
        authorization: authorization.authorization_code,
        emailToken: email_token,
        nextPaymentDate: next_payment_date
          ? new Date(next_payment_date)
          : nextCharge,
        currentStart,
        currentEnd,
      },
    });

    // Create history entry
    await prisma.subscriptionHistory.create({
      data: {
        userId: user.id,
        reference: subscription_code,
        planCode: plan.plan_code,
        planName: matchingPlan.name,
        amount: plan.amount,
        interval: matchingPlan.interval,
        status: "active",
        eventType: "subscription.create",
        startDate: currentStart,
        endDate: currentEnd,
      },
    });

    console.log("Subscription created successfully:", subscription_code);
  } catch (error) {
    console.error("Error handling subscription.create:", error);
  }
}

/**
 * Handle subscription cancellation events
 */
async function handleSubscriptionCancel(data: any) {
  try {
    const { subscription_code } = data;

    const subscription = await prisma.subscription.findFirst({
      where: { subCode: subscription_code },
    });

    if (!subscription) {
      console.error("Subscription not found:", subscription_code);
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "canceled",
        cancelledAt: new Date(),
        nextPaymentDate: null,
      },
    });

    // Create history entry
    await prisma.subscriptionHistory.create({
      data: {
        userId: subscription.userId,
        reference: `cancel_${subscription_code}_${Date.now()}`,
        planCode: subscription.planCode,
        planName: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        status: "canceled",
        eventType: "subscription.disable",
        startDate: subscription.currentStart || new Date(),
        endDate: subscription.currentEnd || new Date(),
      },
    });

    console.log("Subscription cancelled:", subscription_code);
  } catch (error) {
    console.error("Error handling subscription cancel:", error);
  }
}

/**
 * Handle charge.success event (recurring payments)
 */
async function handleChargeSuccess(data: any) {
  try {
    const { reference, customer, plan, paid_at } = data;

    if (!plan) {
      // Not a subscription charge
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { customerCode: customer.customer_code },
          { customerId: String(customer.id) },
        ],
      },
    });

    if (!subscription) {
      console.error("Subscription not found for charge:", reference);
      return;
    }

    // Update last payment date
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        updatedAt: new Date(),
      },
    });

    // Create history entry for successful charge
    await prisma.subscriptionHistory.create({
      data: {
        userId: subscription.userId,
        reference,
        planCode: subscription.planCode,
        planName: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        status: "active",
        eventType: "charge.success",
        lastPaymentDate: paid_at ? new Date(paid_at) : new Date(),
        startDate: new Date(),
      },
    });

    console.log("Charge success recorded:", reference);
  } catch (error) {
    console.error("Error handling charge.success:", error);
  }
}

/**
 * Handle invoice.create event
 */
async function handleInvoiceCreate(data: any) {
  try {
    const { subscription } = data;

    if (!subscription) return;

    const sub = await prisma.subscription.findFirst({
      where: { subCode: subscription.subscription_code },
    });

    if (sub) {
      console.log(
        "Invoice created for subscription:",
        subscription.subscription_code
      );
      // You can add logic here to notify the user about upcoming charge
    }
  } catch (error) {
    console.error("Error handling invoice.create:", error);
  }
}

/**
 * Handle invoice updates and failed payments
 */
async function handleInvoiceUpdate(data: any) {
  try {
    const { subscription, paid } = data;

    if (!subscription) return;

    const sub = await prisma.subscription.findFirst({
      where: { subCode: subscription.subscription_code },
    });

    if (!sub) return;

    // If payment failed, update status
    if (!paid) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "past_due",
          updatedAt: new Date(),
        },
      });

      await prisma.subscriptionHistory.create({
        data: {
          userId: sub.userId,
          reference: `failed_${Date.now()}`,
          planCode: sub.planCode,
          planName: sub.planName,
          amount: sub.amount,
          interval: sub.interval,
          status: "past_due",
          eventType: "invoice.payment_failed",
          startDate: new Date(),
        },
      });

      console.log(
        "Payment failed for subscription:",
        subscription.subscription_code
      );
    }
  } catch (error) {
    console.error("Error handling invoice.update:", error);
  }
}

/**
 * Helper to compute subscription period
 */
function computePeriod(
  interval: "monthly" | "quarterly" | "annually",
  referenceDate: Date
) {
  const currentStart = new Date(referenceDate);

  if (interval === "monthly") {
    const currentEnd = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    const nextCharge = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth() + 1,
      1
    );
    return { currentStart, currentEnd, nextCharge };
  }

  if (interval === "quarterly") {
    const quarter = Math.floor(currentStart.getMonth() / 3);
    const currentEnd = new Date(
      currentStart.getFullYear(),
      quarter * 3 + 3,
      0,
      23,
      59,
      59
    );
    const nextCharge = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth() + 1,
      1
    );
    return { currentStart, currentEnd, nextCharge };
  }

  // Annually
  const currentEnd = new Date(currentStart.getFullYear(), 11, 31, 23, 59, 59);
  const nextCharge = new Date(currentStart.getFullYear() + 1, 0, 1);
  return { currentStart, currentEnd, nextCharge };
}
