// src/lib/paystack.ts

import {
  createPaystackInstance,
  getPaystackSecretForWebhook,
} from "@/utils/paystackConfig";

interface InitializePaymentParams {
  email: string;
  amount: number; // in kobo (multiply naira by 100)
  reference: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata?: Record<string, any>;
  };
}

/**
 * Initialize a payment transaction using Paystack SDK
 */
export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResponse> {
  try {
    const paystack = await createPaystackInstance(
      process.env.NODE_ENV === "production"
    );
    const response = await paystack.transaction.initialize({
      ...params,
      amount: params.amount.toString(), // Convert to string as expected by Paystack
    });

    if (!response.status) {
      throw new Error(response.message || "Payment initialization failed");
    }

    return {
      status: response.status,
      message: response.message,
      data: {
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code,
        reference: response.data.reference,
      },
    };
  } catch (error) {
    console.error("Paystack initialization error:", error);
    throw error;
  }
}

/**
 * Verify a payment transaction using Paystack SDK
 */
export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  try {
    const paystack = await createPaystackInstance(
      process.env.NODE_ENV === "production"
    );
    const response = await paystack.transaction.verify(reference);

    if (!response.status) {
      throw new Error(response.message || "Payment verification failed");
    }

    return {
      status: response.status,
      message: response.message,
      data: {
        ...response.data,
        status: response.data.status as "success" | "failed" | "abandoned",
      },
    };
  } catch (error) {
    console.error("Paystack verification error:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const crypto = require("crypto");
  const secret = await getPaystackSecretForWebhook();
  const hash = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(ticketNumber: string): string {
  const timestamp = Date.now();
  return `${ticketNumber}_${timestamp}_REF`;
}

/**
 * Convert Naira to Kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Convert Kobo to Naira
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Initialize ticket payment
 */
export async function initializeTicketPayment(
  email: string,
  amount: number, // in Naira
  ticketNumber: string,
  ticketType: string,
  metadata?: Record<string, any>
) {
  const reference = generatePaymentReference(ticketNumber);
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/gbc/tickets/success?reference=${reference}`;

  return initializePayment({
    email,
    amount: nairaToKobo(amount),
    reference,
    callback_url: callbackUrl,
    metadata: {
      ticketNumber,
      ticketType,
      ...metadata,
    },
  });
}

/**
 * Process refund using Paystack SDK
 */
export async function processRefund(
  transactionReference: string,
  amount?: number
): Promise<any> {
  try {
    const paystack = await createPaystackInstance(
      process.env.NODE_ENV === "production"
    );
    const response = await paystack.refund.create({
      transaction: transactionReference,
      amount: amount ? nairaToKobo(amount) : undefined,
    });

    if (!response.status) {
      throw new Error(response.message || "Refund processing failed");
    }

    return response;
  } catch (error) {
    console.error("Paystack refund error:", error);
    throw error;
  }
}
