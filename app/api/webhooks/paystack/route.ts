// File: app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as mailer from "@/utils/email";
import * as reva from "@/app/(projects)/reva/actions/revaActions2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack Webhook (App Router)
 * Platforms
 *  - Surfboard: subscriptions (create/enable/disable + renewals via charge.success)
 *  - Reva: one‑time checkout (metadata.platform="reva" or metadata.reference)
 *
 * Schema alignment (from prisma schema)
 *  - SurfboardUser: unique email
 *  - Subscription: unique userId; fields include planCode, planName, amount, interval, status, subCode, emailToken, authorization, nextPaymentDate
 *  - SubscriptionHistory: append-only ledger per event
 *
 * DB‑backed idempotency
 *  - Optional `WebhookEvent` table (id, signature[unique], event, platform, payload, status, error[, entityKey])
 *  - If not present, handler still works (no-ops the ledger)
 * 
 * Sample data
 
{
  "raw": "{\"event\":\"charge.success\",\"data\":{\"id\":5520043315,\"domain\":\"test\",\"status\":\"success\",\"reference\":\"SURFBOARD_SUB_test_1762780085531_e764640e-c5c9-405a-8525-e77118807b55\",\"amount\":5000000,\"message\":null,\"gateway_response\":\"Successful\",\"paid_at\":\"2025-11-10T13:08:13.000Z\",\"created_at\":\"2025-11-10T13:08:06.000Z\",\"channel\":\"card\",\"currency\":\"NGN\",\"ip_address\":\"102.89.69.124\",\"metadata\":{\"custom_fields\":[{\"display_name\":\"Platform\",\"variable_name\":\"platform\",\"value\":\"surfboard\"},{\"display_name\":\"Subscription Plan\",\"variable_name\":\"subscription_plan\",\"value\":\"Quarterly\"},{\"display_name\":\"Subscription Plan ID\",\"variable_name\":\"subscription_plan_id\",\"value\":\"quarterly\"},{\"display_name\":\"Reference\",\"variable_name\":\"reference\",\"value\":\"SURFBOARD_SUB_test_1762780085531_e764640e-c5c9-405a-8525-e77118807b55\"},{\"display_name\":\"User ID\",\"variable_name\":\"user_id\",\"value\":\"e764640e-c5c9-405a-8525-e77118807b55\"},{\"display_name\":\"Email\",\"variable_name\":\"email\",\"value\":\"rojitech9@gmail.com\"}]},\"fees_breakdown\":null,\"log\":null,\"fees\":85000,\"fees_split\":null,\"authorization\":{\"authorization_code\":\"AUTH_q8zseh2eew\",\"bin\":\"408408\",\"last4\":\"4081\",\"exp_month\":\"12\",\"exp_year\":\"2030\",\"channel\":\"card\",\"card_type\":\"visa \",\"bank\":\"TEST BANK\",\"country_code\":\"NG\",\"brand\":\"visa\",\"reusable\":true,\"signature\":\"SIG_wkAaGsI0EEXUmCX7fcNj\",\"account_name\":null,\"receiver_bank_account_number\":null,\"receiver_bank\":null},\"customer\":{\"id\":256979707,\"first_name\":\"\",\"last_name\":\"\",\"email\":\"rojitech9@gmail.com\",\"customer_code\":\"CUS_o766tgq8j92klql\",\"phone\":\"\",\"metadata\":null,\"risk_action\":\"default\",\"international_format_phone\":null},\"plan\":{\"id\":2909642,\"name\":\"Quarterly\",\"plan_code\":\"PLN_jbq0p961zph3gf9\",\"description\":\"Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter)\",\"amount\":5000000,\"interval\":\"quarterly\",\"send_invoices\":1,\"send_sms\":1,\"currency\":\"NGN\"},\"subaccount\":{},\"split\":{},\"order_id\":null,\"paidAt\":\"2025-11-10T13:08:13.000Z\",\"requested_amount\":5000000,\"pos_transaction_data\":null,\"source\":{\"type\":\"api\",\"source\":\"merchant_api\",\"entry_point\":\"transaction_initialize\",\"identifier\":null}}}"
}
 */

