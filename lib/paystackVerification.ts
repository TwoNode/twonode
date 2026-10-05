/**
 * Checks on what Paystack reports for a payment, shared by the REVA and
 * Certificate of Deposit confirmation paths.
 *
 * Paystack's verify endpoint answers `status: true` whenever the LOOKUP
 * worked, including for a transaction that was never paid (`data.status` is
 * then "abandoned" or "failed"). Only `data.status === "success"` means money
 * moved, so the outer flag must never be used on its own.
 *
 * Amounts are kobo. Overpayment is accepted (and logged by callers); a
 * shortfall of more than 1 kobo is not.
 */
const KOBO_TOLERANCE = 1;

export const nairaToKobo = (naira: number | null | undefined) =>
  Math.round((naira ?? 0) * 100);

/** Returns why this paid amount is unacceptable, or null if it is fine. */
export function findPaidAmountProblem(args: {
  paidKobo: number | null | undefined;
  currency?: string | null;
  expectedKobo: number;
}): string | null {
  const { paidKobo, currency, expectedKobo } = args;
  if (currency && currency !== "NGN") {
    return `Paid in ${currency}, expected NGN`;
  }
  if (expectedKobo > 0 && !(typeof paidKobo === "number")) {
    return "Payment amount is missing";
  }
  if (
    expectedKobo > 0 &&
    (paidKobo as number) < expectedKobo - KOBO_TOLERANCE
  ) {
    return `Paid ${paidKobo} kobo, expected ${expectedKobo}`;
  }
  return null;
}

/** Returns why a Paystack verify response does not prove payment, or null. */
export function findUnpaidProblem(
  verification: any,
  args: { reference: string; expectedKobo: number }
): string | null {
  if (!verification?.status || !verification.data) {
    return "Transaction verification failed or was unsuccessful";
  }
  const data = verification.data;
  if (data.status !== "success") {
    return `Payment not completed (status: ${String(data.status)})`;
  }
  if (data.reference && data.reference !== args.reference) {
    return "Paystack returned a different transaction";
  }
  return findPaidAmountProblem({
    paidKobo: data.amount,
    currency: data.currency,
    expectedKobo: args.expectedKobo,
  });
}
