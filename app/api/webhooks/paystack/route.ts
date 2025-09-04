// File: app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs"; // HMAC needs Node crypto
export const dynamic = "force-dynamic"; // webhooks must not be cached

/**
 * Paystack Webhook (App Router)
 * Multi‑platform router for:
 *  - Surfboard: subscriptions + invoices
 *  - Reva: one‑time checkout (guest or authenticated)
 *
 * Key features
 *  - Verifies `x-paystack-signature` (HMAC-SHA512) on the RAW body
 *  - Idempotency (Upstash Redis if configured; in‑memory fallback)
 *  - Calls first‑party actions if available (Prisma fallback)
 *
 * ENV
 *  - PAYSTACK_SECRET_KEY
 *  - (optional) UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

// // ──────────────────────────────────────────────────────────────────────────────
// // Optional stores & dependencies (loaded lazily to keep this file portable)
// // ──────────────────────────────────────────────────────────────────────────────
// let redis: {
//   get: (k: string) => Promise<string | null>;
//   set: (k: string, v: string, opts?: { ex?: number }) => Promise<unknown>;
// } | null = null;
// try {
//   const { Redis } = await import("@upstash/redis");
//   if (
//     process.env.UPSTASH_REDIS_REST_URL &&
//     process.env.UPSTASH_REDIS_REST_TOKEN
//   ) {
//     // @ts-ignore runtime init
//     redis = new Redis({
//       url: process.env.UPSTASH_REDIS_REST_URL,
//       token: process.env.UPSTASH_REDIS_REST_TOKEN,
//     });
//   }
// } catch {}

const seen = (globalThis as any).__ps_seen__ ?? new Set<string>();
(globalThis as any).__ps_seen__ = seen;

let prisma: any = null;
try {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
} catch {}

// Try to load first‑party actions (paths may vary between apps; we probe a few)
async function loadActions() {
  const actions: any = {};
  const tryImport = async (path: string) => {
    try {
      return await import(path);
    } catch {
      return null;
    }
  };

  actions.subscriptions =
    (await tryImport(
      "@/app/(projects)/(surboard)/actions/subscriptionActions"
    )) || null;

  actions.reva =
    (await tryImport("@/app/(projects)/reva/actions/revaActions")) || null;

  actions.planUtils =
    (await tryImport(
      "@/app/(projects)/(surboard)/utils/paystackSubscription"
    )) || null;

  return actions;
}

// ──────────────────────────────────────────────────────────────────────────────
// Types (subset of Paystack payloads + app domain)
// ──────────────────────────────────────────────────────────────────────────────
export type PaystackWebhookPayload = { event: string; data: any };

export type Platform = "surfboard" | "reva" | "unknown";

export type SubscriptionData = {
  id?: number;
  status?: string;
  subscription_code?: string;
  email_token?: string;
  customer?: { id?: number; customer_code?: string; email?: string };
  plan?: string | { plan_code?: string; [k: string]: any };
  next_payment_date?: string | null;
};

export type InvoiceData = {
  id?: number;
  invoice_code?: string;
  status?: string;
  amount?: number;
  subscription?: string | number | null;
  customer?: string | number | null;
  paid_at?: string | null;
  currency?: string;
};

export type ChargeSuccessData = {
  status?: string; // "success"
  reference?: string;
  amount?: number;
  currency?: string;
  customer?: { id?: number; customer_code?: string; email?: string };
  authorization?: { authorization_code?: string };
  plan?: string; // plan code if a subscription renewal
  subscription?: any; // present for recurring charges
  metadata?: Record<string, any> & {
    platform?: string;
    isAuthenticated?: boolean;
    reference?: string;
    custom_fields?: Array<{
      display_name?: string;
      variable_name?: string;
      value?: string;
    }>;
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Route
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "Missing PAYSTACK_SECRET_KEY" },
      { status: 500 }
    );

  // 1) Verify signature on RAW body
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2) Parse JSON
  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = payload;

  // // 3) Idempotency
  // const key = buildIdemKey(event, data);
  // if (key && (await isDuplicate(key)))
  //   return NextResponse.json({ ok: true, duplicate: true });
  // if (key) await markProcessed(key);

  // 4) Route by platform + event family
  const platform = detectPlatform(event, data as any);
  const actions = await loadActions();

  try {
    if (platform === "surfboard") {
      await handleSurfboard(event, data as any, actions);
    } else if (platform === "reva") {
      await handleReva(event, data as any, actions);
    } else {
      await onUnhandled(event, data);
    }
  } catch (err) {
    console.error("[paystack-webhook] handler error", err);
    // Fail closed so Paystack retries
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// Verification
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// Routing helpers
// ──────────────────────────────────────────────────────────────────────────────
function detectPlatform(event: string, data: any): Platform {
  if (event.startsWith("subscription.") || event.startsWith("invoice."))
    return "surfboard";
  if (event === "charge.success") {
    const m = (data?.metadata ?? {}) as ChargeSuccessData["metadata"];
    const hasSubMarkers = Boolean(data?.subscription || data?.plan);
    const hasSurfCustom =
      hasCustomField(m?.custom_fields, "subscription_plan_id") ||
      hasCustomField(m?.custom_fields, "subscription_plan");
    if (hasSubMarkers || hasSurfCustom) return "surfboard";

    const platformMeta = (m?.platform || m?.app || m?.product) as
      | string
      | undefined;
    if (platformMeta && /reva/i.test(platformMeta)) return "reva";

    // Heuristic: if we have a metadata.reference but no subscription markers, treat as Reva
    if (
      !hasSubMarkers &&
      (m?.reference || getField(m?.custom_fields, "reference"))
    )
      return "reva";
  }
  return "unknown";
}

function hasCustomField(
  customFields:
    | Array<{ variable_name?: string; display_name?: string }>
    | undefined,
  key: string
): boolean {
  return Boolean(getField(customFields, key));
}
function getField(
  customFields:
    | Array<{ variable_name?: string; display_name?: string; value?: any }>
    | undefined,
  key: string
): string | undefined {
  if (!customFields?.length) return undefined;
  const found =
    customFields.find(
      (f) => f.variable_name?.toLowerCase() === key.toLowerCase()
    ) ||
    customFields.find(
      (f) => f.display_name?.toLowerCase() === key.toLowerCase()
    );
  return typeof found?.value === "string"
    ? found.value
    : String(found?.value ?? "");
}

// ──────────────────────────────────────────────────────────────────────────────
// Idempotency
// ──────────────────────────────────────────────────────────────────────────────
function idemTtlSeconds() {
  return 60 * 60 * 24 * 7;
}
// async function isDuplicate(key: string): Promise<boolean> {
//   return redis ? Boolean(await redis.get(key)) : seen.has(key);
// }
// async function markProcessed(key: string): Promise<void> {
//   if (redis) await redis.set(key, "1", { ex: idemTtlSeconds() });
//   else seen.add(key);
// }
function buildIdemKey(event: string, data: Record<string, any>): string | null {
  const candidates = [
    data?.id,
    data?.reference,
    data?.invoice_code,
    data?.subscription_code,
  ].filter(Boolean);
  if (candidates.length === 0) return null;
  return `${event}:${String(candidates[0])}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Surfboard handlers
// ──────────────────────────────────────────────────────────────────────────────
async function handleSurfboard(
  event: string,
  data: SubscriptionData | InvoiceData | ChargeSuccessData,
  actions: any
) {
  switch (event) {
    case "subscription.create":
      await onSubscriptionCreate(data as SubscriptionData, actions);
      break;
    case "subscription.enable":
      await onSubscriptionEnable(data as SubscriptionData, actions);
      break;
    case "subscription.disable":
      await onSubscriptionDisable(data as SubscriptionData, actions);
      break;
    case "invoice.create":
      await onInvoiceCreate(data as InvoiceData, actions);
      break;
    case "invoice.update":
      await onInvoiceUpdate(data as InvoiceData, actions);
      break;
    case "invoice.payment_failed":
      await onInvoicePaymentFailed(data as InvoiceData, actions);
      break;
    case "charge.success":
      await onSubscriptionChargeSuccess(data as ChargeSuccessData, actions);
      break;
    default:
      await onUnhandled(event, data as Record<string, unknown>);
  }
}

async function onSubscriptionCreate(data: SubscriptionData, actions: any) {
  console.log(
    "[surfboard] subscription.create",
    pick(data, [
      "subscription_code",
      "customer",
      "plan",
      "email_token",
      "status",
    ])
  );
  const planCode =
    typeof data.plan === "string" ? data.plan : data.plan?.plan_code;
  const planId = await resolvePlanId({ planCode, actions });
  const payload = {
    planId,
    reference: data.subscription_code ?? `${Date.now()}`,
    subCode: data.subscription_code,
    customerCode: data.customer?.customer_code ?? "",
    customerId: String(data.customer?.id ?? ""),
    authorization: "", // not provided on this event; will be filled on charge.success
    emailToken: data.email_token ?? "",
    status: data.status ?? "active",
    nextPaymentDate: data.next_payment_date ?? undefined,
  } as const;
  if (actions?.subscriptions?.createOrUpdateSubscription && planId) {
    await actions.subscriptions.createOrUpdateSubscription(payload as any);
  } else if (prisma) {
    // Fallback minimal persistence
    await prisma.subscription.upsert({
      where: { userId: "unknown" }, // replace if you can map user here
      update: {
        subCode: data.subscription_code ?? undefined,
        status: data.status ?? undefined,
        nextPaymentDate: data.next_payment_date
          ? new Date(data.next_payment_date)
          : undefined,
      },
      create: {
        userId: "unknown",
        planCode: planCode ?? "",
        planName: planId ?? "",
        amount: 0,
        status: data.status ?? "active",
        platform: "surfboard",
      },
    });
  }
}

async function onSubscriptionEnable(data: SubscriptionData, actions: any) {
  console.log(
    "[surfboard] subscription.enable",
    pick(data, ["subscription_code", "status"])
  );
  // Your domain code likely toggles access; createOrUpdateSubscription will set status
  if (actions?.subscriptions?.createOrUpdateSubscription) {
    const planId = await resolvePlanId({
      planCode:
        typeof data.plan === "string" ? data.plan : data.plan?.plan_code,
      actions,
    });
    await actions.subscriptions.createOrUpdateSubscription({
      planId,
      reference: data.subscription_code ?? `${Date.now()}`,
      subCode: data.subscription_code,
      customerCode: data.customer?.customer_code ?? "",
      customerId: String(data.customer?.id ?? ""),
      authorization: "",
      emailToken: data.email_token ?? "",
      status: "active",
      nextPaymentDate: data.next_payment_date ?? undefined,
    });
  }
}

async function onSubscriptionDisable(data: SubscriptionData, actions: any) {
  console.log(
    "[surfboard] subscription.disable",
    pick(data, ["subscription_code", "status"])
  );
  if (actions?.subscriptions?.createOrUpdateSubscription) {
    const planId = await resolvePlanId({
      planCode:
        typeof data.plan === "string" ? data.plan : data.plan?.plan_code,
      actions,
    });
    await actions.subscriptions.createOrUpdateSubscription({
      planId,
      reference: data.subscription_code ?? `${Date.now()}`,
      subCode: data.subscription_code,
      customerCode: data.customer?.customer_code ?? "",
      customerId: String(data.customer?.id ?? ""),
      authorization: "",
      emailToken: data.email_token ?? "",
      status: "canceled",
      nextPaymentDate: data.next_payment_date ?? undefined,
    });
  }
}

async function onInvoiceCreate(data: InvoiceData, _actions: any) {
  console.log(
    "[surfboard] invoice.create",
    pick(data, ["invoice_code", "amount", "status"])
  );
  // Usually used to schedule attempts; no state change necessary here
}

async function onInvoiceUpdate(data: InvoiceData, _actions: any) {
  console.log(
    "[surfboard] invoice.update",
    pick(data, ["invoice_code", "amount", "status"])
  );
}

async function onInvoicePaymentFailed(data: InvoiceData, actions: any) {
  console.log(
    "[surfboard] invoice.payment_failed",
    pick(data, ["invoice_code", "amount", "status"])
  );
  if (actions?.subscriptions?.createOrUpdateSubscription) {
    // Mark subscription as past_due
    await actions.subscriptions.createOrUpdateSubscription({
      planId: undefined as any, // keep last plan
      reference: String(data.invoice_code ?? Date.now()),
      customerCode: String(data.customer ?? ""),
      customerId: String(data.customer ?? ""),
      subCode: undefined,
      authorization: "",
      emailToken: "",
      status: "past_due",
      paidAt: data.paid_at ?? undefined,
    });
  }
}

async function onSubscriptionChargeSuccess(
  data: ChargeSuccessData,
  actions: any
) {
  console.log(
    "[surfboard] charge.success (recurring)",
    pick(data, ["reference", "amount", "plan", "subscription"])
  );
  const planCode =
    data.plan ??
    (typeof data.subscription?.plan === "string"
      ? data.subscription.plan
      : data.subscription?.plan?.plan_code);
  const planId = await resolvePlanId({
    planCode,
    actions,
    metadata: data.metadata,
  });
  const emailToken = data?.subscription?.email_token ?? "";
  const customerCode =
    data?.subscription?.customer?.customer_code ??
    data?.customer?.customer_code ??
    "";
  const customerId = String(
    data?.subscription?.customer?.id ?? data?.customer?.id ?? ""
  );
  const subCode = data?.subscription?.subscription_code ?? undefined;
  const authorization = data?.authorization?.authorization_code ?? "";

  if (actions?.subscriptions?.createOrUpdateSubscription && planId) {
    await actions.subscriptions.createOrUpdateSubscription({
      planId,
      reference: data.reference ?? `${Date.now()}`,
      subCode,
      customerCode,
      customerId,
      authorization,
      emailToken,
      status: "active",
      paidAt: new Date(),
      nextPaymentDate: data?.subscription?.next_payment_date ?? undefined,
    });
  }
}

async function resolvePlanId({
  planCode,
  actions,
  metadata,
}: {
  planCode?: string | undefined;
  actions: any;
  metadata?: any;
}): Promise<string | undefined> {
  // 1) Prefer explicit metadata.subscription_plan_id
  const metaPlanId =
    metadata?.subscription_plan_id ||
    getField(metadata?.custom_fields, "subscription_plan_id");
  if (metaPlanId) return String(metaPlanId);

  // 2) Map Paystack plan_code to internal PlanId via SUBSCRIPTION_PLANS
  try {
    const utils = actions?.planUtils;
    const plans = utils?.SUBSCRIPTION_PLANS as
      | Record<string, { planCode: string } | undefined>
      | undefined;
    if (planCode && plans) {
      const entry = Object.entries(plans).find(
        ([, v]) => v?.planCode === planCode
      );
      if (entry) return entry[0];
    }
  } catch {}
  return undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// Reva handlers (one‑time)
// ──────────────────────────────────────────────────────────────────────────────
async function handleReva(
  event: string,
  data: ChargeSuccessData,
  actions: any
) {
  if (event !== "charge.success") return onUnhandled(event, data as any);
  await onRevaChargeSuccess(data, actions);
}

async function onRevaChargeSuccess(data: ChargeSuccessData, actions: any) {
  const m = data.metadata ?? {};
  const ref = (m.reference ||
    getField(m.custom_fields, "reference") ||
    data.reference) as string | undefined;
  const email = data.customer?.email ?? undefined;
  const isAuth = Boolean(
    m.isAuthenticated || getField(m.custom_fields, "isAuthenticated")
  );
  console.log("[reva] charge.success", { ref, email, isAuth });

  if (!ref) {
    console.warn("[reva] missing reference in metadata/tx");
    return;
  }

  // Prefer calling domain actions if available
  const updateFn = isAuth
    ? actions?.reva?.updatePropertyTransactionStatus
    : actions?.reva?.updateOneTimeTransactionStatus;

  if (updateFn) {
    await updateFn(ref, "Completed", "Paid", "Payment confirmed", null);
  } else if (prisma) {
    const model = isAuth ? prisma.property : prisma.oneTimeUserProperty;
    await model.update({
      where: { reference: ref },
      data: {
        status: "Completed",
        paymentStatus: "Paid",
        statusMessage: "Payment confirmed",
        error: null,
      },
    });
  }

  // Optional: admin/user notifications if available
  try {
    if (
      actions?.reva?.getTransactionData &&
      actions?.reva?.notifyPaymentReceived
    ) {
      const tx = await actions.reva.getTransactionData(ref);
      if (tx?.success && tx?.data)
        await actions.reva.notifyPaymentReceived(tx.data);
    }
  } catch (err) {
    console.warn("[reva] notifyPaymentReceived failed", err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Misc utils
// ──────────────────────────────────────────────────────────────────────────────
async function onUnhandled(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  console.log("[webhook] unhandled", event, Object.keys(data));
}
function pick<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  return keys.reduce((acc, k) => {
    if (k in obj) (acc as any)[k] = obj[k];
    return acc;
  }, {} as Partial<T>);
}

// ──────────────────────────────────────────────────────────────────────────────
// README (inline)
// ──────────────────────────────────────────────────────────────────────────────
/**
Usage
=====
1) Add to `.env.local`:
   PAYSTACK_SECRET_KEY=sk_test_xxx
   # optional durable idempotency (recommended)
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...

2) Configure dashboard webhook URL:
   https://<your-domain>/api/webhooks/paystack

3) Reva one‑time init must include reference in metadata:
   metadata: { platform: "reva", isAuthenticated: false, reference: "REF_xxx" }
   // or custom_fields [{ variable_name: "reference", value: "REF_xxx" }]

Notes
-----
- Verify `x-paystack-signature` on the RAW body before JSON.parse.
- Paystack retries on non‑200 for up to ~72h; keep handlers idempotent.
- Keep domain handlers safe to run multiple times.
*/

