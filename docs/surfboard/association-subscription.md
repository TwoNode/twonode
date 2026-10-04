# Surfboard Association Subscription — evaluation and recommended design

> **Status: proposal. Nothing in this document is implemented.** It evaluates the product requirements ("Surfboard Association Subscription PRB") and the two engineering write-ups that were produced from them, checks every factual claim against the code on `dev` (2026-10-04), and replaces them with one reconciled design.
>
> **Superseded inputs** (kept locally in the untracked `out/` folder; their useful content is carried here): `association_subscription_plan.md` ("Plan A") and Part I of `Surfboard_Association_and_Mobile_Feasibility_Analysis.md` ("Plan B"). Part II of that file (mobile) is evaluated in [`../mobile/surfboard-mobile-app-evaluation.md`](../mobile/surfboard-mobile-app-evaluation.md).

## 1. What the PRB asks for

A **state-level Association Admin** (for example the Ekiti chapter of the Association of Private Practicing Surveyors) pays Surfboard subscriptions **in bulk on behalf of surveyors** in its state. Individual subscriptions keep working unchanged.

| Topic                    | Requirement                                                                                                                                                                                                                               |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                    | A surveyor's existing **State of Residence** decides which association can see them. No separate enrolment. The association manages _subscription access only_, not users generally.                                                      |
| Roles                    | **Surfboard Admin**: create/configure associations per state, assign association admins, set association prices (quarterly + yearly), view activity. **Association Admin**: belongs to one state; sees only that state's surveyors.       |
| Association admin can    | View surveyors + subscription status, select one/many, choose quarterly or yearly, pay, view subscription/payment history, download receipts.                                                                                             |
| Association admin cannot | See other states, change any pricing, manage another state's association, **change a surveyor's State of Residence**.                                                                                                                     |
| Pricing                  | Two separate structures: _individual_ (monthly/quarterly/yearly) and _association_ (quarterly/yearly, per state). The price shown is exactly what Surfboard configured. Association's own levies/subsidies are outside Surfboard's logic. |
| Dashboard                | Surveyors on Surfboard · active · inactive · expiring soon; actions: View Members, Subscribe Members, Subscription History, Payment History.                                                                                              |
| Payment                  | `selected surveyors × applicable association price`, one transaction; on success every selected surveyor is activated/extended.                                                                                                           |
| **Extension rule**       | **Every successful purchase adds its duration to the surveyor's validity, regardless of who paid.** Active: extend from current expiry (31 Dec 2026 + quarterly → 31 Mar 2027). Inactive: start from the activation date.                 |
| Surveyor view            | Subscription status, plan, **"Subscribed by: APPSN – Ekiti state / Individual"**, valid until.                                                                                                                                            |
| Receipt                  | Association name, date, reference, plan, names of subscribed surveyors, count, total; viewable and downloadable from Payment History.                                                                                                     |
| Principle                | Surfboard Admin sets the price · Association Admin chooses members and subscribes · Surfboard processes the payment · the surveyor gets the subscription.                                                                                 |

Two PRB statements drive most of the findings below: **#10/#13.9 "every purchase adds duration regardless of who paid"** (this reaches into the _existing_ individual flow, not just the new one) and **#13.13 "access is determined by subscription status regardless of who paid"**.

## 2. The two plans compared