// ─────────────────────────── Lazy deps ───────────────────────────
let prisma: any = null;
try {
  try {
    prisma = await import("@/lib/prisma");
    prisma = prisma.default;
    console.log("Prisma loaded from lib/prisma");
  } catch (error) {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    console.log("Prisma loaded from @prisma/client");
  }
} catch {
  console.log("Unable to load Prisma");
}

// Try to load Reva actions (paths differ per project; try a few)
// async function loadRevaActions() {
//   const tryImport = async (p: string) => {
//     try {
//       return await import(p);
//     } catch {
//       return null;
//     }
//   };
//   return (
//     (await tryImport("@/app/(projects)/reva/actions/revaActions2")) || null
//   );
// }

// ─────────────────────────── Types ───────────────────────────
export type PaystackWebhookPayload = { event: string; data: any };
export type Platform = "surfboard" | "reva" | "unknown";

export type SubscriptionData = {
  id?: number;
  status?: string; // active|canceled|disabled|past_due
  subscription_code?: string;
  email_token?: string;
  customer?: { id?: number; customer_code?: string; email?: string };
  plan?: string | { plan_code?: string; name?: string; interval?: string };
  next_payment_date?: string | null;
  authorization?: { authorization_code?: string };
  amount?: number; // kobo (if present on event)
};

export type InvoiceData = {
  id?: number;
  invoice_code?: string;
  status?: string;
  amount?: number; // kobo
  customer?: string | number | null;
  paid_at?: string | null;
  currency?: string;
};

export type ChargeSuccessData = {
  status?: string; // "success"
  reference?: string;
  amount?: number; // kobo
  currency?: string;
  customer?: { id?: number; email?: string; customer_code?: string };
  authorization?: { authorization_code?: string };
  plan?: string; // plan code for renewal
  subscription?: any; // present for recurring charge
  metadata?: Record<string, any> & {
    platform?: string;
    isAuthenticated?: boolean;
    reference?: string; // Reva property ref
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
  console.log("Starting webhook processing \n\n\n");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "___NS__" }, { status: 400 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  console.log("Reva actions loaded", reva);
  console.log("Mailer actions loaded", mailer);

  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "___I___" }, { status: 401 });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(raw);
    await sendWebhookEmail({
      to: process.env.WEBHOOK_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      platform: "surfboard",
      event: "test",
      signature,
      headers: {},
      payload: { raw: raw, payload: payload },
      diff: { changed: [] },
      entityKey: "",
    });
  } catch {
    await sendWebhookEmail({
      to: process.env.WEBHOOK_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      platform: "surfboard",
      event: "test",
      signature,
      headers: {},
      payload: { raw: raw },
      diff: { changed: [] },
      entityKey: "",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = payload;
  const platform = detectPlatform(event, data);

  // Email BEFORE idempotency (as requested), with diff against previous entity payload
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

  // DB idempotency (optional)
  const ledgerId = await beginEvent({ signature, event, raw, platform });
  if (ledgerId === null)
    return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (platform === "surfboard") {
      await handleSurfboard(event, data as any);
    } else if (platform === "reva") {
      await handleReva(event, data as any);
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
  const mPlatform =
    typeof (meta as any)?.platform === "string"
      ? (meta as any).platform.toLowerCase()
      : undefined;
  if (mPlatform === "surfboard") return "surfboard";
  if (mPlatform === "reva") return "reva";

  if (event.startsWith("subscription.")) return "surfboard";
  if (event.startsWith("invoice.")) return "surfboard";
  if (event === "charge.success") {
    const hasSubMarkers = Boolean(
      (data as any)?.subscription || (data as any)?.plan
    );
    if (hasSubMarkers) return "surfboard";
    const mRef =
      (typeof (meta as any)?.reference === "string" &&
        (meta as any).reference) ||
      undefined;
    if (mRef) return "reva";
  }
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
          entityKey: entityKey ?? null, // requires column; see schema patch
          receivedAt: new Date(),
          status: "pending",
        },
        select: { id: true },
      });
      return rec.id as string;
    } catch (e: any) {
      // Fallback if schema lacks `entityKey`
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
      if (e?.code === "P2002") return null; // duplicate signature
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
      await onSubscriptionChargeSuccess(data as ChargeSuccessData);
      break;
    default:
      await onUnhandled(event, data as any);
      break;
  }
}

