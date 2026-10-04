# Subscription and Payment Flows

End-to-end payment and subscription processes for Surfboard and REVA, updated for the post-rebuild `surfboard/services/*` / `reva/services/*` architecture (see `docs/development-history/phases/phase-2-surfboard.md` and `phase-3-reva.md` for how these got here).

## 1. Overview of Platforms

- **Surfboard**: subscription-based (monthly/quarterly/annually) plus one-time **Certificate of Deposit (CoD)** batch payments. See [the detailed subscription guide](./surfboard-subscription-detailed.md).
- **REVA**: one-time payment per property request, for both authenticated users and guests (one-time requests).

---

## 2. Surfboard Subscription Flow

### A. Non-Technical Flow

1. **Selection**: user goes to the Subscription page and picks a plan (Monthly, Quarterly, Yearly).
2. **Payment**: a Paystack popup collects Card, Transfer, or USSD payment.
3. **Verification**: the system verifies the transaction automatically.
4. **Activation**: the account is upgraded, full Surfboard access unlocked.
5. **Renewal**: Paystack auto-charges the card at the end of each period.

### B. Technical Flow

1. **Initiation**: `SubscriptionManager.tsx` (`app/(projects)/(surfboard)/surfboard/dashboard/subscription/SubscriptionManager.tsx`) calls `surfboardApi.subscription.initiate(planId)` (`surfboard/apiClient.ts`, the typed client every client component now goes through — Phase 5 repointed this component off a direct server-action import) → `POST /api/v1/surfboard/subscription/initiate` → `initiateSubscription(userId, email, planId)` in `surfboard/services/paystackSubscriptionService.ts`. Generates a reference (`SURFBOARD_SUB_{live|test}_{ts}_{userId}`), fetches/creates the Paystack plan and returns the checkout parameters. There is deliberately **no server-side `transaction.initialize`** — the client popup (`@paystack/inline-js` `newTransaction()`) registers the transaction itself, and initialising it twice caused "Duplicate Transaction Reference" errors.
2. **Client-side payment**: `PaystackPop` collects payment inline.
3. **Verification**:
   - **Immediate**: `SubCallback.tsx` (`.../subscription/callback/SubCallback.tsx`) or `SubscriptionManager.tsx` calls `surfboardApi.subscription.verify(reference)` → `verifySubscription(userId, reference)`, same service file. Verifies status, fetches the official `subscription_code`, calls `createOrUpdateSubscription` (`surfboard/services/subscriptionService.ts`).
   - **Asynchronous (webhook)**: Paystack posts to `/api/webhooks/paystack` (`app/api/webhooks/paystack/route.ts`, shared across all three products). `subscription.create` → `onSubscriptionCreate`; `charge.success` on a subscription reference → `onSubscriptionChargeSuccess`. Both functions live inline in `route.ts`, not extracted to a service — this file is the shared multi-product webhook brain, kept deliberately in one place so its platform-detection logic (§ below) stays in one spot.
4. **One-time variant (no auto-renew)**: `initiateOneTimeSubscription` / `verifyOneTimeSubscription` (`POST .../subscription/initiate-onetime`, `.../verify-onetime`), added so Bank Transfer works — attaching a recurring `plan` makes Paystack drop channels that can't create a reusable authorisation. Reference prefix `SURFBOARD_ONETIME_SUB_…`, `metadata.type = "surfboard_onetime_subscription"` with `plan_id`, no `plan` on the transaction, stored with `provider: "paystack_onetime"` (recurring rows use `"paystack"`). There is no Paystack subscription object, so `disableSubscription` answers "nothing to cancel" and access simply expires at `currentEnd`. The webhook counterpart is `onOneTimeSubscriptionChargeSuccess` in `route.ts`. **Read §2.C before changing it — its verification is weaker than the recurring path.**
5. **Local DB**:
   - `Subscription`: current state (`active`/`canceled`/`past_due`), plan details, Paystack codes (`subCode`, `customerCode`).
   - `SubscriptionHistory`: an audit ledger of every subscription event.

### C. Known gaps (verified against the code, 2026-10-04)

Found while evaluating the association-subscription plans ([`../surfboard/association-subscription.md`](../surfboard/association-subscription.md) §4 has the full reasoning). They are properties of the code as it stands today, not hypotheticals; nothing here was exploited against Paystack.

