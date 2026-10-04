# Payment Documentation

How money moves through Twonodes: Paystack subscriptions, Certificate of Deposit (CoD) payments, and the Remita two-link verification flow.

- [`subscription-payments-flow.md`](./subscription-payments-flow.md) — the overview: Surfboard subscriptions, Surfboard CoD, REVA one-time payments, and Remita, with current file paths across all three.
- **Known gaps** (verified 2026-10-04): [`subscription-payments-flow.md` §2.C](./subscription-payments-flow.md) — one-time verification that doesn't bind the amount/reference, webhook retries swallowed by the ledger, replace-not-add period maths, inconsistent money units. Read it before touching the subscription flow.
- [`surfboard-subscription-detailed.md`](./surfboard-subscription-detailed.md) — the deep dive on Surfboard's subscription state machine, database schema, webhook payloads, and business rules (grace period, platform-detection logic, idempotency).
- [`paystack-configuration.md`](./paystack-configuration.md) — test/live environment key management and the `isLive` tracking field.
- [`payment-verification.md`](./payment-verification.md) — the admin-side manual Paystack re-verification tool (REVA).
- [`remita-ai-extraction-prompts.md`](./remita-ai-extraction-prompts.md) — the prompt design behind extracting structured data from LASG/Remita receipt pages.
- [`remita-two-link-design-notes.txt`](./remita-two-link-design-notes.txt) — the original design notes for the two-link (LASG + Remita receipt) verification approach that shipped.

For the CoD flow those payments sit inside, see [`../surfboard/`](../surfboard/).
