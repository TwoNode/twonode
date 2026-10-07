# 0005. Paystack live or test mode follows the Vercel environment

- **Status:** Accepted
- **Date:** 2026-10-05
- **Related:** PR #271, `lib/paystackMode.ts` (`isPaystackLive`, `getPaystackSecret`), [`../payment/`](../payment/)

## Context

Every Vercel deployment, previews included, runs with `NODE_ENV=production`. Deciding the Paystack mode from `NODE_ENV` alone made staging charge real cards.

## Decision

The mode is resolved in this order: an explicit `PAYSTACK_MODE=live|test`; then a Vercel preview deployment (staging) is test; then `NODE_ENV=production` is live; anything else (local development) is test. The secret key, and the key used to check a webhook's signature, follow the same mode.

## Consequences

- Staging uses test keys and can be tested with Paystack's test cards, and prod stays live.
- Webhooks must be signed with the key of the mode that produced them, so each environment needs its own webhook configuration.
- Test-mode references are tagged, so test and live payments can be told apart in the data.
