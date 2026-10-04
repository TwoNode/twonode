// File: app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as mailer from "@/utils/email";
import {
  updatePropertyTransactionStatus,
  updateOneTimeTransactionStatus,
} from "@/reva/services/propertyRequestService";
import { notifyPaymentReceived as notifyRevaPaymentReceived } from "@/reva/services/notificationService";
import { verifyPayment as verifyGBCTicketPayment } from "@/gbc/services/ticketService";
import {
  applyPaymentPeriod,
  createOrUpdateSubscription,
} from "@/surfboard/services/subscriptionService";
import {
  SUBSCRIPTION_PLANS,
  type PlanId,
} from "@/app/(projects)/(surfboard)/utils/paystackSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────── Shared Prisma singleton ───────────────────────────
import prisma from "@/lib/prisma";

// ─────────────────────────── Types ───────────────────────────
export type PaystackWebhookPayload = { event: string; data: any };
export type Platform = "surfboard" | "reva" | "gbc" | "unknown";

export type SubscriptionData = {
  id?: number;
  status?: string;
  subscription_code?: string;
  email_token?: string;
  customer?: { id?: number; customer_code?: string; email?: string };
  plan?:
    | string
    | { plan_code?: string; name?: string; interval?: string; amount?: number };
  next_payment_date?: string | null;
  authorization?: { authorization_code?: string };
  amount?: number;
};

export type InvoiceData = {
  id?: number;
  invoice_code?: string;
  status?: string;
  amount?: number;
  customer?: string | number | null;
  paid_at?: string | null;
  currency?: string;
  subscription?: any;
};

export type ChargeSuccessData = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  customer?: { id?: number; email?: string; customer_code?: string };
  authorization?: { authorization_code?: string };
  plan?:
    | string
    | { plan_code?: string; name?: string; interval?: string; amount?: number };
  plan_object?: {
    plan_code?: string;
    name?: string;
    interval?: string;
    amount?: number;
  };
  subscription?: any;
  metadata?: Record<string, any> & {
    platform?: string;
    isAuthenticated?: boolean;
    reference?: string;
    subscription_plan_id?: string;
    custom_fields?: Array<{
      display_name?: string;
      variable_name?: string;
      value?: string;
    }>;
  };
};

// ─────────────────────────── Route ───────────────────────────
export async function POST(req: NextRequest) {
  console.log("Starting webhook processing");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "___NS__" }, { status: 400 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    await sendWebhookEmail({
      to: process.env.WEBHOOK_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      platform: "surfboard",
      event: "Invalid JSON",
      signature,
      headers: {},
      payload: { raw: raw },
      diff: { changed: [] },
      entityKey: "",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifySignature(raw, signature, secret)) {
    await sendWebhookEmail({
      to: process.env.WEBHOOK_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      platform: "surfboard",
      event: "Invalid signature",
      signature,
      headers: {},
      payload: { raw: raw },
      diff: { changed: [] },
      entityKey: "",
    });

    return NextResponse.json({ error: "___I___" }, { status: 401 });
  }

  const { event, data } = payload;
  const platform = detectPlatform(event, data);

  // Email with diff
  try {
    const headersObj = Object.fromEntries(req.headers.entries());
    const entityKey = deriveEntityKey(event, data);
    const prev = await fetchPreviousEvent(entityKey);
    const diff = buildDiff(prev?.payload?.data ?? {}, data ?? {});
    await sendWebhookEmail({
      to: process.env.WEBHOOK_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      platform,
      event,
      signature,
      headers: headersObj,
      payload,
      diff,
      entityKey,
    });
  } catch (e) {
    console.warn("[webhook-email] failed", e);
  }

  // DB idempotency
  const ledgerId = await beginEvent({ signature, event, raw, platform });
  if (ledgerId === null)
    return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (platform === "surfboard") {
      await handleSurfboard(event, data as any);
    } else if (platform === "reva") {
      await handleReva(event, data as any);
    } else if (platform === "gbc") {
      await handleGBC(event, data as any);
    } else {
      await onUnhandled(event, data);
    }
    await completeEvent(ledgerId, "ok");
  } catch (err: any) {
    console.error("[paystack-webhook] error", err);
    await failEvent(ledgerId, String(err?.message || err));
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ─────────────────────────── Verify ───────────────────────────
function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody, "utf8")
    .digest("hex");
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

// ─────────────────────────── Platform detect ───────────────────────────
function detectPlatform(event: string, data: any): Platform {
  const meta = normalizeMetadata(
    (data && (data.metadata ?? data.customer?.metadata ?? undefined)) as unknown
  );

  let mPlatform =
    typeof (meta as any)?.platform === "string"
      ? (meta as any).platform.toLowerCase()
      : undefined;

  // Fallback to custom_fields if not at top level
  if (!mPlatform && (meta as any).custom_fields) {
    mPlatform = getField(
      (meta as any).custom_fields,
      "platform"
    )?.toLowerCase();
  }

  // 1) Strict metadata match
  if (mPlatform === "surfboard") return "surfboard";
  if (mPlatform === "reva") return "reva";
  if (mPlatform === "gbc") return "gbc";

  // 2) Event-type based defaults (mostly Surfboard)
  if (event.startsWith("subscription.")) return "surfboard";
  if (event.startsWith("invoice.")) return "surfboard";

  // 3) Charge success heuristics
  if (event === "charge.success") {
    // Check reference prefixes first (very reliable)
    const reference = String(data.reference || (meta as any).reference || "");
    if (reference.startsWith("REVA_") || reference.startsWith("reva_"))
      return "reva";
    if (reference.toUpperCase().includes("GBC")) return "gbc";
    if (reference.startsWith("SurfCoD") || reference.startsWith("SurfCoDRef_"))
      return "surfboard";
    if (reference.startsWith("SURFBOARD_SUB_") || reference.startsWith("SURF_"))
      return "surfboard";

    // Subscription markers
    const hasSubMarkers = Boolean(
      (data as any)?.subscription ||
      (data as any)?.plan ||
      (data as any)?.plan_object
    );

    // If it has subscription markers but NO metadata, we check if it's a known Surfboard plan
    if (hasSubMarkers) {
      const { planCode } = extractPlan(data);
      const isSurfPlan = isSurfboardPlan(planCode);
      if (isSurfPlan) return "surfboard";
    }

    // Fallback for metadata-based reference
    const mRef =
      (typeof (meta as any)?.reference === "string" &&
        (meta as any).reference) ||
      undefined;
    if (mRef) return "reva";
  }

  // 4) Metadata keys (for GBC and others)
  if (meta.ticketNumber || meta.ticketType || meta.allTicketNumbers)
    return "gbc";

  return "unknown";
}

// ─────────────────────────── Ledger (DB idempotency) ───────────────────────────
async function beginEvent(args: {
  signature: string;
  event: string;
  raw: string;
  platform: Platform;
}): Promise<string | null> {
  if (!prisma?.webhookEvent) return "noop";
  try {
    const parsed = JSON.parse(args.raw);
    const entityKey = deriveEntityKey(args.event, parsed?.data);
    try {
      const rec = await prisma.webhookEvent.create({
        data: {
          signature: args.signature,
          event: args.event,
          platform: args.platform,
          payload: parsed,
          entityKey: entityKey ?? null,
          receivedAt: new Date(),
          status: "pending",
        },
        select: { id: true },
      });
      return rec.id as string;
    } catch (e: any) {
      if (
        typeof e?.message === "string" &&
        e.message.includes("Unknown arg `entityKey`")
      ) {
        const rec = await prisma.webhookEvent.create({
          data: {
            signature: args.signature,
            event: args.event,
            platform: args.platform,
            payload: parsed,
            receivedAt: new Date(),
            status: "pending",
          },
          select: { id: true },
        });
        return rec.id as string;
      }
      if (e?.code === "P2002") return null;
      throw e;
    }
  } catch (e: any) {
    if (e?.code === "P2002") return null;
    throw e;
  }
}

async function completeEvent(id: string, status: string) {
  if (prisma?.webhookEvent && id !== "noop") {
    await prisma.webhookEvent.update({
      where: { id },
      data: { status, processedAt: new Date() },
    });
  }
}

async function failEvent(id: string, error: string) {
  if (prisma?.webhookEvent && id !== "noop") {
    await prisma.webhookEvent.update({
      where: { id },
      data: { status: "error", error, processedAt: new Date() },
    });
  }
}

// ─────────────────────────── Surfboard ───────────────────────────
async function handleSurfboard(
  event: string,
  data: SubscriptionData | InvoiceData | ChargeSuccessData
) {
  switch (event) {
    case "subscription.create":
      await onSubscriptionCreate(data as SubscriptionData);
      break;
    case "subscription.enable":
      await onSubscriptionEnable(data as SubscriptionData);
      break;
    case "subscription.disable":
    case "subscription.not_renew":
      await onSubscriptionDisable(data as SubscriptionData);
      break;
    case "invoice.payment_failed":
      await onInvoicePaymentFailed(data as InvoiceData);
      break;
    case "invoice.create":
    case "invoice.update":
      await onInvoiceInformational(event, data as InvoiceData);
      break;
    case "charge.success":
      // Check if this is a certificate payment, a one-time (non-recurring)
      // subscription payment, or a recurring subscription renewal — in that
      // order, since a one-time subscription charge has no plan/plan_object/
      // subscription and would otherwise be silently skipped by
      // onSubscriptionChargeSuccess's "not a subscription charge" guard.
      if (isCertificatePayment(data as ChargeSuccessData)) {
        await onCertificatePaymentSuccess(data as ChargeSuccessData);
      } else if (isOneTimeSubscriptionPayment(data as ChargeSuccessData)) {
        await onOneTimeSubscriptionChargeSuccess(data as ChargeSuccessData);
      } else {
        await onSubscriptionChargeSuccess(data as ChargeSuccessData);
      }
      break;
    default:
      await onUnhandled(event, data as any);
      break;
  }
}

// ---- Helpers: common extraction ----
function extractPlan(data: SubscriptionData | ChargeSuccessData) {
  // Try plan_object first (from charge.success with subscription)
  const planObj = (data as any)?.plan_object;
  if (planObj) {
    return {
      planCode: planObj.plan_code,
      planName: planObj.name,
      interval: planObj.interval,
      amount: planObj.amount,
    };
  }

  // Try plan field
  const planField = (data as any)?.plan;
  if (typeof planField === "string") {
    return {
      planCode: planField,
      planName: planField,
      interval: undefined,
      amount: undefined,
    };
  }
  if (planField && typeof planField === "object") {
    return {
      planCode: planField.plan_code,
      planName: planField.name,
      interval: planField.interval,
      amount: planField.amount,
    };
  }

  // Try subscription.plan
  const subPlan = (data as any)?.subscription?.plan;
  if (subPlan) {
    return {
      planCode: subPlan.plan_code,
      planName: subPlan.name,
      interval: subPlan.interval,
      amount: subPlan.amount,
    };
  }

  return {
    planCode: undefined,
    planName: "",
    interval: undefined,
    amount: undefined,
  };
}

async function findSurfboardUserIdFromEvent(data: any): Promise<string | null> {
  if (!prisma) return null;
  const email: string | undefined = data?.customer?.email;
  const customerCode: string | undefined =
    data?.customer?.customer_code || data?.customerCode;
  const subCode: string | undefined =
    data?.subscription_code ||
    data?.subscription?.subscription_code ||
    data?.subCode;

  // 1) existing subscription by subCode
  if (subCode) {
    const sub = await prisma.subscription.findFirst({ where: { subCode } });
    if (sub?.userId) return sub.userId;
  }
  // 2) existing subscription by customerCode
  if (customerCode) {
    const sub = await prisma.subscription.findFirst({
      where: { customerCode },
    });
    if (sub?.userId) return sub.userId;
  }

  // 3) user by email - Only if we have some confidence it's Surfboard
  const meta = normalizeMetadata(data.metadata || data.customer?.metadata);
  const reference = String(data.reference || meta.reference || "");
  let platform = String(meta.platform || "").toLowerCase();

  // Fallback to custom_fields
  if (!platform && meta.custom_fields) {
    platform = getField(meta.custom_fields, "platform")?.toLowerCase() || "";
  }

  const isSurfboardLikely =
    platform === "surfboard" ||
    reference.startsWith("SURFBOARD_SUB_") ||
    reference.startsWith("SURF_") ||
    isSurfboardPlan(extractPlan(data).planCode);

  if (email && isSurfboardLikely) {
    const user = await prisma.surfboardUser.findUnique({ where: { email } });
    if (user?.id) return user.id;
  }
  return null;
}

// ---- Subscription: create ----
// Syncs Paystack's identity/billing fields (subscription code, email token,
// customer, plan, next charge date) onto the row. It deliberately does NOT
// touch the paid period: time is bought by a payment, and a payment is
// credited exactly once, through applyPaymentPeriod, keyed by its reference
// (the client's verify call and the charge.success webhook). This event carries
// no transaction reference, so crediting from here as well would double-count
// the same payment now that periods add up instead of replacing each other.
// A row that doesn't exist yet is created with an empty period (ending now);
// the payment's own credit extends it.
async function onSubscriptionCreate(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn("⚠️ subscription.create: SurfboardUser not found");
    return;
  }

  const {
    planCode,
    planName,
    interval,
    amount: planAmount,
  } = extractPlan(data);
  const amountKobo = data.amount ?? planAmount ?? 0;
  const nextDate = data.next_payment_date
    ? new Date(data.next_payment_date)
    : null;
  const now = new Date();

  const fields = {
    provider: "paystack",
    email: data.customer?.email ?? undefined,
    customerCode: data.customer?.customer_code ?? undefined,
    customerId: data.customer?.id ? String(data.customer.id) : undefined,
    emailToken: data.email_token ?? undefined,
    subCode: data.subscription_code ?? undefined,
    planCode: planCode ?? "",
    planName: planName ?? "",
    interval: interval ?? "monthly",
    amount: typeof amountKobo === "number" ? amountKobo : 0,
    status: data.status ?? "active",
    authorization: data.authorization?.authorization_code ?? undefined,
    nextPaymentDate: nextDate ?? undefined,
    cancelledAt: null,
    platform: "surfboard",
  };

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: fields,
    create: {
      userId,
      ...fields,
      email: fields.email ?? null,
      customerCode: fields.customerCode ?? null,
      customerId: fields.customerId ?? null,
      emailToken: fields.emailToken ?? null,
      subCode: fields.subCode ?? null,
      currency: "NGN",
      currentStart: now,
      currentEnd: now,
    },
  });

  // History
  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: data.subscription_code || `SUB-${Date.now()}`,
      planCode: sub.planCode,
      planName: sub.planName,
      amount: sub.amount,
      interval: sub.interval,
      status: sub.status,
      eventType: "subscription.create",
      startDate: sub.currentStart,
      endDate: sub.currentEnd,
      lastPaymentDate: now,
    },
  });

  console.log(
    `✅ subscription.create: ${data.subscription_code} for user ${userId}`
  );
}