// // File: app/api/webhooks/paystack/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";

// export const runtime = "nodejs"; // why: HMAC + Buffer APIs
// export const dynamic = "force-dynamic"; // why: prevent caching

// // Optional: Upstash Redis for durable idempotency
// let redis: {
//   get: (k: string) => Promise<string | null>;
//   set: (k: string, v: string, opts?: any) => Promise<void>;
// } | null = null;

// try {
//   // @ts-ignore optional dep
//   const { Redis } = await import("@upstash/redis");
//   if (
//     process.env.UPSTASH_REDIS_REST_URL &&
//     process.env.UPSTASH_REDIS_REST_TOKEN
//   ) {
//     redis = new Redis({
//       url: process.env.UPSTASH_REDIS_REST_URL,
//       token: process.env.UPSTASH_REDIS_REST_TOKEN,
//     }) as any;
//   }
// } catch {}

// // Prisma (schema-driven models present in your repo)
// let prisma: any = null;
// try {
//   const { PrismaClient } = await import("@prisma/client");
//   prisma = new PrismaClient();
// } catch {}

// // ----------------------------- Types ------------------------------
// type PaystackWebhook = { event: string; data: any };

// // Paystack "subscription.*" payloads (partial)
// type PsSubscription = {
//   id?: number;
//   status?: string;
//   subscription_code?: string; // a.k.a. subCode in our DB
//   email_token?: string;
//   customer?: { id?: number; email?: string; customer_code?: string };
//   plan?: any; // can be code or object
//   next_payment_date?: string | null;
//   authorization?: { authorization_code?: string } | null;
// };

