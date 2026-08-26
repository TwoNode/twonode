# Twonodes — Architecture Rebuild: Full Step-by-Step Plan

> Companion to `docs/architecture-rebuild/progress.md`. This is the executable, file-by-file version of `MDs/ARCHITECTURE_REBUILD_PROPOSAL.md`, which stays the source of truth for *why* — this document is only the *how* and *in what order*.

## Context

Grounded against the real repo as of this writing, not assumed from the proposal:

1. **Working tree is clean** except `MDs/ARCHITECTURE_REBUILD_PROPOSAL.md` itself (untracked). No in-flight uncommitted work to close out first, unlike a typical mid-project checkpoint — this plan starts from a known-clean baseline. Current branch: `main`.
2. **No `docs/architecture-rebuild/` directory existed before this file.** This mirrors proplity's own `out/` convention: one master plan, one rolling `progress.md`, and a `phases/` folder that fills in with one completion report per phase *as each phase actually ships* — not written in advance.
3. Every file path, line count, and model name below was confirmed by reading the actual files during the architecture review this plan is based on (see `MDs/ARCHITECTURE_REBUILD_PROPOSAL.md` §2 for the full inventory with citations) — nothing here is inferred from the proposal's prose alone.
4. Five open decisions in the proposal (§6) affect specific steps below. Where a step depends on one, it's called out inline; those steps block on your answer, everything else doesn't.

---

## Phase 0 — Housekeeping

**Where:** its own short-lived branch, `rebuild/housekeeping`, off `main` — never a direct commit to `main` (per proposal §6.5, resolved: `main` stays reserved for the duration of this rebuild). Merged via review before Phase 1 starts. Pure deletions/rotations — nothing here depends on any architecture decision.

### Step 0 — Branch
```
git checkout -b rebuild/housekeeping
```

### Step 1 — Rotate the leaked credential
`test.js:4` has a plaintext production Postgres URL (`postgresql://postgres:reva15p0stgres@revadb.cp284ay4ki61.eu-north-1.rds.amazonaws.com:5432/reva`). This is an action on you, not code: rotate the `postgres` user's password on that RDS instance, update every place the real connection string is configured (Vercel env vars, local `.env` files, anywhere else it's set), confirm the app still connects with the new password, *then* proceed to Step 2. Deleting the file first without rotating leaves the old password valid and exposed in git history regardless.

**Separate decision, not part of this phase's critical path:** the string stays in git history forever unless history is rewritten (`git filter-repo` or BFG). That's a destructive, force-push-requiring operation on shared history — flagging it here but not doing it as part of this plan; tell me explicitly if you want that done, and we'll treat it as its own reviewed step.

### Step 2 — Delete `test.js`
```
git rm test.js
```

### Step 3 — Remove `sequelize/` and `mongoose`
```
git rm -r sequelize/
npm uninstall mongoose   # or pnpm remove mongoose — confirm which lockfile is authoritative first (both package-lock.json and pnpm-lock.yaml exist today)
```

### Step 4 — Delete confirmed-dead Surfboard files
```
git rm "app/(projects)/(surfboard)/actions/certificateActions.ts"
git rm -r "app/(projects)/(surfboard)/adminActions/"
git rm "app/api/webhooks/paystack/route___.ts"
```
(`adminActions/surfboardAdminActions.ts` was confirmed zero-importers repo-wide; removing the whole directory since nothing else lives there.)

### Step 5 — Remove empty/orphaned route folders
These are already git-untracked (confirmed empty, no `route.ts`), so this is a local cleanup, not a `git rm`:
```
rm -rf app/api/reva/onetimerequest app/api/reva/verify-payment
rm -rf "app/api/surfboard/batches" "app/api/surfboard/update-record-copy" "app/api/surfboard/users"
rm -rf app/api/twonodes app/api/user
```

### Step 6 — Verify
```
npx tsc --noEmit
npm run build
```
Both must be clean before committing — these are pure deletions, so any failure here means something was still importing one of the removed files and needs a closer look before proceeding, not a reflexive revert.

