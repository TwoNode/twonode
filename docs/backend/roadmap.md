# Backend roadmap: Next.js now, NestJS later, Go much later

> **Status: future plan, not a commitment.** No mobile code and no NestJS or Go code exists. This records the intended order so decisions made today don't block it. Nothing here has dates; each stage starts only when its entry conditions are met (see the gates).

## 1. The order

| Stage              | Backend                                               | When                                                   | Why this order                                                                                                                                                                                         |
| :----------------- | :---------------------------------------------------- | :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 (now)**        | The existing **Next.js** API (`/api/v1/*`)            | Mobile MVP and the foreseeable future                  | It already covers about 90% of what the app needs ([evaluation §2](../mobile/surfboard-mobile-app-evaluation.md)). The one real blocker is cookie-only auth, which is days of work, not a new backend. |
| **1 (later)**      | **NestJS** service beside Next.js, one area at a time | When a trigger in §4 is hit                            | Same language, same Prisma schema, same services: the cheapest way to get a standalone, documented API with queues and long-running jobs.                                                              |
| **2 (much later)** | **Go**, area by area, behind the same contract        | Only if NestJS becomes the limit, or the team wants it | A rewrite with no code reuse. Worth it only for measurable performance or cost reasons.                                                                                                                |

The web front end stays on Next.js throughout. Only the API moves. The mobile app is the first reason to plan this; what the app needs at each stage is in [`../mobile/roadmap.md`](../mobile/roadmap.md).

## 2. Principles that make every later move cheap

These apply from stage 0, so a later stage is a swap of the implementation and not a redesign.

1. **The HTTP contract is the product.** The mobile app and the web talk to `/api/v1/*`. Whatever answers (Next.js, NestJS, Go) must return the same JSON, status codes and error codes (`{ success, data | error }`, codes such as `EMAIL_VERIFICATION_REQUIRED`, `SUBSCRIPTION_REQUIRED`, `PRICE_MISMATCH`).
2. **Write the contract down.** Produce an OpenAPI spec for the routes the mobile app uses, first for Surfboard. Generate the mobile client from it. The spec is also the test oracle in §3.
3. **Never put business rules in the transport layer.** Rules live in the service layer (`surfboard/services`, `reva/services`, `gbc/services`, documented in [`../functions/`](../functions/)). Route handlers only authenticate, validate and call a service. This is the rule that lets NestJS reuse services and lets Go port them one by one.
4. **No cookies-only features.** Mobile needs bearer tokens, so anything that assumes a browser cookie, a `Referer`, or a Next.js server action is a stage-0 problem ([evaluation §3](../mobile/surfboard-mobile-app-evaluation.md)).
5. **One database, owned by one migration tool at a time.** Until Go, Prisma owns the schema (`0_init` is the baseline). Do not let two services run migrations. Before any Go service writes to the database, decide whether migrations stay with Prisma or move to a neutral tool (plain SQL with goose or Atlas); do that as its own change, not inside a rewrite.
6. **Idempotency and money stay server-side.** Payments are keyed by Paystack reference, prices are computed on the server, and webhooks are verified by signature and recorded in a ledger. These rules move with the code unchanged. A new backend must pass the same tests before it handles any payment route.

## 3. How an area moves between backends (the strangler pattern)

Used for Next.js to NestJS, and again for NestJS to Go.

1. **Pick one area** with low risk and clear boundaries (Surfboard read endpoints first: plans list, queried plans, stats).
2. **Contract tests first.** Run the OpenAPI spec and a recorded set of requests against the current backend. These become the acceptance suite for the new one.
3. **Build the same routes in the new service**, reusing the service logic and the Prisma schema (NestJS) or porting it (Go).
4. **Run both and compare.** Shadow-call the new service with copies of real read traffic and diff the responses before sending it any user.
5. **Switch with a rewrite or proxy rule** per route. Roll back by removing the rule. Nothing changes for the front end or the app.
6. **Keep the old route for a while** after the switch, then delete it.
7. **Writes and payments move last,** after reads are stable, with the existing money tests running against the new service.

## 4. Gates: when each stage starts

### Stage 0 to stage 1 (Next.js to NestJS)

Start when **one or more** is true:

- A long-running job no longer fits serverless limits (certificate and receipt PDFs rendered in a child process, bulk imports, large geospatial processing).
- The database connection ceiling becomes a problem (Prisma is limited to a small `connection_limit` on Vercel).
- Push notifications or queues are needed (device tokens, APNs/FCM senders, retries).
- The API needs to be deployed and scaled separately from the web app.
- More than one client (web, mobile, partners) needs a stable, versioned, documented API.