// // Paystack charge.success (one-time)
// type PsChargeSuccess = {
//   reference?: string;
//   amount?: number; // kobo
//   currency?: string;
//   status?: string; // success
//   customer?: { email?: string };
//   metadata?: Record<string, any> | null;
//   paidAt?: string | null;
// };

// // -------------------------- Entry Point ---------------------------
// export async function POST(req: NextRequest): Promise<NextResponse> {
//   const secret = process.env.PAYSTACK_SECRET_KEY;
//   if (!secret)
//     return NextResponse.json(
//       { error: "Missing PAYSTACK_SECRET_KEY" },
//       { status: 500 }
//     );

//   const raw = await req.text();
//   const signature = req.headers.get("x-paystack-signature") ?? "";
//   if (!verify(raw, signature, secret))
//     return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

//   let payload: PaystackWebhook;
//   try {
//     payload = JSON.parse(raw);
//   } catch {
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const { event, data } = payload;
//   const idemKey = deriveIdemKey(event, data);
//   if (idemKey && (await isDuplicate(idemKey)))
//     return NextResponse.json({ ok: true, duplicate: true });
//   if (idemKey) await markProcessed(idemKey);

//   try {
//     switch (event) {
//       // ───────── SURFBOARD: subscription lifecycle ─────────
//       case "subscription.create":
//       case "subscription.enable":
//       case "subscription.disable": {
//         await surfboardSubscriptionHandler(event, data as PsSubscription);
//         break;
//       }