### Step 7 — Commit, push, and open for review
One commit (all deletions, low risk, easy to review as a unit):
```
git add -A
git commit -m "chore: remove dead code, unused deps, and orphaned route scaffolding"
git push origin rebuild/housekeeping
```
Open a PR into `main` and merge only after review — `main` is not pushed to directly at any point in this rebuild.

---

## Phase 1 — Foundations

**Where:** isolated worktree (per proposal §6.5/your instruction).

**Blocks on:** open decision §6.1 (shared vs. per-product `RefreshToken` table) before Step 5; §6.3 (can Kinde + password link to one account) before Step 5; §6.6 (which error-observability option) before Step 10 wires it in — Step 10 can proceed without it and get the hook added later.

### Step 1 — Create the worktree
```
git worktree add ../twonodes-rebuild -b rebuild/foundations
cd ../twonodes-rebuild
```

### Step 2 — Split `prisma/schema.prisma`
Create `prisma/schema/` and move models into domain files by exact current line ranges (from the 1,146-line file as read):

| New file | Models |
|---|---|
| `core.prisma` | `generator`/`datasource` blocks, `Notification`, `NotificationType`, `NotificationAudience`, `WebhookEvent` |
| `gis.prisma` | `nigeria_ward_admin_boundaries`, `Scale_of_fees`, `spatial_ref_sys`, `LASG_charting_interpretation` |
| `reva.prisma` | `Property`, `OneTimeUserProperty`, `RevaUser`, `Role` (rename to `RevaRole` if it collides with a new shared `Role` — see Step 5) |
| `surfboard.prisma` | `SurfboardUser`, `SurfboardRole`, `SurfboardPlan`, `SurfboardPlanStatus`, `SurfboardRedCopyStatus`, `Subscription`, `SubscriptionHistory`, `SurfboardNotification`(+enums), `LGAFeeConfig`, `CertificateOfDepositBatch`, `ApprovalStatus`, `BatchPaymentStatus`, `SurfboardSettings`, `QREarningsTransaction`, `QRServiceType`, `SurveyorWallet`, `SurveyorBankDetails`, `WithdrawalRequest`, `WithdrawalStatus`, `SurfboardAuditLog`, `PayerIDType` |
| `gbc.prisma` | every `GBC*` model and enum (`GBCUser` through `GBCAuditLog`) |

Delete `prisma/schema.prisma`, delete the `output` path collision if any. Prisma's multi-file schema support needs no preview flag on `prisma ^6.7` (confirmed: this is the exact structure proplity runs on `prisma ^7.9` with no flag).

**Verify:**
```
npx prisma validate
npx prisma generate
```
Zero errors, generated client identical in shape to before (same models, same fields — this step is pure reorganization, confirm with a diff of `prisma/generated/` if anything looks different).

### Step 3 — `lib/api/` shared plumbing
Four files, modeled directly on proplity's own (already proven in production there), extended with the domain-error hierarchy from proposal §4.7:

- **`lib/api/withAuth.ts`** — `withAuth(handler, opts?: { roles?: Role[]; platform: Platform })`, 401 if no session, 403 if role mismatch.
- **`lib/api/pagination.ts`** — `parsePagination(searchParams)` → `{skip, take, page, limit}` (limit capped 100); `buildMeta(total, page, limit)` → `{total, page, limit, hasMore}`.
- **`lib/api/errors.ts`** — `ApiError` base class + `ValidationError`/`UnauthenticatedError`/`ForbiddenError`/`NotFoundError`/`ConflictError`/`RateLimitError` subclasses, `handleApiError(err)` (full code in proposal §4.7).
- **`lib/api/validate.ts`** — `validateBody(req, zodSchema)`, centralizing the parse-and-400 pattern.

**Verify:** `npx tsc --noEmit` clean. No live route to smoke-test against yet — real verification happens in Step 9 when the QR Earnings pilot consumes all four (same sequencing proplity used for its own Phase 0).

