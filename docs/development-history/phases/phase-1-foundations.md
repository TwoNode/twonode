# Phase: Architecture Rebuild Phase 1 — Foundations

**Status:** Complete — Steps 1-12 of 12 done and verified. **Date:** 2026-08-23 through 2026-08-26. Branch stays on `rebuild/foundations` pending review; not merged to `main`.

## Why

Foundations phase: build the shared plumbing (structured API layer, native auth, one Surfboard route/access registry as a pilot) that every later phase — Surfboard, REVA, GBC — will build on and mirror, per `MDs/ARCHITECTURE_REBUILD_PROPOSAL.md`. Done in an isolated git worktree (`../twonodes-rebuild`, branch `rebuild/foundations`) so nothing here touches `main` or disturbs `rebuild/housekeeping`.

## What was built

### Step 1-2 — Worktree + Prisma schema split
`prisma/schema.prisma` (1,146 lines) split into `prisma/schema/{core,gis,reva,surfboard,gbc}.prisma`. Needed an added `prisma.config.ts` not in the original plan — this Prisma version (6.19) doesn't auto-discover a multi-file schema folder without one. Verified every model present on the regenerated client; `tsc`/`build` both clean.

### Step 3 — `lib/api/` shared plumbing
`withAuth`, `pagination`, `errors` (full `ApiError` hierarchy + `handleApiError`, ~30-code Prisma error table ported from Surfboard's existing `prismaErrorHandler.ts`), `validate`, `types` — modeled directly on proplity's own already-proven equivalents.

### Step 4-5 — `lib/auth/` native auth primitives + schema
`jwt`, `cookies`, `csrf`, `rateLimit`, `session`. Cookie names are **platform-suffixed** (`access_token_reva`, `access_token_surfboard`, ...) rather than proplity's fixed pair — a deliberate deviation to preserve this codebase's existing simultaneous-multi-platform-login capability (the `USER_SESSION` cookie's `platforms` map does the same job today).

Schema additions: `passwordHash`/`authProviders` (`AuthProvider[]`) added directly onto `RevaUser`/`SurfboardUser`/`GBCUser` — no separate identity table, unlike the alternative `better-auth`-library approach evaluated later (see Step 7). Shared `RefreshToken` (rotating, `familyId`-based reuse/theft detection) and `LoginAttempt` (DB-backed rate limiting) models added to `core.prisma`. `RefreshToken.platform` is a plain `String` validated against the existing canonical `utils/platform.ts` enum, not a second Prisma enum with different casing.

### Step 6 — Native auth routes
`app/api/v1/auth/{register,login,refresh,logout,me,change-password}/route.ts`. Role is never accepted from the client on registration — always the lowest-privilege value, since these are public routes. All 6 verified live against a local Postgres db, including the two hardest security properties: refresh-token replay produces family-wide revocation, and a role-escalation attempt on registration is rejected.

### Step 7 — Kinde callback dual-write
Before building this, evaluated a rediscovered prior attempt at the same problem: a stale (~2 months behind `main`) `better-auth` branch using the `better-auth` npm library with a separate identity table (`authUserId` link). It independently arrived at the same "bridge onto the legacy cookie, don't touch `proxy.ts`'s downstream logic" shape proposed here — which confirmed the approach rather than changing direction. Decision: keep the native hand-rolled auth (already built and verified, matches the original brief to mirror proplity's patterns), reuse the bridge pattern.

All 7 *live* Kinde callback routes (`reva`, `reva-restricted`, `surfboard`, `surf-restricted`, `surf-mda`, `gbc-restricted`, `scram`) now additionally mint a native session via a shared `issueSession()` helper (extracted out of `/login` so both entry points mint identically), alongside the existing `USER_SESSION` cookie they've always set. `issueSession()` failures are caught and logged, never allowed to break the working Kinde path. `gbc/_route.ts` (underscore-prefixed, inert, never routed by Next.js) is left alone — a pre-existing, separately-flagged decision, not part of this step.

`AuthProvider.PASSWORD` renamed to `AuthProvider.NATIVE` shortly after, to match the vocabulary already used everywhere else (`createNativeUser`, `NativeAuthUser`).

### Step 8 — Surfboard route/access registry pilot
`surfboard/access/routes.ts` — one array of `{path, label, icon, roles, group}` entries covering Surfboard's admin + QR-earnings routes, plus `canAccessRoute()`/`getNavItemsForRole()` helpers, replacing the hardcoded nav array in `surfboardAdminPanelLayout.tsx` (now deleted) that had already drifted from reality once this session (the missing-nav-entry bug fixed under TC-003, before this rebuild started).

`components/admin-panel/DashboardShell.tsx` — data-driven shell reading nav from the registry via `role`/`group` props. Caught and fixed a real bug via live verification, not assumption: `LucideIcon` component references can't be passed as props from a Server Component to a Client Component (React: "Functions cannot be passed directly to Client Components"). The shell originally received pre-resolved `navItems` (icon references included) computed in the server-side layout; fixed by having `DashboardShell` resolve nav itself, client-side, from plain serializable `role`/`group` strings.

### Step 9 — QR Earnings module migration

`surfboard/services/qrEarningsService.ts` extracted from `app/(projects)/(surfboard)/actions/qrEarningsActions.ts` (now deleted), plus the KYC bank-verification functions (`getSurveyorsForKyc`, `toggleBankVerification`) migrated in from `settingsActions.ts` — same subsystem (`SurveyorBankDetails`). Pure Prisma, no `"use server"`/`next/cache`, throws `NotFoundError`/`ValidationError` instead of the old `{success:false, error}` return shape.

8 new routes under `app/api/v1/surfboard/{qr,admin}/*`: 3 public (`access-state`, `payments`, `payments/verify` — the payer is never a logged-in user), 5 authenticated (`earnings-overview`, `bank-details`, `withdrawals`, `settings`, `admin/kyc`). `settings` (SUPERADMIN-only read) was added beyond the original 5-route plan once it became clear the admin settings page reads `getQREarningsSettings()` standalone. `surfboard/apiClient.ts` is the typed `ApiResult<T>` client every consuming component now calls (`QRPaywallModal`, `PublicSurfPlan`, the QR-earnings dashboard, surveyor settings, KYC admin).

Real behavior improvement, not just a refactor: the old actions required a live Kinde session and rejected native-login-only users outright; the new routes use the native JWT session from Step 6/7 and work for both auth paths. Verified live end-to-end: full public paywall flow through to wallet credit and `PAID_ACTIVE` resolution, CSRF rejection on mutating routes, withdrawal validation, SUPERADMIN-only 403 on the KYC/settings routes — test data cleaned up after. Commit `04eb9a6`.

**A real, live-exploitable vulnerability was found and fixed during this migration** (not part of the original Step 9 scope, discovered during a later gap-audit pass): `verifyQRServicePayment` never actually called Paystack to confirm a payment — it trusted a client-supplied `reference`/`paystackRef` unconditionally, and `initiateQRServicePayment` hands out a valid reference for free before any payment happens. Anyone could initiate then immediately verify without paying, getting free paywall access and fraudulently crediting real, withdrawable money into the surveyor's wallet. Fixed on `main` first as a live hotfix (`db9ade5`, outside this branch — see `docs/development-history/progress.md`'s "Live hotfixes" section) since it affected production immediately, then ported into this branch's already-migrated copy (`7ee2e21`) so the migration doesn't reintroduce it on merge. A second bug the fix surfaced along the way — `PAYSTACK_SECRET_KEY` cached from an `async` function at module scope without awaiting, silently sending `"Bearer [object Promise]"` as every Paystack `Authorization` header in the file — was fixed in the same pass.

### Step 10 — First vitest suite

`vitest` + `@vitest/coverage-v8` installed (`package.json` gained `test`/`test:watch`/`test:coverage`; `vitest.config.mts` mirrors `tsconfig.json`'s `@/*` alias). `surfboard/services/__tests__/qrEarningsService.test.ts` (31 cases, Prisma/Paystack/notifications/email all mocked, nothing touches a real database or Paystack) covers fee math and access-state transitions, but is weighted toward `verifyQRServicePayment`'s Paystack-verification path specifically — regression cases assert an abandoned/underpaid/HTTP-failed Paystack response is rejected and never credits the wallet, and that only a confirmed matching payment does, directly guarding the vulnerability above against reintroduction.

Also converted the pre-existing `app/(projects)/(surfboard)/utils/__tests__/prismaErrorHandler.test.ts` — previously a manual `console.log` script, never run by any build/CI step, and asserting two expectations the code doesn't actually produce (P2002/P2025 both hit the `PRISMA_ERROR_MESSAGES` table before reaching the switch-statement branches the old script expected) — into real vitest assertions matching the function's actual behavior.

### Step 11 — Error observability (§6.6 resolved: structured logging, no external service)

`lib/observability/logger.ts` emits one structured JSON line per event to stdout/stderr — no new account, no cost, works with whatever the hosting platform already collects. Wired into the single choke point every API route's error path already funnels through, `handleApiError` (directly, or via `withAuth`'s catch), so no individual route needed its own logging code: `withAuth` and the 9 routes that call `handleApiError` directly now just pass `{route, method[, userId, role, platform]}` as context.

4xx `ApiError`s (validation, not-found, unauthenticated, forbidden) log at `warn` — expected control flow, not incidents, so they don't drown out real problems. Prisma errors and anything unexpected log at `error` with the full stack attached. Swapping in Sentry later means changing `logger.ts`'s `emit()` function, not rewriting call sites. Verified live (`next dev --webpack`, local Postgres): hit `/api/v1/auth/me`, `qr/payments/verify`, and `qr/earnings-overview` unauthenticated / with a bad reference, confirmed correctly-shaped JSON log lines with route/method/code/status for each. `lib/api/__tests__/errors.test.ts` (5 cases) covers the warn-vs-error level selection.

### Step 12 — Final verification pass + this report

Full-repo `npm run build` (Turbopack, local Postgres) completes clean end-to-end across all three products, including `postbuild` sitemap generation — the only console output is the pre-existing, expected "Dynamic server usage / Not Authenticated" noise from Next attempting to statically prerender cookie-gated dashboard routes before correctly falling back to dynamic (`ƒ`), same behavior as before this phase. `tsc --noEmit` clean. 45/45 vitest passing (`qrEarningsService.test.ts` ×31, `errors.test.ts` ×5, `prismaErrorHandler.test.ts` ×9).

## Judgment calls made without an explicit answer on file

- **§6.1 (shared vs. per-product `RefreshToken` table)** and **§6.3 (can Kinde + password link to one account)** — both defaulted to the proposal's stated fallback (shared table; additive linking) since neither was explicitly answered. Flag if either default is wrong — `authProviders` being an array rather than a single enum value is what makes additive linking possible later without a schema change.
- **Step 7 dual-write vs. full cutover** — dual-write chosen explicitly over rewriting `proxy.ts` and its ~20 downstream consumers in the same step; full cutover would have pulled Phase 2's registry work forward, unplanned and unverified in one shot.

## Verification performed

Every step verified live, not just `tsc`/`build`:

- Schema: direct `psql` inspection of resulting tables/columns against a local Postgres db (`twonodes_dev`).
- Native auth routes: all 6 exercised live, including refresh-token reuse detection and registration role-escalation resistance.
- Kinde dual-write: a temporary test route confirmed both cookies land on one response, the native token resolves via `GET /api/v1/auth/me`, and a `RefreshToken` row is created — cleaned up after.
- Registry + shell: a real headless-browser render (Playwright/chromium, installed temporarily via `--no-save`, fully removed after — confirmed no `package-lock.json` drift) confirmed ADMIN sees the full admin nav minus "Audit Logs", SUPERADMIN sees it plus "Audit Logs", USER sees neither.
- One real infrastructure near-miss caught mid-phase: the worktree's `.env` (symlinked from the main checkout) pointed at a **remote** database on the same RDS host as the leaked credential from Phase 0, not the intended local one. Caught before any verification writes landed there; the worktree now has its own real (non-symlinked) `.env` pointed at `twonodes_dev`, isolating all further Phase 1 verification from any remote infrastructure.

## Next up

Phase 1 is complete. Not yet done, deliberately deferred to later phases:

- Full retirement of the legacy `USER_SESSION` cookie and `proxy.ts`'s hand-rolled path matching — Phase 2's registry work is what actually needs to touch `proxy.ts`, so Phase 1 only dual-writes alongside it.
- MDA route/nav registry extension (Surfboard's 8 collapsed sub-roles) — confirmed real gap, scoped into Phase 2.
- REVA has a milder version of the same unfiltered-nav pattern the Surfboard registry fixed — noted for Phase 3, lower urgency (only 2 roles share one route tree).
- `docs/development-history/implementation-plan.md` and `docs/development-history/progress.md` both already carry the fuller Phase 2-4 scope additions made alongside this phase (analytics dashboards, GBC multi-edition support) — see those documents for what's next.

Recommended next step: full route-by-route spec for Phase 2 (Surfboard), required before any Phase 2 execution begins per the plan's own sequencing rule.