// ---- Subscription: enable ----
async function onSubscriptionEnable(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn("⚠️ subscription.enable: SurfboardUser not found");
    return;
  }

  await prisma.subscription.update({
    where: { userId },
    data: { status: "active", cancelledAt: null },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: data.subscription_code || `SUB-${Date.now()}`,
      planCode: "",
      planName: "",
      amount: 0,
      interval: "monthly",
      status: "active",
      eventType: "subscription.enable",
      startDate: new Date(),
    },
  });

  console.log(`✅ subscription.enable: ${data.subscription_code}`);
}

// ---- Subscription: disable ----
async function onSubscriptionDisable(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn("⚠️ subscription.disable: SurfboardUser not found");
    return;
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "canceled",
      cancelledAt: new Date(),
      nextPaymentDate: null,
    },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: data.subscription_code || `SUB-${Date.now()}`,
      planCode: "",
      planName: "",
      amount: 0,
      interval: "monthly",
      status: "canceled",
      eventType: "subscription.disable",
      startDate: new Date(),
    },
  });

  console.log(`✅ subscription.disable: ${data.subscription_code}`);
}

// ---- Invoice: failed → past_due ----
async function onInvoicePaymentFailed(data: InvoiceData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn("⚠️ invoice.payment_failed: SurfboardUser not found");
    return;
  }

  await prisma.subscription.update({
    where: { userId },
    data: { status: "past_due" },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: String(data.invoice_code ?? Date.now()),
      planCode: "",
      planName: "",
      amount: typeof data.amount === "number" ? data.amount : 0,
      interval: "monthly",
      status: "past_due",
      eventType: "invoice.payment_failed",
      lastPaymentDate: null,
    },
  });

  console.log(`⚠️ invoice.payment_failed: ${data.invoice_code}`);
}

// ---- Recurring charge success (renewal) ----
// ---- One-time (non-recurring) subscription payment ----
// Defense-in-depth backstop alongside the client-driven verifyOneTimeSubscription
// call (app/api/v1/surfboard/subscription/verify-onetime/route.ts) — mirrors
// onSubscriptionChargeSuccess below but reads planId from metadata (there's
// no plan_object/subscription on a no-`plan` charge) and goes through the
// upsert-safe createOrUpdateSubscription rather than a raw update, since this
// webhook can in principle arrive before the client's own verify call does.
async function onOneTimeSubscriptionChargeSuccess(data: ChargeSuccessData) {
  if (!prisma) return;

  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn(
      "⚠️ charge.success (one-time subscription): SurfboardUser not found"
    );
    return;
  }

  const meta = data.metadata ?? {};
  const planId = meta.plan_id as PlanId | undefined;
  if (!planId || !SUBSCRIPTION_PLANS[planId]) {
    console.warn(
      `⚠️ charge.success (one-time subscription): missing/invalid plan_id in metadata (${planId})`
    );
    return;
  }

  const customerId = data.customer?.id;
  const customerCode = data.customer?.customer_code;
  const authorization = data.authorization?.authorization_code ?? "";
  const paidAt = data.paid_at;

  await createOrUpdateSubscription({
    userId,
    reference: data.reference || `REF-${Date.now()}`,
    subCode: "",
    emailToken: "",
    planId,
    customerCode: customerCode ?? "",
    customerId: customerId ? String(customerId) : "",
    authorization,
    status: "active",
    paidAt,
    skipHistory: false,
    provider: "paystack_onetime",
  });

  console.log(
    `✅ charge.success (one-time subscription): ${data.reference} for user ${userId}`
  );
}

async function onSubscriptionChargeSuccess(data: ChargeSuccessData) {
  if (!prisma) return;

  // Only handle if it's a subscription charge
  if (!data.plan && !data.plan_object && !data.subscription) {
    console.log("⏭️ charge.success: not a subscription charge, skipping");
    return;
  }

  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) {
    console.warn("⚠️ charge.success: SurfboardUser not found");
    return;
  }

  // Safety check: Ensure the plan code belongs to Surfboard or platform is explicitly surfboard
  const {
    planCode,
    planName,
    interval,
    amount: planAmount,
  } = extractPlan(data);

  const meta = data.metadata ?? {};
  if (meta.platform !== "surfboard" && !isSurfboardPlan(planCode)) {
    console.log(
      `⏭️ charge.success: Skipping as it doesn't match a Surfboard plan or platform (${planCode})`
    );
    return;
  }
  const amountKobo = data.amount ?? planAmount ?? 0;
  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  const reference = data.reference || `REF-${Date.now()}`;

  // Get next payment date from subscription object, else the end of the
  // period this payment buys.
  const nextDateStr: string | undefined = data?.subscription?.next_payment_date;

  // Credits the payment exactly once and ADDS to any paid time that remains
  // (see applyPaymentPeriod). A row that doesn't exist yet is created, so a
  // first charge arriving before the client's verify call isn't lost.
  const result = await applyPaymentPeriod({
    userId,
    reference,
    eventType: "subscription.success",
    paidAt,
    periodInterval: (interval || "monthly") as
      "monthly" | "quarterly" | "annually",
    row: {
      provider: "paystack",
      status: "active",
      planCode: planCode ?? undefined,
      planName: planName ?? undefined,
      interval: interval ?? undefined,
      amountKobo: typeof amountKobo === "number" ? amountKobo : undefined,
      authorization: data.authorization?.authorization_code ?? undefined,
      customerCode: data.customer?.customer_code ?? undefined,
      customerId: data.customer?.id ? String(data.customer.id) : undefined,
      nextPaymentDate: nextDateStr ? new Date(nextDateStr) : undefined,
    },
  });

  if (result.status === "used_by_another_account") {
    console.error(
      `⚠️ charge.success: payment ${reference} was already applied to a different account than ${userId} — not applied again`
    );
    return;
  }

  console.log(
    result.status === "already_applied"
      ? `ℹ️ charge.success (renewal): ${reference} already applied (idempotent)`
      : `✅ charge.success (renewal): ${reference} for user ${userId}`
  );
}

// ---- Invoice informational ----
async function onInvoiceInformational(event: string, data: InvoiceData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) return;

  // If invoice failed, mark subscription as past_due
  if (data.status === "failed") {
    await prisma.subscription.update({
      where: { userId },
      data: { status: "past_due" },
    });
  }

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: String(data.invoice_code ?? Date.now()),
      planCode: "",
      planName: "",
      amount: typeof data.amount === "number" ? data.amount : 0,
      interval: "monthly",
      status: data.status ?? "pending",
      eventType: event,
      lastPaymentDate: null,
    },
  });

  console.log(`ℹ️ ${event}: ${data.invoice_code} (Status: ${data.status})`);
}

// ─────────────────────────── Reva (one‑time) ───────────────────────────
/**
 * Migrated off revaActions2.ts (which was dead everywhere else in the repo
 * but live here — see docs/development-history/phases/phase-3-reva.md's
 * "corrections" section) onto propertyRequestService.ts/notificationService.ts.
 * Rewritten more defensively than the version it replaces, in the same
 * spirit as this file's own onCertificatePaymentSuccess (the Surfboard
 * equivalent) rather than just swapping imports 1:1 — this file processes
 * three products' webhooks, so a REVA-specific bug here has historically
 * been easy to miss:
 *  - Uses normalizeMetadata() (the same helper detectPlatform() above
 *    already relies on) instead of reading data.metadata directly — the
 *    source read it raw, so a stringified metadata payload would have
 *    routed correctly but then failed to parse here.
 *  - Looks the record up first and returns cleanly (no throw, no retry)
 *    if it's missing or already Paid, instead of letting a bare
 *    optional-chained call silently no-op on a missing function — a real
 *    misconfiguration (e.g. a bad import) now surfaces as a thrown error
 *    the outer handler logs and Paystack retries, not silence.
 *  - Reconciles the paid amount against the record's totalCost the same
 *    way onCertificatePaymentSuccess already does for Surfboard — logs a
 *    mismatch rather than failing, since Paystack's signature already
 *    guarantees the payload is authentic and a stuck payer is worse than
 *    a flagged-for-review one.
 *  - Passes the already-updated row straight into notifyPaymentReceived
 *    instead of the source's separate re-fetch call.
 */
