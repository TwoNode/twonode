// ---- TYPES ----
export type PlanId = "monthly" | "quarterly" | "annually";
export interface SubscriptionPlan {
  id: PlanId;
  planCode: string;
  name: string;
  price: number; // NGN
  description: string;
  interval: PlanId; // reuse type for simplicity
}

// Plans per business rules

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  monthly: {
    id: "monthly",
    planCode: "PLN_55ftd3cu1vuhy7v",
    name: "Monthly",
    price: 16700,
    description: "Postpaid, billed monthly (charged on the 1st of the next month)",
    interval: "monthly",
  },
  quarterly: {
    id: "quarterly",
    planCode: "PLN_op8wb4hoxs9v96b",
    name: "Quarterly",
    price: 50000,
    description: "Postpaid, billed quarterly (charged in Apr/Jul/Oct/Jan for the previous quarter)",
    interval: "quarterly",
  },
  annually: {
    id: "annually",
    planCode: "PLN_8tim0wubm0jope1",
    name: "Annually",
    price: 200000,
    description: "Postpaid, billed annually (charged on Jan 1 for the previous year)",
    interval: "annually",
  },
};
