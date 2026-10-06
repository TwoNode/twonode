# Twonodes Documentation

## Start here

**[`DEPLOYMENT.md`](./DEPLOYMENT.md)** — the branch-to-environment mapping (`main` is staging, `prod` is live production — not what the names suggest) and what to check before merging into `prod`, plus database migrations (the `0_init` baseline and the staging/production workflows), cron and connection-pool settings.

**[`development-history/`](./development-history/)** — the 2026-08 architecture rebuild: why it happened, the phase-by-phase execution plan, and a completion report per phase covering exactly what was built, what was found along the way, and what's still open. This is the single most reliable source for "does X still work the way an older doc says it does" — every other document in this folder that describes current behavior was cross-checked against it. Also holds `route-inventory.md`, a list of every route in the app whose tables are **generated from the code** (`npm run docs:routes`; `npm run docs:routes -- --check` fails if it is stale), and `progress.md`, the rolling checklist.

## Per-topic

| Folder                                 | Covers                                                                                                                                                        |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`auth/`](./auth/)                     | Login, sessions, and roles across all three products — the native email+password system and the still-live parallel Kinde OAuth path.                         |
| [`payment/`](./payment/)               | Paystack subscriptions, Certificate of Deposit payments, Remita verification.                                                                                 |
| [`surfboard/`](./surfboard/)           | Survey plan lodging + the MDA government approval workflow: user flow, technical flow, QR Earnings, and the association-subscription evaluation.              |
| [`reva/`](./reva/)                     | Property due-diligence requests: user flow, user stories, notifications.                                                                                      |
| [`integrations/`](./integrations/)     | Third-party systems under evaluation — currently the NIPOST National Digital Postcode API.                                                                    |
| [`gbc/`](./gbc/)                       | Event ticketing — auth notes; see `development-history/phases/phase-4-gbc.md` for the fuller picture.                                                         |
| [`backend/`](./backend/)               | Plans for the backend itself: the order of Next.js, NestJS and Go, with the gates and the safe way to move between them.                                      |
| [`future-plans.md`](./future-plans.md) | Every plan and proposal that is not built yet (backend roadmap, mobile app, association subscription, postcode API), with dependencies and a suggested order. |
| [`mobile/`](./mobile/)                 | Feasibility findings and an evaluated plan for taking a product mobile — starting with the Surfboard Mobile App brief.                                        |
| [`pages/`](./pages/index.md)           | Every page route, one file per platform (`gbc.md`/`reva.md`/`surfboard.md`) plus `main-site.md` for the shared corporate site.                                |
| [`components/`](./components/index.md) | Every component, one file per platform plus `shared.md`.                                                                                                      |
| [`functions/`](./functions/index.md)   | Every service/util/hook/lib file, one file per platform plus `shared.md`.                                                                                     |

## Reading a document that predates the rebuild

Several documents here (mostly under `surfboard/history/`, plus a couple of older REVA reviews) were written before the 2026-08 rebuild and are kept for their problem analysis and product-requirement context, not as current architecture references. Each one carries a note at the top pointing to whatever current document superseded it. If a document doesn't have that note, its content is current.

## Contributing to these docs

When you change a route, a service's file location, or an auth/payment flow: run `npm run docs:routes` (it regenerates the route tables in `development-history/route-inventory.md`) and commit the result, and check whether any per-topic document above references the thing you moved. Treat a stale file path in these docs the same as a stale comment in code — worth a line to fix while you're already there.