|                                   | Plan A (`association_subscription_plan.md`)                                                                                          | Plan B (Feasibility Part I)                                                                                                                           |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fit with this repo                | **Better.** Correct file names (`receiptPdfService.ts`, `isSubActiveOrGrace`), correct reading of `Subscription` (one row per user). | Weaker on repo detail; one wrong service name and several wrong technical specifics (see §4.12).                                                      |
| Schema                            | `Association` (+`adminId`), `AssociationPayment`, `AssociationPaymentSurveyor`; `ASSOCIATION_ADMIN` role; flags on `Subscription`.   | `StateAssociation`, `AssociationAdmin`, `AssociationPricing`, `AssociationPaymentBatch`, `AssociationPaymentItem`; sponsor columns on `Subscription`. |
| Money                             | Naira `Int`                                                                                                                          | Kobo `Int` (**right choice**, matches Paystack)                                                                                                       |
| Fulfilment                        | On the _verify_ call (user's browser must return); webhook role unspecified                                                          | Only in the _webhook_                                                                                                                                 |
| Duration maths                    | Calendar months via `setMonth` (overflows at month ends)                                                                             | Fixed 90/365 days                                                                                                                                     |
| Recurring individual subscription | Not addressed (**double-billing risk**)                                                                                              | Addressed (disable the Paystack subscription)                                                                                                         |
| Security/edge cases               | Light (price lock, idempotency noted)                                                                                                | Better (server-side price, state isolation, batch cap) but partly overstated                                                                          |
| Open questions                    | Good list (admin onboarding, null state, price lock, reminders)                                                                      | Few                                                                                                                                                   |

**Verdict:** use Plan A's grounding in the codebase, Plan B's kobo/webhook/isolation instincts, and fix the gaps in §4. Neither plan is safe to build as written.

## 3. What the code does today (verified)

| Area                              | Fact                                                                                                                                                                                                                                          | Where                                                                                                           |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| Subscription model                | **One row per user** (`userId @unique`), with `provider`, `planCode`, `interval`, `amount`, `currentStart/End`, `nextPaymentDate`, `status`. Nullable Paystack fields.                                                                        | `prisma/schema/surfboard.prisma:107`                                                                            |
| "Active" rule                     | `status ∈ {active, past_due}` and not past `currentEnd + 24h`, or `canceled` but still inside the period. The API gate uses this; **the page gate in `proxy.ts` is stricter** (`status === "active"` or canceled-in-grace).                   | `surfboard/services/subscriptionService.ts:25`, `proxy.ts:213`                                                  |
| What a lapsed subscription blocks | Only _capability_ actions (create/edit/share plans, QR). Reading own/shared plans, map, settings, subscription pages stay open ("Shared Access" vision).                                                                                      | `proxy.ts` `alwaysAllowedEvenUnsubscribed`; `requireActiveSubscription`                                         |
| Individual payment paths          | (1) recurring: popup checkout → `verifySubscription` and webhook `subscription.create`/renewal `charge.success`; (2) one-time: popup → `verifyOneTimeSubscription` and webhook. Plans: monthly ₦16,700 · quarterly ₦50,000 · yearly ₦200,000. | `surfboard/services/paystackSubscriptionService.ts`, `app/(projects)/(surfboard)/utils/paystackSubscription.ts` |
| Period maths                      | `computePeriodPerTimestamp` — **clamped** calendar `addMonths`, Lagos wall-clock, `currentEnd = nextCharge − 1s`.                                                                                                                             | `app/(projects)/(surfboard)/utils/computePeriod.ts`                                                             |
| Webhook                           | One endpoint for all products; HMAC-verified; per-event ledger with **unique `signature`**; product routed from `metadata.platform`.                                                                                                          | `app/api/webhooks/paystack/route.ts`, `WebhookEvent` in `core.prisma`                                           |
| Roles                             | `SurfboardRole`: `USER, ADMIN, SUPERADMIN` + six MDA roles. **One role per user.** A route registry (`surfboard/access/routes.ts`) drives nav _and_ access; `proxy.ts` has one branch per path prefix.                                        | `prisma/schema/surfboard.prisma:7`, `surfboard/access/routes.ts`, `proxy.ts`                                    |
| Staff onboarding                  | Invitation system: `AdminInvitation` row + emailed single-use link; roles limited by `INVITABLE_ROLES`; accept page per product. Reusable for association admins.                                                                             | `lib/auth/adminInvitations.ts:39`                                                                               |
| `residenceState`                  | Free-text `String?` column, but the UI is a `<select>` over `nigerianStates` (names such as `"Federal Capital Territory"`). **Editable until KYC validation** (`isLocked = isKycValidated`).                                                  | `prisma/schema/surfboard.prisma:55`, `surfboard/services/profileService.ts:88`, `lib/constants.ts`              |
| Manual override                   | A `SUPERADMIN` can set any user's subscription directly (`PATCH admin/users/[id]/subscription`) — a precedent for non-Paystack grants.                                                                                                        | `app/api/v1/surfboard/admin/users/[id]/subscription/route.ts`                                                   |
| Receipts                          | `@react-pdf/renderer` run in a child-process worker; eligibility/ownership logic in `receiptPdfService.ts`.                                                                                                                                   | `surfboard/services/receiptPdfService.ts`                                                                       |
| Reminders                         | Daily cron (`vercel.json`, 08:00 UTC) scans `status = active` rows by `currentEnd`; sets `expiryReminderSentAt` once per expiry date, so a bumped `currentEnd` re-arms it.                                                                    | `surfboard/services/subscriptionReminderService.ts`                                                             |

## 4. Findings

Severity: **P0** = fix before or with this feature · **P1** = must be designed in · **P2** = should be decided · **P3** = correctness of the plans themselves.

### 4.1 [P0] Individual payments _replace_ the subscription period; the PRB says purchases _add_

Every individual path computes the new period **from the payment date** and overwrites `currentStart/currentEnd`:

- `createOrUpdateSubscription` — `surfboard/services/subscriptionService.ts:129–137` (upsert).
- webhook `subscription.create` — `route.ts:496–502`; webhook renewal `charge.success` — `route.ts:752–759`.

Consequence: association pays 12 months for a surveyor → the surveyor's own monthly card renewal later fires → `currentEnd` is reset to "payment date + 1 month". **The association's money is silently lost.** PRB #9/#10/#13.9 require additive semantics _for every successful purchase_. Both plans scope "extension logic" to the association path only. The additive rule has to become one shared function used by all paths (see §5.4).

### 4.2 [P0] Double billing when an association extends a surveyor on a recurring Paystack plan

Extending `currentEnd` does nothing to the surveyor's Paystack subscription, which keeps charging on its own schedule. Plan A's upsert does not touch `provider`/`subCode`/`nextPaymentDate` at all. Paystack cannot shift an existing subscription's next payment date, so the only safe options are (a) disable the recurring subscription when an association extends (Plan B's suggestion; the `disableSubscription` service already exists) and tell the surveyor, or (b) accept a duplicate charge. Choose (a). Document that the surveyor must resubscribe after the sponsored period ends.

