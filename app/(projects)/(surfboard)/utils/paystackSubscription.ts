// ---- TYPES ----
export type PlanId = "monthly" | "quarterly" | "annually";
export interface SubscriptionPlan {
  id: PlanId;
  planCode: string;
  name: string;
  price: number; // NGN
  amount: number; // NGN
  amountInKobo: number; // NGN
  description: string;
  interval: PlanId; // reuse type for simplicity
}

// Plans per business rules

export const SURF_MONTHLY = process.env.SURF_MONTHLY || "";
export const SURF_QUARTERLY = process.env.SURF_QUARTERLY || "";
export const SURF_YEARLY = process.env.SURF_YEARLY || "";

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  monthly: {
    id: "monthly",
    planCode: SURF_MONTHLY,
    name: "SURF_MONTHLY",
    price: 16700,
    amount: 16700,
    amountInKobo: 16700 * 100,
    description:
      "Postpaid, billed monthly (charged on the 1st of the next month)",
    interval: "monthly",
  },
  quarterly: {
    id: "quarterly",
    // planCode: "PLN_op8wb4hoxs9v96b",
    planCode: SURF_QUARTERLY,
    name: "SURF_QUARTERLY",
    price: 50000,
    amount: 50000,
    amountInKobo: 50000 * 100,
    description:
      "Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter)",
    interval: "quarterly",
  },
  annually: {
    id: "annually",
    // planCode: "",
    planCode: SURF_YEARLY,
    name: "SURF_YEARLY",
    price: 200000,
    amount: 200000,
    amountInKobo: 200000 * 100,
    description:
      "Postpaid, billed annually (charged on Jan 1 for the previous year)",
    interval: "annually",
  },
};
