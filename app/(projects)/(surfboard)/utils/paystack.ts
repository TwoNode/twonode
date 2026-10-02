import axios, { AxiosError } from "axios";

export type PaystackEnv = {
  secretKey: string; // sk_test_xxx / sk_live_xxx
};

const BASE_URL = "https://api.paystack.co";

function createClient(env: PaystackEnv) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${env.secretKey}`,
      "Content-Type": "application/json",
    },
  });
}

function normalizeAxiosError(err: unknown, path: string): never {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    const status = ax.response?.status ?? "ERR";
    const message = ax.response?.data?.message || ax.message;
    const details = ax.response?.data ? JSON.stringify(ax.response.data) : "";
    throw new Error(`Paystack ${path} failed: ${status} ${message} ${details}`);
  }
  // Fallback
  throw err as any;
}

async function post<T>(env: PaystackEnv, path: string, body: any): Promise<T> {
  try {
    const client = createClient(env);
    const res = await client.post<T>(path, body);
    return res.data as unknown as T;
  } catch (e) {
    return normalizeAxiosError(e, path);
  }
}

async function get<T>(env: PaystackEnv, path: string): Promise<T> {
  try {
    const client = createClient(env);
    const res = await client.get<T>(path);
    return res.data as unknown as T;
  } catch (e) {
    return normalizeAxiosError(e, path);
  }
}

export const paystack = {
  plans: {
    create(
      env: PaystackEnv,
      body: {
        name: string;
        interval: string;
        amount: number;
        currency?: string;
      }
    ): Promise<any> {
      return post(env, "/plan", { currency: "NGN", ...body });
    },
    list(env: PaystackEnv, query = ""): Promise<any> {
      return get(env, `/plan${query ? `?${query}` : ""}`);
    },
  },
  subscriptions: {
    create(
      env: PaystackEnv,
      body: {
        customer: string;
        plan: string;
        authorization?: string;
        start_date?: string;
      }
    ): Promise<any> {
      return post(env, "/subscription", body);
    },
    disable(
      env: PaystackEnv,
      body: { code: string; token: string }
    ): Promise<any> {
      return post(env, "/subscription/disable", body);
    },
    enable(
      env: PaystackEnv,
      body: { code: string; token: string }
    ): Promise<any> {
      return post(env, "/subscription/enable", body);
    },
    fetch(env: PaystackEnv, code: string): Promise<any> {
      return get(env, `/subscription/${code}`);
    },
  },
  transactions: {
    initialize(env: PaystackEnv, body: Record<string, any>): Promise<any> {
      return post(env, "/transaction/initialize", body);
    },
    verify(env: PaystackEnv, reference: string): Promise<any> {
      return get(env, `/transaction/verify/${reference}`);
    },
  },
};

export function getEnv(): PaystackEnv {
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY ||
    "";
  if (!secretKey) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return { secretKey };
}