//       // ───────── REVA: one‑time checkout (charge.success) ─────────
//       case "charge.success": {
//         await revaOneTimeHandler(data as PsChargeSuccess);
//         break;
//       }

//       // Other events currently ignored
//       default: {
//         await onUnhandled(event, data);
//         break;
//       }
//     }
//   } catch (err) {
//     console.error("[paystack-webhook] handler error", err);
//     return NextResponse.json({ error: "Handler error" }, { status: 500 });
//   }

//   return NextResponse.json({ ok: true });
// }

// // ------------------------- Surfboard flow -------------------------
// async function surfboardSubscriptionHandler(
//   event: string,
//   ps: PsSubscription
// ): Promise<void> {
//   // why: limit to Surfboard platform; fail fast otherwise
//   const platform = inferPlatformFromMetadata(ps as any) ?? "surfboard";
//   if (platform !== "surfboard") return;

//   if (!prisma) {
//     console.log("[surfboard] prisma not available; skipping persistence");
//     return;
//   }

//   const email = ps.customer?.email ?? null;
//   const user = email
//     ? await prisma.surfboardUser.findUnique({ where: { email } })
//     : null;

//   // Map Paystack → DB
//   const subCode = ps.subscription_code ?? null;
//   const planCode = normalizePlanCode(ps.plan);
//   const planName =
//     typeof ps.plan === "object" && ps.plan?.name
//       ? String(ps.plan.name)
//       : planCode ?? "";
//   const interval =
//     typeof ps.plan === "object" && ps.plan?.interval
//       ? String(ps.plan.interval)
//       : "monthly";
//   const nextPaymentDate = ps.next_payment_date
//     ? new Date(ps.next_payment_date)
//     : null;
//   const authorization = ps.authorization?.authorization_code ?? null;
//   const customerCode = ps.customer?.customer_code ?? null;
//   const customerId = ps.customer?.id ? String(ps.customer.id) : null;
//   const status = ps.status ?? "active";

//   if (user) {
//     // userId is unique in Subscription schema
//     await prisma.subscription.upsert({
//       where: { userId: user.id },
//       create: {
//         userId: user.id,
//         provider: "paystack",
//         email: email ?? undefined,
//         customerCode: customerCode ?? undefined,
//         customerId: customerId ?? undefined,
//         emailToken: ps.email_token ?? undefined,
//         authorization: authorization ?? undefined,
//         subCode: subCode ?? undefined,
//         planCode: planCode ?? "",
//         planName: planName,
//         interval,
//         amount: 0, // unknown from webhook; set during plan creation/checkout
//         currency: "NGN",
//         nextPaymentDate,
//         status,
//         platform: "surfboard",
//       },
//       update: {
//         email: email ?? undefined,
//         customerCode: customerCode ?? undefined,
//         customerId: customerId ?? undefined,
//         emailToken: ps.email_token ?? undefined,
//         authorization: authorization ?? undefined,
//         subCode: subCode ?? undefined,
//         planCode: planCode ?? undefined,
//         planName: planName ?? undefined,
//         interval: interval ?? undefined,
//         nextPaymentDate: nextPaymentDate ?? undefined,
//         status,
//         platform: "surfboard",
//       },
//     });
//   } else {
//     // why: avoid bad data; alert for manual reconciliation
//     console.warn("[surfboard] user not found for subscription event", {
//       email,
//       subCode,
//     });
//   }

//   // Optional: record history if you have SubscriptionHistory model
//   try {
//     if (prisma.subscriptionHistory) {
//       await prisma.subscriptionHistory.create({
//         data: {
//           event,
//           raw: (ps as any) ?? {},
//           platform: "surfboard",
//           userId: user?.id ?? null,
//           subCode: subCode ?? null,
//         },
//       });
//     }
//   } catch {}
// }

// // --------------------------- Reva flow ----------------------------
// async function revaOneTimeHandler(ps: PsChargeSuccess): Promise<void> {
//   // why: only process Reva one-time charges
//   const platform =
//     inferPlatformFromMetadata(ps) ??
//     (await inferRevaFromReference(ps.reference));
//   if (platform !== "reva") return;

