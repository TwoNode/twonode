"use server";

import axios, { AxiosInstance } from "axios";
import {
  createPaystackInstance,
  getPaystackSecretForWebhook,
} from "@/utils/paystackConfig";

const PAYSTACK_SECRET_KEY = getPaystackSecretForWebhook();

type CustomField = {
  value: string;
  display_name?: string;
  variable_name?: string;
};

type PaystackSubscription = {
  id: number;
  status: string;
  subscription_code: string;
  email_token: string | null;
  next_payment_date: string | null;
  plan?:
    | {
        id: number;
        name: string;
        plan_code: string;
        interval: string;
        amount: number;
      }
    | string;
  customer?:
    | {
        id: number;
        email: string;
        customer_code: string;
      }
    | number;
  metadata?: {
    custom_fields?: CustomField[];
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
};

type ListResponse = {
  status: boolean;
  message: string;
  data: PaystackSubscription[];
  meta: { total: number; perPage: number; page: number; pageCount: number };
};

function createClient(secretKey: string): AxiosInstance {
  return axios.create({
    baseURL: "https://api.paystack.co",
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      // Accept: "application/json",
    },
  });
}

function getField(
  customFields: CustomField[] | undefined,
  key: string
): string | undefined {
  if (!customFields?.length) return undefined;

  const found =
    customFields.find(
      (f) => f.variable_name?.toLowerCase() === key.toLowerCase()
    ) ??
    customFields.find(
      (f) => f.display_name?.toLowerCase() === key.toLowerCase()
    );
  return typeof found?.value === "string" ? found.value : undefined;
}

export type FindSubsOptions = {
  reference?: string;
  userId?: string;
  perPage?: number;
  maxPages?: number; // safety guard
};

export type FindSubsResult = {
  firstMatch?: PaystackSubscription;
  matches: PaystackSubscription[];
  all: PaystackSubscription[];
};

/**
 * List Paystack subscriptions for a customer (by customer_code) and filter by metadata
 * custom_fields for `reference` and/or `user_id`.
 */
export async function findSubscriptionsByCustomerMeta(
  secretKey: string,
  customerId: string,
  opts: FindSubsOptions = {}
): Promise<FindSubsResult> {
  // Why: Node-only code; ensure this runs on server
  const client = createClient(secretKey);
  const isLive = process.env.NODE_ENV === "production";
  const paystack = await createPaystackInstance(isLive);

  const perPage = Math.max(1, Math.min(100, opts.perPage ?? 50));
  const maxPages = Math.max(1, Math.min(50, opts.maxPages ?? 10)); // guard

  // 1) paginate through subscriptions
  const all: PaystackSubscription[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && page <= maxPages) {
    const res = await paystack.subscription.list({
      customer: customerId,
      perPage,
      page,
    });

    console.log("\n\n\n\n RES", res.data, "\n\n\n\n");

    if (!res?.status) {
      throw new Error(res?.message || "Failed to list subscriptions");

      // RES {
      //   status: true,
      //   message: 'Subscriptions retrieved',
      //   data: [
      //     {
      //       id: 861331,
      //       domain: 'test',
      //       status: 'active',
      //       start: 1755480456,
      //       quantity: 1,
      //       subscription_code: 'SUB_k8wzpyyynmf383o',
      //       email_token: '1ywwfq76754a4ju',
      //       amount: 20000000,
      //       cron_expression: '27 1 18 8 *',
      //       next_payment_date: '2026-08-18T01:27:00.000Z',
      //       open_invoice: null,
      //       createdAt: '2025-08-18T01:27:36.000Z',
      //       integration: 1410813,
      //       plan: [Object],
      //       authorization: [Object],
      //       customer: [Object],
      //       invoice_limit: 0,
      //       split_code: null,
      //       metadata: [Object],
      //       payments_count: 1,
      //       most_recent_invoice: [Object]
      //     },
      //     {
      //       id: 861082,
      //       domain: 'test',
      //       status: 'active',
      //       start: 1755424069,
      //       quantity: 1,
      //       subscription_code: 'SUB_dbxgli4nr31y9sb',
      //       email_token: 'rwdiq9xpqony3i1',
      //       amount: 5000000,
      //       cron_expression: '47 9 17 8,11,2,5 *',
      //       next_payment_date: '2025-11-17T09:47:00.000Z',
      //       open_invoice: null,
      //       createdAt: '2025-08-17T09:47:49.000Z',
      //       integration: 1410813,
      //       plan: [Object],
      //       authorization: [Object],
      //       customer: [Object],
      //       invoice_limit: 0,
      //       split_code: null,
      //       metadata: [Object],
      //       payments_count: 1,
      //       most_recent_invoice: [Object]
      //     },
      //     {
      //       id: 860830,
      //       domain: 'test',
      //       status: 'active',
      //       start: 1755338873,
      //       quantity: 1,
      //       subscription_code: 'SUB_60xitwb2efzm1ns',
      //       email_token: 'en5it0g6elkl17y',
      //       amount: 1670000,
      //       cron_expression: '7 10 16 * *',
      //       next_payment_date: '2025-09-16T10:07:00.000Z',
      //       open_invoice: null,
      //       createdAt: '2025-08-16T10:07:53.000Z',
      //       integration: 1410813,
      //       plan: [Object],
      //       authorization: [Object],
      //       customer: [Object],
      //       invoice_limit: 0,
      //       split_code: null,
      //       metadata: [Object],
      //       payments_count: 1,
      //       most_recent_invoice: [Object]
      //     }
      //   ]
      // }
    }
    all.push(...(res.data ?? []));
    pageCount = res?.meta?.pageCount ?? pageCount;
    page += 1;
  }

  console.log("\n\n\n\n ALL", all, "\n\n\n\n");

  // 2) filter by metadata.custom_fields (reference/user_id)
  const { reference, userId } = opts;
  console.log("\n\n\n\n  ", opts, "\n\n\n\n");

  const matches = all.filter((sub) => {
    const cf = sub.metadata?.custom_fields || [];
    const refVal = getField(cf, "reference")?.toLowerCase();
    const userVal = getField(cf, "user_id")?.toLowerCase();

    // If both reference and userId are provided, both must match
    // If only one is provided, only that one needs to match
    const refOk = reference ? refVal === reference.toLowerCase() : true;
    const userOk = userId ? userVal === userId.toLowerCase() : true;

    console.log(refVal, userVal, `\nSubscription ${sub.id} - `, {
      hasMetadata: !!sub.metadata,
      metadata: JSON.stringify(sub.metadata),
      refVal,
      userVal,
      matches: { refOk, userOk },
    });

    return refOk && userOk;
  });

  return {
    firstMatch: matches[0],
    matches,
    all,
  };
}

/**
 * Convenience wrapper for your flow:
 * - Reads secret from env helper you mentioned
 * - Takes customer_code, and either/both of reference and userId
 */
export async function findSubscriptionsByCustomerRefUser(
  customerId: string,
  args: { reference?: string; userId?: string }
) {
  const secret = await getPaystackSecretForWebhook();
  if (!secret) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return findSubscriptionsByCustomerMeta(secret, customerId, args);
}
