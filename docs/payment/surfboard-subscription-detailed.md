# Surfboard Detailed Subscription Guide

This document provides a deep dive into the Surfboard subscription engine, covering the state machine, database schema, webhook events, and edge-case handling.

## 1. Subscription States & Lifecycle

| State          | Description                                                        | Transition Trigger                                             |
| :------------- | :----------------------------------------------------------------- | :------------------------------------------------------------- |
| **`active`**   | Full access to premium features.                                   | Successful payment (`verifySubscription` or `charge.success`). |
| **`past_due`** | Access continues, but renewal payment failed.                      | `invoice.payment_failed` webhook event.                        |
| **`canceled`** | User turned off auto-renewal. Access continues until `currentEnd`. | `disableSubscription` call or `subscription.disable` webhook.  |
| **`expired`**  | Access revoked. `currentEnd` + 1 day grace period has passed.      | `isSubActiveOrGrace()` check returns `false`.                  |

### Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> active: Initial Payment
    active --> canceled: User Cancels
    active --> past_due: Renewal Payment Fails
    past_due --> active: Payment Retried/Success
    past_due --> expired: Max Retries / Period Ends
    canceled --> expired: currentEnd + 1 day reached
    expired --> active: Resubscribe
```

---

## 2. Technical Component Map

_(Paths current as of the 2026-08 architecture rebuild — see `docs/development-history/phases/phase-2-surfboard.md`. The old `app/(projects)/(surfboard)/actions/{paystackActions,subscriptionActions}.ts` action files this section used to reference are deleted; their logic now lives in `surfboard/services/*` behind `/api/v1/surfboard/*` routes.)_

### A. Initiation & Client Flow

- **`SubscriptionManager.tsx`** (`app/(projects)/(surfboard)/surfboard/dashboard/subscription/SubscriptionManager.tsx`): The primary UI.
  - Handles plan selection and triggers the `PaystackPop` inline checkout.
  - On success, redirects or calls `verifySubscription`.
- **`surfboard/services/paystackSubscriptionService.ts`**: Paystack-facing logic.
  - `initiateSubscription`: Builds the checkout parameters (reference, plan, `metadata.platform = "surfboard"`). It does **not** call Paystack's `transaction.initialize` — the client popup registers the transaction (see `subscription-payments-flow.md` §2.B).
  - `initiateOneTimeSubscription` / `verifyOneTimeSubscription`: the no-auto-renew variant (`provider: "paystack_onetime"`, no Paystack subscription object).
  - `verifySubscription`: Finalizes the transaction and updates the local DB.
  - `disableSubscription`: Cancels auto-renewal via Paystack.
  - `getOrCreatePaystackPlan`: Resolves/creates the Paystack-side plan record.
- **`app/(projects)/(surfboard)/surfboard/dashboard/subscription/callback/SubCallback.tsx`**: Handles the redirect after external payment (if not using inline).

### B. Background Sync (Webhooks)

- **`app/api/webhooks/paystack/route.ts`**: The core "brain" for async updates — shared across Surfboard/REVA/GBC, kept as one file deliberately rather than split per-product, since its platform-detection logic (§ "Platform Detection Logic" below) needs one place to reconcile ambiguous references. The handler functions below live inline in this file, not in a service:
  - `onSubscriptionCreate`: Upserts the `Subscription` and logs history.
  - `onSubscriptionChargeSuccess`: Handles recurring billing (renewals).
  - `onSubscriptionDisable`: Marks subscription as canceled in DB.
  - `onInvoicePaymentFailed`: Marks subscription as `past_due`.

### C. Domain Logic

- **`surfboard/services/subscriptionService.ts`**: Low-level DB interactions.
  - `applyPaymentPeriod`: **the one place a payment buys time** (see "Purchases add" in §5). `createOrUpdateSubscription` (the client verify call and one-time payments) delegates to it, and so does the `charge.success` webhook.
  - `createOrUpdateSubscription`: The source of truth for DB state transitions on the verify path; resolves the Paystack plan, then calls `applyPaymentPeriod`.
  - `getUserActiveSubscription` / `getUserAndActiveSub`: Access-control reads (grace-period logic, see §5).
- **`surfboard/services/subscriptionAnalyticsService.ts`**: Admin-facing subscription analytics/reporting.
- **`app/(projects)/(surfboard)/utils/computePeriod.ts`**: Date calculation engine (not moved into `surfboard/` — a small, dependency-free utility left in place during the Phase 2 folder move).
  - `computePeriodPerTimestamp`: the period for a payment made when nothing is running — `currentStart` and `currentEnd` for `monthly`, `quarterly` or `annually`.
  - `computeExtendedPeriod`: the period a payment buys given what the account already has — a fresh period if nothing is running, otherwise it starts the second the current one ends (§5, "Purchases add").
  - `addCalendarMonths`: calendar-month addition that clamps month-ends (31 Jan + 1 month = 28 Feb). _It used to overflow (3 Mar), so periods starting on the 29th–31st ran up to three days long._

---

## 3. Database Schema Details

### `Subscription` Table

| Field              | Purpose                                                                                                                           |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `userId`           | Links to `SurfboardUser`.                                                                                                         |
| `subCode`          | The Paystack Subscription ID (e.g., `SUB_xxx`). Required for cancellations.                                                       |
| `planCode`         | The Paystack Plan ID (e.g., `PLN_xxx`).                                                                                           |
| `status`           | The current local state (`active`, `canceled`, etc.).                                                                             |
| `currentEnd`       | The end date of the current paid period.                                                                                          |
| `nextPaymentDate`  | When Paystack is scheduled to charge next.                                                                                        |
| `provider`         | `"paystack"` (recurring) or `"paystack_onetime"` (no auto-renew, nothing to cancel).                                              |
| `userId` is unique | **One `Subscription` row per user** — a new payment overwrites the previous period (see `subscription-payments-flow.md` §2.C #3). |

### `SubscriptionHistory` Table

Every significant event is logged here for auditing:

- `subscription.create`
- `subscription.success` (Renewal)
- `subscription.disable` (Cancellation)
- `invoice.payment_failed`

---

## 4. Webhook Payload Examples (Surfboard Specific)

### `subscription.create`

Sent when a new subscription is successfully linked to a customer.

```json
{
  "event": "subscription.create",
  "data": {
    "subscription_code": "SUB_gsjhu22rhpl72mz",
    "status": "active",
    "customer": { "email": "user@example.com", "customer_code": "CUS_xxx" },
    "plan": { "plan_code": "PLN_xxx", "interval": "monthly" },
    "next_payment_date": "2026-03-18T15:13:00.000Z"
  }
}
```

### `charge.success` (Renewal)

Sent every time a recurring payment succeeds.

```json
{
  "event": "charge.success",
  "data": {
    "reference": "SURFBOARD_SUB_live_xxx",
    "amount": 1670000,
    "metadata": { "platform": "surfboard" },
    "subscription": {
      "subscription_code": "SUB_xxx",
      "next_payment_date": "2026-04-18T15:13:00.000Z"
    }
  }
}
```

---

---

## 5. Critical Logic & Business Rules

### The 1-Day Grace Period

`surfboard/services/subscriptionService.ts`'s internal `isSubActiveOrGrace()` (`GRACE_PERIOD_MS = 24 * 60 * 60 * 1000`) allows users to access the platform for **24 hours** after their `currentEnd` date. This prevents immediate lockout due to minor payment delays or time-zone differences. It governs the **API** gate; `proxy.ts`'s page gate is stricter (see `subscription-payments-flow.md` §2.C #5). (The pre-rebuild source had a same-purpose `isUserSubscribed()` in `subscriptionActions.ts` — grep-confirmed dead with zero consumers during the Phase 2 migration, so it wasn't carried over; this is the function that actually runs today.)

### Platform Detection Logic (Hardened)

To prevent cross-platform data contamination (e.g., Reva payments showing up in Surfboard history), the system uses a multi-layered detection strategy:

1.  **Top-level Metadata**: Checks `data.metadata.platform`.
2.  **Nested Metadata**: If missing from top-level, it searches `data.metadata.custom_fields` for a "platform" variable.
3.  **Reference Prefixes**:
    - `REVA_` or `reva_` -> Reva
    - `SurfCoD` or `SurfCoDRef_` -> Surfboard CoD
    - `SURFBOARD_SUB_` or `SURF_` -> Surfboard Subscriptions
    - `GBC` or `EB_GBC` -> GBC
4.  **Plan Analysis**: If it's a subscription event without clear metadata, it checks the `planCode` against a whitelist of known Surfboard plans.

### Quarterly Interval (Fixed)

The `computePeriodPerTimestamp` function previously used 4 months for quarterly intervals. This has been corrected to **3 months** to match standard quarterly billing cycles (Jan, Apr, Jul, Oct).

### Purchases add to remaining time

A payment made while paid time remains **starts when that time ends** instead of replacing it (`computeExtendedPeriod`). So an early payment, a sponsored/admin-granted year followed by the surveyor's own card renewal, or a plan switch never throws paid days away. `Subscription.currentStart`..`currentEnd` describe the whole continuous coverage; the `SubscriptionHistory` row for a payment records only the stretch _that_ payment bought (`startDate`..`endDate`, `amount` in kobo).

Time is added only on top of a period that is **still running and in a coverage status** (`active`, `past_due`, `canceled`); an ended period, or an `expired` one, starts fresh from the payment date. Month-end anniversaries (29th–31st) clamp to the shorter month and stay on the clamped day afterwards — at most three days earlier than the original date, not compounding.

**Each payment is credited at most once.** Its Paystack reference is the key, recorded in `SubscriptionHistory` (`eventType` `subscription.create` for the verify path, `subscription.success` for the webhook; the two are the same ledger). The client's verify call and the `charge.success` webhook both run for every payment, so without this an additive period would double-credit. One transaction holds a Postgres advisory lock on the reference (those two paths run one after the other) and on the user (two _different_ payments for one account can't both read the same `currentEnd`), always in that order. A reference already credited to another account is refused (409 on verify; logged and acknowledged on the webhook).

**`subscription.create` never credits time.** It carries no transaction reference, so crediting from it as well would double-count; it only syncs Paystack's identity/billing fields (subscription code, email token, customer, plan, next charge date) and creates a missing row with an empty period that the payment's own credit then extends.

### Idempotency

We use the `WebhookEvent` table to log every incoming Paystack signature (unique `signature`). If the same signature is sent twice, the system skips processing the second time (`ledgerId === null`).

**Caveat:** the ledger row is inserted _before_ the handler runs, so a handler that throws still leaves the signature recorded — Paystack's retry of the same payload is then treated as a duplicate and acknowledged without being processed. See `subscription-payments-flow.md` §2.C #2.

---

## 6. Troubleshooting & Common Issues

- **"Subscription sync pending"**: Occurs when a user tries to cancel but the system hasn't yet received the `subCode` from Paystack via webhook.
- **Wrong Platform History**: Resolved by strict `detectPlatform` logic in `route.ts`. Users should no longer see Reva or GBC history in their Surfboard dashboard.
- **Plan Mismatch**: If `isSurfboardPlan()` fails, renewals are skipped. Ensure all new Paystack plans are added to the `.env` file (`SURF_MONTHLY`, etc.).