//   if (!prisma) {
//     console.log("[reva] prisma not available; skipping persistence");
//     return;
//   }

//   const reference = ps.reference ?? null;
//   if (!reference) return;

//   const isLive = (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_live");

//   // Map charge → OneTimeUserProperty
//   const paymentStatus =
//     ps.status === "success" ? "success" : ps.status ?? "unknown";

//   const exists = await prisma.oneTimeUserProperty
//     .findUnique({ where: { reference } })
//     .catch(() => null);
//   if (!exists) {
//     console.warn("[reva] one-time record not found for reference", reference);
//     return;
//   }

//   await prisma.oneTimeUserProperty.update({
//     where: { reference },
//     data: {
//       paymentStatus,
//       status: paymentStatus === "success" ? "paid" : paymentStatus,
//       isLive,
//       updatedAt: new Date(),
//       // Optionally store receipt fields
//       report: {
//         reference: ps.reference,
//         amount: ps.amount,
//         currency: ps.currency,
//         customer: ps.customer ?? null,
//         metadata: ps.metadata ?? null,
//         paidAt: ps.paidAt ?? null,
//       },
//     },
//   });
// }

// // --------------------------- Utilities ---------------------------
// function verify(rawBody: string, signature: string, secret: string): boolean {
//   const expected = crypto
//     .createHmac("sha512", secret)
//     .update(rawBody, "utf8")
//     .digest("hex");
//   if (!signature) return false;
//   try {
//     const a = Buffer.from(expected, "hex");
//     const b = Buffer.from(signature.trim(), "hex");
//     if (a.length !== b.length) return false;
//     return crypto.timingSafeEqual(a as any, b as any);
//   } catch {
//     return false;
//   }
// }

// function deriveIdemKey(
//   event: string,
//   data: Record<string, any>
// ): string | null {
//   const cands = [
//     data?.id,
//     data?.reference,
//     data?.invoice_code,
//     data?.subscription_code,
//     data?.trxref,
//     data?.transaction_reference,
//   ].filter(Boolean);
//   if (!cands.length) return null;
//   return `${event}:${String(cands[0])}`;
// }

// async function isDuplicate(key: string): Promise<boolean> {
//   if (redis) return Boolean(await redis.get(key));
//   const g = getSeen();
//   return g.has(key);
// }

// async function markProcessed(key: string): Promise<void> {
//   if (redis) return void (await redis.set(key, "1", { ex: 60 * 60 * 24 * 7 }));
//   getSeen().add(key);
// }

// function getSeen(): Set<string> {
//   const g = globalThis as unknown as { __ps_seen__?: Set<string> };
//   if (!g.__ps_seen__) g.__ps_seen__ = new Set();
//   return g.__ps_seen__!;
// }

// function inferPlatformFromMetadata(obj: any): string | null {
//   const meta = obj?.metadata ?? obj?.data?.metadata ?? null;
//   const p =
//     typeof meta === "object" && meta
//       ? meta.platform ?? meta.app ?? meta.product ?? null
//       : null;
//   return p ? String(p).toLowerCase() : null;
// }

// async function inferRevaFromReference(
//   reference?: string | null
// ): Promise<"reva" | null> {
//   if (!reference || !prisma) return null;
//   try {
//     const rec = await prisma.oneTimeUserProperty.findUnique({
//       where: { reference },
//     });
//     return rec ? "reva" : null;
//   } catch {
//     return null;
//   }
// }

// function normalizePlanCode(plan: any): string | null {
//   if (!plan) return null;
//   if (typeof plan === "string") return plan;
//   if (typeof plan === "object") return plan.plan_code ?? plan.code ?? null;
//   return null;
// }

// async function onUnhandled(
//   event: string,
//   data: Record<string, any>
// ): Promise<void> {
//   console.log("[paystack-webhook] unhandled", event, Object.keys(data));
// }

// // --------------------------- README -------------------------------
// /*
// Usage
// =====
// Env:
//   PAYSTACK_SECRET_KEY=sk_test_xxx
//   # optional for idempotency
//   UPSTASH_REDIS_REST_URL=...
//   UPSTASH_REDIS_REST_TOKEN=...

// URL:
//   POST /api/webhooks/paystack

// Platform Routing:
//   - Surfboard: handles Paystack subscription.* events only.
//     Add { metadata: { platform: 'surfboard' } } when creating subscriptions (recommended).
//   - Reva: handles Paystack charge.success (one-time). Pass { metadata: { platform: 'reva', ... } } when initializing the transaction.
//     Fallback: will auto-detect Reva if reference matches OneTimeUserProperty.reference.

// Local Test:
//   curl -X POST http://localhost:3000/api/webhooks/paystack \
//     -H "Content-Type: application/json" \
//     -H "x-paystack-signature: $(node -e 'const c=require("crypto");const s=process.env.PAYSTACK_SECRET_KEY||"sk_test_xxx";const b=JSON.stringify({event:"charge.success",data:{reference:"REF_123",status:"success",metadata:{platform:"reva"}}});process.stdout.write(c.createHmac("sha512",s).update(b).digest("hex"))')" \
//     -d '{"event":"charge.success","data":{"reference":"REF_123","status":"success","metadata":{"platform":"reva"}}}'
// */

// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // ────────────────────────────────────────────────────────────────────────────────
// // // File: app/api/paystack/webhook/route.ts
// // // Purpose: Paystack webhook — Node runtime only. Verifies signature over raw
// // //          bytes, resolves user by metadata (fallback email), updates Subscription,
// // //          and writes SubscriptionHistory idempotently using `reference`.
// // // Schema notes:
// // //   - SubscriptionHistory.reference (indexed, required) is the idempotency key.
// // //   - Subscription requires userId; resolve from event metadata.
// // //   - subCode might not be resolvable in app state; prefer event.subCode when present.
// // // ────────────────────────────────────────────────────────────────────────────────

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Imports
// // // ────────────────────────────────────────────────────────────────────────────────
// // import { NextResponse } from "next/server";
// // import prisma from "@/lib/prisma";
// // import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
// // import { SUBSCRIPTION_PLANS } from "@/app/(projects)/(surboard)/utils/paystackSubscription";
// // import { createHmac, timingSafeEqual } from "node:crypto";
// // import { PaystackWebhookType } from "@/types/PaystackWebhookType";

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Types
// // // ────────────────────────────────────────────────────────────────────────────────
// // type Interval = "monthly" | "quarterly" | "annually";