// ---- Helpers: common extraction ----
function extractPlan(data: SubscriptionData | ChargeSuccessData) {
  const planCode =
    typeof (data as any)?.plan === "string"
      ? String((data as any).plan)
      : (data as any)?.plan?.plan_code ||
        (data as any)?.subscription?.plan?.plan_code ||
        undefined;
  const planName =
    (data as any)?.plan?.name ||
    (data as any)?.subscription?.plan?.name ||
    planCode ||
    "";
  const interval =
    (data as any)?.plan?.interval ||
    (data as any)?.subscription?.plan?.interval ||
    undefined;
  return { planCode, planName, interval };
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
  // 3) user by email
  if (email) {
    const user = await prisma.surfboardUser.findUnique({ where: { email } });
    if (user?.id) return user.id;
  }
  return null;
}

// ---- Subscription: create/enable/disable ----
async function onSubscriptionCreate(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId)
    throw new Error(
      "SurfboardUser not found for subscription.create (match email/customerCode/subCode)"
    );

  const { planCode, planName, interval } = extractPlan(data);
  const amountKobo = (data as any)?.amount ?? undefined;
  const nextDate = data.next_payment_date
    ? new Date(data.next_payment_date)
    : null;

  // Upsert main subscription
  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      provider: "paystack",
      email: data.customer?.email ?? undefined,
      customerCode: data.customer?.customer_code ?? undefined,
      customerId: data.customer?.id ? String(data.customer.id) : undefined,
      emailToken: data.email_token ?? undefined,
      subCode: data.subscription_code ?? undefined,
      planCode: planCode ?? "",
      planName: planName ?? "",
      interval: interval ?? undefined,
      amount: typeof amountKobo === "number" ? amountKobo : undefined,
      status: data.status ?? "active",
      nextPaymentDate: nextDate ?? undefined,
      platform: "surfboard",
    },
    create: {
      userId,
      provider: "paystack",
      email: data.customer?.email ?? null,
      customerCode: data.customer?.customer_code ?? null,
      customerId: data.customer?.id ? String(data.customer.id) : null,
      emailToken: data.email_token ?? null,
      subCode: data.subscription_code ?? null,
      planCode: planCode ?? "",
      planName: planName ?? "",
      interval: interval ?? "monthly",
      amount: typeof amountKobo === "number" ? amountKobo : 0,
      currency: "NGN",
      status: data.status ?? "active",
      nextPaymentDate: nextDate,
      platform: "surfboard",
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
      startDate: new Date(),
      endDate: sub.nextPaymentDate ?? null,
      lastPaymentDate: null,
    },
  });
}

async function onSubscriptionEnable(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId)
    throw new Error("SurfboardUser not found for subscription.enable");
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
}

async function onSubscriptionDisable(data: SubscriptionData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId)
    throw new Error("SurfboardUser not found for subscription.disable");
  await prisma.subscription.update({
    where: { userId },
    data: { status: "canceled", cancelledAt: new Date() },
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
}

// ---- Invoice: failed → past_due ----
async function onInvoicePaymentFailed(data: InvoiceData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId)
    throw new Error("SurfboardUser not found for invoice.payment_failed");
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
}