| #   | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Where                                                                                                         | Severity                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **One-time verification trusts the client.** `verifyOneTimeSubscription` accepts any successful Paystack transaction for the given `reference` and grants the client-supplied `planId`: it doesn't compare `data.amount` to the plan price, doesn't check the reference was issued to this user/plan, and doesn't stop one reference activating several accounts. The webhook path trusts `metadata.plan_id` the same way. The REVA and CoD webhook paths compute the expected amount but only log a mismatch and still confirm (a deliberate "don't strand a real payer" choice). | `paystackSubscriptionService.ts` `verifyOneTimeSubscription`; `route.ts` `onOneTimeSubscriptionChargeSuccess` | **High** — fix first                       |
| 2   | **Failed webhooks are never retried.** The `WebhookEvent` ledger inserts a row with a unique `signature` before processing; a handler that throws leaves an `error` row, and Paystack's redelivery (same payload) hits the unique constraint and is acknowledged as a duplicate. A transient DB failure permanently loses the event.                                                                                                                                                                                                                                               | `app/api/webhooks/paystack/route.ts` (ledger insert, `duplicate: true` return)                                | **High**                                   |
| 3   | **Payments replace the period instead of adding to it.** Every path (`createOrUpdateSubscription`, webhook `subscription.create`, renewal `charge.success`) sets `currentStart/currentEnd` from the payment date. Credit bought some other way (admin override, a future sponsor payment) is lost when the next payment lands.                                                                                                                                                                                                                                                     | `subscriptionService.ts`, `route.ts`                                                                          | Medium (High once sponsored periods exist) |
| 4   | **Inconsistent money units.** `SUBSCRIPTION_PLANS[*].amount` is naira, `amountInKobo` is kobo; `Subscription.amount` stores Paystack's kobo; `SubscriptionHistory.amount` is written as `plan.amount * 100` on the verify path (100× kobo) but as Paystack's kobo on webhook renewals. Nothing reads these columns for revenue yet, so it hasn't surfaced.                                                                                                                                                                                                                         | `subscriptionService.ts`, `route.ts`                                                                          | Medium                                     |
| 5   | **Page gate and API gate disagree.** `proxy.ts` lets a user through only if `status === "active"` (or `canceled` within the period); the API gate (`isSubActiveOrGrace`) also admits `past_due` and applies a 24 h grace. A `past_due` user can call APIs but is redirected away from dashboard pages.                                                                                                                                                                                                                                                                             | `proxy.ts` (`computeRouteAccess`), `subscriptionService.ts`                                                   | Low                                        |
| 6   | **Calendar-month maths convention.** `computePeriodPerTimestamp` clamps month-ends and sets `currentEnd = nextCharge − 1s`; its `toLagosDate` builds a `Date` from Lagos wall-clock parts in the _server's_ zone, so on a UTC server stored instants are shifted by the Lagos offset (date-granularity display is fine; be careful in tests).                                                                                                                                                                                                                                      | `app/(projects)/(surfboard)/utils/computePeriod.ts`                                                           | Info                                       |

Direction for 1–3: server-side `initialize` with a locked amount and a `PENDING` payment row keyed by reference; compare `data.amount`/`data.currency`/reference at both verify and webhook time; make the ledger re-process `error` rows; route every payer through one additive period function. The association design (`../surfboard/association-subscription.md` §5) is built that way and is a good template for retrofitting the individual flows.

_(General rule for reading every "Technical Flow" in this document and in `../surfboard/cod-user-and-technical-flow.md`: a client component ("use client") never imports a service file directly — it always goes through `surfboardApi.*`/`revaApi.*`, which calls the matching `/api/v1/*` route, which calls the service. Server components/pages skip the API client and call the service function in-process. This split was completed during Phase 5 of the rebuild; see `docs/development-history/phases/phase-5-retirement.md`.)_

---

## 3. Surfboard Certificate of Deposit (CoD) Flow

### A. Non-Technical Flow

1. User submits a batch of survey plans for lodging and pays the associated fee (see the [CoD user flow](../surfboard/cod-user-flow-summary.md) for the full, plan-level walkthrough — Remita is now the primary payment rail, not Paystack; see §5 below).
2. Some batches (e.g. Query Response Fees, older reference-based flows) still use Paystack.
3. The batch/plan is marked paid once the transaction confirms.

### B. Technical Flow