// // interface PaystackWebhookEvent {
// //   event: string;
// //   data: {
// //     reference?: string;
// //     subscription_code?: string;
// //     amount?: number;
// //     customer?: {
// //       email?: string;
// //       customer_code?: string;
// //     };
// //     customer_email?: string;
// //     customer_code?: string;
// //     plan_code?: string;
// //     plan?: {
// //       plan_code?: string;
// //     };
// //     email_token?: string;
// //     authorization_code?: string;
// //     authorization?: {
// //       authorization_code?: string;
// //       reference?: string;
// //     };
// //     status?: string;
// //     paid_at?: string;
// //     createdAt?: string;
// //     updatedAt?: string;
// //     next_payment_date?: string;
// //     period_start?: string;
// //     period_end?: string;
// //     metadata?: any;
// //     [key: string]: any;
// //   };
// // }

// // // Run on Node, never cache, always dynamic
// // export const runtime = "nodejs";
// // export const dynamic = "force-dynamic";
// // export const revalidate = 0;

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Error Handling
// // // ────────────────────────────────────────────────────────────────────────────────
// // class WebhookError extends Error {
// //   constructor(
// //     message: string,
// //     public readonly statusCode: number = 500,
// //     public readonly context: Record<string, any> = {}
// //   ) {
// //     super(message);
// //     this.name = "WebhookError";
// //   }
// // }

// // function logError(error: unknown, context: Record<string, any> = {}) {
// //   if (error instanceof WebhookError) {
// //     console.error(`[Webhook Error ${error.statusCode}]: ${error.message}`, {
// //       ...error.context,
// //       ...context,
// //       stack: error.stack,
// //     });
// //   } else if (error instanceof Error) {
// //     console.error(`[Webhook Error]: ${error.message}`, {
// //       ...context,
// //       stack: error.stack,
// //     });
// //   } else {
// //     console.error("[Webhook Error]: Unknown error occurred", {
// //       error,
// //       ...context,
// //     });
// //   }
// // }

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Request Validation
// // // ────────────────────────────────────────────────────────────────────────────────
// // async function validateWebhookRequest(request: Request): Promise<{
// //   event: PaystackWebhookEvent;
// //   rawBody: Uint8Array;
// // }> {
// //   const signature = request.headers.get("x-paystack-signature");
// //   if (!signature) {
// //     throw new WebhookError("Missing Paystack signature", 200);
// //   }

// //   const secret = getPaystackSecretForWebhook();
// //   if (!secret) {
// //     throw new WebhookError("Server configuration error", 200);
// //   }

// //   const rawBody = new Uint8Array(await request.arrayBuffer());
// //   const isValid = verifySignatureRaw(rawBody, signature, secret);

// //   if (!isValid) {
// //     throw new WebhookError("Invalid signature", 200);
// //   }

// //   try {
// //     const bodyText = new TextDecoder().decode(rawBody);
// //     const event = JSON.parse(bodyText) as PaystackWebhookEvent;

// //     if (!event.event || !event.data) {
// //       throw new WebhookError("Invalid webhook payload", 200);
// //     }

// //     return { event, rawBody };
// //   } catch (error) {
// //     if (error instanceof SyntaxError) {
// //       throw new WebhookError("Invalid JSON payload", 200);
// //     }
// //     throw error;
// //   }
// // }

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Helpers
// // // ────────────────────────────────────────────────────────────────────────────────
// // const safe = <T>(v: T | undefined | null): T | undefined =>
// //   v === undefined || v === null ? undefined : (v as T);

// // const parseDate = (v: unknown): Date | undefined =>
// //   v ? new Date(v as any) : undefined;

// // // Optimize plan lookup with a Map
// // const PLAN_LOOKUP = new Map(
// //   Object.values(SUBSCRIPTION_PLANS).map((p) => [p.planCode, p])
// // );

// // function planFromCode(planCode?: string) {
// //   return planCode ? PLAN_LOOKUP.get(planCode) : undefined;
// // }

// // function periodFor(interval: Interval, ref: Date) {
// //   const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
// //   const endOfMonth = (d: Date) =>
// //     new Date(d.getFullYear(), d.getMonth() + 1, 0);
// //   const startOfQuarter = (d: Date) =>
// //     new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
// //   const endOfQuarter = (d: Date) =>
// //     new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
// //   const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
// //   const endOfYear = (d: Date) => new Date(d.getFullYear(), 12, 0);
// //   const addDays = (d: Date, days: number) =>
// //     new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// //   if (interval === "monthly") {
// //     const start = startOfMonth(ref);
// //     const end = endOfMonth(ref);
// //     return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
// //   }
// //   if (interval === "quarterly") {
// //     const start = startOfQuarter(ref);
// //     const end = endOfQuarter(ref);
// //     return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
// //   }
// //   const start = startOfYear(ref);
// //   const end = endOfYear(ref);
// //   return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
// // }

// // function nairaFromKobo(kobo?: number) {
// //   if (typeof kobo !== "number" || Number.isNaN(kobo)) return undefined;
// //   return Math.round(kobo / 100);
// // }

// // function verifySignatureRaw(
// //   raw: Uint8Array,
// //   signature: string,
// //   secret: string
// // ): boolean {
// //   const digestHex = createHmac("sha512", secret).update(raw).digest("hex");
// //   const a = Buffer.from(digestHex, "hex");
// //   const b = Buffer.from(signature, "hex");
// //   return (
// //     a.length === b.length &&
// //     timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
// //   );
// // }

// // function extractReference(data: any): string {
// //   return (
// //     data?.reference ||
// //     data?.invoice_code ||
// //     data?.transaction_reference ||
// //     data?.authorization?.reference ||
// //     data?.id?.toString?.() ||
// //     // Last resort: deterministic composite (not ideal but required by schema)
// //     [data?.subscription_code, data?.paid_at || data?.createdAt, data?.status]
// //       .filter(Boolean)
// //       .join(":")
// //   );
// // }

// // function extractPlanCode(data: any): string | undefined {
// //   if (!data) return undefined;
// //   if (typeof data.plan === "string") return data.plan;
// //   if (typeof data.plan?.plan_code === "string") return data.plan.plan_code;
// //   return undefined;
// // }

