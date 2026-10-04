import {
  SUBSCRIPTION_PLANS,
  type PlanId,
} from "@/app/(projects)/(surfboard)/utils/paystackSubscription";

/**
 * Pure checks that tie a one-time (non-recurring) subscription payment to the
 * account and plan it is being applied to.
 *
 * The one-time checkout is popup-driven: the browser, not the server, creates
 * the Paystack transaction, so the amount, the metadata and the reference are
 * all chosen client-side. Anything the client says about a payment is
 * therefore a CLAIM; the only trustworthy facts are the ones Paystack reports
 * back (`verify` response, or an HMAC-signed webhook): the reference, the
 * amount actually charged and the currency. These helpers check the claim
 * against those facts. Used by both fulfilment paths — the client-triggered
 * verify and the webhook — so they cannot drift apart.
 */

export const ONE_TIME_REFERENCE_PREFIX = "SURFBOARD_ONETIME_SUB_";

// `<prefix><live|test>_<epoch ms>_<userId>` — the trailing user id is what
// binds a reference to an account.
const ONE_TIME_REFERENCE = /^SURFBOARD_ONETIME_SUB_(?:live|test)_\d+_(.+)$/;

export function buildOneTimeReference(
  isLive: boolean,
  userId: string,
  now: number = Date.now()
): string {
  return `${ONE_TIME_REFERENCE_PREFIX}${isLive ? "live" : "test"}_${now}_${userId}`;
}

/** The account a one-time reference was issued to, or null if it isn't one of ours. */
export function userIdFromOneTimeReference(
  reference: string | null | undefined
): string | null {
  if (typeof reference !== "string") return null;
  return ONE_TIME_REFERENCE.exec(reference)?.[1] ?? null;
}

/**
 * A real plan id. `planId in SUBSCRIPTION_PLANS` / a truthiness check on
 * `SUBSCRIPTION_PLANS[planId]` is not enough: inherited keys such as
 * "constructor" or "toString" resolve to truthy functions.
 */
export function isPlanId(value: unknown): value is PlanId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, value)
  );
}

export type PaymentProblem = {
  code:
    | "INVALID_PLAN"
    | "REFERENCE_NOT_ISSUED_TO_USER"
    | "REFERENCE_MISMATCH"
    | "WRONG_CURRENCY"
    | "UNDERPAID";
  message: string;
};

const naira = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

/**
 * The part of the check that needs no Paystack data: the plan is real and the
 * reference was issued to this account. Cheap enough to run before spending a
 * Paystack API call on a reference that can't possibly be this user's.
 */
export function findOneTimeReferenceProblem(args: {
  planId: unknown;
  userId: string;
  reference: string;
}): PaymentProblem | null {
  if (!isPlanId(args.planId)) {
    return { code: "INVALID_PLAN", message: "Unknown subscription plan" };
  }

  if (userIdFromOneTimeReference(args.reference) !== args.userId) {
    return {
      code: "REFERENCE_NOT_ISSUED_TO_USER",
      message: "This payment reference was not issued to your account",
    };
  }

  return null;
}

/**
 * Null when the transaction legitimately pays for `planId` for `userId`,
 * otherwise what is wrong with it.
 *
 * Underpayment is the exploit (pay a few naira, claim the annual plan), so
 * that is what is rejected; paying MORE than the plan price is allowed rather
 * than risk refusing a genuine payment over a fee or rounding difference.
 */
export function findOneTimePaymentProblem(args: {
  planId: unknown;
  userId: string;
  reference: string;
  transaction: { reference?: unknown; amount?: unknown; currency?: unknown };
}): PaymentProblem | null {
  const { planId, reference, transaction } = args;

  const referenceProblem = findOneTimeReferenceProblem(args);
  if (referenceProblem) return referenceProblem;

  if (transaction.reference !== reference) {
    return {
      code: "REFERENCE_MISMATCH",
      message: "The payment reference does not match the transaction",
    };
  }

  if (transaction.currency !== "NGN") {
    return {
      code: "WRONG_CURRENCY",
      message: "The payment was not made in Nigerian naira",
    };
  }

  const expected = SUBSCRIPTION_PLANS[planId as PlanId].amountInKobo;
  const paid = transaction.amount;
  if (typeof paid !== "number" || !Number.isFinite(paid) || paid < expected) {
    return {
      code: "UNDERPAID",
      message: `The amount paid${typeof paid === "number" ? ` (${naira(paid)})` : ""} is less than the ${naira(expected)} price of the selected plan`,
    };
  }

  return null;
}