/** Exported for direct unit testing (see app/api/webhooks/__tests__/) — not called from outside this file otherwise. */
export async function handleReva(event: string, data: ChargeSuccessData) {
  if (event !== "charge.success") return onUnhandled(event, data as any);

  const meta = normalizeMetadata(data.metadata);
  const reference = (meta.reference ||
    getField(meta.custom_fields, "reference") ||
    data.reference) as string | undefined;
  const isAuthenticated = Boolean(
    meta.isAuthenticated ||
    getField(meta.custom_fields, "isAuthenticated") === "true"
  );

  if (!reference) {
    console.warn("[reva-webhook] charge.success missing reference", { event });
    return;
  }

  const existing = isAuthenticated
    ? await prisma.property.findUnique({ where: { reference } })
    : await prisma.oneTimeUserProperty.findUnique({ where: { reference } });

  if (!existing) {
    console.warn(
      `[reva-webhook] no ${isAuthenticated ? "Property" : "OneTimeUserProperty"} found for reference ${reference} — nothing to update`
    );
    return;
  }

  if (existing.paymentStatus === "Paid") {
    console.log(
      `[reva-webhook] ${reference} already marked Paid (idempotent, likely already confirmed client-side)`
    );
    return;
  }

  const expectedKobo = Math.round((existing.totalCost ?? 0) * 100);
  const paidKobo = data.amount ?? 0;
  if (Math.abs(expectedKobo - paidKobo) > 1) {
    console.error(`[reva-webhook] amount mismatch for ${reference}`, {
      expectedKobo,
      paidKobo,
    });
    // Log but don't fail — matches onCertificatePaymentSuccess's own choice
    // for the same situation: still confirm the payment for manual review
    // rather than leaving a real payer stuck.
  }

  const updated = isAuthenticated
    ? await updatePropertyTransactionStatus(
        reference,
        "Processing",
        "Paid",
        "Payment completed successfully",
        null
      )
    : await updateOneTimeTransactionStatus(
        reference,
        "Processing",
        "Paid",
        "Payment completed successfully",
        null
      );

  await notifyRevaPaymentReceived(
    updated,
    isAuthenticated ? ((updated as any).userId ?? undefined) : undefined
  );

  console.log(`✅ [reva-webhook] charge.success confirmed: ${reference}`);
}

/**
 * Closes the gap this file's platform dispatch had for GBC — events used to
 * just fall through to onUnhandled(), so a ticket's only path from PENDING
 * to COMPLETED was the success page's client-side redirect actually
 * reaching the browser; if that redirect never happened (closed tab,
 * network failure mid-redirect, abandoned after paying), the ticket sat
 * PENDING forever with no fallback. Wired onto ticketService.verifyPayment
 * (spec step 11) — the same function the success page calls, so this is a
 * safety net using the identical verification logic, not a second
 * implementation to keep in sync.
 *
 * The success page (gbc/tickets/success/page.tsx) itself still calls the
 * old verifyGBCPayment from ticket-actions.ts, not repointed here — matches
 * this phase's established scope (unmigrated consumers stay on the legacy
 * action file until their own dedicated repointing pass). Both paths are
 * individually idempotent (Paystack's own verify call, plus the
 * already-COMPLETED check below), so having two call sites during the
 * transition is safe.
 */
export async function handleGBC(event: string, data: ChargeSuccessData) {
  if (event !== "charge.success") return onUnhandled(event, data as any);

  const reference = data.reference;
  if (!reference) {
    console.warn("[gbc-webhook] charge.success missing reference", { event });
    return;
  }

  const tickets = await prisma.gBCTicket.findMany({
    where: { paymentRef: reference },
  });
  if (
    tickets.length > 0 &&
    tickets.every((t) => t.paymentStatus === "COMPLETED")
  ) {
    console.log(
      `[gbc-webhook] ${reference} already fully COMPLETED (idempotent) — skipping re-verify`
    );
    return;
  }

  await verifyGBCTicketPayment(reference);
  console.log(`✅ [gbc-webhook] charge.success confirmed: ${reference}`);
}

// ─────────────────────────── Certificate of Deposit (one-time) ───────────────────────────
async function onCertificatePaymentSuccess(data: ChargeSuccessData) {
  if (!prisma) return;

  const reference = extractBatchReference(data);
  if (!reference) {
    console.warn("⚠️ certificate charge.success: missing reference");
    return;
  }

  try {
    // Find batch by payment reference (userPaymentRef field)
    const batch = await prisma.certificateOfDepositBatch.findFirst({
      where: {
        userPaymentRef: reference,
      },
      select: {
        id: true,
        batchCode: true,
        totalAmount: true,
        paymentStatus: true,
      },
    });

    if (!batch) {
      console.warn(
        `⚠️ certificate charge.success: batch not found for ref ${reference}`
      );
      return;
    }

    // Check if already processed (idempotency)
    if (batch.paymentStatus === "LASG_PAID") {
      console.log(
        `ℹ️ certificate charge.success: batch ${batch.batchCode} already marked as paid (idempotent)`
      );
      return;
    }

    // Verify payment amount matches (with tolerance for rounding)
    // Database stores amount in NAIRA, Paystack sends in KOBO
    const expectedAmountKobo = Math.trunc(batch.totalAmount * 100);
    const paidAmountKobo = data.amount ?? 0;
    const amountDiff = Math.abs(expectedAmountKobo - paidAmountKobo);

    if (amountDiff > 1) {
      // Allow 1 kobo difference for rounding
      console.error("⚠️ Certificate payment amount mismatch:", {
        reference,
        batchCode: batch.batchCode,
        expectedKobo: expectedAmountKobo,
        paidKobo: paidAmountKobo,
        differenceKobo: amountDiff,
      });
      // Log but don't fail - we still want to mark as paid for manual review
    }

    // Update batch status
    const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
    await prisma.certificateOfDepositBatch.update({
      where: { id: batch.id },
      data: {
        paymentStatus: "LASG_PAID",
        userPaymentDate: paidAt,
      },
    });

    console.log(
      `✅ certificate charge.success: ${reference} for batch ${
        batch.batchCode
      } (₦${(paidAmountKobo / 100).toFixed(2)})`
    );
  } catch (error) {
    console.error(
      `❌ Error processing certificate payment for ${reference}:`,
      error
    );
    // Don't throw - let the webhook complete successfully even if update fails
    // The payment was successful, we just couldn't update the database
  }
}

// ─────────────────────────── Utils ───────────────────────────
function normalizeMetadata(input: unknown): Record<string, any> {
  if (!input || input === 0) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as Record<string, any>;
  return {};
}

/**
 * Pre-existing bug found while live-verifying the REVA repoint (unrelated
 * to REVA specifically — hits every platform's diagnostic email): diffToHtml
 * passes JSON.stringify(before/after) straight through, but
 * JSON.stringify(undefined) returns undefined (not the string "undefined")
 * whenever a diffed field is new/removed between events — the very common
 * case of a first-ever webhook for an entity, where every field is "new".
 * escapeHtml(undefined).replace(...) then threw, caught by the caller's own
 * try/catch so it never broke webhook processing, but silently dropped the
 * diagnostic email's diff table. Coercing to a string here fixes it at the
 * one shared choke point instead of at each of escapeHtml's 6 call sites.
 */
function escapeHtml(str: unknown) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}

function getField(
  customFields:
    | Array<{ variable_name?: string; display_name?: string; value?: any }>
    | undefined,
  key: string
): string | undefined {
  if (!customFields?.length) return undefined;
  const lower = key.toLowerCase();
  const match =
    customFields.find((f) => f.variable_name?.toLowerCase() === lower) ||
    customFields.find((f) => f.display_name?.toLowerCase() === lower);
  const val = match?.value;
  return typeof val === "string" ? val : val != null ? String(val) : undefined;
}

// ─────────────────────────── Certificate Payment Helpers ───────────────────────────
/**
 * Checks if a charge.success event is for a Certificate of Deposit payment
 */
function isSurfboardPlan(planCode?: string): boolean {
  if (!planCode) return false;
  const surfMonthly = process.env.SURF_MONTHLY;
  const surfQuarterly = process.env.SURF_QUARTERLY;
  const surfYearly = process.env.SURF_YEARLY;

  // Exact matches
  if (
    planCode === surfMonthly ||
    planCode === surfQuarterly ||
    planCode === surfYearly
  ) {
    return true;
  }

  // Common identifiers or prefixes
  if (planCode.includes("SURF_")) return true;

  return false;
}

function isOneTimeSubscriptionPayment(data: ChargeSuccessData): boolean {
  const meta = data.metadata ?? {};

  if (meta.type === "surfboard_onetime_subscription") return true;

  const ref = data.reference ?? "";
  if (ref.startsWith("SURFBOARD_ONETIME_SUB_")) return true;

  return false;
}

function isCertificatePayment(data: ChargeSuccessData): boolean {
  const meta = data.metadata ?? {};

  // Primary check: metadata type
  if (
    meta.type === "certificate_of_deposit" ||
    meta.platform === "surfboard_cod"
  ) {
    return true;
  }

  // Fallback: reference pattern
  const ref = data.reference ?? "";
  if (
    ref.startsWith("SurfCoD_") ||
    ref.startsWith("SurfCoDRef_") ||
    ref.startsWith("SurfCoDRef")
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts batch payment reference from charge data
 */
function extractBatchReference(data: ChargeSuccessData): string | null {
  // Try metadata first
  const metaRef = data.metadata?.reference;
  if (metaRef && typeof metaRef === "string") return metaRef;

  // Fallback to payment reference
  return data.reference ?? null;
}

// —— DIFF helpers ——
function flatEntries(obj: any, prefix = ""): Array<[string, any]> {
  const out: Array<[string, any]> = [];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v))
        out.push(...flatEntries(v, key));
      else out.push([key, v]);
    }
  }
  return out;
}

function buildDiff(prev: any, curr: any) {
  const before = new Map(flatEntries(prev));
  const after = new Map(flatEntries(curr));
  const changed: Array<{ path: string; before: any; after: any }> = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const k of keys) {
    const a = before.get(k);
    const b = after.get(k);
    const same = a === b || JSON.stringify(a) === JSON.stringify(b);
    if (!same) changed.push({ path: k, before: a, after: b });
  }
  return { changed };
}