// // function extractInterval(planCode?: string, fallback?: string): Interval {
// //   const p = planFromCode(planCode || "");
// //   const iv = (p?.interval || fallback || "monthly") as Interval;
// //   return iv;
// // }

// // function extractUserIdFromMetadata(meta: any): string | undefined {
// //   if (!meta) return undefined;
// //   const direct =
// //     meta.userId || meta.user_id || meta.uid || meta.surfboard_user_id;
// //   if (direct && typeof direct === "string") return direct;
// //   const fields: any[] = Array.isArray(meta.custom_fields)
// //     ? meta.custom_fields
// //     : [];
// //   const fromField = fields.find((f) =>
// //     ["user_id", "userId", "uid", "surfboard_user_id"].includes(
// //       String(f?.variable_name || f?.key || "").toLowerCase()
// //     )
// //   );
// //   if (fromField?.value && typeof fromField.value === "string")
// //     return fromField.value;
// //   return undefined;
// // }

// // async function resolveUserId(data: any): Promise<string | undefined> {
// //   const meta = data?.metadata || {};
// //   const userId = extractUserIdFromMetadata(meta);
// //   if (userId) return userId;
// //   // Fallback: customer email → user
// //   const email: string | undefined = safe(
// //     data?.customer?.email || data?.customer_email || meta?.email
// //   );
// //   if (email) {
// //     const user = await prisma.surfboardUser.findUnique({ where: { email } });
// //     if (user) return user.id;
// //   }
// //   return undefined;
// // }

// // // Idempotency checks: prefer exact reference, otherwise legacy keys
// // async function historyExistsByReference(reference?: string) {
// //   if (!reference) return false;
// //   const found = await prisma.subscriptionHistory.findFirst({
// //     where: { reference },
// //   });
// //   return Boolean(found);
// // }

// // async function historyExistsLegacy(
// //   userId: string,
// //   reference: string,
// //   eventType: string,
// //   trxDate?: Date,
// //   amount?: number
// // ) {
// //   if (!userId) return false;
// //   const found = await prisma.subscriptionHistory.findFirst({
// //     where: {
// //       userId,
// //       reference,
// //       eventType,
// //       ...(trxDate ? { startDate: trxDate } : {}),
// //       ...(typeof amount === "number" ? { amount } : {}),
// //     },
// //   });
// //   return Boolean(found);
// // }

// // // ────────────────────────────────────────────────────────────────────────────────
// // // Handler
// // // ────────────────────────────────────────────────────────────────────────────────
// // export async function POST(request: Request) {
// //   try {
// //     const { event, rawBody } = await validateWebhookRequest(request);
// //     const { event: type, data } = event;
// //     const reference = extractReference(data);

// //     const secret = getPaystackSecretForWebhook();
// //     const signature = request.headers.get("x-paystack-signature");

// //     const body = (await request.json()) as PaystackWebhookType;
// //     const hash = createHmac("sha512", secret)
// //       .update(JSON.stringify(body))
// //       .digest("hex");

// //     if (hash !== signature) {
// //       console.log("Webhook: Invalid signature");
// //       return Response.json(
// //         { message: "Invalid signature" },
// //         {
// //           status: 200,
// //           headers: { "Content-Type": "application/json" },
// //         }
// //       );
// //     }

// //     // Log incoming webhook for debugging
// //     console.log(`[Webhook Received] ${type}`, {
// //       reference,
// //       eventType: type,
// //       subscriptionCode: data.subscription_code,
// //       customerEmail: data.customer?.email || data.customer_email,
// //     });

// //     // Resolve user id from metadata (or email fallback)
// //     const userId = await resolveUserId(data);
// //     if (!userId) {
// //       console.warn(`[Webhook Warning] Could not resolve user for event`, {
// //         type,
// //         reference,
// //         metadata: data.metadata,
// //       });
// //       // Continue processing as some events might not require a user
// //     }

// //     // Check for duplicate webhook
// //     if (await historyExistsByReference(reference)) {
// //       console.log(`[Webhook Deduped] Duplicate webhook received`, {
// //         reference,
// //         type,
// //       });
// //       return NextResponse.json({ ok: true, deduped: true });
// //     }

// //     // Process the webhook event
// //     try {
// //       // Common fields
// //       const subCode: string | undefined = safe(data.subscription_code);
// //       const planCode: string | undefined = extractPlanCode(data);
// //       const amountKobo: number | undefined = safe(data.amount);
// //       const customerCode: string | undefined = safe(
// //         data.customer?.customer_code || data.customer_code
// //       );
// //       const emailToken: string | undefined = safe(data.email_token);
// //       const authorizationCode: string | undefined = safe(
// //         data.authorization_code || data.authorization?.authorization_code
// //       );
// //       const status: string | undefined = safe(data.status);

// //       switch (type) {
// //         case "subscription.create": {
// //           if (!userId) return NextResponse.json({ ok: true }); // Cannot attach rows without user

// //           const p = planFromCode(planCode);
// //           const amountNaira = nairaFromKobo(amountKobo) ?? 0;
// //           const interval = extractInterval(planCode, "monthly");

// //           // Prefer event's subCode if present; otherwise try to keep existing row by customerCode
// //           if (userId) {
// //             await prisma.subscription.upsert({
// //               where: { userId },
// //               update: {
// //                 userId: userId, // do not switch ownership silently
// //                 provider: "paystack",
// //                 planCode: planCode || "",
// //                 planName: p?.name || "",
// //                 interval: interval,
// //                 amount: amountNaira,
// //                 currency: "NGN",
// //                 status: status || "active",
// //                 customerCode: customerCode || "",
// //                 authorization: authorizationCode || undefined,
// //                 emailToken: emailToken || "",
// //                 nextPaymentDate: parseDate(data.next_payment_date),
// //               },
// //               create: {
// //                 userId,
// //                 subCode,
// //                 provider: "paystack",
// //                 planCode: planCode || "",
// //                 planName: p?.name || "",
// //                 interval,
// //                 amount: amountNaira,
// //                 currency: "NGN",
// //                 status: status || "active",
// //                 customerCode: customerCode,
// //                 authorization: authorizationCode,
// //                 emailToken: emailToken,
// //                 nextPaymentDate: parseDate(data.next_payment_date),
// //               },
// //             });
// //           } else {
// //             // No subCode and no existing row: cannot create Subscription (schema requires subCode)
// //             // We still record history against the user for audit.
// //           }

