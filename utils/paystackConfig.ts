"use server";
/**
 * Paystack Configuration Utility
 * Handles environment-based key selection for test vs live payments
 */

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  isLive: boolean;
}

/**
 * Get Paystack configuration based on isLive flag
 * @param isLive - Whether this is a live transaction
 * @returns PaystackConfig object with appropriate keys
 */
export const getPaystackConfig = async (
  isLive: boolean
): Promise<PaystackConfig> => {
  if (isLive) {
    // Live environment - use live keys
    const liveSecretKey = process.env.PAYSTACK_LIVE_SECRET;
    const livePublicKey = process.env.PAYSTACK_LIVE_PUBLIC_KEY;

    if (!liveSecretKey) {
      throw new Error(
        "Live Paystack keys not configured. Please set PAYSTACK_LIVE_SECRET environment variable."
      );
    }

    return {
      secretKey: liveSecretKey,
      publicKey: livePublicKey || "",
      isLive: true,
    };
  } else {
    // Test environment - use test keys
    const testSecretKey = process.env.PAYSTACK_TEST_SECRET;
    const testPublicKey = process.env.PAYSTACK_TEST_PUBLIC_KEY;

    if (!testSecretKey) {
      throw new Error(
        "Test Paystack keys not configured. Please set PAYSTACK_TEST_SECRET environment variable."
      );
    }

    return {
      secretKey: testSecretKey,
      publicKey: testPublicKey || "",
      isLive: false,
    };
  }
};

/**
 * Get Paystack secret key for webhook verification
 * This function determines which key to use based on the transaction reference
 * @param reference - Transaction reference to determine environment
 * @returns Secret key for webhook verification
 */
export const getPaystackSecretForWebhook = async () => {
  // Check if this is a live transaction by looking up the database record
  // For now, we'll use a simple heuristic based on environment
  const isLive = process.env.NODE_ENV === "production";

  if (isLive) {
    const liveSecretKey = process.env.PAYSTACK_LIVE_SECRET;
    if (!liveSecretKey) {
      throw new Error("Live Paystack secret key not configured");
    }
    return liveSecretKey;
  } else {
    const testSecretKey = process.env.PAYSTACK_TEST_SECRET;
    if (!testSecretKey) {
      throw new Error("Test Paystack secret key not configured");
    }
    return testSecretKey;
  }
};

/**
 * Create a new Paystack instance with the appropriate configuration
 * @param isLive - Whether this is a live transaction
 * @returns Paystack SDK instance
 */
export const createPaystackInstance = async (isLive: boolean) => {
  const config = await getPaystackConfig(isLive);
  const Paystack = require("@paystack/paystack-sdk");
  return new Paystack(config.secretKey);
};

/**
 * Log Paystack environment information for debugging
 * @param isLive - Whether this is a live transaction
 */
export const logPaystackEnvironment = async (isLive: boolean) => {
  const config = await getPaystackConfig(isLive);
  console.log(`Paystack Environment: ${isLive ? "LIVE" : "TEST"}`);
  console.log(`Public Key: ${config.publicKey.substring(0, 10)}...`);
  console.log(`Secret Key: ${config.secretKey.substring(0, 10)}...`);
};
