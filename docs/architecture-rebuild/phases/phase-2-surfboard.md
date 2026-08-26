# Phase: Architecture Rebuild Phase 2 — Surfboard (full migration)

**Status:** Spec complete, all open questions resolved, not yet executing. **Date:** 2026-08-26.

## Why

Phase 1 built the shared plumbing (`lib/api/*`, `lib/auth/*`, native auth routes, the Kinde dual-write bridge) and piloted the pattern end-to-end on one small vertical slice of Surfboard (the admin+QR-earnings nav registry, and the QR Earnings module's service/route/client split). This phase applies that same proven pattern to the rest of Surfboard: two large `"use server"` action files (`codActions.ts`, 5,679 lines; `surfboardActions.ts`, 3,717 lines) become Prisma-only services behind typed `/api/v1/surfboard/*` routes, the route/nav registry grows from its 13-entry admin-only pilot to cover the full admin + MDA + user surface, and the analytics dashboards and naming standardization scoped into the plan on 2026-08-24 get built.

This document is the "full per-route Zod-schema-level detail" the implementation plan requires before Phase 2 starts executing. It's built from a complete read of both action files (every exported function catalogued — see the source inventory below), not from the plan's earlier high-level intent.

## Source inventory

Full function-by-function catalog (params, Prisma models touched, existing auth checks, external calls) was produced by reading `codActions.ts` and `surfboardActions.ts` in their entirety. Rather than duplicate ~80 functions' worth of detail twice, this document works from that catalog directly in the service breakdown below. Two things from that pass matter before any code moves:

**`codActions.ts` and `surfboardActions.ts` are not the only `"use server"` files in Surfboard.** 19 files carry the directive:
```
settingsActions.ts   ossgActions.ts        paystackActions.ts      authActions.ts
notificationActions.ts  auditLogActions.ts  verificationActions.ts  paystackSubscriptions.ts
qrAdminActions.ts    profile.ts            aiExtractionActions.ts  adminActions.ts
mdaRemarkActions.ts  subscriptionActions.ts migrate/actions.ts      awsActions.ts
surfboardActions.ts  codActions.ts         subscriptionAnalyticsActions.ts
```
This phase migrates `codActions.ts` and `surfboardActions.ts` only (they're the two the plan scoped, and by far the two largest). The other 17 stay as server actions for now — each is its own smaller, separately-scoped migration if/when it's needed, not silently pulled into this phase's blast radius.

**Real duplication/dead-code risk found — grep-confirmed resolved (2026-08-26), not silently picked**: `surfboardActions.ts` had three overlapping generations of plan creation (`_createSurfPlan`, `_createPlan`, `createSurfPlan`) and two of plan update (`_updatePlan`, `updateSurfPlan`), plus a duplicate share/unshare pair. Repo-wide grep for each name found:
- `_createSurfPlan`, `_createPlan`, `_updatePlan`, `_getAllSurfPlans`, `_deletePlanAttachment`, `importDbDataFromCsv` — **zero call sites anywhere outside their own definition.** Confirmed dead. None of these get migrated or get a route.
- `addSurfUserToSharedSurfPlan`, `removeSurfUserFromSharedSurfPlan` — **zero call sites.** Dead, same treatment. `sharePlanWithUser`/`unsharePlanWithUser` are the live pair (called from `SharePlanModal.tsx`) and are what this spec migrates.
- `createSurfPlan`, `updateSurfPlan` — confirmed current-production (matches the live UI's notification-sending and withdrawal-status-flip logic). These migrate.

**The access-control gap this raised is now moot**: `_getAllSurfPlans`/`_createPlan`/`_updatePlan` (the ones with no auth check inside them) are confirmed dead per the grep above — they get deleted along with the other dead functions in Phase 5, not carried into a route at all. No auth check needs adding because nothing calls them.

## Service extraction

### From `codActions.ts` → 4 services (`surfboard/services/`)

**`planLockService.ts`** — the FIFO-gated optimistic locking subsystem, both plan-level and batch-level (they're the same lock mechanism, just scoped to one plan vs. every plan in a batch):
- `acquirePlanLock`, `releasePlanLock`, `getAndLockOldestAvailablePlan`, `releaseAllLocksForUser`, `getPlanLockStatus`, `canWorkOnPlan`
- `getAndLockBatchForAccounts`, `getAndLockBatchForIntake`, `getAndLockBatchForRecordsII`, `releaseBatchLockForAccounts`, `releaseBatchLockForIntake`, `releaseBatchLockForRecordsII`

**`codFeeService.ts`** — pure calculation + the two PostGIS zone lookups:
- `getChartingInterpretation`, `getZoneFromGeometry` (both `$queryRaw` against `LASG_charting_interpretation`/`Scale_of_fees` — same PostGIS-unavailable-locally workaround from Phase 1's schema split applies whenever this needs local verification)
- `calculatePlanFeeByZone` (+ private `calculateFeeFromRow`, `shouldChargeDoubleFee`)

**`remitaVerificationService.ts`** — batch submission through to payment confirmation:
- `submitRedCopyBatch`, `verifyBatchPayment` (legacy single-reference path — grep-confirmed still live, called from `surfboard/dashboard/payment/callback/page.tsx`; migrates alongside the newer two-link flow, not replaced by it), `verifyBatchPaymentWithLinks`, `verifyLASGReceiptLink`, `verifyQueryPaymentLinks` (currently private — stays internal, called by `batchApprovalService.ts`'s resubmission flow), `retryBatchPayment`, `uploadLASGReceipt`, `getBatchesByStatus`, `getUserBatches`, `getBatchPDFData`, `getCurrentPayerProfile`

**`batchApprovalService.ts`** — the approval chain, queue/history reads, and query/resubmission handling (kept together: they're one workflow, reads and writes on the same state machine):
- Chain: `updateAccountsApproval`, `updateChartingStatus`, `updateSurconStatus`, `updateRecordsIStatus`, `updateIntakeStatus`, `updateIntakeBatchStatus`, `updateRecordsIIStatus`, `markPlanArchived`
- Queues/history: `getAccountsBatches`, `getChartingPlans`, `getSurconPlans`, `getRecordsIPlans`, `getRecordsIIPlans`, `getIntakeBatches`, `getRecordsIIBatches`, `getAccountsHistory`, `getChartingHistory`, `getSurconHistory`, `getRecordsIHistory`, `getRecordsIIHistory`, `getIntakeHistoryBatches`, `getRecordsIIHistoryBatches`, `getPendingArchiveBatches`, `getArchiveHistoryBatches`, `getPendingCountByRole`
- Query/resubmission: `getQueriedPlansForUser`, `resubmitQueriedPlan`, `checkAndDispatchQueries` (internal)
- Physical copy: `submitPhysicalCopies`
- **Not migrated as an API route**: `deleteAllBatches` (dev-only nuke, already production-blocked in the source). A SUPERADMIN-gated HTTP endpoint that deletes every CoD batch is a bad idea to expose at all, even behind a role check — if this capability is still needed, it stays a one-off script run directly against the DB, not part of the API surface.

### From `surfboardActions.ts` → 2 services

**`planService.ts`** — plan CRUD, QR/public access, sharing, attachments, geo lookups:
- QR/URL: `generatePlanQRCode`, `getPlanPublicUrl`, `getBaseUrl`
- Create/update (production paths only — see dead-code note above): `createSurfPlan`, `updateSurfPlan`
- Reads: `getAllSurfPlans`, `getPaginatedSurfPlans`, `getAllSharedSurfPlans`, `getSharedWithMeSurfPlans`, `getSurfPlanById`, `getSurfPlanByIdWithSurveyor`, `getPublicSurfPlanByIdWithSurveyor`, `getGatedPublicSurfPlan`, `getDeletedSurfPlans`, `checkPlanNumberExists`, `getAllFacilitatorsAndPlanNumbers`, `getAllFacilitators`, `searchReferencePlanNumbers`
- Status/lifecycle: `updateSurfPlanStatus`, `deleteSurfPlan`, `restoreSurfPlan`, `permanentlyDeleteSurfPlan`, `submitRedCopy`, `verifyPersonCount`, `queryPlan`
- Sharing: `searchSurfUserByEmailOrSurconRegNumber`, `sharePlanWithUser` (canonical name; `addSurfUserToSharedSurfPlan` is the same operation — confirm which name is actually called and drop the duplicate), `unsharePlanWithUser` (+ `removeSurfUserFromSharedSurfPlan`, same duplication check), `searchUsers`
- Attachments/geo: `deletePlanAttachment` (canonical; `_deletePlanAttachment` is the older duplicate — confirm unreferenced before dropping), `updatePlanRecordCopy`, `getAdminBoundaries` (`__handleIntersect` is its private internal, stays internal)
- **Not migrated**: `importDbDataFromCsv` — reads a CSV and does nothing further (incomplete stub, confirmed by reading it, and grep-confirmed zero call sites — never wired up to any UI). Dropped, not migrated.

**`analyticsService.ts`** (new) — see the dedicated section below. Built from `getDashboardAnalytics`, which already does real work here (facilitator/LGA `groupBy`, deededArea sums, pillar-type breakdown, a 12-month trend via raw `DATE_TRUNC` SQL) — this is a substantial head start on the 2026-08-24 analytics request, not a from-scratch build.

## API route inventory

All routes follow Phase 1's established shape exactly: `withAuth(handler, {platform: Platform.SURFBOARD, roles: [...]})` wrapping a service call, `validateBody(req, zodSchema)` for mutations, `handleApiError(err, context)` never needed explicitly (it's inside `withAuth`), responses are `ApiResult<T>`. Public routes (no session) follow the QR module's pattern: their own try/catch, `handleApiError(err, {route, method})` directly.

Base path: `/api/v1/surfboard/*`. MDA_SUPERADMIN and platform SUPERADMIN both get every MDA-scoped route (SUPERADMIN as the existing platform-wide override, MDA_SUPERADMIN as its MDA-specific equivalent — mirroring exactly what the current server actions already check).

### Representative schemas (the non-trivial ones)

```ts
// POST /api/v1/surfboard/cod/batches — submitRedCopyBatch
const submitBatchSchema = z.object({
  planIds: z.array(z.string().uuid()).min(1),
  acceptanceAcknowledged: z.literal(true),
});

// POST /api/v1/surfboard/cod/batches/:id/payment/verify-links — verifyBatchPaymentWithLinks
const verifyLinksSchema = z.object({
  lasgReceiptUrl: z.string().url(),
  remitaReceiptUrl: z.string().url(),
});

// POST /api/v1/surfboard/mda/:role/plans/:id/decision — one shared handler for
// updateChartingStatus/updateSurconStatus/updateRecordsIStatus/updateIntakeStatus
// (identical shape across all 4 — one route, :role in the path selects the
// service function and the required role, instead of 4 near-identical routes)
const mdaDecisionSchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

// POST /api/v1/surfboard/mda/records-ii/plans/:id/decision — updateRecordsIIStatus
// same body shape as above; kept as its own route (not folded into the shared
// :role one) because approval here triggers OSSG transmission + LODGED status,
// materially different side effects worth a distinct, more carefully reviewed handler.

// POST /api/v1/surfboard/plans/:id/resubmit — resubmitQueriedPlan
const resubmitSchema = z.object({
  pillars: z.array(pillarSchema).optional(),
  recordCopyUrl: z.string().url().optional(),
  location: z.object({ ward: z.string().optional(), lcda: z.string().optional(), lga: z.string().optional(), state: z.string().optional() }).optional(),
  lasgReceiptUrl: z.string().url().optional(),
  remitaReceiptUrl: z.string().url().optional(),
});

// POST /api/v1/surfboard/plans — createSurfPlan (largest body; mirrors SurfboardPlanDTO)
const createPlanSchema = z.object({
  planNumber: z.string().min(1),
  surveyTitle: z.string().min(1),
  planType: z.string().min(1),
  referencePlanNumber: z.string().optional(),
  deededArea: z.string(),
  facilitator: z.string(),
  pillarType: z.string(),
  geometry: z.any(), // GeoJSON — validated by computeGeometryDetails at the service layer, not re-specified in Zod
  pillars: z.any(),
  dateOnSurveyPlan: z.coerce.date().optional(),
  reasonForWithdrawalAndResubmission: z.string().optional(),
  parcels: z.any().optional(),
  personCount: z.number().int().min(1).default(1),
});

// GET /api/v1/surfboard/plans?page=&pageSize=&status=&planType=&facilitator=&from=&to=&sort=
// — getPaginatedSurfPlans; query params via parsePagination() + a small filters
// sub-schema, not a body (GET).
```

### Full route table

| Route | Method | Service fn | Roles | Notes |
|---|---|---|---|---|
| `/plans` | GET | `getPaginatedSurfPlans` | USER | filters/sort via query params |
| `/plans` | POST | `createSurfPlan` | USER | |
| `/plans/:id` | GET | `getSurfPlanById` | USER | owner or shared-with |
| `/plans/:id` | PATCH | `updateSurfPlan` | USER | owner |
| `/plans/:id` | DELETE | `deleteSurfPlan` | USER | soft delete, owner |
| `/plans/:id/restore` | POST | `restoreSurfPlan` | USER | |
| `/plans/:id/permanent` | DELETE | `permanentlyDeleteSurfPlan` | USER, ADMIN, SUPERADMIN | |
| `/plans/:id/status` | PATCH | `updateSurfPlanStatus` | USER, ADMIN, SUPERADMIN | owner or admin |
| `/plans/:id/surveyor` | GET | `getSurfPlanByIdWithSurveyor` | USER | owner only |
| `/plans/:id/public` | GET | `getGatedPublicSurfPlan` | *public* | QR-gated redaction |
| `/plans/:id/public/full` | GET | `getPublicSurfPlanByIdWithSurveyor` | *public* | increments scan count |
| `/plans/:id/qr` | GET | `generatePlanQRCode` | USER | owner |
| `/plans/:id/red-copy` | POST | `submitRedCopy` | USER | multipart, owner |
| `/plans/:id/record-copy` | PATCH | `updatePlanRecordCopy` | USER | owner |
| `/plans/:id/person-count` | PATCH | `verifyPersonCount` | not USER (MDA/admin) | |
| `/plans/:id/query` | POST | `queryPlan` | not USER (MDA/admin) | |
| `/plans/:id/resubmit` | POST | `resubmitQueriedPlan` | USER | owner, plan must be QUERIED |
| `/plans/:id/attachments` | DELETE | `deletePlanAttachment` | USER | owner, body: `{fileUrl, fileType}` |
| `/plans/:id/share` | POST | `sharePlanWithUser` | USER | owner |
| `/plans/:id/share` | DELETE | `unsharePlanWithUser` | USER | owner |
| `/plans/shared` | GET | `getAllSharedSurfPlans` | USER | |
| `/plans/shared-with-me` | GET | `getSharedWithMeSurfPlans` | USER | |
| `/plans/deleted` | GET | `getDeletedSurfPlans` | USER | trash view |
| `/plans/check-number` | GET | `checkPlanNumberExists` | USER | `?planNumber=&excludeId=` |
| `/plans/facilitators` | GET | `getAllFacilitators` / `getAllFacilitatorsAndPlanNumbers` | USER | `?withPlanNumbers=` selects which |
| `/plans/reference-numbers` | GET | `searchReferencePlanNumbers` | USER | `?planType=` |
| `/plans/queried` | GET | `getQueriedPlansForUser` | USER | |
| `/plans/geo/boundaries` | POST | `getAdminBoundaries` | USER | body: `{geometry}` |
| `/plans/:id/physical-copy` | POST | `submitPhysicalCopies` (bulk, `{planIds[]}`) | USER | |
| `/users/search` | GET | `searchUsers` | USER | `?query=` |
| `/users/lookup` | GET | `searchSurfUserByEmailOrSurconRegNumber` | USER | `?email=&surconRegNumber=` |
| `/cod/fee-preview` | POST | `calculatePlanFeeByZone` | USER | body: `{zone, areaSqM, surveyTitle, ethnicity?}` — client-side fee preview before batch submit |
| `/cod/zone` | POST | `getZoneFromGeometry` | USER | body: `{geometry}` |
| `/cod/batches` | POST | `submitRedCopyBatch` | USER | |
| `/cod/batches` | GET | `getUserBatches` / `getBatchesByStatus` | USER (own) / ADMIN, SUPERADMIN (all, `?status=`) | same route, scope decided by role inside the handler |
| `/cod/batches/:id` | GET | `getBatchPDFData` | USER | owner |
| `/cod/batches/:id/payment/verify` | POST | `verifyBatchPayment` | USER | owner, legacy single-ref path — confirmed still live, migrates |
| `/cod/batches/:id/payment/verify-links` | POST | `verifyBatchPaymentWithLinks` | USER | owner or SUPERADMIN |
| `/cod/batches/:id/payment/verify-lasg` | POST | `verifyLASGReceiptLink` | USER | owner or SUPERADMIN |
| `/cod/batches/:id/payment/retry` | POST | `retryBatchPayment` | USER | owner |
| `/cod/batches/:id/lasg-receipt` | POST | `uploadLASGReceipt` | ADMIN, SUPERADMIN | body: `{receiptUrl, receiptS3Key}` |
| `/cod/payer-profile` | GET | `getCurrentPayerProfile` | USER | |
| `/cod/locks/:planId` | POST | `acquirePlanLock` | ACCOUNTS, CHARTING, SURCON, RECORDS_I, INTAKE, RECORDS_II, ARCHIVE, MDA_SUPERADMIN, SUPERADMIN | body: `{role}` |
| `/cod/locks/:planId` | DELETE | `releasePlanLock` | same as above | |
| `/cod/locks/:planId` | GET | `getPlanLockStatus` | same as above | `?role=` |
| `/cod/locks/next` | POST | `getAndLockOldestAvailablePlan` | same as above | body: `{role}` — FIFO claim |
| `/cod/locks/release-all` | POST | `releaseAllLocksForUser` | same as above | body: `{role}` |
| `/cod/locks/batch/next` | POST | `getAndLockBatchForAccounts`/`ForIntake`/`ForRecordsII` | ACCOUNTS / INTAKE / RECORDS_II resp. | one route, role in body selects which |
| `/cod/locks/batch/release` | POST | `releaseBatchLockForAccounts`/`ForIntake`/`ForRecordsII` | same | |
| `/mda/accounts/batches` | GET | `getAccountsBatches` / `getAccountsHistory` | ACCOUNTS, SUPERADMIN, MDA_SUPERADMIN | `?view=queue\|history` |
| `/mda/accounts/batches/:id/decision` | POST | `updateAccountsApproval` | ACCOUNTS, SUPERADMIN | body: `{approved, comment?}` |
| `/mda/:role/plans` | GET | `get{Charting,Surcon,RecordsI,RecordsII}Plans` / `...History` | that role, SUPERADMIN, MDA_SUPERADMIN | `:role ∈ {charting,surcon,records-i,records-ii}`, `?view=` |
| `/mda/:role/plans/:id/decision` | POST | `update{Charting,Surcon,RecordsI,Intake,RecordsII}Status` | that role, SUPERADMIN | shared schema, see above |
| `/mda/intake/batches` | GET | `getIntakeBatches` / `getIntakeHistoryBatches` | INTAKE, SUPERADMIN, MDA_SUPERADMIN | `?view=` |
| `/mda/intake/batches/:id/decision` | POST | `updateIntakeBatchStatus` | INTAKE, SUPERADMIN | batch-level variant of the intake decision |
| `/mda/archive/batches` | GET | `getPendingArchiveBatches` / `getArchiveHistoryBatches` | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN | `?view=` |
| `/mda/archive/plans/:id` | POST | `markPlanArchived` | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN | body: `{notes?}` |
| `/mda/pending-counts` | GET | `getPendingCountByRole` | ADMIN, SUPERADMIN, ACCOUNTS, CHARTING, SURCON, RECORDS_I, INTAKE, RECORDS_II, ARCHIVE, MDA_SUPERADMIN | sidebar badges |
| `/analytics` | GET | `analyticsService` (new, see below) | role-scoped, see below | |

## `analyticsService.ts` — role/platform-scoped dashboards

`getDashboardAnalytics` (in `surfboardActions.ts` today) already computes: total/status counts, facilitator `groupBy`, LGA `groupBy`, deeded-area sums, pillar-type breakdown, and a 12-month time trend via raw `DATE_TRUNC` SQL — confirmed by reading the function, not assumed from the plan's earlier description. This is the base the 2026-08-24 request extends, not a from-scratch build:

- **Stat cards**: provisional-plan count adds `planType IN ('PROVISIONAL', 'PROVISIONAL_LAYOUT')` (confirmed: `planType` is free-text, not the `SurfboardPlanStatus` enum — that enum is only `PENDING`/`LODGED`/`QUERIED`/`UNDER_REVIEW`). **Resolved (2026-08-26): pending certificates gets two separate stat cards**, not one — `CertificateOfDepositBatch.paymentStatus !== COMPLETED` (batch-level, "Pending Batches") for admin/Accounts context, and `SurfboardPlan.redCopyStatus NOT IN (APPROVED, FAILED)` (plan-level, "Pending Certificates") for surveyor context. Both cards ship; role-scoping (below) decides which audience sees which by default.
- **Dynamic dimension chart**: `GET /api/v1/surfboard/analytics?dimension=facilitator|lga` — one endpoint, `GROUP BY facilitator` or `GROUP BY lga` selected by the param, reusing `getDashboardAnalytics`'s existing groupBy pattern for both rather than writing two separate queries.
- **Lodgement trend**: new — `dateLodged - dateOnSurveyPlan` in days per plan (both already exist on `SurfboardPlan`), histogrammed into a trend of "N records took D days." Plans missing either date are excluded from the histogram and their count surfaced alongside it (silently dropping them would misrepresent the trend, per the plan's own note on this).
- **Role scoping** (not identical everywhere — confirmed against the actual role list in `SurfboardRole`):
  - ADMIN/SUPERADMIN: full-population, exactly what `getDashboardAnalytics` already computes today.
  - MDA sub-roles (ACCOUNTS/CHARTING/SURCON/RECORDS_I/INTAKE/RECORDS_II/ARCHIVE): scoped to their own stage — queue depth and average time-in-stage, computed from the same lock/approval-timestamp fields (`accountsApprovedAt`, `accountsLockedAt`, etc.) `batchApprovalService.ts` already reads for the queue views, not a separate analytics path. MDA_SUPERADMIN sees all stages' stats combined.
  - USER (surveyor): same shapes as admin, scoped to `WHERE userId = session.sub` — their own facilitator/LGA breakdown (trivial since facilitator is usually themself, but LGA breakdown is still useful), their own lodgement trend.
- **Chart library**: **Resolved (2026-08-26): Recharts.** Composes well with the existing Tailwind component tree, handles line/bar charts and the lodgement-trend histogram without extra complexity.

## Route/nav registry extension

`surfboard/access/routes.ts`'s `SurfboardRouteGroup` grows from `"admin" | "user"` to `"admin" | "user" | "mda"`. Two real gaps close here, not just registry bookkeeping:

**MDA nav-filtering gap (confirmed real, not generic)**: `surfboardMDAPanelLayout.tsx` is client-side, hand-rolled conditional rendering — not wired to any registry — and today shows a Charting officer, say, exactly the Charting link (the layout *does* correctly conditionally render per-role already, this part works). What's actually missing is that `proxy.ts` doesn't consult a registry for MDA routes at all (same gap Phase 1's Step 8 already fixed for the plain admin panel) — the registry gives `canAccessRoute`/`getNavItemsForRole` a single source of truth `proxy.ts` can be migrated to read, instead of the layout's own conditional JSX being the only enforcement of what's shown (server-side enforcement still happens in each server action today, independently — the registry unifies nav *and* access checking behind one array, matching Phase 1's pattern exactly).

New entries, `group: "mda"`, base `/surf-mda/dashboard`:
```
""                → all 8 MDA roles + MDA_SUPERADMIN + SUPERADMIN   (Home)
/accounts         → ACCOUNTS, MDA_SUPERADMIN, SUPERADMIN
/charting         → CHARTING, MDA_SUPERADMIN, SUPERADMIN
/surcon           → SURCON, MDA_SUPERADMIN, SUPERADMIN
/intake           → INTAKE, MDA_SUPERADMIN, SUPERADMIN
/records-i        → RECORDS_I, MDA_SUPERADMIN, SUPERADMIN
/records-ii       → RECORDS_II, MDA_SUPERADMIN, SUPERADMIN
/archive          → ARCHIVE, MDA_SUPERADMIN, SUPERADMIN
/profile          → all MDA roles + MDA_SUPERADMIN + SUPERADMIN
/settings         → all MDA roles + MDA_SUPERADMIN + SUPERADMIN
```

**Admin registry gap (confirmed by the route inventory, not in the Phase 1 pilot's 13 entries)**: `/surf-restricted/dashboard/{secure-plans,superadmin,admin-tools,cod}` exist as real routes today but aren't in `SURFBOARD_ROUTES` yet — added with `roles: ADMIN_ROLES` (or `SUPERADMIN_ONLY` for `/superadmin`, matching its name) alongside the naming migration below.

`group: "user"` entries get added for the first time this phase (Phase 1's pilot was admin-only) — `/surfboard/dashboard/{plans,newplan,map,notifications,settings,qr-earnings,subscription,shared,queried-plans}`, all `roles: [SurfboardRole.USER]`.

## Naming standardization (proposal §4.8)

`surf-restricted` → `surfboard-restricted`, `surf-mda` → `surfboard-mda`. Mechanics:
1. `next.config.mjs`: `redirects()` entries for both old prefixes → new (308, permanent).
2. Kinde application config: update redirect URIs for the `surf-restricted`/`surf-mda` platform entries (external, done in Kinde's dashboard, not code — flag as a manual step, not something a commit does).
3. `proxy.ts`: update route-matching to the new prefixes (paired with the registry migration above, not a separate pass).
4. Hardcoded notification links — every one found by grepping `notificationActions.ts` and `qrEarningsService.ts` needs its literal path prefix updated:
```
notificationActions.ts:494,523,819,848,909   /surfboard/dashboard/plan?planId=...        (unaffected — /surfboard prefix, not /surf-)
notificationActions.ts:552,582,653,787       /surf-restricted/dashboard/cod              → /surfboard-restricted/dashboard/cod
notificationActions.ts:623                   /surf-mda/dashboard                         → /surfboard-mda/dashboard
notificationActions.ts:688,723,755,879       /surfboard/dashboard/plans...                (unaffected)
qrEarningsService.ts:436                     /surf-restricted/dashboard/qr-earnings      → /surfboard-restricted/dashboard/qr-earnings
```
Only 5 of the 15 found link sites actually need changing — the rest already use the unabbreviated `/surfboard/...` prefix and aren't part of this rename. Old links already sent in existing, unread notifications keep working regardless, since the 308 redirects cover them.

## Folder move

`components/surfboard/`, `components/layouts/surfboard*.tsx` (including `surfboardMDAPanelLayout.tsx`, retired in favor of `DashboardShell` once the `"mda"` group above exists — same replacement Phase 1's Step 8 already did for the admin layout), `hooks/useSurfUserProfile.ts`, `utils/surfAuth.ts`, root `surfboard-colors.ts` → `surfboard/{components,layouts,hooks,utils,colors.ts}`. Done as its own commit, after the service/route work lands, so the folder-move diff doesn't obscure the actual logic changes.

## Open questions — all resolved (2026-08-26)

All six are closed. Four by a repo-wide grep (call-site facts): dead-code confirmation, the access-control gap (moot — the ungated functions are dead), `verifyBatchPayment` (confirmed still live), `importDbDataFromCsv` (confirmed dead, dropped). Two by your decision: pending-certificates ships as two separate stat cards (batch-level + plan-level, see the analytics section above), Recharts is the chart library. Nothing blocks execution starting.

## Sequencing

Mirrors Phase 1's own order — plumbing before consumers, always live-verified, not just `tsc`/`build`:
1. ~~Answer the open questions above~~ — done, see above.
2. `planLockService.ts` + `codFeeService.ts` (foundational — the approval chain depends on locking; fee calc has zero dependents to migrate first).
3. `remitaVerificationService.ts` (depends on fee calc for batch submission).
4. `batchApprovalService.ts` (depends on locking + Remita verification).
5. `planService.ts` (largely independent of the CoD chain, but `getGatedPublicSurfPlan` already depends on the QR module Phase 1 built).
6. `analyticsService.ts` (depends on nothing above; can happen in parallel with 2-5).
7. Registry extension + `proxy.ts` migration + naming standardization together (the registry is what `proxy.ts`'s migration needs to read from, and the naming rename touches the same routing surface — one coordinated pass, not three).
8. Folder move (last — cosmetic, easiest to get a clean diff on once nothing else in this phase is still moving).
9. Live verification pass (full CoD workflow end-to-end: batch submit → payment verify → 4-way parallel approval → intake → records II → archive; plus the MDA nav-filtering fix, confirmed via headless-browser render per role, same method Phase 1's Step 8 used) + this report's own completion update.
