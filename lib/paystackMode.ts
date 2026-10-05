/**
 * Whether Paystack calls from this deployment use the LIVE keys.
 *
 * Every Vercel deployment, previews included, runs with NODE_ENV=production,
 * so NODE_ENV alone made staging charge real cards. Resolution order:
 *   1. PAYSTACK_MODE=live|test: explicit override.
 *   2. Vercel preview deployment (staging): test.
 *   3. NODE_ENV === "production": live. Everything else (local dev): test.
 */
export function isPaystackLive(): boolean {
  const forced = process.env.PAYSTACK_MODE?.trim().toLowerCase();
  if (forced === "live") return true;
  if (forced === "test") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * The secret key matching the current mode, for API calls and for checking a
 * webhook's signature (Paystack signs with the key of the mode that produced
 * the event). In test mode PAYSTACK_TEST_SECRET wins; in live mode
 * PAYSTACK_SECRET_KEY / PAYSTACK_LIVE_SECRET are used as before.
 */
export function getPaystackSecret(): string {
  const env = process.env;
  const secret = isPaystackLive()
    ? env.PAYSTACK_SECRET_KEY || env.PAYSTACK_LIVE_SECRET
    : env.PAYSTACK_TEST_SECRET || env.PAYSTACK_SECRET_KEY;
  return secret?.trim() || env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || "";
}