### Step 4 — `lib/auth/` native auth primitives
- **`lib/auth/jwt.ts`** — `signAccessToken({sub, role, platform})` / `verifyToken(token)`, `jose`, 15min expiry, throws if `JWT_SECRET` unset in production.
- **`lib/auth/cookies.ts`** — `setAuthCookies(access, refresh, maxAge)` / `clearAuthCookies()`. Access token cookie path `/`; refresh token cookie path scoped to `/api/v1/auth/refresh` only.
- **`lib/auth/csrf.ts`** — `validateCSRF(req)`, Origin/Referer header check.
- **`lib/auth/rateLimit.ts`** — `checkRateLimit(identifier)` / `recordAttempt(identifier, userId?)`, DB-backed (new `LoginAttempt`-style model in `core.prisma`).
- **`lib/auth/session.ts`** — `getServerSession(platform)` reading the `access_token` cookie.

### Step 5 — Schema additions for native auth *(blocks on §6.1, §6.3)*
Per-product `User` models (`RevaUser`, `SurfboardUser`, `GBCUser`) each get:
```prisma
passwordHash   String?
authProviders  AuthProvider[] @default([KINDE])
```
New shared model in `core.prisma` (default per §6.1 — one table, `platform` discriminator, unless you said otherwise):
```prisma
enum AuthProvider { KINDE PASSWORD }
enum Platform { REVA SURFBOARD GBC }

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  platform   Platform
  tokenHash  String    @unique
  familyId   String
  revokedAt  DateTime?
  replacedBy String?
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  @@index([familyId])
}
```
**Verify:** `npx prisma generate`, `npx prisma db push` against a dev database (not prod) — **not** `migrate dev`. The committed `prisma/migrations/` history stops mid-2025 and is missing most of the current schema, confirming `db push` (matching `package.json`'s `prisma:push` script) has been this project's actual workflow for a long time, not migration-file tracking. Using `migrate dev` against a fresh database would try to replay that stale, incomplete history instead of just syncing the current schema.

### Step 6 — Native auth routes
`app/api/v1/auth/{register,login,refresh,logout,me,change-password}/route.ts` — same shape as proplity's own (already read in full: bcrypt cost 12, rate-limited, CSRF-checked, refresh rotation with reuse-detection via the `familyId`/`revokedAt`/`replacedBy` fields from Step 5), adapted to accept a `platform` field so one set of routes serves all three products against the shared `RefreshToken` table.

### Step 7 — Converge Kinde's callback onto the new session
Update `app/api/auth/success/{platform}/route.ts` (all 8: reva, reva-restricted, surfboard, surf-restricted, surf-mda, gbc, gbc-restricted, scram): after the existing find-or-create-user logic, replace the `setEncryptedUserCookie(...)` call with `issueSession(user.id, platform)` — mints the same access+refresh pair Step 6's `/login` mints, so `withAuth` never has to know whether the user arrived via Kinde or via native login.

**Verify:** manual login pass through both paths (Kinde social login on one test platform, native register+login) confirming both land on a working session and `GET /api/v1/auth/me` returns the right user either way.

### Step 8 — Route/access registry pilot
- `surfboard/access/routes.ts` — the registry pattern from proposal §4.8, scoped to Surfboard's admin+QR-earnings routes only for now (not the full MDA tree yet — that's Phase 2).
- `components/admin-panel/DashboardShell.tsx` — one shell component, `{product, role}` props, reads nav from a passed-in registry.

### Step 9 — Pilot migration: QR Earnings module
The module debugged and fixed earlier this session — small, self-contained, behavior well understood, easiest to verify against for zero regression.

- `surfboard/services/qrEarningsService.ts` — the business logic currently in `qrEarningsActions.ts` (`getQREarningsSettings`, `getPlanQRAccessState`, `initiateQRServicePayment`, `verifyQRServicePayment`, `saveSurveyorBankDetails`, `requestWithdrawal`), Prisma calls only, no `"use server"`, no Next imports.
- `app/api/v1/surfboard/qr/access-state/route.ts` (`GET`), `app/api/v1/surfboard/qr/payments/route.ts` (`POST` initiate), `app/api/v1/surfboard/qr/payments/verify/route.ts` (`POST` verify), `app/api/v1/surfboard/qr/bank-details/route.ts` (`POST`), `app/api/v1/surfboard/qr/withdrawals/route.ts` (`POST`) — thin, call into the service, wrapped in `handleApiError`.
- `surfboard/apiClient.ts` — typed client for the five endpoints above.
- Update `QRPaywallModal.tsx`, `PublicSurfPlan.tsx` (the "Unlock Certificate" flow fixed earlier this session), and `SurveyorProfileSettings.tsx`'s bank form to call `surfboardApi.qr.*` instead of importing the server actions directly.
- Also migrate the KYC admin page's `toggleBankVerification`/`getSurveyorsForKyc` (added this session) into the same service + a `app/api/v1/surfboard/admin/kyc/route.ts`, since it's the same subsystem.

