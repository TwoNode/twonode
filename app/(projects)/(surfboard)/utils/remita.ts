import axios, { AxiosError } from "axios";
import crypto from "crypto";

/**
 * Remita Biller API Configuration
 * Used for direct MDA payments (users pay directly into MDA Remita account)
 */
export interface RemitaEnv {
  publicKey: string;
  secretKey: string;
  billerProductId: string;
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
 * Get Remita Biller API environment configuration from environment variables
 */
export function getRemitaEnv(): RemitaEnv {
  const publicKey = process.env.REMITA_PUBLIC_KEY || "";
  const secretKey = process.env.REMITA_SECRET_KEY || "";
  const billerProductId = process.env.REMITA_BILLER_PRODUCT_ID || "";
  const baseUrl = process.env.REMITA_BASE_URL || "https://remitademo.net";

  if (!publicKey) throw new Error("Missing REMITA_PUBLIC_KEY");
  if (!secretKey) throw new Error("Missing REMITA_SECRET_KEY");
  if (!billerProductId) throw new Error("Missing REMITA_BILLER_PRODUCT_ID");

  return { publicKey, secretKey, billerProductId, baseUrl };
}

/**
 * Generate API hash for Remita Biller API authentication
 * Hash = SHA512(publicKey + requestId + secretKey)
 */
function generateBillerApiHash(
  env: RemitaEnv,
  requestId: string
): string {
  const hashString = `${env.publicKey}${requestId}${env.secretKey}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Generate API hash for RRR generation
 * Hash = SHA512(billerProductId + requestId + amount + secretKey)
 */
function generateRRRHash(
  env: RemitaEnv,
  requestId: string,
  amount: number
): string {
  const hashString = `${env.billerProductId}${requestId}${amount}${env.secretKey}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Generate API hash for status check
 * Hash = SHA512(rrr + secretKey + publicKey)
 */
function generateStatusHash(env: RemitaEnv, rrr: string): string {
  const hashString = `${rrr}${env.secretKey}${env.publicKey}`;
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

    console.log("\n\n\n\n\n\n\n Remita error:", ax.response?.data);
    throw new Error(
      `Remita ${operation} failed: ${status} ${message} ${details}`
    );
  }
  throw err as any;
}

/**
 * Generate a Remita Retrieval Reference (RRR) for payment into MDA account
 * Uses the Biller API for direct MDA payments
 *
 * @param params - Payment parameters including orderId, amount, payer details
 * @returns Promise with RRR and transaction ID
 */
export async function generateRRR(
  params: RRRGenerationParams
): Promise<RRRResponse> {
  const env = getRemitaEnv();
  const requestId = params.orderId;
  const apiHash = generateRRRHash(env, requestId, params.amount);

  const requestBody = {
    serviceTypeId: env.billerProductId,
    amount: params.amount,
    orderId: requestId,
    payerName: params.payerName,
    payerEmail: params.payerEmail,
    payerPhone: params.payerPhone || "",
    description: params.description,
  };

  console.log("\n\n\n\n\n\n Remita request body:", requestBody, env, "\n\n\n\n\n\n");

  try {
    // Use the correct Remita Biller API endpoint
    const url = `${env.baseUrl}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit`;

    console.log("Remita API URL:", url);

    const response = await axios.post(
      url,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `remitaConsumerKey=${env.publicKey},remitaConsumerToken=${apiHash}`,
        },
        timeout: 30000,
        // Prevent redirects from changing POST to GET
        maxRedirects: 0,
        validateStatus: (status) => status < 400 || status === 303,
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
        transactionId: data.transactionId || requestId,
      };
    } else {
      throw new Error(
        `RRR generation failed: ${data.statusMessage || data.status || "Unknown error"
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
 * Verifies payment with Remita Biller API
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
    const response = await axios.post(
      `${env.baseUrl}/remita/exapp/api/v1/send/api/echannelsvc/${env.publicKey}/${rrr}/${apiHash}/status.reg`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `remitaConsumerKey=${env.publicKey},remitaConsumerToken=${apiHash}`,
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
 * This redirects users to Remita's payment portal to complete payment
 */
export function getRemitaPaymentUrl(rrr: string): string {
  const env = getRemitaEnv();
  const isDemo = env.baseUrl.includes("demo");

  if (isDemo) {
    return `https://remitademo.net/remita/onepage/biller/${rrr}`;
  }
  return `https://login.remita.net/remita/onepage/biller/${rrr}`;
}

/**
 * Fetch the official Remita Receipt PDF
 * Endpoint: https://login.remita.net/remita/exapp/api/v1/send/api/print/billsvc/biller/{rrr}/printrecieptRequest.pdf
 */
export async function fetchRemitaReceiptPdf(rrr: string): Promise<Buffer> {
  // const env = getRemitaEnv();
  // Construct the URL. Note: The user provided URL structure seems to confirm it's under the base URL.
  // We'll use the environment's base URL to support demo/live, assuming the path is consistent.
  // If the user's provided link is constant regardless of env, we might need to stick to the specific one, 
  // but usually it depends on the environment. 
  // User provided: "https://login.remita.net/remita/exapp/api/v1/send/api/print/billsvc/biller/191392819355/printrecieptRequest.pdf"

  // Clean RRR just in case
  const cleanRRR = rrr.replace(/-/g, "").trim();
  const baseUrl = "https://login.remita.net";

  const url = `${baseUrl}/remita/exapp/api/v1/send/api/print/billsvc/biller/${cleanRRR}/printrecieptRequest.pdf`;

  console.log("Fetching Remita PDF from:", url);

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        // Some endpoints require headers, adding basic ones just in case
        Accept: "application/pdf",
      },
      validateStatus: (status) => status === 200,
    });

    return Buffer.from(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching Remita PDF:", error.message, error.response?.status);
      throw new Error(`Failed to download Remita Receipt: ${error.message}`);
    }
    throw error;
  }
}