### 4.3 [P0, pre-existing] The one-time payment verification does not check the amount or bind the reference

`verifyOneTimeSubscription` (`paystackSubscriptionService.ts:308`) accepts a Paystack transaction if `status === "success"` and then grants the plan named by the **client-supplied** `planId`. It never compares `data.amount` with that plan's price, never checks that the reference was issued by `initiateOneTimeSubscription`, and never checks that the reference hasn't already been used by another account. The webhook path (`onOneTimeSubscriptionChargeSuccess`, `route.ts:672`) trusts `metadata.plan_id` the same way. The popup checkout is client-driven (no server-side `transaction.initialize`), so amount and metadata are client-controlled.

By contrast the REVA and certificate-of-deposit webhook paths **do** compare amounts (`route.ts:892`, `route.ts:1014`).

_Assessment from reading the code; not exploited against Paystack._ Practical risk: pay a small amount through any flow, then call `verify-onetime` with that reference and `planId: "annually"`. **This affects today's production flow and the association flow would copy the same pattern if built naively.** Fix independently of this feature: server-side `initialize` with a locked amount, a `PENDING` payment row keyed by reference, and `data.amount`/`data.currency`/reference checks at both verify and webhook time.

### 4.4 [P0] A failed webhook is never retried — the ledger swallows Paystack's retries