### Step 10 — Verify Phase 1 end-to-end
- `npx tsc --noEmit`, `npm run build` — clean.
- Live manual pass repeating exactly the flows debugged this session: paywall purchase for both services, access-code redemption, the "Unlock Certificate" price-from-settings fix, the popover z-index fix, bank details save + admin verify toggle. Zero behavior difference from pre-migration is the bar, not "looks right."
- First real vitest suite: `surfboard/services/__tests__/qrEarningsService.test.ts` — extends the one existing test file's pattern (`prismaErrorHandler.test.ts`) to the new service layer.

### Step 11 — Wire in error observability *(if §6.6 landed on Sentry)*
`npx @sentry/wizard@latest -i nextjs`, then one line in `lib/api/errors.ts`'s `handleApiError` before the generic-500 fallback: `Sentry.captureException(err)`.

### Step 12 — Commit
Stays on `rebuild/foundations` for your review — not merged to `main` yet (confirm if you want per-phase merges instead of one review at the end of Phase 1). Write the completion report to `docs/architecture-rebuild/phases/phase-1-foundations.md` once this step's verification is actually done, following the proplity phase-report format (Status/Date, What was built, any real judgment calls hit during implementation, Verification performed, Next up).

---

## Phase 2 — Surfboard (full migration)

Everything not already moved in Phase 1's pilot. Full per-route Zod-schema-level detail gets written into `docs/architecture-rebuild/phases/phase-2-surfboard.md` *before this phase starts executing* (not now) — once Phase 1's real patterns exist to mirror exactly, the same sequencing proplity used for its own later phases. What's already certain:

**Service extraction from `codActions.ts`** (~5,700 lines) into `surfboard/services/`:
- `planLockService.ts` — `acquirePlanLock`/`releasePlanLock`/`canWorkOnPlan`, the FIFO-gated optimistic locking.
- `codFeeService.ts` — `getZoneFromGeometry`/`calculatePlanFeeByZone`, the PostGIS `ST_Intersects` zone lookup.
- `remitaVerificationService.ts` — the two-link Remita/LASG receipt parsing and cross-validation.
- `batchApprovalService.ts` — the accounts→charting→surcon→recordsI→intake→recordsII chain, `checkAndDispatchQueries`, query/resubmission.

**Service extraction from `surfboardActions.ts`** (~3,700 lines) into `surfboard/services/planService.ts` — plan CRUD, AI-extraction-assisted creation.

**New: role/platform-scoped analytics dashboards** *(added 2026-08-24)*. Confirmed feasible against the real schema — `SurfboardPlan.facilitator`, `.lga`, `.dateLodged`, `.dateOnSurveyPlan` all already exist, no schema changes needed here. One correction while scoping it: "provisional" isn't a plan *status* — `SurfboardPlanStatus` is only `PENDING`/`LODGED`/`QUERIED`/`UNDER_REVIEW`. It's a value of the free-text `planType` field (`PROVISIONAL`/`PROVISIONAL_LAYOUT`), confirmed via real usage in `surfboardActions.ts`. "Pending certificates" needs a decision before building: does it mean `CertificateOfDepositBatch` rows not yet `paymentStatus: COMPLETED`, or individual plans whose `redCopyStatus` isn't yet `APPROVED`? Different query, different number — flagged, not guessed.

