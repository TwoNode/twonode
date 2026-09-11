# Twonodes Documentation

## Start here

**[`development-history/`](./development-history/)** — the 2026-08 architecture rebuild: why it happened, the phase-by-phase execution plan, and a completion report per phase covering exactly what was built, what was found along the way, and what's still open. This is the single most reliable source for "does X still work the way an older doc says it does" — every other document in this folder that describes current behavior was cross-checked against it. Also holds `route-inventory.md`, a living list of every route in the app, and `progress.md`, the rolling checklist.

## Per-topic

| Folder | Covers |
| :--- | :--- |
| [`auth/`](./auth/) | Login, sessions, and roles across all three products — the native email+password system and the still-live parallel Kinde OAuth path. |
| [`payment/`](./payment/) | Paystack subscriptions, Certificate of Deposit payments, Remita verification. |
| [`surfboard/`](./surfboard/) | Survey plan lodging + the MDA government approval workflow: user flow, technical flow, QR Earnings. |
| [`reva/`](./reva/) | Property due-diligence requests: user flow, user stories, notifications. |
| [`gbc/`](./gbc/) | Event ticketing — auth notes; see `development-history/phases/phase-4-gbc.md` for the fuller picture. |
| [`pages/`](./pages/index.md) | Every page route, one file per platform (`gbc.md`/`reva.md`/`surfboard.md`) plus `main-site.md` for the shared corporate site. |
| [`components/`](./components/index.md) | Every component, one file per platform plus `shared.md`. |
| [`functions/`](./functions/index.md) | Every service/util/hook/lib file, one file per platform plus `shared.md`. |

## Reading a document that predates the rebuild

Several documents here (mostly under `surfboard/history/`, plus a couple of older REVA reviews) were written before the 2026-08 rebuild and are kept for their problem analysis and product-requirement context, not as current architecture references. Each one carries a note at the top pointing to whatever current document superseded it. If a document doesn't have that note, its content is current.

## Contributing to these docs

When you change a route, a service's file location, or an auth/payment flow: update `development-history/route-inventory.md` in the same commit, and check whether any per-topic document above references the thing you moved. Treat a stale file path in these docs the same as a stale comment in code — worth a line to fix while you're already there.
