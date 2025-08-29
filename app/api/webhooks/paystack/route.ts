// ────────────────────────────────────────────────────────────────────────────────
// File: app/api/paystack/webhook/route.ts
// Purpose: Paystack webhook — Node runtime only. Verifies signature over raw
//          bytes, resolves user by metadata (fallback email), updates Subscription,
//          and writes SubscriptionHistory idempotently using `reference`.
// Schema notes:
//   - SubscriptionHistory.reference (indexed, required) is the idempotency key.
//   - Subscription requires userId; resolve from event metadata.
//   - subCode might not be resolvable in app state; prefer event.subCode when present.
// ────────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────────
// Imports
// ────────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import { SUBSCRIPTION_PLANS } from "@/app/(projects)/(surboard)/utils/paystackSubscription";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PaystackWebhookType } from "@/types/PaystackWebhookType";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────
type Interval = "monthly" | "quarterly" | "annually";

interface PaystackWebhookEvent {
  event: string;
  data: {
    reference?: string;
    subscription_code?: string;
    amount?: number;
    customer?: {
      email?: string;
      customer_code?: string;
    };
    customer_email?: string;
    customer_code?: string;
    plan_code?: string;
    plan?: {
      plan_code?: string;
    };
    email_token?: string;
    authorization_code?: string;
    authorization?: {
      authorization_code?: string;
      reference?: string;
    };
    status?: string;
    paid_at?: string;
    createdAt?: string;
    updatedAt?: string;
    next_payment_date?: string;
    period_start?: string;
    period_end?: string;
    metadata?: any;
    [key: string]: any;
  };
}

// Run on Node, never cache, always dynamic
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ────────────────────────────────────────────────────────────────────────────────
// Error Handling
// ────────────────────────────────────────────────────────────────────────────────
class WebhookError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly context: Record<string, any> = {}
  ) {
    super(message);
    this.name = "WebhookError";
  }
}