`surfboard/services/analyticsService.ts`:
- Stat cards: provisional plan count (`planType IN ('PROVISIONAL','PROVISIONAL_LAYOUT')`), pending-certificate count (pending the decision above).
- Dynamic line/bar chart with a dimension selector — "Facilitator vs Number of Records" (`GROUP BY facilitator`), "LGA vs Number of Records" (`GROUP BY lga`). Same query shape, different `GROUP BY` column — one endpoint, a `dimension` param, not two.
- Lodgement trend: `dateLodged - dateOnSurveyPlan` in days per plan, then a histogram/trend of how many records took each day-count to lodge — needs both dates present, so plans missing either get excluded and the excluded count should show alongside the chart (silently dropping them would misrepresent the trend).

**Role/platform scoping, not identical everywhere**:
- Surfboard admin/superadmin: full-population analytics as described above.
- Surfboard MDA sub-roles (Accounts, Charting, SURCON, Records I/II, Intake, Archive): scoped to their own stage — e.g. average time a plan sits at *their* stage, records *they've* processed — not the global lodgement trend, which isn't their job to optimize.
- Surfboard surveyor (user dashboard): the same shapes, scoped to their own plans only — their facilitator/LGA breakdown, their own lodgement trend, not the whole platform's.
- REVA and GBC get the same *concept* (dynamic, role-scoped charts backed by real service-layer queries) in their own Phase 3/4 work, with their own domain-appropriate dimensions (REVA: requests by LGA, submission-to-report-ready trend; GBC: ticket sales by tier over time, per-edition once the edition tagging above lands) — not Surfboard's facilitator/lodgement vocabulary forced onto products that don't have those concepts.

Chart library: none exists in the codebase yet — needs picking before this is built (not decided here).

**Route/nav registry**, extended from Phase 1's pilot scope to the full product: every `surf-restricted/dashboard/*` and `surf-mda/dashboard/{role}/*` route added to `surfboard/access/routes.ts`, collapsing the 8 MDA role trees into one parametrized `surfboard-mda/dashboard/:role` route.

**Real gap confirmed here, not just generic MDA coverage** (2026-08-24): `surfboardMDAPanelLayout.tsx`'s nav today shows all 7 stage links (Accounts/Charting/SURCON/Intake/Records I/Records II/Archive) to *every* MDA role regardless of which one they hold — access is only enforced at the route level in `proxy.ts`, so e.g. a Charting officer currently sees an "Accounts" link they'd be denied for clicking. This is exactly the class of problem `getNavItemsForRole` already fixed for the regular admin panel in Step 8 — MDA gets the same treatment here: each of the 7 stage roles (plus `MDA_SUPERADMIN`, who sees everything) gets a `roles` array on its registry entry so the nav itself reflects what a role can actually reach, not just what the server will let them.

This also ties into the per-role analytics from Step 9-adjacent work: each MDA role's `surfboard-mda/dashboard/:role` view gets its own stage-scoped stats (queue depth, average time a plan sits at their stage) from `analyticsService.ts`, read through the same registry/role-scoping rather than a second, separate analytics path.

**Naming standardization** (proposal §4.8): `surf-restricted`→`surfboard-restricted`, `surf-mda`→`surfboard-mda`. Mechanics: add `redirects()` entries in `next.config.mjs` for both old prefixes (308, permanent), update the Kinde application config's redirect URIs for the `surf-restricted`/`surf-mda` platforms, update `proxy.ts`'s route matching, update any hardcoded links in emails/notifications that reference the old paths (`createNotification` calls with `link: "/surf-restricted/..."` — grep and update each).

**Folder move**: everything from `components/surfboard/`, `components/layouts/surfboard*.tsx`, `hooks/useSurfUserProfile.ts`, `utils/surfAuth.ts`, root `surfboard-colors.ts` into `surfboard/{components,layouts,hooks,utils,colors.ts}`.

**Cleanup folded in**: this phase is where the `revaActions.ts`/`revaActions2.ts`-style risk doesn't apply to Surfboard (no second file), but does apply to `certificateActions.ts` (already deleted in Phase 0) and confirms no other dead paths were missed.

---

## Phase 3 — REVA (full migration)

Full detail written into `docs/architecture-rebuild/phases/phase-3-reva.md` before this phase starts.

