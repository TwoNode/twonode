# Phase 12: Production Corrections, Pricing & Audit (October 5–7, 2026)

**Status:** Completed. **Date:** 2026-10-07. **Branch/PRs:** PR #300–#313.

## Why

Following the initial platform rebuild and launch, production runtime audits and user reports identified several discrepancies:
1. Map boundary shifts in Lagos and uncategorized states without bounding context.
2. Inconsistent Paystack sandbox/live modes across Vercel environments.
3. Client-side price tampering risks on REVA property requests.
4. Production database date and attendee name length constraints.

## Scope

- [x] **Map Boundary Display Adjustments:**
  - Shifted pillarless survey plans on screen without mutating stored coordinate geometry ([ADR-0001](../../adr/0001-map-correction-is-display-only.md), [ADR-0002](../../adr/0002-shift-pillarless-plans-on-screen-no-notification.md)).
  - Defaulted unscoped survey plans to Lagos datum ([ADR-0003](../../adr/0003-plans-without-a-state-are-lagos.md)), leaving non-Lagos plans untouched ([ADR-0004](../../adr/0004-other-states-stay-uncorrected.md)).
- [x] **Payment Security & Webhook Resilience:**
  - Fixed Paystack environment routing to strictly follow Vercel preview/production context ([ADR-0005](../../adr/0005-paystack-mode-follows-the-vercel-environment.md)).
  - Enforced server-side pricing on REVA property requests and certificates ([ADR-0006](../../adr/0006-reva-price-is-computed-on-the-server.md)).
  - Resolved webhook amount ledger retries and Surfboard plan identification.
- [x] **Database Audit & Attendee Name Fixes:**
  - Audited odd dates and long attendee names in GBC registration tables.
  - Resolved long name truncations across certificates, badges, and receipts ([PR #310](https://github.com/TwoNode/twonode/pull/310), [PR #313](https://github.com/TwoNode/twonode/pull/313)).

## Verification Plan & Completion Report

- Vitest unit and integration test suite expanded to 842 passing tests.
- Audited PostgreSQL RDS instances and applied date sanitization scripts.
- Merged to `prod` via [PR #313](https://github.com/TwoNode/twonode/pull/313).
