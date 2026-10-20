# Mobile app roadmap: what the app needs from the backend, stage by stage

> **Status: future plan, not a commitment. Stage 0 has started (2026-10-19):** native auth is built (PR #495) and the app foundation is in the `TwoNode/twonode-mobile` repo; progress is tracked in [TASK-0015](../tasks/0015-mobile-app-and-api.md). This is the mobile side of [`../backend/roadmap.md`](../backend/roadmap.md) (Next.js now, NestJS later, Go much later). It says what the app needs at each backend stage and how the app stays independent of which backend answers. The product scope and the backend gaps are in [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md).

## 1. The one rule: the app knows a contract, not a backend

The app calls one base URL and the `/api/v1/*` contract (JSON shape, status codes, error codes). Moving the API from Next.js to NestJS to Go must not need an app release. Everything below follows from that.

App-side rules, from day one:

1. **Generate the API client from the OpenAPI spec** ([`../backend/roadmap.md`](../backend/roadmap.md) §2.2), not hand-written fetch calls.
2. **One configurable base URL.** No hard-coded hosts, and no paths that only exist in Next.js.
3. **Tolerant parsing.** Ignore unknown fields; never depend on undocumented ones.
4. **Send `X-App-Version`** so the server can refuse versions it no longer supports.
5. **Keep tokens in the Keychain/Keystore** and follow the documented refresh rules ([`../auth/`](../auth/)). The token format and refresh rules stay the same across every backend.

## 2. Stage 0: the Next.js API (the app's first backend)

The mobile MVP runs on the existing API. The work is additive and does not change the web. From [the evaluation](./surfboard-mobile-app-evaluation.md) (§3 and §4.6):

| Need                                   | What to build                                                                                                                                                                                                                                                                                       |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Native auth** (the one hard blocker) | `POST /api/v1/auth/mobile/login`, `.../refresh`, `.../logout`; a bearer branch in the session code; bearer-aware CSRF; handling for the 30 s refresh re-presentation window; mobile-safe rate-limit keys (not IP-only); an email-verification (OTP) screen; per-device sessions that can be revoked |
| **Version gate**                       | `X-App-Version` header with a server-side minimum                                                                                                                                                                                                                                                   |
| **Search gaps**                        | Locality and LGA search on the plans list                                                                                                                                                                                                                                                           |
| **Address search**                     | A geocoding provider (a product and licensing decision)                                                                                                                                                                                                                                             |
| **Map browsing**                       | A lightweight own-plans map endpoint (`id`, `planNumber`, `status`, simplified geometry, centroid); a viewport or "near me" endpoint only if the brief grows to need it                                                                                                                             |
| **Derived status**                     | One shared `displayStatus` for batch and plan rows, used by web and mobile                                                                                                                                                                                                                          |
| **Push notifications**                 | Device-token table and APNs/FCM senders. This is also a **trigger for stage 1** (see §3)                                                                                                                                                                                                            |

The app phases (0 to 4: accounts and decisions, auth and profile, records and stats, map home, push and extras) are in the [evaluation §5.2](./surfboard-mobile-app-evaluation.md); the detailed task list is [TASK-0015](../tasks/0015-mobile-app-and-api.md).

**Progress on stage 0 (2026-10-19):** built: native auth (mobile login, refresh and logout, device sessions, bearer-aware CSRF, per-email and per-device rate limits, app roles limited to `USER`). Also built (#500): the lean plan list with locality, LGA, ward, LCDA and pillar search, the shared `displayStatus`, the Queried and Ready counts, and the batch summaries. Also built (#501): the lean plan detail (`plans/{planId}/summary`) and the shared-viewer fix (the record copy is the owner's). The app's Plans and Records screens use these routes (app PR #6, in review, 2026-10-20). Not yet built: email-verification and reset-link handling for the app, Google (Android) and Apple (iOS) sign-in, the version gate, an OpenAPI spec, the own-plans map endpoint, push.

## 3. Stage 1: NestJS

What the mobile app gains: **push and queues** (retries, fan-out), a **generated OpenAPI client** that is always in sync, and an API that scales on its own, separately from the website.

What the app must do: **nothing.** Each route moves behind the same URL by a rewrite ([`../backend/roadmap.md`](../backend/roadmap.md) §3). Check before each route moves:

- the mobile contract tests pass against the new service;
- the minimum-version gate still works;
- tokens issued by one backend are accepted by the other during the move.

## 4. Stage 2: Go

The app is unaffected for the same reason. The likely first Go candidates are the ones the app drives hardest: **map and viewport queries** (spatial work) and **notification fan-out**. Auth and payments move last.

## 5. Not decided yet

- Which map and geocoding providers to use (licensing is a risk today; see the evaluation §4.4).
- Whether the app gets any offline reads. The brief does not ask for them.
- Whether physical-copy submission needs an active subscription on mobile (evaluation §4.7).

## 6. Related

- [`../backend/roadmap.md`](../backend/roadmap.md): the backend order, gates and the move pattern.
- [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md) and [`surfboard-mobile-feasibility.md`](./surfboard-mobile-feasibility.md): the product scope and backend readiness.
- [`../future-plans.md`](../future-plans.md): every future plan in one place.