**Service extraction** from `revaActions.ts` (1,488 lines, the UI-facing implementation — authoritative) into `reva/services/`: `propertyRequestService.ts`, `paymentService.ts`, `reportService.ts`. `revaActions2.ts` (the webhook-only, drifted duplicate) gets diffed line-by-line against `revaActions.ts` *before* deletion — any behavior in `revaActions2.ts` not present in `revaActions.ts` needs an explicit decision (intentional divergence vs. bug) rather than silently picking one.

**Route/nav registry**: `reva/access/routes.ts`, covering both `reva` (user) and `reva-restricted` (admin) — `reva-restricted` keeps its name, already standard.

**Folder move**: `components/reva/`, `components/reva/shared/`, `components/layouts/reva*.tsx`, `hooks/useReva*.ts`, `utils/revaAuth.ts`, root `reva-colors.ts` + `lib/reva-colors.ts` (the fork gets resolved into one file, `reva/colors.ts`, during this move) into `reva/{components,layouts,hooks,utils,colors.ts}`.

**Known gap to resolve as part of this phase** (from proposal §2, REVA deep-dive): the guest/one-time-request flow has no client view page to track/download reports, and approval-notification code looks up `property.user.email`, which doesn't exist for `OneTimeUserProperty` — decide during this phase whether to fix or explicitly scope out.

---

## Phase 4 — GBC (full migration)

Full detail written into `docs/architecture-rebuild/phases/phase-4-gbc.md` before this phase starts.

**New: multi-edition architecture** *(added 2026-08-24, from the design-overview review)*. GBC has run as 1.0, 2.0, and will keep running as an annual event, but nothing in the schema reflects that — confirmed by reading `prisma/schema/gbc.prisma`, not assumed. Every GBC model (`GBCTicket`, `GBCSponsor`, `GBCPartner`, `GBCSpeaker`, `GBCPage`, `GBCSettings`, `GBCEventStats`) is flat and implicitly single-conference. Concretely: `GBCTicket.ticketNumber`'s database default hardcodes `'GBC2_'` as a literal prefix (`concat('GBC2_', ...)`), and `GBCSettings` is a singleton JSON blob (event name/theme/date/venue) — the next edition would overwrite it rather than extend it, with no record of what "2.0" looked like left behind.

Revised approach (2026-08-24, simplified from the original all-relational proposal per your suggestion to reuse the existing settings JSON): edition *metadata* doesn't need a new table — `GBCSettings.settings` already stores event config as JSON today, so it extends naturally to `settings.editions: [{ key: "2.0", name, theme, subtheme, venue, startDate, endDate, status: UPCOMING|ACTIVE|PAST, ticketPrefix }, { key: "3.0", ... }]`, an array instead of a single object. Smaller migration, consistent with how this data already lives.

What JSON *can't* do: tag the actual `GBCTicket`/`GBCSponsor`/`GBCPartner`/`GBCSpeaker` rows so a 2.0 record is distinguishable from a 3.0 one — that has to live on the row itself. So each of those models (plus `GBCEventStats`) gets one plain `edition: String` column matching a `key` in the settings array — a tag, not a foreign-key relation; enough for `WHERE edition = '2.0'` to work cleanly in every per-edition query without the weight of full referential integrity for what's really just a categorical label. Existing rows backfill to `edition: "2.0"` — their ticket numbers already say `GBC2_`, so that's the natural anchor point. Ticket-number generation moves from the hardcoded SQL default to `${editionConfig.ticketPrefix}_...`, read from the active entry in `settings.editions`. Whether `GBCContactInquiry` also needs an `edition` tag is an open question, not assumed either way — general sponsorship/press inquiries may span editions.