// //           const trxDate = parseDate(data.createdAt) || new Date();
// //           if (
// //             !(await historyExistsLegacy(
// //               userId,
// //               reference,
// //               type,
// //               trxDate,
// //               amountKobo
// //             ))
// //           ) {
// //             await prisma.subscriptionHistory.create({
// //               data: {
// //                 reference,
// //                 userId,
// //                 planCode: planCode || "",
// //                 planName: p?.name || "",
// //                 amount: typeof amountKobo === "number" ? amountKobo : 0,
// //                 interval,
// //                 lastPaymentDate: undefined,
// //                 startDate: parseDate(data.createdAt) || new Date(),
// //                 endDate: parseDate(data.next_payment_date) || new Date(),
// //                 status: status || "active",
// //                 eventType: type,
// //               },
// //             });
// //           }
// //           return NextResponse.json({ ok: true });
// //         }

// //         case "charge.success": {
// //           if (!userId) return NextResponse.json({ ok: true });
// //           const paidAt = parseDate(data.paid_at) || new Date();
// //           const p = planFromCode(planCode || "");
// //           const interval = extractInterval(planCode || "", "monthly");
// //           const { periodStart, periodEnd, chargeDate } = periodFor(
// //             interval,
// //             paidAt
// //           );

// //           if (userId) {
// //             await prisma.subscription.upsert({
// //               where: { userId },
// //               update: {
// //                 status: "active",
// //                 currentStart: periodStart,
// //                 currentEnd: periodEnd,
// //                 nextPaymentDate: chargeDate,
// //                 amount: nairaFromKobo(amountKobo) ?? 0,
// //                 authorization: authorizationCode || undefined,
// //                 customerCode: customerCode || "",
// //               },
// //               create: {
// //                 userId,
// //                 subCode,
// //                 provider: "paystack",
// //                 planCode: planCode || "",
// //                 planName: p?.name || "",
// //                 interval,
// //                 amount: nairaFromKobo(amountKobo) ?? 0,
// //                 currency: "NGN",
// //                 status: "active",
// //                 customerCode: customerCode,
// //                 authorization: authorizationCode,
// //                 currentStart: periodStart,
// //                 currentEnd: periodEnd,
// //                 nextPaymentDate: chargeDate,
// //               },
// //             });
// //           }

// //           await prisma.subscriptionHistory.create({
// //             data: {
// //               reference,
// //               userId,
// //               planCode: planCode || "",
// //               planName: p?.name || "",
// //               amount: typeof amountKobo === "number" ? amountKobo : 0,
// //               interval,
// //               lastPaymentDate: paidAt,
// //               startDate: periodStart,
// //               endDate: periodEnd,
// //               status: "active",
// //               eventType: type,
// //             },
// //           });
// //           return NextResponse.json({ ok: true });
// //         }

// //         case "invoice.payment_failed": {
// //           if (!userId) return NextResponse.json({ ok: true });
// //           const when = parseDate(data.next_payment_date) || new Date();

// //           if (userId) {
// //             await prisma.subscription.update({
// //               where: { userId },
// //               data: { status: "past_due" },
// //             });
// //           }

// //           await prisma.subscriptionHistory.create({
// //             data: {
// //               reference,
// //               userId,
// //               planCode: planCode || "",
// //               planName: planFromCode(planCode || "")?.name || "",
// //               amount: typeof amountKobo === "number" ? amountKobo : 0,
// //               interval: (planFromCode(planCode || "")?.interval ||
// //                 "monthly") as Interval,
// //               lastPaymentDate: undefined,
// //               startDate: new Date(),
// //               endDate: new Date(),
// //               status: "past_due",
// //               eventType: type,
// //             },
// //           });
// //           return NextResponse.json({ ok: true });
// //         }

// //         case "subscription.disable":
// //         case "subscription.not_renew": {
// //           if (!userId) return NextResponse.json({ ok: true });
// //           const when = parseDate(
// //             data.disabledAt || data.updatedAt || Date.now()
// //           );

// //           if (userId) {
// //             await prisma.subscription.update({
// //               where: { userId },
// //               data: { status: "canceled", cancelledAt: when || undefined },
// //             });
// //           }

// //           await prisma.subscriptionHistory.create({
// //             data: {
// //               reference,
// //               userId,
// //               planCode: planCode || "",
// //               planName: planFromCode(planCode || "")?.name || "",
// //               amount: typeof amountKobo === "number" ? amountKobo : 0,
// //               interval: (planFromCode(planCode || "")?.interval ||
// //                 "monthly") as Interval,
// //               lastPaymentDate: new Date(),
// //               startDate: new Date(),
// //               endDate: new Date(),
// //               status: "canceled",
// //               eventType: type,
// //             },
// //           });
// //           return NextResponse.json({ ok: true });
// //         }

// //         case "invoice.create": {
// //           if (!userId) return NextResponse.json({ ok: true });
// //           await prisma.subscriptionHistory.create({
// //             data: {
// //               reference,
// //               userId,
// //               planCode: planCode || "",
// //               planName: planFromCode(planCode || "")?.name || "",
// //               amount: typeof amountKobo === "number" ? amountKobo : 0,
// //               interval: (planFromCode(planCode || "")?.interval ||
// //                 "monthly") as Interval,
// //               lastPaymentDate: undefined,
// //               startDate: parseDate(data.period_start) || new Date(),
// //               endDate: parseDate(data.period_end) || new Date(),
// //               status: "pending",
// //               eventType: type,
// //             },
// //           });
// //           return NextResponse.json({ ok: true });
// //         }

// //         default:
// //           return NextResponse.json({ ok: true, ignored: type });
// //       }
// //     } catch (processError) {
// //       logError(processError, {
// //         eventType: type,
// //         reference,
// //         userId,
// //       });
// //       throw new WebhookError("Failed to process webhook", 500, {
// //         eventType: type,
// //         reference,
// //       });
// //     }
// //   } catch (error) {
// //     if (error instanceof WebhookError) {
// //       logError(error);
// //       return NextResponse.json(
// //         { error: error.message },
// //         { status: error.statusCode }
// //       );
// //     }

// //     // For unexpected errors, log the full error but return a generic message
// //     logError(error);
// //     return NextResponse.json(
// //       { error: "Internal server error" },
// //       { status: 500 }
// //     );
// //   }
// // }
