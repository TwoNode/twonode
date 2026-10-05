# Paystack webhook payloads: what Paystack actually sends

Observed from the `WebhookEvent` ledger (144 rows, 2025-11-18 to 2026-08-07, read 2026-10-05). The rows carry `domain: "live"`, so this is real Paystack traffic, not test-mode samples. Field names and shapes only; no customer data is recorded here. For how the handler uses these events, see [`subscription-payments-flow.md`](./subscription-payments-flow.md) and [`surfboard-subscription-detailed.md`](./surfboard-subscription-detailed.md).

## 1. The ledger

`WebhookEvent` (one row per delivery, written by `app/api/webhooks/paystack/route.ts`):

| Column                      | Notes                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signature`                 | Unique. Paystack retries send the **same** payload, so the same signature. This is how a retry is recognised.                                                                      |
| `event`, `platform`         | `platform` is a label the handler assigns. It is `surfboard` even on GBC ticket references (`STD_GBC2_…`, `REG_GBC2_…`, `EB_GBC2_…`), so do not use it to tell the products apart. |
| `entityKey`                 | `ref:<transaction reference>` for charges, `sub:<SUB_…>` for subscription and invoice events.                                                                                      |
| `payload`                   | The raw body: `{ "event": "...", "data": { ... } }`, nothing else at the top level.                                                                                                |
| `status`                    | `pending`, `ok`, `error`, `rejected`. `error` and stale `pending` rows are re-run when Paystack redelivers (#261).                                                                 |
| `receivedAt`, `processedAt` | `receivedAt` is also the lease clock for a redelivery claim.                                                                                                                       |

What the ledger holds:

| Event                    |  Rows | Notes                                                   |
| ------------------------ | ----: | ------------------------------------------------------- |
| `charge.success`         |   128 | 107 `ok`, 20 `error`, 1 under platform `unknown` (`ok`) |
| `invoice.create`         |     7 | all `ok`                                                |
| `invoice.payment_failed` |     7 | all `ok`                                                |
| `invoice.update`         |     2 | all `ok`                                                |
| `subscription.create`    | **0** | never recorded; see §5                                  |

## 2. `charge.success`

`data` keys: `id, log, fees, plan, split, amount, domain, paidAt, source, status, channel, message, paid_at, currency, customer, metadata, order_id, reference, created_at, fees_split, ip_address, subaccount, authorization, fees_breakdown, gateway_response, requested_amount, pos_transaction_data`.

- `amount` and `requested_amount` are in **kobo**. `currency` is `NGN`. `domain` is `live` or `test`.
- `paid_at` is ISO-8601 UTC with a `Z` suffix (`2026-08-07T12:18:43.000Z`). `paidAt` is the same instant.
- `channel` is `card` or `bank_transfer`. `authorization` carries `authorization_code`, `reusable`, `channel`, and the card or bank-transfer details, so its inner keys differ by channel.
- `customer` has `id, customer_code, email, first_name, last_name, phone, metadata, risk_action, international_format_phone`.
- `metadata` on a Surfboard first charge holds only `custom_fields` (an array of `{display_name, variable_name, value}`). The handler therefore cannot rely on `metadata.platform`; it falls back to the plan code (`isSurfboardPlan`) and the reference prefix.

### A first recurring charge (reference `SURFBOARD_SUB_<live|test>_<ts>_<userId>`)

All 25 such events in the ledger had:

- `data.plan` as an object: `{ id, name, amount, currency, interval, plan_code, description, send_sms, send_invoices }`. `interval` is `monthly`, `quarterly` or `annually`; `amount` is kobo.
- `data.plan_object` absent or null, and **no** `data.subscription` object.
- `reference`, `paid_at`, `amount` and the customer email.

That is everything `onSubscriptionChargeSuccess` reads (`extractPlan`, `reference`, `paid_at`, `amount`, `customer`, `authorization`), and it identifies the user by customer email plus the `SURFBOARD_SUB_` prefix (`findSurfboardUserIdFromEvent`). So a first charge can be credited from `charge.success` alone, without waiting for the browser's verify call. This closes the open question from #263.

`data.subscription` is absent on first charges, so `nextPaymentDate` is not taken from the event; the handler uses the end of the period the payment buys.

### Auto-renewal charges

Only one `charge.success` in the ledger has a Paystack-generated reference (a bare hex string, platform `unknown`). The data does not cover renewal payloads well. Renewals show up mostly through the `invoice.*` events below. Treat the renewal shape as unverified until a renewal is captured.

### Other references seen on the same event

GBC tickets (`STD_`/`REG_`/`EB_`/`CMP_GBC2_…`), Certificate of Deposit (`SurfCoDRef_…`) and REVA (`reva_<hex>`). They arrive on the same endpoint and are routed by reference prefix and plan code.

## 3. `invoice.*`

`invoice.create`, `invoice.update` and `invoice.payment_failed` carry `data` keys: `paid, amount, domain, status, paid_at, customer, createdAt, period_end, description, transaction, invoice_code, period_start, subscription, authorization`. Here `data.subscription` **is** present (with `subscription_code`), which is how `entityKey` becomes `sub:<SUB_…>`. `period_start` and `period_end` describe the billing period.

## 4. Errors seen before #261

20 `charge.success` rows ended `error`, all with the same message: `prisma.subscription.update() … No record was found for an update`. 16 of them were first-charge events (`SURFBOARD_SUB_…`). The old handler updated a subscription row that did not exist yet (the row used to be created only by `subscription.create` or the client's verify call). Since #263 the handler creates the row (`applyPaymentPeriod`), and since #261 a Paystack redelivery re-runs an `error` row. The other 4 were GBC ticket payments (`REG_`/`EB_GBC2_…`, April 2026). Their `data.plan` is an empty object `{}` and their metadata has no `platform`, so before the GBC routing fix of 2026-05-07 they were handled as Surfboard subscription charges and failed the same way. No payment was lost: all 7 tickets behind them are `COMPLETED` (the success page confirms them). GBC payments now route to `handleGBC` by reference.

Rows already stored as `error` are only re-run if Paystack sends them again; they are not retried by anything in this repo.

## 5. Gaps in this data

- `subscription.create`, `subscription.disable` and `subscription.not_renew` do not appear in the ledger, and the route writes **every** signed event to the ledger before any handler or filter runs. So Paystack has never delivered them to this endpoint. Check which events the Paystack dashboard's webhook is subscribed to; until they are, the subscription handlers for those events are untested and a first charge is credited by `charge.success` and the browser's verify call alone.
- No one-time payment (`SURFBOARD_ONETIME_SUB_…`) appears in the ledger, so the one-time webhook path added in #262 has not been exercised by real traffic yet.

## 6. Environments

- **Staging** (`twonodetech-git-main-rojitechs-projects.vercel.app`) writes to the Neon database `twonode_staging`. The RDS database `test_db` holds an older copy with the same 144 webhook rows; its newest activity is from 2026-10-01.
- Staging uses **live** Paystack keys: initiated references read `SURFBOARD_ONETIME_SUB_live_…` and the Paystack plan lists live subscriptions. A payment test on staging charges real money. Switch staging to test keys before running payment tests.
- Connection strings live in the environment files and Vercel, never in docs.

## 7. Verified on staging, 2026-10-05

| Check                                                                              | Result                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| One-time verify with a forged reference (another user's id) or a garbage reference | 403 `REFERENCE_NOT_ISSUED_TO_USER`                                                                      |
| Initiate or verify with an unknown plan                                            | 400 validation error                                                                                    |
| Email-OTP verify without a session                                                 | 401, even when a `userId` is sent in the body                                                           |
| Email-OTP with a seeded code: 5 wrong codes, then a 6th, then the correct code     | wrong ×5 → "Incorrect code"; 6th → 429; correct code after that → 429; row ends at `attempts=5`, unused |
| Webhook without a valid signature                                                  | 401                                                                                                     |
| Password-reset email link                                                          | points at the staging URL, not the live site (#265)                                                     |

### Clean account, first ever subscription (2026-10-05, test mode)

A brand-new account (signed up with a disposable mailbox through `send-otp` and `register`, email verified by OTP, no Paystack customer, no history) subscribed to the monthly plan with the browser's verify call blocked, as if the tab had been closed:

- Both `charge.success` and `subscription.create` arrived within half a second, and both were recorded `ok`. They arrived in **either order** across runs (`subscription.create` first in one run, `charge.success` first in the next); the result is the same.
- The account ended `active` for exactly one period (one month from payment), with `subCode` and `customerCode` filled in from `subscription.create`.
- The payment is one `subscription.success` history row keyed by the transaction reference, in kobo.
- `subscription.create` also writes its own history row (`eventType` `subscription.create`, `reference` = the `SUB_…` code, same amount and window as the payment). It does not credit time, and the payment ledger keys on the transaction reference, so it cannot double-credit. But it looks like a second payment: **do not sum `SubscriptionHistory.amount` for revenue** without excluding rows whose reference starts with `SUB_`. Note too that the browser-verify path stores its payment under `eventType` `subscription.create` (the `eventType` alone does not tell a payment from a lifecycle row). Open: give the lifecycle row its own `eventType`.

Exercised since, in Paystack test mode: a real one-time payment, an early repeat purchase (5 Nov to 5 Dec, remaining days carried over, replay credited nothing), and a recurring first charge with the browser's verify call blocked, for an existing and for a brand-new account. See [`../development-history/progress.md`](../development-history/progress.md).