Unlocks what was actually asked for, on **both** sides:
- **Public homepage**: a **Past Editions** page listing `PAST` events, each with its own read-only recap (theme, stats snapshot, gallery, that year's sponsors/speakers) — a visitor's view of GBC's history.
- **Admin panel**: the same event-switcher serves both purposes depending on which edition is selected (reading the list from `settings.editions`) — pick the `ACTIVE` one and it's the full editable management view (tickets, check-in, sponsors); pick any `PAST` one and it becomes a read-only overview of that edition's real numbers, computed live from `GBCTicket`/etc. `WHERE edition = '<key>'` (tickets sold, revenue, attendee count, sponsor/speaker roster as they were) — an internal, more detailed counterpart to the public recap, not the same page reused. Without this, staff would have no way to pull up "how did 2.0 actually perform" once 3.0 goes live.

**New: attendee-facing screens** *(from the design-overview artifact, accepted for build — review still needed before implementation)*: `My Ticket` (QR pass + event details) and the ticket purchase/checkout flow. Since `GBCTicket` has no relation to `GBCUser` today — ticket buyers never get an account, only staff do via Kinde — `My Ticket` is reached the same way REVA's one-time-request lookup already works: a reference+email link emailed after purchase, not a login. This is also the natural place to resolve the disabled public-login path noted just below — worth deciding together whether that dead path becomes this flow or stays deleted, rather than building a second, unrelated mechanism.

**Service extraction** from the 11 action files under `app/(projects)/(GBC)/actions/` into `gbc/services/`: `ticketService.ts` (from `ticket-actions.ts`, 1,284 lines), `qrCheckinService.ts` (from `qr-verification.ts`), `cmsService.ts` (gallery/sponsor/partner/speaker actions — genuinely similar CRUD shape, one service), `contactService.ts`, `certificateService.ts`, plus a new `editionService.ts` for the `settings.editions` array above (create/activate/archive an edition, compute a past edition's live numbers).

**Webhook gap to close**: the shared Paystack webhook currently logs GBC events but doesn't process them (relies entirely on client-triggered `verifyGBCPayment`) — this phase is where that gets fixed properly now that the webhook handler itself is being migrated to call into `gbc/services/ticketService.ts`.

**Route/nav registry + naming**: `gbc/access/routes.ts`; flatten `gbc/restricted` → top-level `gbc-restricted` (redirects + Kinde URI updates, same mechanics as Phase 2's Surfboard rename), fixing the `gbc/restricted-login` naming variant in the same move. Resolve the disabled public-user login path (`gbc/_route.ts`, `gbc/login/_page.tsx`) — now a real candidate to become the `My Ticket` lookup flow above, rather than simply deleted; confirm with you which.

**Folder move**: `app/(projects)/(GBC)/{components,types,utils}/`, `components/layouts/gbc*.tsx`, `hooks/useGBC*.ts`, root `gbc-colors.ts` into `gbc/{components,layouts,hooks,utils,colors.ts}`.

**Explicitly not touched**: `app/(noPopUp)/gbccertificate` and `app/(main)/gbc-frame` — confirmed unrelated (leftover ArcGIS/Survey123 tool sharing the "GBC" initials, zero code overlap with the real product). Left exactly where they are; only worth a rename if you want the naming collision resolved too, which is a separate call.

---

## Phase 5 — Retirement

### Step 1 — Confirm zero remaining server-action call sites
```
grep -rl "\"use server\"" app/ | xargs -I{} echo {}
```
Every remaining hit should be gone after Phases 2–4; anything left is either genuinely missed or intentionally out of scope (confirm which before deleting).

### Step 2 — Delete the old action files
Once confirmed unreferenced: `revaActions.ts`, `revaActions2.ts`, `surfboardActions.ts`, `codActions.ts`, `ticket-actions.ts`, and every other `*Actions.ts`/`*actions.ts` file migrated in Phases 1–4.

### Step 3 — Full-repo verification
`npx tsc --noEmit`, `npm run build`, full vitest suite, then a live manual pass across all three products' primary flows (property request + payment, survey plan CRUD + MDA approval + QR earnings, ticket purchase + check-in) before this merges to `main`.

---

## `docs/architecture-rebuild/phases/` convention going forward

Empty right now. As each phase actually ships (starting with Phase 0), a completion report gets written — `phase-0-housekeeping.md`, `phase-1-foundations.md`, etc. — following the exact shape proplity's own phase reports use: **Status/Date**, **Why**, **What was built** (exact files/behavior, not the plan's intent), **Judgment calls made during implementation** (anywhere reality differed from what this plan predicted), **Verification performed** (real commands/manual-test results, not hypothetical), **Next up**. `docs/architecture-rebuild/progress.md` gets its checkboxes updated in the same commit.