function logError(error: unknown, context: Record<string, any> = {}) {
  if (error instanceof WebhookError) {
    console.error(`[Webhook Error ${error.statusCode}]: ${error.message}`, {
      ...error.context,
      ...context,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error(`[Webhook Error]: ${error.message}`, {
      ...context,
      stack: error.stack,
    });
  } else {
    console.error("[Webhook Error]: Unknown error occurred", {
      error,
      ...context,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Request Validation
// ────────────────────────────────────────────────────────────────────────────────
async function validateWebhookRequest(request: Request): Promise<{
  event: PaystackWebhookEvent;
  rawBody: Uint8Array;
}> {
  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    throw new WebhookError("Missing Paystack signature", 200);
  }

  const secret = getPaystackSecretForWebhook();
  if (!secret) {
    throw new WebhookError("Server configuration error", 200);
  }

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const isValid = verifySignatureRaw(rawBody, signature, secret);

  if (!isValid) {
    throw new WebhookError("Invalid signature", 200);
  }

  try {
    const bodyText = new TextDecoder().decode(rawBody);
    const event = JSON.parse(bodyText) as PaystackWebhookEvent;

    if (!event.event || !event.data) {
      throw new WebhookError("Invalid webhook payload", 200);
    }

    return { event, rawBody };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new WebhookError("Invalid JSON payload", 200);
    }
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
const safe = <T>(v: T | undefined | null): T | undefined =>
  v === undefined || v === null ? undefined : (v as T);

const parseDate = (v: unknown): Date | undefined =>
  v ? new Date(v as any) : undefined;

// Optimize plan lookup with a Map
const PLAN_LOOKUP = new Map(
  Object.values(SUBSCRIPTION_PLANS).map((p) => [p.planCode, p])
);

function planFromCode(planCode?: string) {
  return planCode ? PLAN_LOOKUP.get(planCode) : undefined;
}

function periodFor(interval: Interval, ref: Date) {
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOfQuarter = (d: Date) =>
    new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  const endOfQuarter = (d: Date) =>
    new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
  const endOfYear = (d: Date) => new Date(d.getFullYear(), 12, 0);
  const addDays = (d: Date, days: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

  if (interval === "monthly") {
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
  }
  if (interval === "quarterly") {
    const start = startOfQuarter(ref);
    const end = endOfQuarter(ref);
    return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
  }
  const start = startOfYear(ref);
  const end = endOfYear(ref);
  return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
}

function nairaFromKobo(kobo?: number) {
  if (typeof kobo !== "number" || Number.isNaN(kobo)) return undefined;
  return Math.round(kobo / 100);
}

function verifySignatureRaw(
  raw: Uint8Array,
  signature: string,
  secret: string
): boolean {
  const digestHex = createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(digestHex, "hex");
  const b = Buffer.from(signature, "hex");
  return (
    a.length === b.length &&
    timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
  );
}

function extractReference(data: any): string {
  return (
    data?.reference ||
    data?.invoice_code ||
    data?.transaction_reference ||
    data?.authorization?.reference ||
    data?.id?.toString?.() ||
    // Last resort: deterministic composite (not ideal but required by schema)
    [data?.subscription_code, data?.paid_at || data?.createdAt, data?.status]
      .filter(Boolean)
      .join(":")
  );
}

function extractPlanCode(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data.plan === "string") return data.plan;
  if (typeof data.plan?.plan_code === "string") return data.plan.plan_code;
  return undefined;
}

function extractInterval(planCode?: string, fallback?: string): Interval {
  const p = planFromCode(planCode || "");
  const iv = (p?.interval || fallback || "monthly") as Interval;
  return iv;
}

function extractUserIdFromMetadata(meta: any): string | undefined {
  if (!meta) return undefined;
  const direct =
    meta.userId || meta.user_id || meta.uid || meta.surfboard_user_id;
  if (direct && typeof direct === "string") return direct;
  const fields: any[] = Array.isArray(meta.custom_fields)
    ? meta.custom_fields
    : [];
  const fromField = fields.find((f) =>
    ["user_id", "userId", "uid", "surfboard_user_id"].includes(
      String(f?.variable_name || f?.key || "").toLowerCase()
    )
  );
  if (fromField?.value && typeof fromField.value === "string")
    return fromField.value;
  return undefined;
}

async function resolveUserId(data: any): Promise<string | undefined> {
  const meta = data?.metadata || {};
  const userId = extractUserIdFromMetadata(meta);
  if (userId) return userId;
  // Fallback: customer email → user
  const email: string | undefined = safe(
    data?.customer?.email || data?.customer_email || meta?.email
  );
  if (email) {
    const user = await prisma.surfboardUser.findUnique({ where: { email } });
    if (user) return user.id;
  }
  return undefined;
}

// Idempotency checks: prefer exact reference, otherwise legacy keys
async function historyExistsByReference(reference?: string) {
  if (!reference) return false;
  const found = await prisma.subscriptionHistory.findFirst({
    where: { reference },
  });
  return Boolean(found);
}

async function historyExistsLegacy(
  userId: string,
  reference: string,
  eventType: string,
  trxDate?: Date,
  amount?: number
) {
  if (!userId) return false;
  const found = await prisma.subscriptionHistory.findFirst({
    where: {
      userId,
      reference,
      eventType,
      ...(trxDate ? { startDate: trxDate } : {}),
      ...(typeof amount === "number" ? { amount } : {}),
    },
  });
  return Boolean(found);
}

// ────────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { event, rawBody } = await validateWebhookRequest(request);
    const { event: type, data } = event;
    const reference = extractReference(data);

    const secret = getPaystackSecretForWebhook();
    const signature = request.headers.get("x-paystack-signature");

    const body = (await request.json()) as PaystackWebhookType;
    const hash = createHmac("sha512", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    if (hash !== signature) {
      console.log("Webhook: Invalid signature");
      return Response.json(
        { message: "Invalid signature" },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log incoming webhook for debugging
    console.log(`[Webhook Received] ${type}`, {
      reference,
      eventType: type,
      subscriptionCode: data.subscription_code,
      customerEmail: data.customer?.email || data.customer_email,
    });

    // Resolve user id from metadata (or email fallback)
    const userId = await resolveUserId(data);
    if (!userId) {
      console.warn(`[Webhook Warning] Could not resolve user for event`, {
        type,
        reference,
        metadata: data.metadata,
      });
      // Continue processing as some events might not require a user
    }

    // Check for duplicate webhook
    if (await historyExistsByReference(reference)) {
      console.log(`[Webhook Deduped] Duplicate webhook received`, {
        reference,
        type,
      });
      return NextResponse.json({ ok: true, deduped: true });
    }

    // Process the webhook event
    try {
      // Common fields
      const subCode: string | undefined = safe(data.subscription_code);
      const planCode: string | undefined = extractPlanCode(data);
      const amountKobo: number | undefined = safe(data.amount);
      const customerCode: string | undefined = safe(
        data.customer?.customer_code || data.customer_code
      );
      const emailToken: string | undefined = safe(data.email_token);
      const authorizationCode: string | undefined = safe(
        data.authorization_code || data.authorization?.authorization_code
      );
      const status: string | undefined = safe(data.status);

      switch (type) {
        case "subscription.create": {
          if (!userId) return NextResponse.json({ ok: true }); // Cannot attach rows without user

          const p = planFromCode(planCode);
          const amountNaira = nairaFromKobo(amountKobo) ?? 0;
          const interval = extractInterval(planCode, "monthly");

          // Prefer event's subCode if present; otherwise try to keep existing row by customerCode
          if (userId) {
            await prisma.subscription.upsert({
              where: { userId },
              update: {
                userId: userId, // do not switch ownership silently
                provider: "paystack",
                planCode: planCode || "",
                planName: p?.name || "",
                interval: interval,
                amount: amountNaira,
                currency: "NGN",
                status: status || "active",
                customerCode: customerCode || "",
                authorization: authorizationCode || undefined,
                emailToken: emailToken || "",
                nextPaymentDate: parseDate(data.next_payment_date),
              },
              create: {
                userId,
                subCode,
                provider: "paystack",
                planCode: planCode || "",
                planName: p?.name || "",
                interval,
                amount: amountNaira,
                currency: "NGN",
                status: status || "active",
                customerCode: customerCode,
                authorization: authorizationCode,
                emailToken: emailToken,
                nextPaymentDate: parseDate(data.next_payment_date),
              },
            });
          } else {
            // No subCode and no existing row: cannot create Subscription (schema requires subCode)
            // We still record history against the user for audit.
          }

          const trxDate = parseDate(data.createdAt) || new Date();
          if (
            !(await historyExistsLegacy(
              userId,
              reference,
              type,
              trxDate,
              amountKobo
            ))
          ) {
            await prisma.subscriptionHistory.create({
              data: {
                reference,
                userId,
                planCode: planCode || "",
                planName: p?.name || "",
                amount: typeof amountKobo === "number" ? amountKobo : 0,
                interval,
                lastPaymentDate: undefined,
                startDate: parseDate(data.createdAt) || new Date(),
                endDate: parseDate(data.next_payment_date) || new Date(),
                status: status || "active",
                eventType: type,
              },
            });
          }
          return NextResponse.json({ ok: true });
        }

        case "charge.success": {
          if (!userId) return NextResponse.json({ ok: true });
          const paidAt = parseDate(data.paid_at) || new Date();
          const p = planFromCode(planCode || "");
          const interval = extractInterval(planCode || "", "monthly");
          const { periodStart, periodEnd, chargeDate } = periodFor(
            interval,
            paidAt
          );

          if (userId) {
            await prisma.subscription.upsert({
              where: { userId },
              update: {
                status: "active",
                currentStart: periodStart,
                currentEnd: periodEnd,
                nextPaymentDate: chargeDate,
                amount: nairaFromKobo(amountKobo) ?? 0,
                authorization: authorizationCode || undefined,
                customerCode: customerCode || "",
              },
              create: {
                userId,
                subCode,
                provider: "paystack",
                planCode: planCode || "",
                planName: p?.name || "",
                interval,
                amount: nairaFromKobo(amountKobo) ?? 0,
                currency: "NGN",
                status: "active",
                customerCode: customerCode,
                authorization: authorizationCode,
                currentStart: periodStart,
                currentEnd: periodEnd,
                nextPaymentDate: chargeDate,
              },
            });
          }

          await prisma.subscriptionHistory.create({
            data: {
              reference,
              userId,
              planCode: planCode || "",
              planName: p?.name || "",
              amount: typeof amountKobo === "number" ? amountKobo : 0,
              interval,
              lastPaymentDate: paidAt,
              startDate: periodStart,
              endDate: periodEnd,
              status: "active",
              eventType: type,
            },
          });
          return NextResponse.json({ ok: true });
        }

        case "invoice.payment_failed": {
          if (!userId) return NextResponse.json({ ok: true });
          const when = parseDate(data.next_payment_date) || new Date();

          if (userId) {
            await prisma.subscription.update({
              where: { userId },
              data: { status: "past_due" },
            });
          }

          await prisma.subscriptionHistory.create({
            data: {
              reference,
              userId,
              planCode: planCode || "",
              planName: planFromCode(planCode || "")?.name || "",
              amount: typeof amountKobo === "number" ? amountKobo : 0,
              interval: (planFromCode(planCode || "")?.interval ||
                "monthly") as Interval,
              lastPaymentDate: undefined,
              startDate: new Date(),
              endDate: new Date(),
              status: "past_due",
              eventType: type,
            },
          });
          return NextResponse.json({ ok: true });
        }

        case "subscription.disable":
        case "subscription.not_renew": {
          if (!userId) return NextResponse.json({ ok: true });
          const when = parseDate(
            data.disabledAt || data.updatedAt || Date.now()
          );

          if (userId) {
            await prisma.subscription.update({
              where: { userId },
              data: { status: "canceled", cancelledAt: when || undefined },
            });
          }

          await prisma.subscriptionHistory.create({
            data: {
              reference,
              userId,
              planCode: planCode || "",
              planName: planFromCode(planCode || "")?.name || "",
              amount: typeof amountKobo === "number" ? amountKobo : 0,
              interval: (planFromCode(planCode || "")?.interval ||
                "monthly") as Interval,
              lastPaymentDate: new Date(),
              startDate: new Date(),
              endDate: new Date(),
              status: "canceled",
              eventType: type,
            },
          });
          return NextResponse.json({ ok: true });
        }

        case "invoice.create": {
          if (!userId) return NextResponse.json({ ok: true });
          await prisma.subscriptionHistory.create({
            data: {
              reference,
              userId,
              planCode: planCode || "",
              planName: planFromCode(planCode || "")?.name || "",
              amount: typeof amountKobo === "number" ? amountKobo : 0,
              interval: (planFromCode(planCode || "")?.interval ||
                "monthly") as Interval,
              lastPaymentDate: undefined,
              startDate: parseDate(data.period_start) || new Date(),
              endDate: parseDate(data.period_end) || new Date(),
              status: "pending",
              eventType: type,
            },
          });
          return NextResponse.json({ ok: true });
        }

        default:
          return NextResponse.json({ ok: true, ignored: type });
      }
    } catch (processError) {
      logError(processError, {
        eventType: type,
        reference,
        userId,
      });
      throw new WebhookError("Failed to process webhook", 500, {
        eventType: type,
        reference,
      });
    }
  } catch (error) {
    if (error instanceof WebhookError) {
      logError(error);
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // For unexpected errors, log the full error but return a generic message
    logError(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