Do **not** start only because "NestJS is nicer". The cost is a second deployment to run and monitor.

### Stage 1 to stage 2 (NestJS to Go)

Start only when **measured** evidence exists, such as:

- A specific service is CPU or memory bound and the cost of running it in Node is significant.
- Very high concurrency (for example live map streams or heavy geospatial work) where Go is clearly better.
- The team decides it wants Go and accepts the cost of a full rewrite and a second language.

Go moves area by area. Heavy, isolated services (geospatial processing, PDF generation, notification fan-out) are the natural first candidates, not auth or payments.

## 5. Stage 0 work that supports every later stage

The mobile-specific pre-work (bearer-token auth, device sessions, search and map gaps) is in [`../mobile/roadmap.md`](../mobile/roadmap.md). The backend-wide items are:

1. **OpenAPI spec** for the mobile-facing routes first (§2.2), then the rest.
2. **Shared packages:** extract the Prisma client, shared types and a geo utility (`EPSG:26331/26332`) out of the Next.js app, so a second service and the mobile app can import them.
3. **Move PDF generation behind a service function** with a clean input and output, so it can later run as a job in NestJS or Go without touching the page code.
4. **Make routes thin** wherever business logic still sits in a route handler (§2.3).
5. **Native-client auth is a backend contract.** Whatever the mobile work adds (token format, refresh rules, device sessions), a later backend must implement the same, so write it down in [`../auth/`](../auth/) when it is built.

## 6. NestJS notes (stage 1)

- **Why NestJS:** TypeScript end to end, keeps Prisma and the service layer, built-in validation (DTOs), guards for auth and subscription checks, and OpenAPI generated from code. Fixed conventions also make AI-assisted code more predictable.
- **Shape:** a monorepo (`apps/web` Next.js, `apps/api` NestJS, `packages/db`, `packages/shared`). The Fastify adapter is an option if throughput matters.
- **Auth:** reuse the existing JWT format and refresh-token table, so web and mobile sessions work against either backend during the move.
- **Hosting:** a long-running server (not Vercel functions). Decide the host (Railway, Fly, AWS or similar), logging, health checks and database pooling before the first route moves.
- **Queues:** add a queue (for example BullMQ on Redis) only when a trigger in §4 needs it.

## 7. Go notes (stage 2)

- **Reuse nothing but the contract and the database.** The OpenAPI spec, contract tests and Postgres schema are the only things that carry over.
- **Likely stack:** a standard-library or lightweight router, `pgx` with `sqlc` for typed queries, and the same JWT and refresh-token rules. Decide migrations (§2.5) before the first service writes data.
- **Port business rules with their tests,** especially money and idempotency ([`../payment/`](../payment/)). A line-by-line port of the tests is the safety net.

## 8. Risks

| Risk                                      | Mitigation                                                                                         |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------- |
| Two backends drift and answer differently | Contract tests and shadow traffic run in CI for every moved route.                                 |
| A payment or webhook bug during a move    | Payments and webhooks move last. The existing money tests must pass against the new service first. |
| Schema changes from two services          | One migration owner at a time (§2.5).                                                              |
| Auth sessions break during a switch       | Keep one token format and one refresh-token table across backends.                                 |
| The rewrite never finishes                | Each stage is optional and gated. The system works at every point.                                 |
| Mobile app depends on web-only behaviour  | Stage 0 bearer auth and the OpenAPI spec make the contract explicit.                               |

## 9. Related documents

- [`../mobile/roadmap.md`](../mobile/roadmap.md): what the mobile app needs from the backend at each stage.
- [`../mobile/surfboard-mobile-app-evaluation.md`](../mobile/surfboard-mobile-app-evaluation.md): what the mobile app needs and what the backend already has.
- [`../mobile/surfboard-mobile-feasibility.md`](../mobile/surfboard-mobile-feasibility.md): the original backend-readiness analysis.
- [`../auth/`](../auth/): the session and token system any new backend must match.
- [`../payment/`](../payment/): the payment and webhook rules that move unchanged.
- [`../functions/`](../functions/): the service layer that stage 1 reuses and stage 2 ports.
- [`../development-history/route-inventory.md`](../development-history/route-inventory.md): the full list of routes (267 API routes at the last count).