function diffToHtml(diff: {
  changed: Array<{ path: string; before: any; after: any }>;
}) {
  if (!diff.changed.length)
    return "<p>No differences (first event or identical payload).</p>";
  const rows = diff.changed
    .slice(0, 50)
    .map(
      ({ path, before, after }) =>
        `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb">${escapeHtml(
          path
        )}</td>` +
        `<td style="padding:6px 8px;border:1px solid #e5e7eb"><pre style="margin:0">${escapeHtml(
          JSON.stringify(before, null, 2)
        )}</pre></td>` +
        `<td style="padding:6px 8px;border:1px solid #e5e7eb"><pre style="margin:0">${escapeHtml(
          JSON.stringify(after, null, 2)
        )}</pre></td></tr>`
    )
    .join("");
  return (
    `<table style="border-collapse:collapse;font-family:ui-sans-serif,system-ui"><thead><tr>` +
    `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Field</th>` +
    `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb">Before</th>` +
    `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb">After</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

function diffToText(diff: {
  changed: Array<{ path: string; before: any; after: any }>;
}) {
  if (!diff.changed.length)
    return "No differences (first event or identical payload).";
  return diff.changed
    .slice(0, 50)
    .map(
      ({ path, before, after }) => `- ${path}:
  before: ${JSON.stringify(before)}
  after:  ${JSON.stringify(after)}`
    )
    .join("\n");
}

function deriveEntityKey(event: string, data: any): string | null {
  const sub = data?.subscription_code || data?.subscription?.subscription_code;
  if (sub) return `sub:${sub}`;
  const ref = data?.reference || data?.invoice_code;
  if (ref) return `ref:${ref}`;
  const cust = data?.customer?.customer_code || data?.customerCode;
  if (cust) return `cus:${cust}`;
  return null;
}

async function fetchPreviousEvent(
  entityKey: string | null
): Promise<any | null> {
  if (!entityKey || !prisma?.webhookEvent) return null;
  try {
    const prev = await prisma.webhookEvent.findFirst({
      where: { entityKey },
      orderBy: { receivedAt: "desc" },
      select: { payload: true },
    });
    return prev;
  } catch {
    return null;
  }
}

async function sendWebhookEmail(args: {
  to: string;
  platform: Platform;
  event: string;
  signature: string;
  headers: Record<string, string>;
  payload: any;
  diff?: { changed: Array<{ path: string; before: any; after: any }> };
  entityKey?: string | null;
}) {
  const to = args.to
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) return;

  const summaryRef = (
    args.payload?.data?.reference ||
    args.payload?.data?.subscription_code ||
    args.payload?.data?.invoice_code ||
    ""
  ).toString();
  const subject = `[Paystack][${args.platform}] ${args.event}${
    summaryRef ? ` — ${summaryRef}` : ""
  }`;

  const prettyHeaders = JSON.stringify(args.headers, null, 2);
  const prettyPayload = JSON.stringify(args.payload, null, 2);
  const diffHtml = diffToHtml(args.diff ?? { changed: [] });
  const diffText = diffToText(args.diff ?? { changed: [] });

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 8px">Paystack Webhook</h2>
      <p style="margin:4px 0"><strong>Platform:</strong> ${escapeHtml(
        String(args.platform)
      )}</p>
      <p style="margin:4px 0"><strong>Event:</strong> ${escapeHtml(
        args.event
      )}</p>
      <p style="margin:4px 0"><strong>Signature:</strong> <code>${escapeHtml(
        args.signature
      )}</code></p>
      ${
        args.entityKey
          ? `<p style="margin:4px 0"><strong>Entity:</strong> ${escapeHtml(
              args.entityKey
            )}</p>`
          : ""
      }
      <h3 style="margin:16px 0 6px">Diff vs previous</h3>
      ${diffHtml}
      <h3 style="margin:16px 0 6px">Headers</h3>
      <pre style="background:#f6f8fa;padding:12px;border-radius:8px;white-space:pre-wrap">${escapeHtml(
        prettyHeaders
      )}</pre>
      <h3 style="margin:16px 0 6px">Payload</h3>
      <pre style="background:#f6f8fa;padding:12px;border-radius:8px;white-space:pre-wrap">${escapeHtml(
        prettyPayload
      )}</pre>
    </div>
  `;
  const text = `Paystack Webhook
    Platform: ${args.platform}
    Event: ${args.event}
    Signature: ${args.signature}
    Entity: ${args.entityKey || ""}

    Diff:
    ${diffText}

    Headers:
    ${prettyHeaders}

    Payload:
    ${prettyPayload}
  `;

  if (!mailer) {
    console.log("Mailer not loaded");
    return;
  }

  console.log("Sending webhook email to:", to);
  if (typeof (mailer as any).sendEmail === "function") {
    const fn = (mailer as any).sendEmail;
    try {
      await fn({ to, subject, html, text });
      return;
    } catch {}
    try {
      await fn(to, subject, html);
      return;
    } catch {}
  }
  if (typeof (mailer as any).sendMail === "function") {
    try {
      await (mailer as any).sendMail({ to, subject, html, text });
      return;
    } catch {}
  }
  if (typeof (mailer as any).send === "function") {
    try {
      await (mailer as any).send({ to, subject, html, text });
      return;
    } catch {}
  }
  if (typeof (mailer as any).sendRawEmail === "function") {
    try {
      await (mailer as any).sendRawEmail({ to, subject, html, text });
      return;
    } catch {}
  }
  if (typeof (mailer as any).sendSES === "function") {
    try {
      await (mailer as any).sendSES({ to, subject, html, text });
      return;
    } catch {}
  }
}

async function onUnhandled(event: string, data: Record<string, unknown>) {
  console.log("[webhook] unhandled", event, Object.keys(data || {}));
}

// Webhook sample 1
//   Headers
//   {
//     "accept": "application/json, text/plain, */*",
//     "accept-encoding": "gzip",
//     "connection": "close",
//     "content-length": "2458",
//     "content-type": "application/json",
//     "forwarded": "for=52.214.14.220;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIDc0OTc0YWE5MWM4OTEyYjg1M2Q0OTQyOTU2ZmRkNzE2OTUzYmFhODA5ZTQzYTA3ZWQwOTQxN2ZjZDdjZGMwM2U=;exp=1768220066",
//     "host": "www.twonodetechnologies.com",
//     "user-agent": "Paystack/2.0",
//     "x-datadog-parent-id": "1558438078181418050",
//     "x-datadog-sampled": "1",
//     "x-datadog-sampling-priority": "0",
//     "x-datadog-trace-id": "2426194284303296411",
//     "x-forwarded-for": "52.214.14.220",
//     "x-forwarded-host": "www.twonodetechnologies.com",
//     "x-forwarded-port": "443",
//     "x-forwarded-proto": "https",
//     "x-matched-path": "/api/webhooks/paystack",
//     "x-paystack-integration-id": "1410813",
//     "x-paystack-signature": "eb4d11a66c19f4eef29440e438b579980484587590f59b27ab4207d04f904c931df4123c78eb364456d5898f6af006f530efa31a28ac3341481edf44de5368ed",
//     "x-real-ip": "52.214.14.220",
//     "x-robots-tag": "index, follow",
//     "x-vercel-deployment-url": "twonodetech-d67x8acdb-rojitechs-projects.vercel.app",
//     "x-vercel-forwarded-for": "52.214.14.220",
//     "x-vercel-function-path": "api/webhooks/paystack",
//     "x-vercel-id": "dub1::nrtf8-1768219766133-7d8d43f59220",
//     "x-vercel-internal-bot-check": "skip",
//     "x-vercel-internal-ingress-bucket": "bucket017",
//     "x-vercel-internal-ingress-port": "17443",
//     "x-vercel-ip-as-number": "16509",
//     "x-vercel-ip-city": "Dublin",
//     "x-vercel-ip-continent": "EU",
//     "x-vercel-ip-country": "IE",
//     "x-vercel-ip-country-region": "L",
//     "x-vercel-ip-latitude": "53.3382",
//     "x-vercel-ip-longitude": "-6.2591",
//     "x-vercel-ip-postal-code": "D02",
//     "x-vercel-ip-timezone": "Europe/Dublin",
//     "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//     "x-vercel-oidc-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJhdWQiOiJodHRwczpcL1wvdmVyY2VsLmNvbVwvcm9qaXRlY2hzLXByb2plY3RzIiwicHJvamVjdCI6InR3b25vZGV0ZWNoIiwibmJmIjoxNzY4MjE5NDEyLCJvd25lciI6InJvaml0ZWNocy1wcm9qZWN0cyIsIm93bmVyX2lkIjoidGVhbV90eUxLTjVWOGlkUG5PNFpheW85ZTMxankiLCJwcm9qZWN0X2lkIjoicHJqX0pKTEdpVHB2MU95QVliVk5zRG1sSUZVZFhQNUMiLCJlbnZpcm9ubWVudCI6InByb2R1Y3Rpb24iLCJzY29wZSI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJpYXQiOjE3NjgyMTk0MTIsImlzcyI6Imh0dHBzOlwvXC9vaWRjLnZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyIsInN1YiI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJwbGFuIjoiaG9iYnkiLCJleHAiOjE3NjgyMjMwMTJ9.bJ7Tn6q1rJjE1CkvIvHmuMya9qePtRvw8MDEjAAg1q_TGkI91Vghnuhd2_A5eNUjSA8WkdP_WaKy0nlBj6Ll9PemVEu5IQH1WrB4gd8W2DwFOEu_UgsFJPAN3hqFHculYMUID2TA6y1qhlFcpSBy6U1Pezz7wqj9kWfUpPy5FKzkW0SAftaWaiUVYbPW4IivcwyZScKU6qrKxrlhKM66fPDvBE2c05NkkCKy1xW6O_6s3cDvatgX3Xts9d111rxE5jFRxzj8gD-87VKUU8oBNuEFp8FQTVYmihbmedUhNOzJIUjsIJeGX0yKB5HdjNX4yTQB9OT2NGdIVH7965tBhw",
//     "x-vercel-proxied-for": "52.214.14.220",
//     "x-vercel-proxy-signature": "Bearer 74974aa91c8912b853d4942956fdd716953baa809e43a07ed09417fcd7cdc03e",
//     "x-vercel-proxy-signature-ts": "1768220066",
//     "x-vercel-sc-basepath": "",
//     "x-vercel-sc-headers": "{\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\",\"x-vercel-ept\":\"0\",\"Authorization\":\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmxpbWl0ZWQiOmZhbHNlLCJlbnYiOiJwcm9kdWN0aW9uIiwibmV4dFZlcnNpb24iOiIxNi4xLjAiLCJvd25lcklkIjoidGVhbV90eUxLTjVWOGlkUG5PNFpheW85ZTMxankiLCJkZXBsb3ltZW50SWQiOiJkcGxfN2cxc1RWdkpQNVZIZ3lDUE1haXZYUXB6TkZSaiIsImlzcyI6InNlcnZlcmxlc3MiLCJwcm9qZWN0SWQiOiJwcmpfSkpMR2lUcHYxT3lBWWJWTnNEbWxJRlVkWFA1QyIsInJlcXVlc3RJZCI6Im5ydGY4LTE3NjgyMTk3NjYxMzMtN2Q4ZDQzZjU5MjIwIiwiaWF0IjoxNzY4MjE5NzY2LCJibG9jayI6ZmFsc2UsImV4cCI6MTc2ODIyMDY4NiwicGxhbiI6ImhvYmJ5IiwiZG9tYWluIjoid3d3LnR3b25vZGV0ZWNobm9sb2dpZXMuY29tIn0.dfPhOH0ksdY53jCCByY5qKpGaQTYvwumpanwUmR0OFI\"}",
//     "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
//   }
//   Payload
//   {
//     "event": "charge.success",
//     "data": {
//       "id": 5728232636,
//       "domain": "live",
//       "status": "success",
//       "reference": "SURFBOARD_SUB_live_1768218421472_52e7d718-b91d-469c-b803-030bee4aafdc",
//       "amount": 20000000,
//       "message": null,
//       "gateway_response": "Approved",
//       "paid_at": "2026-01-12T12:05:28.000Z",
//       "created_at": "2026-01-12T11:47:02.000Z",
//       "channel": "bank_transfer",
//       "currency": "NGN",
//       "ip_address": "102.88.111.223",
//       "metadata": {
//         "custom_fields": [
//           {
//             "display_name": "Platform",
//             "variable_name": "platform",
//             "value": "surfboard"
//           },
//           {
//             "display_name": "Subscription Plan",
//             "variable_name": "subscription_plan",
//             "value": "SURF_YEARLY"
//           },
//           {
//             "display_name": "Subscription Plan ID",
//             "variable_name": "subscription_plan_id",
//             "value": "2740357"
//           },
//           {
//             "display_name": "Plan Code",
//             "variable_name": "plan_code",
//             "value": "PLN_sp36u33nqqxe6mr"
//           },
//           {
//             "display_name": "Reference",
//             "variable_name": "reference",
//             "value": "SURFBOARD_SUB_live_1768218421472_52e7d718-b91d-469c-b803-030bee4aafdc"
//           },
//           {
//             "display_name": "User ID",
//             "variable_name": "user_id",
//             "value": "52e7d718-b91d-469c-b803-030bee4aafdc"
//           },
//           {
//             "display_name": "Email",
//             "variable_name": "email",
//             "value": "yisco4yekeen89@gmail.com"
//           }
//         ]
//       },
//       "fees_breakdown": {
//         "amount": "200000",
//         "formula": null,
//         "type": "paystack"
//       },
//       "log": null,
//       "fees": 200000,
//       "fees_split": null,
//       "authorization": {
//         "authorization_code": "AUTH_kxzz6722zi",
//         "bin": "560XXX",
//         "last4": "X496",
//         "exp_month": "01",
//         "exp_year": "2026",
//         "channel": "bank_transfer",
//         "card_type": "transfer",
//         "bank": "Fidelity Bank",
//         "country_code": "NG",
//         "brand": "Managed Account",
//         "reusable": false,
//         "signature": null,
//         "account_name": null,
//         "sender_country": "NG",
//         "sender_bank": "Fidelity Bank",
//         "sender_bank_account_number": "XXXXXXX496",
//         "sender_name": "YISCOTECH GLOBAL SERVICES LTD",
//         "narration": "COB TRF FROM YISCOTECH",
//         "receiver_bank_account_number": "9981144890",
//         "receiver_bank": "Paystack-Titan"
//       },
//       "customer": {
//         "id": 331736006,
//         "first_name": null,
//         "last_name": null,
//         "email": "yisco4yekeen89@gmail.com",
//         "customer_code": "CUS_xuu66s3wi0pw4co",
//         "phone": null,
//         "metadata": null,
//         "risk_action": "default",
//         "international_format_phone": null
//       },
//       "plan": {
//         "id": 2740357,
//         "name": "SURF_YEARLY",
//         "plan_code": "PLN_sp36u33nqqxe6mr",
//         "description": "Postpaid, billed yearly (charged on Jan 1 for the previous year",
//         "amount": 20000000,
//         "interval": "annually",
//         "send_invoices": 1,
//         "send_sms": 1,
//         "currency": "NGN"
//       },
//       "subaccount": {},
//       "split": {},
//       "order_id": null,
//       "paidAt": "2026-01-12T12:05:28.000Z",
//       "requested_amount": 20000000,
//       "pos_transaction_data": null,
//       "source": {
//         "type": "api",
//         "source": "merchant_api",
//         "entry_point": "transaction_initialize",
//         "identifier": null
//       }
//     }
//   }

// Webhook sample 2
// Headers
// {
//   "accept": "application/json, text/plain, */*",
//   "accept-encoding": "gzip",
//   "connection": "close",
//   "content-length": "2499",
//   "content-type": "application/json",
//   "forwarded": "for=52.214.14.220;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIDM0ZjBmZDIzNmI2YWU3ZjgyZmJlZDg3NjNlNmIxMWMyNzk5ZDAzYTI5M2U3Y2M5ZDNmOTFkMGE0OTYzYzcwOGU=;exp=1770218794",
//   "host": "www.twonodetechnologies.com",
//   "user-agent": "Paystack/2.0",
//   "x-datadog-parent-id": "5044565898737361692",
//   "x-datadog-sampled": "1",
//   "x-datadog-sampling-priority": "0",
//   "x-datadog-trace-id": "2014082774522428216",
//   "x-forwarded-for": "52.214.14.220",
//   "x-forwarded-host": "www.twonodetechnologies.com",
//   "x-forwarded-port": "443",
//   "x-forwarded-proto": "https",
//   "x-invocation-id": "dub1::zfp48-1770218494008-2b2fed3bf920",
//   "x-matched-path": "/api/webhooks/paystack",
//   "x-paystack-integration-id": "1410813",
//   "x-paystack-signature": "b0e227386f9dc2e22b78e078103b2452c256cf0052a24f57bdcd8368261049987c3e7324da3851cdcefa1d3dea7b0ac95529fc39ff4c3c702c99d5b1f7a94eab",
//   "x-real-ip": "52.214.14.220",
//   "x-robots-tag": "index, follow",
//   "x-vercel-deployment-url": "twonodetech-ro1s2r5rk-rojitechs-projects.vercel.app",
//   "x-vercel-forwarded-for": "52.214.14.220",
//   "x-vercel-id": "dub1::zfp48-1770218494008-2b2fed3bf920",
//   "x-vercel-ip-as-number": "16509",
//   "x-vercel-ip-city": "Dublin",
//   "x-vercel-ip-continent": "EU",
//   "x-vercel-ip-country": "IE",
//   "x-vercel-ip-country-region": "L",
//   "x-vercel-ip-latitude": "53.3382",
//   "x-vercel-ip-longitude": "-6.2591",
//   "x-vercel-ip-postal-code": "D02",
//   "x-vercel-ip-timezone": "Europe/Dublin",
//   "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//   "x-vercel-oidc-token": "eyJhbGciOiJSUzI1NiIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczpcL1wvb2lkYy52ZXJjZWwuY29tXC9yb2ppdGVjaHMtcHJvamVjdHMiLCJvd25lciI6InJvaml0ZWNocy1wcm9qZWN0cyIsInBsYW4iOiJob2JieSIsInN1YiI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJlbnZpcm9ubWVudCI6InByb2R1Y3Rpb24iLCJleHAiOjE3NzAyMjE3NzcsImF1ZCI6Imh0dHBzOlwvXC92ZXJjZWwuY29tXC9yb2ppdGVjaHMtcHJvamVjdHMiLCJpYXQiOjE3NzAyMTgxNzcsIm93bmVyX2lkIjoidGVhbV90eUxLTjVWOGlkUG5PNFpheW85ZTMxankiLCJzY29wZSI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJwcm9qZWN0X2lkIjoicHJqX0pKTEdpVHB2MU95QVliVk5zRG1sSUZVZFhQNUMiLCJwcm9qZWN0IjoidHdvbm9kZXRlY2giLCJuYmYiOjE3NzAyMTgxNzd9.AGlH3IC_OpA1zWQmEnVeCvttooioDQ7MACJN794wwMcObV-Sjt73i_9TqgCD48028b0wVTDTsdE7t3Cxvqrong7O5CfiLvsXTWwbd0KhL60K-kCtxjhl674yoi4_rE6zfsz5u4NHgFPI6_n_wp9hL8ksIYZxw8YgH1AbGu7nZ-A-o1xCWVbbDF_Kfi9Be64_tlvSZIv_EgpJZkKfFjnSuR1S_Cr2kn7MVVxNqWKXDRpd52KaAPnuOqLj5Jj9QD-kiJb9a9hIp8gQktGZJ_9NZQOk81jBRpPDFSYtp51dtcEuRBbPs6KaWsZX9KO8ZPM02BgQvm_C5kNyM8K37G1BzQ",
//   "x-vercel-proxied-for": "52.214.14.220",
//   "x-vercel-proxy-signature": "Bearer 34f0fd236b6ae7f82fbed8763e6b11c2799d03a293e7cc9d3f91d0a4963c708e",
//   "x-vercel-proxy-signature-ts": "1770218794",
//   "x-vercel-sc-basepath": "",
//   "x-vercel-sc-headers": "{\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\",\"x-vercel-ept\":\"0\",\"Authorization\":\"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwbGFuIjoiaG9iYnkiLCJleHAiOjE3NzAyMTk0MTQsIm5leHRWZXJzaW9uIjoiMTYuMS4wIiwiaXNzIjoic2VydmVybGVzcyIsImVudiI6InByb2R1Y3Rpb24iLCJ1bmxpbWl0ZWQiOmZhbHNlLCJkb21haW4iOiJ3d3cudHdvbm9kZXRlY2hub2xvZ2llcy5jb20iLCJkZXBsb3ltZW50SWQiOiJkcGxfOVkxVDNFTUVEdUZpajZ6c005ZGFWYURKQjdyZCIsImJsb2NrIjpmYWxzZSwib3duZXJJZCI6InRlYW1fdHlMS041VjhpZFBuTzRaYXlvOWUzMWp5IiwicHJvamVjdElkIjoicHJqX0pKTEdpVHB2MU95QVliVk5zRG1sSUZVZFhQNUMiLCJyZXF1ZXN0SWQiOiJ6ZnA0OC0xNzcwMjE4NDk0MDA4LTJiMmZlZDNiZjkyMCIsImlhdCI6MTc3MDIxODQ5NH0.BVrqxYCbot1pcTmazSRZngeBR0mqGFxFTNuUQfazzFE\"}",
//   "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
// }
// Payload
// {
//   "event": "charge.success",
//   "data": {
//     "id": 5806666762,
//     "domain": "live",
//     "status": "success",
//     "reference": "SURFBOARD_SUB_live_1770218099233_7dfe58e2-33e1-4484-9c87-a3644b76c77c",
//     "amount": 1670000,
//     "message": null,
//     "gateway_response": "Approved",
//     "paid_at": "2026-02-04T15:16:16.000Z",
//     "created_at": "2026-02-04T15:14:59.000Z",
//     "channel": "bank_transfer",
//     "currency": "NGN",
//     "ip_address": "102.89.34.178",
//     "metadata": {
//       "custom_fields": [
//         {
//           "display_name": "Platform",
//           "variable_name": "platform",
//           "value": "surfboard"
//         },
//         {
//           "display_name": "Subscription Plan",
//           "variable_name": "subscription_plan",
//           "value": "SURF_MONTHLY"
//         },
//         {
//           "display_name": "Subscription Plan ID",
//           "variable_name": "subscription_plan_id",
//           "value": "2740340"
//         },
//         {
//           "display_name": "Plan Code",
//           "variable_name": "plan_code",
//           "value": "PLN_55ftd3cu1vuhy7v"
//         },
//         {
//           "display_name": "Reference",
//           "variable_name": "reference",
//           "value": "SURFBOARD_SUB_live_1770218099233_7dfe58e2-33e1-4484-9c87-a3644b76c77c"
//         },
//         {
//           "display_name": "User ID",
//           "variable_name": "user_id",
//           "value": "7dfe58e2-33e1-4484-9c87-a3644b76c77c"
//         },
//         {
//           "display_name": "Email",
//           "variable_name": "email",
//           "value": "jimohabubakar4@gmail.com"
//         }
//       ]
//     },
//     "fees_breakdown": {
//       "amount": "35050",
//       "formula": null,
//       "type": "paystack"
//     },
//     "log": null,
//     "fees": 35050,
//     "fees_split": null,
//     "authorization": {
//       "authorization_code": "AUTH_xi0fqessbg",
//       "bin": "015XXX",
//       "last4": "X226",
//       "exp_month": "02",
//       "exp_year": "2026",
//       "channel": "bank_transfer",
//       "card_type": "transfer",
//       "bank": "Guaranty Trust Bank",
//       "country_code": "NG",
//       "brand": "Managed Account",
//       "reusable": false,
//       "signature": null,
//       "account_name": null,
//       "sender_country": "NG",
//       "sender_bank": "Guaranty Trust Bank",
//       "sender_bank_account_number": "XXXXXXX226",
//       "sender_name": "JIMOH ABUBAKAR KAYODE",
//       "narration": "NIP Transfer to PAYSTACK CHECKOUT. 000013260204161609000730164117",
//       "receiver_bank_account_number": "9985456032",
//       "receiver_bank": "Paystack-Titan"
//     },
//     "customer": {
//       "id": 337163793,
//       "first_name": null,
//       "last_name": null,
//       "email": "jimohabubakar4@gmail.com",
//       "customer_code": "CUS_vipyu4sz60ghfya",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default",
//       "international_format_phone": null
//     },
//     "plan": {
//       "id": 2740340,
//       "name": "SURF_MONTHLY",
//       "plan_code": "PLN_55ftd3cu1vuhy7v",
//       "description": "Postpaid, billed monthly (charged on the 1st of the next month",
//       "amount": 1670000,
//       "interval": "monthly",
//       "send_invoices": 1,
//       "send_sms": 1,
//       "currency": "NGN"
//     },
//     "subaccount": {},
//     "split": {},
//     "order_id": null,
//     "paidAt": "2026-02-04T15:16:16.000Z",
//     "requested_amount": 1670000,
//     "pos_transaction_data": null,
//     "source": {
//       "type": "api",
//       "source": "merchant_api",
//       "entry_point": "transaction_initialize",
//       "identifier": null
//     }
//   }
// }

// Webhook sample 3
// Headers
// {
//   "accept": "application/json, text/plain, */*",
//   "accept-encoding": "gzip",
//   "connection": "close",
//   "content-length": "1202",
//   "content-type": "application/json",
//   "forwarded": "for=52.31.139.75;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIDBiZmJkOTVmNjg3YWZiYzY0Y2Q3NWZlYzdlN2YxMzVlYTMzYmJhOTYxNTUxZmY4OTBjNzU1NmVlNmViNzUzODg=;exp=1771428034",
//   "host": "www.twonodetechnologies.com",
//   "user-agent": "Paystack/2.0",
//   "x-datadog-parent-id": "2698902049246418509",
//   "x-datadog-sampled": "1",
//   "x-datadog-sampling-priority": "0",
//   "x-datadog-trace-id": "4469633130195362577",
//   "x-forwarded-for": "52.31.139.75",
//   "x-forwarded-host": "www.twonodetechnologies.com",
//   "x-forwarded-port": "443",
//   "x-forwarded-proto": "https",
//   "x-invocation-id": "dub1::nhffn-1771427734012-672b0eba8887",
//   "x-matched-path": "/api/webhooks/paystack",
//   "x-paystack-integration-id": "1410813",
//   "x-paystack-signature": "2a3b5b7a6bf6e10b5cd352cdd94ed944bb6f6b2e21e6f8b85d94f0ecf00fe7708302fe01e5bde5692a3d67f0f2dacec1b659b5afa72a3eb2367832c31e04ffb7",
//   "x-real-ip": "52.31.139.75",
//   "x-robots-tag": "index, follow",
//   "x-vercel-deployment-url": "twonodetech-ayloc85jv-rojitechs-projects.vercel.app",
//   "x-vercel-forwarded-for": "52.31.139.75",
//   "x-vercel-id": "dub1::nhffn-1771427734012-672b0eba8887",
//   "x-vercel-ip-as-number": "16509",
//   "x-vercel-ip-city": "Dublin",
//   "x-vercel-ip-continent": "EU",
//   "x-vercel-ip-country": "IE",
//   "x-vercel-ip-country-region": "L",
//   "x-vercel-ip-latitude": "53.3382",
//   "x-vercel-ip-longitude": "-6.2591",
//   "x-vercel-ip-postal-code": "D02",
//   "x-vercel-ip-timezone": "Europe/Dublin",
//   "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//   "x-vercel-oidc-token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJzY29wZSI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJpYXQiOjE3NzE0Mjc3MzQsImV4cCI6MTc3MTQzMTMzNCwicHJvamVjdF9pZCI6InByal9KSkxHaVRwdjFPeUFZYlZOc0RtbElGVWRYUDVDIiwiYXVkIjoiaHR0cHM6XC9cL3ZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyIsInN1YiI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJlbnZpcm9ubWVudCI6InByb2R1Y3Rpb24iLCJpc3MiOiJodHRwczpcL1wvb2lkYy52ZXJjZWwuY29tXC9yb2ppdGVjaHMtcHJvamVjdHMiLCJwbGFuIjoiaG9iYnkiLCJvd25lcl9pZCI6InRlYW1fdHlMS041VjhpZFBuTzRaYXlvOWUzMWp5IiwicHJvamVjdCI6InR3b25vZGV0ZWNoIiwib3duZXIiOiJyb2ppdGVjaHMtcHJvamVjdHMiLCJuYmYiOjE3NzE0Mjc3MzR9.Yxr46FRv67iDtqfCuEcVndhH83YaSJbo21ypaqm8EwTjnU7ioqMfEjRr5HTl3jdEr9nQospAIFIwK8Fay9OauPXDw5G6qnP0Lh7ANM7OR0RwxyAKtK0eikJt4SsKQOrKTzCIePiphb1ml93CCkCL4GOKH4lxLWMJDuVVjeK9lgtYSsGIpBlDE-jaxnBXqUqAk-GwSwP4s5rHrNjAjpnUVq8Nd6l3MCgfX-UyPS4qEmNpR494bKPL6ZpqKhaTMLEyjh02JR92kghUzWmnJvZc-q61VPi8rBQA5eeDJm5hekGLWeW3hm2QL_lqANr7rVa0Un-tSPkvvp16E6pqlx2OCA",
//   "x-vercel-proxied-for": "52.31.139.75",
//   "x-vercel-proxy-signature": "Bearer 0bfbd95f687afbc64cd75fec7e7f135ea33bba961551ff890c7556ee6eb75388",
//   "x-vercel-proxy-signature-ts": "1771428034",
//   "x-vercel-sc-basepath": "",
//   "x-vercel-sc-headers": "{\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\",\"x-vercel-ept\":\"0\",\"Authorization\":\"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NzE0Mjc3MzQsImV4cCI6MTc3MTQyODY1NCwibmV4dFZlcnNpb24iOiIxNi4xLjYiLCJvd25lcklkIjoidGVhbV90eUxLTjVWOGlkUG5PNFpheW85ZTMxankiLCJlbnYiOiJwcm9kdWN0aW9uIiwicGxhbiI6ImhvYmJ5IiwicmVxdWVzdElkIjoibmhmZm4tMTc3MTQyNzczNDAxMi02NzJiMGViYTg4ODciLCJpc3MiOiJzZXJ2ZXJsZXNzIiwiYmxvY2siOmZhbHNlLCJkZXBsb3ltZW50SWQiOiJkcGxfN1ZNcjlMYVBIS2tQRU16cE1wOG13ZmlrakJqRSIsImRvbWFpbiI6Ind3dy50d29ub2RldGVjaG5vbG9naWVzLmNvbSIsInByb2plY3RJZCI6InByal9KSkxHaVRwdjFPeUFZYlZOc0RtbElGVWRYUDVDIiwidW5saW1pdGVkIjpmYWxzZX0.OwA096u0waYB3ct-so1Bz6Il92kw6uYubzcik1M0i-E\"}",
//   "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
// }
// Payload
// {
//   "event": "invoice.update",
//   "data": {
//     "domain": "live",
//     "invoice_code": "INV_ak70g09lzejx12w",
//     "amount": 1670000,
//     "period_start": "2026-02-18T15:13:00.000Z",
//     "period_end": "2026-03-18T15:12:59.000Z",
//     "status": "failed",
//     "paid": 0,
//     "paid_at": null,
//     "description": null,
//     "createdAt": "2026-02-16T07:49:36.000Z",
//     "authorization": {
//       "authorization_code": "AUTH_yic3m58g2a",
//       "bin": "539983",
//       "last4": "9031",
//       "exp_month": "01",
//       "exp_year": "2028",
//       "channel": "card",
//       "card_type": "mastercard debit",
//       "bank": "Guaranty Trust Bank",
//       "country_code": "NG",
//       "brand": "mastercard",
//       "reusable": true,
//       "signature": "SIG_xq6nwiujQPUtVsuXbSuG",
//       "account_name": null
//     },
//     "subscription": {
//       "status": "attention",
//       "subscription_code": "SUB_gsjhu22rhpl72mz",
//       "email_token": "ywsngffwlecy335",
//       "amount": 1670000,
//       "cron_expression": "13 15 18 * *",
//       "next_payment_date": "2026-03-18T15:13:00.000Z",
//       "open_invoice": null
//     },
//     "customer": {
//       "id": 262353553,
//       "first_name": "lukman",
//       "last_name": "adelakun",
//       "email": "olatunbosunadelakun@gmail.com",
//       "customer_code": "CUS_g3a5a2ms2wdt8sx",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default",
//       "international_format_phone": null
//     },
//     "transaction": {
//       "reference": "0589124c74ef26af4ee2a8d8aa243aeecabd2f9b373d218a",
//       "status": "failed",
//       "amount": "1670000",
//       "currency": "NGN"
//     }
//   }
// }

// Webhook sample 4
// {}
// Payload
// {
//   "raw": "{\"event\":\"invoice.update\",\"data\":{\"domain\":\"test\",\"invoice_code\":\"INV_00824uyv20ya4ck\",\"amount\":5000000,\"period_start\":\"2026-05-03T16:05:00.000Z\",\"period_end\":\"2026-08-03T16:04:59.000Z\",\"status\":\"failed\",\"paid\":0,\"paid_at\":null,\"description\":null,\"createdAt\":\"2026-05-01T07:51:39.000Z\",\"authorization\":{\"authorization_code\":\"AUTH_gjpp8v69n5\",\"bin\":\"408408\",\"last4\":\"4081\",\"exp_month\":\"12\",\"exp_year\":\"2030\",\"channel\":\"card\",\"card_type\":\"visa \",\"bank\":\"TEST BANK\",\"country_code\":\"NG\",\"brand\":\"visa\",\"reusable\":true,\"signature\":\"SIG_wkAaGsI0EEXUmCX7fcNj\",\"account_name\":null},\"subscription\":{\"status\":\"attention\",\"subscription_code\":\"SUB_gutg1lbv9717i31\",\"email_token\":\"j6ju384iy204igu\",\"amount\":5000000,\"cron_expression\":\"5 16 3 2,5,8,11 *\",\"next_payment_date\":\"2026-08-03T16:05:00.000Z\",\"open_invoice\":null},\"customer\":{\"id\":336932708,\"first_name\":null,\"last_name\":null,\"email\":\"olamide.abowaba@twonodetechnologies.com\",\"customer_code\":\"CUS_q5r115qr61hmz5p\",\"phone\":null,\"metadata\":null,\"risk_action\":\"default\",\"international_format_phone\":null},\"transaction\":{\"reference\":\"48a577e12da2990c3f0f49659058f3d63f3e81126a946cf0\",\"status\":\"failed\",\"amount\":5000000,\"currency\":\"NGN\"}}}"
// }

// Webhook Sample 5
// Headers
// {
//   "accept": "application/json, text/plain, */*",
//   "accept-encoding": "gzip",
//   "connection": "close",
//   "content-length": "1789",
//   "content-type": "application/json",
//   "forwarded": "for=52.49.173.169;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIGY2ODJlMGIzNjM0YTU3MGViYTdjZWNiNzE0ZDNlOWU2YjZhMDgzNDkxODJmNzljNjdmYTk5YzA2NGFhOTU1MzU=;exp=1777372528",
//   "host": "www.twonodetechnologies.com",
//   "user-agent": "Paystack/2.0",
//   "x-datadog-parent-id": "129266347681560785",
//   "x-datadog-sampled": "1",
//   "x-datadog-sampling-priority": "0",
//   "x-datadog-trace-id": "3494953358754045487",
//   "x-forwarded-for": "52.49.173.169",
//   "x-forwarded-host": "www.twonodetechnologies.com",
//   "x-forwarded-port": "443",
//   "x-forwarded-proto": "https",
//   "x-invocation-id": "dub1::jl9sj-1777372228966-e55ee35940b8",
//   "x-matched-path": "/api/webhooks/paystack",
//   "x-paystack-integration-id": "1410813",
//   "x-paystack-signature": "4bb8e210ad24b700d224a3f77ca6bb636801ddbedd4c73f33e659b0c22de48d33649bfd6b336f6f44a04046ec1f7720e744c2463424fce8656c88fc01de0ede5",
//   "x-real-ip": "52.49.173.169",
//   "x-robots-tag": "index, follow",
//   "x-vercel-deployment-url": "twonodetech-js98tbxjl-rojitechs-projects.vercel.app",
//   "x-vercel-forwarded-for": "52.49.173.169",
//   "x-vercel-id": "dub1::jl9sj-1777372228966-e55ee35940b8",
//   "x-vercel-ip-as-number": "16509",
//   "x-vercel-ip-city": "Dublin",
//   "x-vercel-ip-continent": "EU",
//   "x-vercel-ip-country": "IE",
//   "x-vercel-ip-country-region": "L",
//   "x-vercel-ip-latitude": "53.3354",
//   "x-vercel-ip-longitude": "-6.252",
//   "x-vercel-ip-postal-code": "D02",
//   "x-vercel-ip-timezone": "Europe/Dublin",
//   "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//   "x-vercel-oidc-token": "eyJraWQiOiJtcmstNDMwMmVjMWI2NzBmNDhhOThhZDYxZGFkZTRhMjNiZTciLCJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lcl9pZCI6InRlYW1fdHlMS041VjhpZFBuTzRaYXlvOWUzMWp5IiwicHJvamVjdF9pZCI6InByal9KSkxHaVRwdjFPeUFZYlZOc0RtbElGVWRYUDVDIiwic2NvcGUiOiJvd25lcjpyb2ppdGVjaHMtcHJvamVjdHM6cHJvamVjdDp0d29ub2RldGVjaDplbnZpcm9ubWVudDpwcm9kdWN0aW9uIiwiZXhwIjoxNzc3Mzc1NTQzLCJvd25lciI6InJvaml0ZWNocy1wcm9qZWN0cyIsImlzcyI6Imh0dHBzOlwvXC9vaWRjLnZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyIsImVudmlyb25tZW50IjoicHJvZHVjdGlvbiIsInBsYW4iOiJob2JieSIsInN1YiI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJwcm9qZWN0IjoidHdvbm9kZXRlY2giLCJuYmYiOjE3NzczNzE5NDMsImF1ZCI6Imh0dHBzOlwvXC92ZXJjZWwuY29tXC9yb2ppdGVjaHMtcHJvamVjdHMiLCJpYXQiOjE3NzczNzE5NDN9.T2tLsSqoPxGRlYnGHIfJTaxofbQs-yL2qAYKc22sIKDTs50kJb_s5W5rPJShreqNQt6iVMJzaTjYVkKre8WtGtq4YCO0mX7lSU-pNLCCCt2XaDhP_NWskPpbCMN1LY22bs9av-z_Lys8JiySXDRkfgnREcC3KbgvI9cI9op3UU6j3HYoUtkUCk-PEf_iBM__KFKhQIRJBERu5H-TPkER-jB4q8DGrYZwgUU3nAdDWze7wVRWDnhJdysIXPrkcuQlywqxKcD4fQBuQ4g6DP0mIHQA2zTDV1LZMRuiMDKTy_JamqqeHwot3v3jYLgC7iOa77RI0BsCofSQGhId_9ua9A",
//   "x-vercel-proxied-for": "52.49.173.169",
//   "x-vercel-proxy-signature": "Bearer f682e0b3634a570eba7cecb714d3e9e6b6a08349182f79c67fa99c064aa95535",
//   "x-vercel-proxy-signature-ts": "1777372528",
//   "x-vercel-sc-basepath": "",
//   "x-vercel-sc-headers": "{\"x-vercel-ept\":\"0\",\"Authorization\":\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXF1ZXN0SWQiOiJqbDlzai0xNzc3MzcyMjI4OTY2LWU1NWVlMzU5NDBiOCIsImlzcyI6InNlcnZlcmxlc3MiLCJuZXh0VmVyc2lvbiI6IjE2LjEuNiIsInBsYW4iOiJob2JieSIsInVubGltaXRlZCI6ZmFsc2UsImRlcGxveW1lbnRJZCI6ImRwbF9HRmdBQWdpYXNUOE1na1FDSjlZOTN5YlZzaEJQIiwiYmxvY2siOmZhbHNlLCJwcm9qZWN0SWQiOiJwcmpfSkpMR2lUcHYxT3lBWWJWTnNEbWxJRlVkWFA1QyIsImlhdCI6MTc3NzM3MjIyOCwiZW52IjoicHJvZHVjdGlvbiIsIm93bmVySWQiOiJ0ZWFtX3R5TEtONVY4aWRQbk80WmF5bzllMzFqeSIsImV4cCI6MTc3NzM3MzE0OCwiZG9tYWluIjoid3d3LnR3b25vZGV0ZWNobm9sb2dpZXMuY29tIn0.XZlNv55rZnkZB7gl3jNzw68FET1rXXdIRp1vwWABDJY\",\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\"}",
//   "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
// }
// Payload
// {
//   "event": "charge.success",
//   "data": {
//     "id": 6087113160,
//     "domain": "live",
//     "status": "success",
//     "reference": "REG_GBC2_769a8c_1777371888636_REF",
//     "amount": 10000000,
//     "message": null,
//     "gateway_response": "Approved",
//     "paid_at": "2026-04-28T10:25:42.000Z",
//     "created_at": "2026-04-28T10:24:49.000Z",
//     "channel": "bank_transfer",
//     "currency": "NGN",
//     "ip_address": "105.112.179.154",
//     "metadata": {
//       "ticketNumber": "GBC2_769a8c",
//       "ticketType": "REGULAR",
//       "name": "Pair Ticket (2 attendees)",
//       "phone": "08129871656",
//       "profession": "PAIR_PURCHASE",
//       "ticketIds": [
//         "cmoihby610000l504rky9jt68",
//         "cmoihby8t0001l50405nm2rh6"
//       ],
//       "allTicketNumbers": [
//         "GBC2_769a8c",
//         "GBC2_f38350"
//       ]
//     },
//     "fees_breakdown": {
//       "amount": 160000,
//       "formula": null,
//       "type": "paystack"
//     },
//     "log": null,
//     "fees": 160000,
//     "fees_split": null,
//     "authorization": {
//       "authorization_code": "AUTH_lncfyyu57u",
//       "bin": "073XXX",
//       "last4": "X706",
//       "exp_month": "04",
//       "exp_year": "2026",
//       "channel": "bank_transfer",
//       "card_type": "transfer",
//       "bank": "Access Bank",
//       "country_code": "NG",
//       "brand": "Managed Account",
//       "reusable": false,
//       "signature": null,
//       "account_name": null,
//       "sender_country": "NG",
//       "sender_bank": "Access Bank",
//       "sender_bank_account_number": "XXXXXXX706",
//       "sender_name": "YUSUF ADEDOLAPO BADRUDEEN",
//       "narration": "MOBILE TRF TO PAT Conference fee PAYSTACK CHECKOUT",
//       "receiver_bank_account_number": "9904011759",
//       "receiver_bank": "Paystack-Titan"
//     },
//     "customer": {
//       "id": 274886498,
//       "first_name": "Badrudeen",
//       "last_name": "Yusuf Adedolapo",
//       "email": "generalyusbad@gmail.com",
//       "customer_code": "CUS_0y9ngnth2rwcrtu",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default",
//       "international_format_phone": null
//     },
//     "plan": {},
//     "subaccount": {},
//     "split": {},
//     "order_id": null,
//     "paidAt": "2026-04-28T10:25:42.000Z",
//     "requested_amount": 10000000,
//     "pos_transaction_data": null,
//     "source": {
//       "type": "api",
//       "source": "merchant_api",
//       "entry_point": "transaction_initialize",
//       "identifier": null
//     }
//   }
// }

// Webhook Sample 6
// Headers
// {
//   "accept": "application/json, text/plain, */*",
//   "accept-encoding": "gzip",
//   "connection": "close",
//   "content-length": "1208",
//   "content-type": "application/json",
//   "forwarded": "for=52.214.14.220;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIGVjMWQwNjU1NDY0M2FlNjJjN2FjNWY5NjdiYWQzMmU0MTFlNDFiZDkzNzljYTgzMzk3YjI5ODY1MjY2OTE5YWE=;exp=1776525636",
//   "host": "www.twonodetechnologies.com",
//   "user-agent": "Paystack/2.0",
//   "x-datadog-parent-id": "5242704478234250536",
//   "x-datadog-sampled": "1",
//   "x-datadog-sampling-priority": "0",
//   "x-datadog-trace-id": "6957364102749268141",
//   "x-forwarded-for": "52.214.14.220",
//   "x-forwarded-host": "www.twonodetechnologies.com",
//   "x-forwarded-port": "443",
//   "x-forwarded-proto": "https",
//   "x-invocation-id": "dub1::8fmdw-1776525336591-d470ebc055d4",
//   "x-matched-path": "/api/webhooks/paystack",
//   "x-paystack-integration-id": "1410813",
//   "x-paystack-signature": "6b2472fc94965550cf09dd4eb1f96c14070ca18ce65024db17ba610f6665f0fd7e09b50090cd239d2aad195e56b284839e7c443a11a41c0f4b8e8ecbcda0fc1e",
//   "x-real-ip": "52.214.14.220",
//   "x-robots-tag": "index, follow",
//   "x-vercel-deployment-url": "twonodetech-druy89101-rojitechs-projects.vercel.app",
//   "x-vercel-forwarded-for": "52.214.14.220",
//   "x-vercel-id": "dub1::8fmdw-1776525336591-d470ebc055d4",
//   "x-vercel-ip-as-number": "16509",
//   "x-vercel-ip-city": "Dublin",
//   "x-vercel-ip-continent": "EU",
//   "x-vercel-ip-country": "IE",
//   "x-vercel-ip-country-region": "L",
//   "x-vercel-ip-latitude": "53.3382",
//   "x-vercel-ip-longitude": "-6.2591",
//   "x-vercel-ip-postal-code": "D02",
//   "x-vercel-ip-timezone": "Europe/Dublin",
//   "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//   "x-vercel-oidc-token": "eyJ0eXAiOiJKV1QiLCJraWQiOiJtcmstNDMwMmVjMWI2NzBmNDhhOThhZDYxZGFkZTRhMjNiZTciLCJhbGciOiJSUzI1NiJ9.eyJzY29wZSI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJlbnZpcm9ubWVudCI6InByb2R1Y3Rpb24iLCJpYXQiOjE3NzY1MjUzMzYsIm93bmVyIjoicm9qaXRlY2hzLXByb2plY3RzIiwic3ViIjoib3duZXI6cm9qaXRlY2hzLXByb2plY3RzOnByb2plY3Q6dHdvbm9kZXRlY2g6ZW52aXJvbm1lbnQ6cHJvZHVjdGlvbiIsInByb2plY3RfaWQiOiJwcmpfSkpMR2lUcHYxT3lBWWJWTnNEbWxJRlVkWFA1QyIsImV4cCI6MTc3NjUyODkzNiwicGxhbiI6ImhvYmJ5IiwicHJvamVjdCI6InR3b25vZGV0ZWNoIiwib3duZXJfaWQiOiJ0ZWFtX3R5TEtONVY4aWRQbk80WmF5bzllMzFqeSIsImlzcyI6Imh0dHBzOlwvXC9vaWRjLnZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyIsIm5iZiI6MTc3NjUyNTMzNiwiYXVkIjoiaHR0cHM6XC9cL3ZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyJ9.QL7wKG49ERUwCQXHxcnKCKvD1Ex4qGSojI10XDqdQnGFY_fUwEHn2Q0cE9AmX3MWSHShemZ9ciNfzz-lpjY5A_htUyWirvlyGVnMpqcMELpo-ARwx9uYqQMoAbdGG_0zRFrfzPxnbTiiH4inDs-kqkIExDMc0dRbM3yp01CuL1dWhbYvrewOZyuRORqCZEqXqK7iQ1qXUvA9qClno3WFrILbj3mxAgt1vmh1fYig7nCiw8dN9u--_pF27BvM2QXfDSTwpnxbYVcAt4GQprRgE1DJXoMDTKmNF5SI81FwRDpHqb9qDMlz_8IDMW8AKMkXo2nTMHqVqGrqAHH6H4YWVQ",
//   "x-vercel-proxied-for": "52.214.14.220",
//   "x-vercel-proxy-signature": "Bearer ec1d06554643ae62c7ac5f967bad32e411e41bd9379ca83397b29865266919aa",
//   "x-vercel-proxy-signature-ts": "1776525636",
//   "x-vercel-sc-basepath": "",
//   "x-vercel-sc-headers": "{\"x-vercel-ept\":\"0\",\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\",\"Authorization\":\"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NzY1MjUzMzYsIm93bmVySWQiOiJ0ZWFtX3R5TEtONVY4aWRQbk80WmF5bzllMzFqeSIsIm5leHRWZXJzaW9uIjoiMTYuMS42IiwiaXNzIjoic2VydmVybGVzcyIsImVudiI6InByb2R1Y3Rpb24iLCJleHAiOjE3NzY1MjYyNTYsInVubGltaXRlZCI6ZmFsc2UsInJlcXVlc3RJZCI6IjhmbWR3LTE3NzY1MjUzMzY1OTEtZDQ3MGViYzA1NWQ0IiwiZG9tYWluIjoid3d3LnR3b25vZGV0ZWNobm9sb2dpZXMuY29tIiwicHJvamVjdElkIjoicHJqX0pKTEdpVHB2MU95QVliVk5zRG1sSUZVZFhQNUMiLCJwbGFuIjoiaG9iYnkiLCJibG9jayI6ZmFsc2UsImRlcGxveW1lbnRJZCI6ImRwbF9GaXJwUVl6VXVoSHJ6ZnJYb282V1p1UG5raHcyIn0.Wh2U446zMJ5QySZ7CmOgVomhA8aV5UCWtiKsMYdTYnc\"}",
//   "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
// }
// Payload
// {
//   "event": "invoice.payment_failed",
//   "data": {
//     "domain": "live",
//     "invoice_code": "INV_sq9r6lt3yzo9nn5",
//     "amount": 1670000,
//     "period_start": "2026-04-18T15:13:00.000Z",
//     "period_end": "2026-05-18T15:12:59.000Z",
//     "status": "failed",
//     "paid": 0,
//     "paid_at": null,
//     "description": null,
//     "createdAt": "2026-04-18T15:15:33.000Z",
//     "authorization": {
//       "authorization_code": "AUTH_yic3m58g2a",
//       "bin": "539983",
//       "last4": "9031",
//       "exp_month": "01",
//       "exp_year": "2028",
//       "channel": "card",
//       "card_type": "mastercard debit",
//       "bank": "Guaranty Trust Bank",
//       "country_code": "NG",
//       "brand": "mastercard",
//       "reusable": true,
//       "signature": "SIG_xq6nwiujQPUtVsuXbSuG",
//       "account_name": null
//     },
//     "subscription": {
//       "status": "attention",
//       "subscription_code": "SUB_gsjhu22rhpl72mz",
//       "email_token": "ywsngffwlecy335",
//       "amount": 1670000,
//       "cron_expression": "13 15 18 * *",
//       "next_payment_date": "2026-05-18T15:13:00.000Z",
//       "open_invoice": null
//     },
//     "customer": {
//       "id": 262353553,
//       "first_name": "lukman",
//       "last_name": "adelakun",
//       "email": "olatunbosunadelakun@gmail.com",
//       "customer_code": "CUS_g3a5a2ms2wdt8sx",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default",
//       "international_format_phone": null
//     },
//     "transaction": {
//       "reference": "8f65a17242bc954c97babb7fac44325d883537b50e59a7e7",
//       "status": "failed",
//       "amount": 1670000,
//       "currency": "NGN"
//     }
//   }
// }

// Webhook Sample 7
// Headers
// {
//   "accept": "application/json, text/plain, */*",
//   "accept-encoding": "gzip",
//   "connection": "close",
//   "content-length": "1200",
//   "content-type": "application/json",
//   "forwarded": "for=52.214.14.220;host=www.twonodetechnologies.com;proto=https;sig=0QmVhcmVyIGVjMWQwNjU1NDY0M2FlNjJjN2FjNWY5NjdiYWQzMmU0MTFlNDFiZDkzNzljYTgzMzk3YjI5ODY1MjY2OTE5YWE=;exp=1776525636",
//   "host": "www.twonodetechnologies.com",
//   "user-agent": "Paystack/2.0",
//   "x-datadog-parent-id": "1814489237545554577",
//   "x-datadog-sampled": "1",
//   "x-datadog-sampling-priority": "0",
//   "x-datadog-trace-id": "1944249192440888674",
//   "x-forwarded-for": "52.214.14.220",
//   "x-forwarded-host": "www.twonodetechnologies.com",
//   "x-forwarded-port": "443",
//   "x-forwarded-proto": "https",
//   "x-invocation-id": "dub1::cs5ss-1776525336517-25aaa825597d",
//   "x-matched-path": "/api/webhooks/paystack",
//   "x-paystack-integration-id": "1410813",
//   "x-paystack-signature": "47944ab9d6b04f473cb53b1bfda71c55dbbe7c8b0366f59ed149d6a80fc80bae78212fe5f760e281372638c2778792cd9bf0656ef207655df0ae9f06cc77e343",
//   "x-real-ip": "52.214.14.220",
//   "x-robots-tag": "index, follow",
//   "x-vercel-deployment-url": "twonodetech-druy89101-rojitechs-projects.vercel.app",
//   "x-vercel-forwarded-for": "52.214.14.220",
//   "x-vercel-id": "dub1::cs5ss-1776525336517-25aaa825597d",
//   "x-vercel-ip-as-number": "16509",
//   "x-vercel-ip-city": "Dublin",
//   "x-vercel-ip-continent": "EU",
//   "x-vercel-ip-country": "IE",
//   "x-vercel-ip-country-region": "L",
//   "x-vercel-ip-latitude": "53.3382",
//   "x-vercel-ip-longitude": "-6.2591",
//   "x-vercel-ip-postal-code": "D02",
//   "x-vercel-ip-timezone": "Europe/Dublin",
//   "x-vercel-ja4-digest": "t13d591000_a33745022dd6_5ac7197df9d2",
//   "x-vercel-oidc-token": "eyJ0eXAiOiJKV1QiLCJraWQiOiJtcmstNDMwMmVjMWI2NzBmNDhhOThhZDYxZGFkZTRhMjNiZTciLCJhbGciOiJSUzI1NiJ9.eyJzY29wZSI6Im93bmVyOnJvaml0ZWNocy1wcm9qZWN0czpwcm9qZWN0OnR3b25vZGV0ZWNoOmVudmlyb25tZW50OnByb2R1Y3Rpb24iLCJlbnZpcm9ubWVudCI6InByb2R1Y3Rpb24iLCJpYXQiOjE3NzY1MjUzMzYsIm93bmVyIjoicm9qaXRlY2hzLXByb2plY3RzIiwic3ViIjoib3duZXI6cm9qaXRlY2hzLXByb2plY3RzOnByb2plY3Q6dHdvbm9kZXRlY2g6ZW52aXJvbm1lbnQ6cHJvZHVjdGlvbiIsInByb2plY3RfaWQiOiJwcmpfSkpMR2lUcHYxT3lBWWJWTnNEbWxJRlVkWFA1QyIsImV4cCI6MTc3NjUyODkzNiwicGxhbiI6ImhvYmJ5IiwicHJvamVjdCI6InR3b25vZGV0ZWNoIiwib3duZXJfaWQiOiJ0ZWFtX3R5TEtONVY4aWRQbk80WmF5bzllMzFqeSIsImlzcyI6Imh0dHBzOlwvXC9vaWRjLnZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyIsIm5iZiI6MTc3NjUyNTMzNiwiYXVkIjoiaHR0cHM6XC9cL3ZlcmNlbC5jb21cL3Jvaml0ZWNocy1wcm9qZWN0cyJ9.QL7wKG49ERUwCQXHxcnKCKvD1Ex4qGSojI10XDqdQnGFY_fUwEHn2Q0cE9AmX3MWSHShemZ9ciNfzz-lpjY5A_htUyWirvlyGVnMpqcMELpo-ARwx9uYqQMoAbdGG_0zRFrfzPxnbTiiH4inDs-kqkIExDMc0dRbM3yp01CuL1dWhbYvrewOZyuRORqCZEqXqK7iQ1qXUvA9qClno3WFrILbj3mxAgt1vmh1fYig7nCiw8dN9u--_pF27BvM2QXfDSTwpnxbYVcAt4GQprRgE1DJXoMDTKmNF5SI81FwRDpHqb9qDMlz_8IDMW8AKMkXo2nTMHqVqGrqAHH6H4YWVQ",
//   "x-vercel-proxied-for": "52.214.14.220",
//   "x-vercel-proxy-signature": "Bearer ec1d06554643ae62c7ac5f967bad32e411e41bd9379ca83397b29865266919aa",
//   "x-vercel-proxy-signature-ts": "1776525636",
//   "x-vercel-sc-basepath": "",
//   "x-vercel-sc-headers": "{\"x-vercel-function-platform\":\"vercel\\/proxy+serverless\",\"x-vercel-ept\":\"0\",\"Authorization\":\"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkb21haW4iOiJ3d3cudHdvbm9kZXRlY2hub2xvZ2llcy5jb20iLCJkZXBsb3ltZW50SWQiOiJkcGxfRmlycFFZelV1aEhyemZyWG9vNldadVBua2h3MiIsImJsb2NrIjpmYWxzZSwicHJvamVjdElkIjoicHJqX0pKTEdpVHB2MU95QVliVk5zRG1sSUZVZFhQNUMiLCJuZXh0VmVyc2lvbiI6IjE2LjEuNiIsIm93bmVySWQiOiJ0ZWFtX3R5TEtONVY4aWRQbk80WmF5bzllMzFqeSIsInVubGltaXRlZCI6ZmFsc2UsImV4cCI6MTc3NjUyNjI1NiwiaWF0IjoxNzc2NTI1MzM2LCJlbnYiOiJwcm9kdWN0aW9uIiwiaXNzIjoic2VydmVybGVzcyIsInBsYW4iOiJob2JieSIsInJlcXVlc3RJZCI6ImNzNXNzLTE3NzY1MjUzMzY1MTctMjVhYWE4MjU1OTdkIn0.bEBL6wLBvNYg0eP3UMighkwUtdo9j3y3l3vU5Q8QeCs\"}",
//   "x-vercel-sc-host": "iad1.suspense-cache.vercel-infra.com"
// }
// Payload
// {
//   "event": "invoice.create",
//   "data": {
//     "domain": "live",
//     "invoice_code": "INV_sq9r6lt3yzo9nn5",
//     "amount": 1670000,
//     "period_start": "2026-04-18T15:13:00.000Z",
//     "period_end": "2026-05-18T15:12:59.000Z",
//     "status": "failed",
//     "paid": 0,
//     "paid_at": null,
//     "description": null,
//     "createdAt": "2026-04-18T15:15:33.000Z",
//     "authorization": {
//       "authorization_code": "AUTH_yic3m58g2a",
//       "bin": "539983",
//       "last4": "9031",
//       "exp_month": "01",
//       "exp_year": "2028",
//       "channel": "card",
//       "card_type": "mastercard debit",
//       "bank": "Guaranty Trust Bank",
//       "country_code": "NG",
//       "brand": "mastercard",
//       "reusable": true,
//       "signature": "SIG_xq6nwiujQPUtVsuXbSuG",
//       "account_name": null
//     },
//     "subscription": {
//       "status": "attention",
//       "subscription_code": "SUB_gsjhu22rhpl72mz",
//       "email_token": "ywsngffwlecy335",
//       "amount": 1670000,
//       "cron_expression": "13 15 18 * *",
//       "next_payment_date": "2026-05-18T15:13:00.000Z",
//       "open_invoice": null
//     },
//     "customer": {
//       "id": 262353553,
//       "first_name": "lukman",
//       "last_name": "adelakun",
//       "email": "olatunbosunadelakun@gmail.com",
//       "customer_code": "CUS_g3a5a2ms2wdt8sx",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default",
//       "international_format_phone": null
//     },
//     "transaction": {
//       "reference": "8f65a17242bc954c97babb7fac44325d883537b50e59a7e7",
//       "status": "failed",
//       "amount": 1670000,
//       "currency": "NGN"
//     }
//   }
// }
