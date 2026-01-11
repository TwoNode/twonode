import axios, { AxiosError } from "axios";
import crypto from "crypto";

export interface RemitaEnv {
  merchantId: string;
  apiKey: string;
  serviceTypeId: string;
  baseUrl: string; // demo: https://remitademo.net, live: https://login.remita.net
}

interface RRRGenerationParams {
  orderId: string;
  amount: number;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  description: string;
}

interface RRRResponse {
  rrr: string;
  transactionId: string;
}

interface PaymentStatusResponse {
  status: "pending" | "paid" | "failed";
  amount?: number;
  paymentDate?: Date;
  message?: string;
}

/**
 * Get Remita environment configuration from environment variables
 */
export function getRemitaEnv(): RemitaEnv {
  const merchantId = process.env.REMITA_MERCHANT_ID || "";
  const apiKey = process.env.REMITA_API_KEY || "";
  const serviceTypeId = process.env.REMITA_SERVICE_TYPE_ID || "";
  const baseUrl = process.env.REMITA_BASE_URL || "https://remitademo.net";

  if (!merchantId) throw new Error("Missing REMITA_MERCHANT_ID");
  if (!apiKey) throw new Error("Missing REMITA_API_KEY");
  if (!serviceTypeId) throw new Error("Missing REMITA_SERVICE_TYPE_ID");

  return { merchantId, apiKey, serviceTypeId, baseUrl };
}

/**
 * Generate API hash for Remita authentication
 * Hash = SHA512(merchantId + serviceTypeId + orderId + amount + apiKey)
 */
function generateApiHash(
  env: RemitaEnv,
  orderId: string,
  amount: number
): string {
  const hashString = `${env.merchantId}${env.serviceTypeId}${orderId}${amount}${env.apiKey}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Generate API hash for status check
 * Hash = SHA512(orderId + apiKey + merchantId)
 */
function generateStatusHash(env: RemitaEnv, rrr: string): string {
  const hashString = `${rrr}${env.apiKey}${env.merchantId}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Normalize axios errors for better error messages
 */
function normalizeAxiosError(err: unknown, operation: string): never {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    const status = ax.response?.status ?? "ERR";
    const message = ax.response?.data?.message || ax.message;
    const details = ax.response?.data ? JSON.stringify(ax.response.data) : "";
    throw new Error(
      `Remita ${operation} failed: ${status} ${message} ${details}`
    );
  }
  throw err as any;
}

/**
 * Generate a Remita Retrieval Reference (RRR) for payment
 *
 * @param params - Payment parameters including orderId, amount, payer details
 * @returns Promise with RRR and transaction ID
 */
export async function generateRRR(
  params: RRRGenerationParams
): Promise<RRRResponse> {
  const env = getRemitaEnv();
  const apiHash = generateApiHash(env, params.orderId, params.amount);

  const requestBody = {
    serviceTypeId: env.serviceTypeId,
    amount: params.amount,
    orderId: params.orderId,
    payerName: params.payerName,
    payerEmail: params.payerEmail,
    payerPhone: params.payerPhone || "",
    description: params.description,
  };

  try {
    const response = await axios.post(
      `${env.baseUrl}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `remitaConsumerKey=${env.merchantId},remitaConsumerToken=${apiHash}`,
        },
        timeout: 30000,
      }
    );

    // Remita returns JSONP-style response, need to parse it
    let data = response.data;

    // If response is a string (JSONP format), extract JSON
    if (typeof data === "string") {
      const jsonMatch = data.match(/\{.*\}/s);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      }
    }

    if (data.statuscode === "025" || data.statuscode === "055") {
      // Success: RRR generated
      return {
        rrr: data.RRR,
        transactionId: data.transactionId || params.orderId,
      };
    } else {
      throw new Error(
        `RRR generation failed: ${
          data.statusMessage || data.status || "Unknown error"
        }`
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return normalizeAxiosError(error, "generateRRR");
    }
    throw error;
  }
}

/**
 * Check payment status for a given RRR
 *
 * @param rrr - The Remita Retrieval Reference to check
 * @returns Promise with payment status details
 */
export async function checkPaymentStatus(
  rrr: string
): Promise<PaymentStatusResponse> {
  const env = getRemitaEnv();
  const apiHash = generateStatusHash(env, rrr);

  try {
    const response = await axios.get(
      `${env.baseUrl}/remita/exapp/api/v1/send/api/echannelsvc/${env.merchantId}/${rrr}/${apiHash}/status.reg`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `remitaConsumerKey=${env.merchantId},remitaConsumerToken=${apiHash}`,
        },
        timeout: 15000,
      }
    );

    // Remita returns JSONP-style response, need to parse it
    let data = response.data;

    // If response is a string (JSONP format), extract JSON
    if (typeof data === "string") {
      const jsonMatch = data.match(/\{.*\}/s);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      }
    }

    // Status codes:
    // 00 or 01 = Payment successful
    // 021 = Payment pending
    // 025 = RRR generated but not paid
    // Other = Failed
    const statusCode = data.status || data.statuscode;

    if (statusCode === "00" || statusCode === "01") {
      return {
        status: "paid",
        amount: parseFloat(data.amount) || undefined,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        message: data.message || "Payment successful",
      };
    } else if (
      statusCode === "021" ||
      statusCode === "025" ||
      statusCode === "055"
    ) {
      return {
        status: "pending",
        message: data.message || "Payment pending",
      };
    } else {
      return {
        status: "failed",
        message: data.message || "Payment failed or RRR not found",
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return normalizeAxiosError(error, "checkPaymentStatus");
    }
    throw error;
  }
}

/**
 * Get Remita payment page URL for inline/redirect payment
 * This can be used as an alternative to direct bank transfer
 */
export function getRemitaPaymentUrl(rrr: string): string {
  const env = getRemitaEnv();
  const isDemo = env.baseUrl.includes("demo");

  if (isDemo) {
    return `https://remitademo.net/remita/onepage/biller/${rrr}`;
  }
  return `https://login.remita.net/remita/onepage/biller/${rrr}`;
}
