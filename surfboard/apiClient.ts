import type { ApiResult } from "@/lib/api/types";
import type { QREarningsSettingsData } from "@/surfboard/services/qrEarningsService";

/**
 * Thin typed wrapper around the /api/v1/surfboard/* routes, for client
 * components that used to import server actions directly from
 * qrEarningsActions.ts / settingsActions.ts. Same-origin fetch already
 * sends cookies, so no credentials option is needed.
 */

const BASE = "/api/v1/surfboard";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res.json();
}

export type QRAccessState = {
  accessState: "FREE" | "PAYWALL_REQUIRED" | "PAID_ACTIVE" | "EXPIRED";
  serviceType?: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT";
  expiresAt?: string;
  scanCount?: number;
  freeLimit?: number;
  isCoDAvailable: boolean;
  planId: string;
  planNumber: string;
  pricing: QREarningsSettingsData;
};

export const surfboardApi = {
  qr: {
    accessState: (planId: string, token?: string) =>
      jsonFetch<QRAccessState>(
        `${BASE}/qr/access-state?planId=${encodeURIComponent(planId)}${token ? `&token=${encodeURIComponent(token)}` : ""}`
      ),

    initiatePayment: (input: {
      planId: string;
      serviceType: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT";
      payerEmail?: string;
      payerName?: string;
    }) =>
      jsonFetch<{
        reference: string;
        amountInNaira: number;
        amountInKobo: number;
        paystackKey: string;
        serviceType: string;
        planNumber: string;
        payerEmail: string;
      }>(`${BASE}/qr/payments`, { method: "POST", body: JSON.stringify(input) }),

    verifyPayment: (reference: string, paystackRef?: string) =>
      jsonFetch<{ accessToken: string | null; expiresAt?: string }>(`${BASE}/qr/payments/verify`, {
        method: "POST",
        body: JSON.stringify({ reference, paystackRef }),
      }),

    earningsOverview: () => jsonFetch<any>(`${BASE}/qr/earnings-overview`),

    settings: () => jsonFetch<QREarningsSettingsData>(`${BASE}/qr/settings`),

    saveBankDetails: (input: { bankCode: string; bankName: string; accountNumber: string }) =>
      jsonFetch<any>(`${BASE}/qr/bank-details`, { method: "POST", body: JSON.stringify(input) }),

    requestWithdrawal: (amount: number) =>
      jsonFetch<any>(`${BASE}/qr/withdrawals`, { method: "POST", body: JSON.stringify({ amount }) }),
  },
  admin: {
    kyc: {
      list: () => jsonFetch<any[]>(`${BASE}/admin/kyc`),
      toggleVerification: (userId: string, status: boolean) =>
        jsonFetch<{ success: boolean }>(`${BASE}/admin/kyc`, {
          method: "POST",
          body: JSON.stringify({ userId, status }),
        }),
    },
  },
};