Paystack retries unacknowledged webhooks (live mode: every 3 minutes for the first four attempts, then hourly for up to 72 hours — [Paystack docs](https://paystack.com/docs/payments/webhooks/)). Our ledger inserts a row with a **unique `signature`** _before_ processing and, on a unique-constraint hit, returns `{ ok: true, duplicate: true }` (`route.ts:150`, `route.ts:307/311`). If the handler then throws, the route returns 500 and marks the row `error`… but the retry has the same payload, hits the unique constraint, and is acknowledged as a duplicate. **A transient failure (DB blip, timeout) during fulfilment permanently loses the event.**

For one subscription this is an annoyance; for a bulk association payment it is "paid, nothing activated". Design response: (a) make the association state machine **re-drivable** from a verify endpoint and a reconciliation job, and (b) fix the ledger so rows in `error` status are processed again on redelivery.

### 4.5 [P1] Unit conventions are inconsistent — pick kobo for new tables and convert at the edges

- `SUBSCRIPTION_PLANS[*].amount` is **naira**, `amountInKobo` is kobo.
- `createOrUpdateSubscription` stores the Paystack plan's `amount` (already **kobo**) in `Subscription.amount`, but writes `plan.amount * 100` into `SubscriptionHistory.amount` — apparently **100× kobo**. Webhook renewals store Paystack's `data.amount` (kobo) in both. (The "100× price inflation" hotfix, #202/#203, touched the client side of the same mismatch.)
- Plan A stores naira; Plan B stores kobo.

Recommendation: `…Kobo` suffix columns on new tables, `Int`, and never reuse `Subscription.amount` arithmetic. Audit/fix the history 100× separately and add a unit test around it. (There is no revenue report reading these columns today — `subscriptionAnalyticsService.ts` has none — so nothing is _visibly_ wrong yet, which is also why it hasn't been noticed.)

### 4.6 [P1] Make the webhook the source of truth; keep verify as a fast path

Plan A fulfils only when the admin's browser calls `/verify`; if the tab closes after paying, money moved and nothing activates. Plan B fulfils only in the webhook, with no manual retry. Do both with **one idempotent function** (`fulfilAssociationPayment(reference)`), invoked by the webhook, by the verify endpoint, and by a reconciliation job for payments stuck in `PAID`. Guard with a state transition (`updateMany({ where: { id, status: "PAID" }, data: { status: "FULFILLING" } })`) so two concurrent callers can't both run it — the same pattern used for pending-registration claims in `lib/auth/pendingRegistration.ts`.

### 4.7 [P1] Server-issued, server-priced checkout

The existing individual popup flow deliberately skips `transaction.initialize` (a duplicate-reference collision with the client popup). For association payments use the **GBC pattern**: server-side `paystack.transaction.initialize` (`gbc/utils/paystack.ts`), then either redirect to `authorization_url` or open the installed inline library with `resumeTransaction(access_code)` — never both. The server creates a `PENDING` `AssociationPayment` first with the locked unit price, count, total (kobo), and the exact surveyor IDs; the browser only ever sees the resulting `access_code`. At verify/webhook time compare `data.amount === totalKobo`, `data.currency === "NGN"`, and that the reference belongs to a `PENDING` row. Amounts are integers in kobo ([Paystack API reference](https://paystack.com/docs/api/transaction/); the repo already relies on this — `amountInKobo`, and the REVA/CoD webhooks compare `data.amount` in kobo).

### 4.8 [P1] Duration maths: calendar months, clamped, same convention as the rest of the app

The PRB's examples are calendar months (31 Dec + 3 months = 31 Mar). Plan A's `Date#setMonth` overflows at month ends (30 Nov + 3 months → 2 Mar, not 28 Feb). Plan B's fixed 90/365 days happens to reproduce the two PRB examples but drifts (and 365 ≠ a leap year). The repo already has the right tool — a **clamped** `addMonths` with the `currentEnd = nextCharge − 1s` convention in `computePeriod.ts`. Reuse it. (Note: its `toLagosDate` builds a `Date` from Lagos wall-clock parts in the _server's_ local zone; on a UTC server stored instants are shifted by the Lagos offset. Harmless for date-granularity display but worth knowing before writing tests.)

### 4.9 [P1] One role per user; association admins need their own accounts and a routing slot

`SurfboardUser.role` is a single enum. A person who is both a practising surveyor (`USER`) and an association officer cannot hold both. Both plans add `ASSOCIATION_ADMIN` (Plan B additionally a link table) without noticing this. Recommended: association admins are **separate accounts**, invited through the existing invitation flow. Adding a role touches: the enum + migration; `INVITABLE_ROLES`, `ACCEPT_PATH`, `loginPathFor` in `lib/auth/adminInvitations.ts`; a new `association` group in `surfboard/access/routes.ts`; a new path-prefix branch in `proxy.ts`'s `computeRouteAccess`; the JWT/session role union; and `withAuth` roles on the new routes. This answers Plan A's open question #1 (Kinde vs not): native email+password auth is the primary path now.

### 4.10 [P1] "Subscribed by" cannot be a flag on the single `Subscription` row

PRB #9/#13.10 let different payers extend the same surveyor in sequence. A `subscribedByType` flag on the one row shows only the last writer and loses who paid for which stretch. Add a **source** to the history ledger (`INDIVIDUAL | ASSOCIATION | ADMIN`, plus `sponsorAssociationId`) and derive "Subscribed by" from the history row covering "now" (or the one with the latest `endDate`).

### 4.11 [P2] Privacy and member visibility

An association admin sees names, SURCON numbers and likely phone/email for every surveyor in the state, most of whom never opted in. Under the **Nigeria Data Protection Act 2023** processing must have a lawful basis (consent, contract, legitimate interest, …) and controllers/processors owe accountability and a duty of care ([overview](https://securiti.ai/overview-of-nigeria-data-protection-act/), [KPMG review](https://assets.kpmg.com/content/dam/kpmg/ng/pdf/the-nigeria-data-protection-act-2023.pdf)). Recommended: return the minimum fields (name, SURCON reg number, subscription status/expiry, masked email), audit every association-admin read, and have counsel confirm the lawful basis and whether surveyors need notice. This is a product/legal decision, not just engineering.

### 4.12 [P3] Errors and overstatements in the plans

| Claim                                                                                           | Reality                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :---------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan B: receipts via `codReceiptService.ts`                                                     | No such file. The service is `receiptPdfService.ts` (Plan A had it right).                                                                                                                                                                                                                                                                                                                                                                                               |
| Plan B: surveyors could "fraudulently change `residenceState` to get a free licence"            | They can't self-grant: the _association_ chooses and pays. The state is editable until KYC validation, so the real risks are (a) mis-scoped membership and (b) a surveyor moving states after being paid for (PRB #13.12 already accepts that).                                                                                                                                                                                                                          |
| Plan B: cap bulk at 250 because of a "15s Vercel limit"                                         | Vercel's default function duration with Fluid compute is **300s** on every plan, 800s max on Pro ([Vercel docs](https://vercel.com/docs/functions/configuring-functions/duration)). The real constraint is Prisma's interactive-transaction defaults — **`timeout` 5s, `maxWait` 2s** in Prisma Client 6 ([Prisma v6 docs](https://www.prisma.io/docs/v6/orm/prisma-client/queries/transactions); the repo is on 6.19.2): chunk the work and pass an explicit `timeout`. |
| Both plans: interval vocabulary `quarterly`/`yearly` (A) and `QUARTERLY`/`YEARLY` (B)           | The codebase uses `"annually"` for plan ids/intervals (`PlanId`, `computePeriod`). Choose one for the new enum and map at the edge.                                                                                                                                                                                                                                                                                                                                      |
| Plan A: `create` with `customerCode: ""`, `authorization: ""`, `emailToken: ""`, `amount: 0`    | Those columns are nullable — use `null`. `amount: 0` in history hides what was actually paid; record the per-surveyor share of the payment.                                                                                                                                                                                                                                                                                                                              |
| Plan A: Paystack flow = "one-time charge (recommended)"                                         | Correct, but must be paired with server-side `initialize` (§4.7) and amount verification (§4.3).                                                                                                                                                                                                                                                                                                                                                                         |
| Plans A/B: association fulfilment writes `provider: "association"` into `Subscription.provider` | `provider` drives Paystack-specific behaviour (disable/enable). Don't overload it; keep the ledger source in history (§4.10).                                                                                                                                                                                                                                                                                                                                            |

### 4.13 [P2] Questions the PRB leaves open

1. **Which surveyors count?** Only role `USER`? KYC-validated only? What about deactivated accounts (`isActive = false`) and users with `residenceState = null`?
2. **Inactive start date** — "starts from the current subscription activation date": we read this as _the payment/fulfilment date_. Confirm.
3. **Numbers** — the PRB uses ₦X/₦Y. Association price vs the individual plans (₦50,000 quarterly / ₦200,000 yearly)? Is a discount intended?
4. **Refunds/chargebacks/partial coverage** — if a surveyor is deactivated between payment and fulfilment, is their share refunded or credited?
5. **Duplicate coverage** — two associations (a surveyor who changed state) or an association and an individual paying for the same period: PRB says add; confirm that is wanted when the surveyor is already far in credit.
6. **Reminders** — expiry reminders go to the surveyor today; should the association admin also be told which members are expiring?
7. **Receipt scale** — a 250-name receipt: one PDF with pagination, or summary + CSV roster?
8. **Association admin count** — PRB says "assign State Association Admins" (plural). One admin per state or several?

## 5. Recommended design

### 5.1 Data model (new, additive migration)

```prisma
enum SurfboardRole { /* …existing… */ ASSOCIATION_ADMIN }

enum AssociationInterval { QUARTERLY  YEARLY }
enum AssociationPaymentStatus { PENDING  PAID  FULFILLING  FULFILLED  PARTIAL  FAILED  EXPIRED }
enum AssociationItemStatus { PENDING  APPLIED  SKIPPED }

model Association {
  id                 String   @id @default(uuid())
  state              String   @unique            // exactly a name from lib/constants.ts nigerianStates
  name               String                      // "APPSN – Ekiti State Chapter"
  isActive           Boolean  @default(true)
  quarterlyPriceKobo Int?
  yearlyPriceKobo    Int?
  priceUpdatedById   String?
  admins   AssociationAdmin[]
  payments AssociationPayment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AssociationAdmin {            // user@unique: an admin belongs to exactly one association/state
  id            String   @id @default(uuid())
  associationId String
  userId        String   @unique
  isActive      Boolean  @default(true)
  association   Association   @relation(fields: [associationId], references: [id], onDelete: Cascade)
  user          SurfboardUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AssociationPayment {
  id             String   @id @default(uuid())
  reference      String   @unique                // server-generated, registered with Paystack by initialize()
  associationId  String
  createdById    String
  interval       AssociationInterval
  unitPriceKobo  Int                              // LOCKED at initiate
  surveyorCount  Int
  totalKobo      Int                              // unitPriceKobo * surveyorCount
  status         AssociationPaymentStatus @default(PENDING)
  paystackTxId   String?
  paidAt         DateTime?
  fulfilledAt    DateTime?
  expiresAt      DateTime                         // abandoned PENDING rows are swept
  items          AssociationPaymentItem[]
  @@index([associationId, createdAt])
  @@index([status])
}

model AssociationPaymentItem {
  id          String   @id @default(uuid())
  paymentId   String
  userId      String
  status      AssociationItemStatus @default(PENDING)
  skipReason  String?                             // e.g. "state changed", "account inactive"
  previousEnd DateTime?
  newEnd      DateTime?
  payment     AssociationPayment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  @@unique([paymentId, userId])                   // idempotency: a surveyor is applied at most once per payment
}

// SubscriptionHistory gains:  source String? ("INDIVIDUAL"|"ASSOCIATION"|"ADMIN")  sponsorAssociationId String?
// Subscription itself gains NOTHING payer-specific; "Subscribed by" is derived from history.
```

### 5.2 Request flow

```
Association admin selects N members, picks quarterly|yearly
  POST /api/v1/surfboard/association/subscribe/initiate  { surveyorIds, interval }
    server: re-check every id is USER, active, residenceState === admin's state
            price = Association.{quarterly|yearly}PriceKobo   (never from the client)
            create AssociationPayment(PENDING) + items(PENDING), expiresAt = now+30min
            paystack.transaction.initialize({ amount: totalKobo, reference, metadata:{ type:"surfboard_association", paymentId } })
    → { accessCode | authorizationUrl, reference, totalKobo }

Paystack → /api/webhooks/paystack  (charge.success, metadata.type === "surfboard_association")
  OR browser → POST …/subscribe/verify { reference }       ← same function either way
    fulfilAssociationPayment(reference):
      verify with Paystack; require amount === totalKobo, currency NGN, status success
      CAS  PENDING→PAID, then PAID→FULFILLING  (updateMany guards)
      for each item in chunks (own transaction, explicit timeout):
         re-check state/active (SKIPPED with reason if changed)
         applyExtension(userId, months, source:"ASSOCIATION", sponsorAssociationId)   // §5.4
         write item APPLIED + history row
      payment → FULFILLED (or PARTIAL if any SKIPPED); render receipt; notify surveyors + admin

Reconciliation job (cron, every few minutes): re-run fulfilAssociationPayment for PAID/FULFILLING rows older than N minutes;
expire stale PENDING rows.
```

### 5.3 Authorisation and isolation

- Every association route is `withAuth({ roles: [ASSOCIATION_ADMIN] })` and derives `associationId` **from the session's `AssociationAdmin` row**, never from the request body.
- Member queries are always `where: { role: USER, residenceState: association.state }`. Add a test asserting an admin of State A can never read, select, or pay for a State B surveyor, including by passing foreign IDs to `initiate`.
- Pricing endpoints are `SUPERADMIN`/`ADMIN` only; association routes expose price read-only.
- Audit every initiate/fulfil/member-list read with `writeAudit`.

### 5.4 One extension function for _all_ payers

```ts
// Used by the association path AND by createOrUpdateSubscription / webhook renewals / one-time verify.
function periodFor(existingEnd: Date | null, now: Date, months: number) {
  const startInstant =
    existingEnd && existingEnd > now
      ? new Date(existingEnd.getTime() + 1000) // continue right after the current period (matches currentEnd = nextCharge − 1s)
      : now; // lapsed or none: start from the payment/fulfilment date
  const next = addMonthsClamped(startInstant, months); // the clamped helper already in computePeriod.ts
  return {
    currentStart:
      existingEnd && existingEnd > now
        ? /* keep original */ undefined
        : startInstant,
    currentEnd: new Date(next.getTime() - 1000),
  };
}
```

Rules: `status → "active"`, `cancelledAt → null`; never lower an existing `currentEnd`; record `previousEnd/newEnd` on the item and in history; for a surveyor with a live Paystack recurring subscription call the existing `disableSubscription` _after_ the extension commits and notify them. Cover with tests for: active extend, lapsed restart, within-24h-grace, month-end clamping (30 Nov + 3 months), leap years, and **association-then-individual-renewal stacking** (the §4.1 regression).

### 5.5 Surfaces

| Surface                                                   | Work                                                                                                                                                                                                                  |
| :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfboard Admin → **Associations**                        | List/create/edit (state from the fixed list, name, status), set quarterly/yearly price, invite/assign association admins (reuse invitation flow), activity table.                                                     |
| Association portal (`/surfboard-association/dashboard/*`) | Dashboard (total / active / inactive / expiring ≤30 days), Members (search, filter, multi-select, "select all expired/expiring"), Subscribe flow (select → interval → review total → pay), Payment History + receipt. |
| Surveyor subscription card                                | "Subscribed by", plan, valid until — derived from history (§4.10).                                                                                                                                                    |
| Receipt                                                   | Extend `receiptPdfService.ts`'s worker with an association template; paginate; optionally CSV roster.                                                                                                                 |
| Notifications                                             | Email/WhatsApp to each surveyor on activation (`notificationService` / existing mail+WhatsApp helpers); reminder cron optionally also summarises expiring members to the association admin.                           |

### 5.6 Data hygiene before launch

Run on production before enabling: count of `USER` accounts by `residenceState`, including `NULL` and values not in `nigerianStates`.

```sql
SELECT COALESCE("residenceState", '(null)') AS state, COUNT(*)
FROM "SurfboardUser" WHERE role = 'USER' GROUP BY 1 ORDER BY 2 DESC;
```

Unassigned surveyors are invisible to every association. Decide whether to prompt them to set a state (it is a free `<select>`, but locks after KYC) or let the Surfboard Admin assign.

_Optional residence check:_ the state segment of a surveyor's NIPOST digital postcode (e.g. `EK` → Ekiti) is a cheap consistency check against `residenceState`, but coverage is still rolling out — treat it as a hint, never a gate. See [`../integrations/nigeria-postcode-api.md`](../integrations/nigeria-postcode-api.md) §5.5.

## 6. Build order

| Phase                                   | Scope                                                                                                                                                                                                                                                                          | Size |
| :-------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| **0 — prerequisites (independent PRs)** | (a) Server-side initialize + amount/reference binding for the one-time flow (§4.3). (b) Ledger fix so errored events are reprocessed (§4.4). (c) Shared additive `periodFor` used by all individual paths + regression tests (§4.1). (d) Audit the history-amount 100× (§4.5). | M    |
| 1 — schema + service                    | Migration, `associationSubscriptionService` (`initiate`, `fulfil`, `applyExtension`), webhook branch, reconciliation cron, tests.                                                                                                                                              | M–L  |
| 2 — admin                               | Associations CRUD, pricing, admin invitation + role plumbing (§4.9).                                                                                                                                                                                                           | M    |
| 3 — association portal                  | Dashboard, members, subscribe, payment history, receipt.                                                                                                                                                                                                                       | L    |
| 4 — surveyor side                       | "Subscribed by" derived field, notifications, reminder routing.                                                                                                                                                                                                                | S    |

Phase 0 is the real critical path: items (a)–(c) fix defects that exist **today** and the association feature is unsafe without them.

## 7. Decisions needed from the product owner

§4.13 questions 1–8, plus: confirm separate association-admin accounts (§4.9); confirm disabling the surveyor's recurring Paystack plan when extended (§4.2); confirm the member-field minimum and the lawful basis (§4.11).

## 8. Verification log and sources

**Run for this evaluation (2026-10-04):** read the PRB PDF and both plans end to end; traced the individual payment path, webhook, ledger, `proxy.ts` gate, access registry, invitation roles, profile editing, receipts and reminders in the code; confirmed the installed `@paystack/inline-js` exposes `resumeTransaction` and that GBC already uses server-side `initialize`.

**External:** [Paystack webhooks](https://paystack.com/docs/payments/webhooks/) (retry policy) · [Paystack transaction API](https://paystack.com/docs/api/transaction/) (kobo amounts, initialize/verify — the page blocks automated fetching, so the kobo statement was confirmed from search excerpts and from the repo's own usage) · [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration) · [Prisma v6 interactive transactions](https://www.prisma.io/docs/v6/orm/prisma-client/queries/transactions) (`timeout` 5s / `maxWait` 2s defaults, configurable per call) · [Nigeria Data Protection Act 2023 overview](https://securiti.ai/overview-of-nigeria-data-protection-act/) and [KPMG review](https://assets.kpmg.com/content/dam/kpmg/ng/pdf/the-nigeria-data-protection-act-2023.pdf).

**Not verifiable from the repo:** production data quality of `residenceState`, actual Paystack behaviour for the replay scenario in §4.3 (assessed from code; confirm in Paystack test mode before treating as exploitable), and the legal conclusions in §4.11.