1. **Identification**: the webhook detects CoD payments by reference prefix (`SurfCoD` / `SurfCoDRef_`) or metadata (`route.ts`'s `detectPlatform`/reference-prefix checks).
2. **Processing**: `onCertificatePaymentSuccess` (inline in `route.ts`) locates the `CertificateOfDepositBatch` by payment reference and updates `paymentStatus`.
3. The rest of the CoD approval chain (locking, fee calculation, batch approvals) lives in `surfboard/services/{planLockService,codFeeService,remitaVerificationService,batchApprovalService}.ts` — see the [CoD user & technical flow](../surfboard/cod-user-and-technical-flow.md) for the full breakdown; this document only covers the _payment_ leg.

---

## 4. REVA One-Time Payment Flow

### A. Non-Technical Flow

1. User (authenticated or guest) submits a property request.
2. Pays via Paystack.
3. An admin can manually re-sync payment status if a webhook is ever missed.

### B. Technical Flow

1. **Webhook**: `app/api/webhooks/paystack/route.ts`'s REVA branch (`handleReva`) processes `charge.success` for REVA references, calling into `reva/services/propertyRequestService.ts` (`updatePropertyTransactionStatus`, `updateOneTimeTransactionStatus`) and `reva/services/notificationService.ts` (`notifyPaymentReceived`). This branch was rewritten defensively during Phase 3 (not a straight import swap) — it now does its own idempotency check and amount reconciliation, since this webhook dispatches Surfboard/REVA/GBC events from one shared entry point. It previously imported from `revaActions2.ts`, which has since been deleted.
2. **Admin verification**: `PaymentVerification.tsx` (`app/(projects)/(reva)/reva-restricted/dashboard/payment-verification/PaymentVerification.tsx`) — bulk or single manual verification against Paystack, for cases the webhook missed.

---

## 5. Remita Payment Flow (Surfboard CoD's primary rail)

### A. Non-Technical Flow

1. User pays via an embedded Remita iframe, directly into the LASG MDA's own Remita account (not an intermediary).
2. Remita sends two receipt emails: one from LASG (`printreceipt.ebs-rcm.com`), one from Remita (`login.remita.net`).
3. The user pastes both receipt links into the Surfboard portal.
4. The system verifies both links (URL parsing + AI extraction of the receipt contents) and moves the batch to `LASG_PAID`.

### B. Technical Flow

1. **UI**: `RemitaPaymentModal.tsx` (`app/(projects)/(surfboard)/components/RemitaPaymentModal.tsx`), a split-panel modal — payer info + embedded Remita portal.
2. **Verification**: `verifyBatchPaymentWithLinks(batchId, lasgReceiptUrl, remitaReceiptUrl)` — `surfboard/services/remitaVerificationService.ts` (moved here from the now-deleted `codActions.ts` during Phase 2). See [the CoD technical flow](../surfboard/cod-user-and-technical-flow.md) §2 for the full extraction/validation sequence, and [the Remita AI-extraction prompts](./remita-ai-extraction-prompts.md) for the prompt design behind the receipt-parsing step.
3. Because payment lands directly in the MDA's own Remita account, there is no separate "admin remittance" step — verification alone is what unlocks MDA review.

---

## 6. Key Files and Paths (current)

| Component                             | File Path                                                                                                            |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| **Webhook Handler (shared)**          | `app/api/webhooks/paystack/route.ts`                                                                                 |
| **Surfboard Subscription UI**         | `app/(projects)/(surfboard)/surfboard/dashboard/subscription/SubscriptionManager.tsx`                                |
| **Surfboard Subscription DB logic**   | `surfboard/services/subscriptionService.ts`                                                                          |
| **Surfboard Paystack init/verify**    | `surfboard/services/paystackSubscriptionService.ts`                                                                  |
| **Surfboard Subscription analytics**  | `surfboard/services/subscriptionAnalyticsService.ts`                                                                 |
| **Surfboard CoD fee calc**            | `surfboard/services/codFeeService.ts`                                                                                |
| **Surfboard CoD locking**             | `surfboard/services/planLockService.ts`                                                                              |
| **Surfboard CoD Remita verification** | `surfboard/services/remitaVerificationService.ts`                                                                    |
| **Surfboard CoD approval chain**      | `surfboard/services/batchApprovalService.ts`                                                                         |
| **Remita UI**                         | `app/(projects)/(surfboard)/components/RemitaPaymentModal.tsx`                                                       |
| **REVA property/payment services**    | `reva/services/propertyRequestService.ts`, `reva/services/paymentService.ts`, `reva/services/notificationService.ts` |
| **REVA Admin Verification**           | `app/(projects)/(reva)/reva-restricted/dashboard/payment-verification/PaymentVerification.tsx`                       |
| **Webhook payload types**             | `types/PaystackWebhookType.ts`                                                                                       |

**Superseded paths, do not use**: `app/(projects)/(surfboard)/actions/{paystackActions,subscriptionActions,codActions}.ts` and `revaActions2.ts` — all deleted. `codActions.ts`'s functionality is now the 4 `surfboard/services/*` files above (Phase 2); `revaActions2.ts`'s one live function set was folded into the REVA services above and the webhook route repointed (Phase 3); see `docs/development-history/phases/phase-5-retirement.md` for the final `codActions.ts` deletion.