// ---- Recurring charge success (renewal) ----
async function onSubscriptionChargeSuccess(data: ChargeSuccessData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId)
    throw new Error("SurfboardUser not found for charge.success (renewal)");

  const { planCode, planName, interval } = extractPlan(data);
  const amountKobo = data.amount ?? 0;
  const nextDateStr: string | undefined =
    data?.subscription?.next_payment_date || undefined;
  const nextDate = nextDateStr ? new Date(nextDateStr) : null;

  const sub = await prisma.subscription.update({
    where: { userId },
    data: {
      status: "active",
      planCode: planCode ?? undefined,
      planName: planName ?? undefined,
      interval: interval ?? undefined,
      amount: typeof amountKobo === "number" ? amountKobo : undefined,
      authorization: data.authorization?.authorization_code ?? undefined,
      nextPaymentDate: nextDate ?? undefined,
      currentStart: new Date(),
      currentEnd: nextDate ?? undefined,
    },
  });

  // Amount reconciliation (simple): log mismatch if any
  if (typeof sub.amount === "number" && sub.amount !== amountKobo) {
    await prisma?.webhookEvent
      ?.create?.({
        data: {
          signature: `recon:${data.reference}`,
          event: "amount.mismatch",
          platform: "surfboard",
          payload: {
            expected: sub.amount,
            paid: amountKobo,
            planCode: sub.planCode,
            reference: data.reference,
          },
          status: "ok",
        },
      })
      .catch(() => {});
  }

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      reference: data.reference || `REF-${Date.now()}`,
      planCode: sub.planCode,
      planName: sub.planName,
      amount: amountKobo,
      interval: sub.interval,
      status: "active",
      eventType: "subscription.success",
      startDate: new Date(),
      endDate: nextDate ?? null,
      lastPaymentDate: new Date(),
    },
  });
}

async function onInvoiceInformational(event: string, data: InvoiceData) {
  if (!prisma) return;
  const userId = await findSurfboardUserIdFromEvent(data);
  if (!userId) return;
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
}

// ─────────────────────────── Reva (one‑time) ───────────────────────────
async function handleReva(event: string, data: ChargeSuccessData) {
  if (event !== "charge.success") return onUnhandled(event, data as any);
  const m = data.metadata ?? {};
  const ref = (m.reference ||
    getField(m.custom_fields, "reference") ||
    data.reference) as string | undefined;
  const isAuth = Boolean(
    m.isAuthenticated || getField(m.custom_fields, "isAuthenticated")
  );
  if (!ref) {
    console.warn("[reva] missing reference");
    return;
  }

  // const reva = await loadRevaActions();
  console.log("Reva actions loaded", reva);

  const updateFn = isAuth
    ? reva?.updatePropertyTransactionStatus
    : reva?.updateOneTimeTransactionStatus;
  await updateFn?.(ref, "Completed", "Paid", "Payment confirmed", null);

  try {
    const tx = await (isAuth
      ? reva?.authGetTransactionData?.(ref)
      : reva?.getTransactionData?.(ref));
    const dataObj = tx?.data ?? tx; // support either shape
    if ((tx?.success || dataObj) && reva?.notifyPaymentReceived)
      await reva.notifyPaymentReceived(dataObj, undefined);
  } catch (e) {
    console.warn("[reva] notifyPaymentReceived failed", e);
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

function escapeHtml(str: string) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
}

// async function loadMailer() {
//   const tryImport = async (p: string) => {
//     try {
//       return await import(p);
//     } catch {
//       return null;
//     }
//   };

//   return (await tryImport("@/utils/email")) || null;
// }

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
    // If entityKey column does not exist, or any other issue, ignore
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
  if (!to.length) return; // no recipients configured

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

  // const mailer = await loadMailer();
  if (!mailer) {
    console.log("Mailer not loaded");
    return;
  }

  console.log("Mailer loaded");
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
  // Last resort: no-op
}

async function onUnhandled(event: string, data: Record<string, unknown>) {
  console.log("[webhook] unhandled", event, Object.keys(data || {}));
}
