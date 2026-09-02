# Phase: Architecture Rebuild Phase 5 — Retirement

**Status:** Execution complete (all three products' action files retired, live smoke pass done) — PR merge to `main` still pending. **Date:** 2026-08-28, completed 2026-09-02.

## Why

Phases 1-4 each built the full new stack for one product — Prisma-only services, typed `/api/v1/{product}/*` routes, route/nav registries — but deliberately left every product's legacy `"use server"` action file in place, since a large number were (and mostly still are) called directly by live pages and components. Repointing those callers was explicitly deferred to this phase, matching the precedent set in every prior phase's completion report.

Phase 5's job, per the original proposal (`MDs/ARCHITECTURE_REBUILD_PROPOSAL.md` §5): *"Delete the old `use server` action files once every caller has moved to the API client. Update any remaining direct-import references."* Once that's done: a full-repo verification pass, then merge `rebuild/foundations` to `main`.

This is the largest phase in the rebuild by file count touched — not because the underlying logic is new (every service/route this phase repoints callers onto already exists and is already tested), but because the blast radius is every page and component across three products that still imports a legacy action directly.

## Source inventory (2026-08-28 survey)

34 action files remain. Per-file consumer counts below (files with 0 consumers are fully dead; "mixed" means it has both live and confirmed-dead exports).

### GBC (`app/(projects)/(GBC)/actions/`) — smallest surface, all backing services already exist
| File | Status | Consumers | Shape |
|---|---|---|---|
| `partners-actions.ts` | dead | 0 | — |
| `user-actions.ts` | dead | 0 | — |
| `contact-actions.ts` | mixed | 3 live | inquiry fns live (client); dead tail `getGBCUsers`/`updateGBCUserRole` |
| `admin-actions.ts` | live | 3 | client |
| `certificate-actions.ts` | live | 1 | client |
| `gallery-actions.ts` | live | 6 | mixed |
| `settings-actions.ts` | live | ~14 | mixed |
| `speaker-actions.ts` | live | 6 | mixed |
| `sponsor-actions.ts` | live | 7 | mixed |
| `ticket-actions.ts` | live | 14 | mixed, largest GBC fan-out |
| `upload-actions.ts` | live | 8 | client |

### REVA (`reva/actions/` + `reva-restricted/actions/`) — no `apiClient.ts` yet, prerequisite step
| File | Status | Consumers | Shape |
|---|---|---|---|
| `otherActions.ts` (reva) | dead | 0 — `setMyRedirectUrlCookie` unused | — |
| `profileActions.ts` | dead | 0 — TODO stubs, superseded by `profileService.ts` | — |
| `authActions.ts` | live | 2 (hooks, fanning out further) | client |
| `awsActions.ts` | shared-dep | 0 direct page/component callers, but imported by `paymentService.ts`/`reportService.ts` | — |
| `paystackActions.ts` | shared-dep | 1 real (`PaymentVerification.tsx`) + imported directly by `paymentService.ts` | client |
| `revaActions.ts` | live | ~19 | mostly server pages + a few components |
| `adminDbActions.ts` (restricted) | live | ~13 | mixed |
| `otherActions.ts` (restricted) | live | 1 | server page |

### Surfboard (`(surfboard)/actions/` + `migrate/`) — largest surface, nearly all client components
| File | Status | Consumers | Shape |
|---|---|---|---|
| `userActions.ts` | dead | 0 bytes | — |
| `migrate/actions.ts` | dead | only consumer route is disabled (`__page.tsx`, double-underscore) | — |
| `ossgActions.ts` | shared-dep | 0 direct callers, imported by `batchApprovalService.ts` | — |
| `notificationActions.ts` | shared-dep | 2 real pages + imported directly by 4 services + a client layout | client |
| `adminActions.ts` | live | 2 | client |
| `aiExtractionActions.ts` | live | 2 + `remitaVerificationService.ts` dep | client |
| `auditLogActions.ts` | live | 1 | client |
| `authActions.ts` | live | 4 | client |
| `awsActions.ts` | live | 6 + `planService.ts` dep | client |
| `codActions.ts` | live | ~19 | client, largest file (165KB) |
| `mdaRemarkActions.ts` | live | 6 | client |
| `paystackActions.ts` | live | 2 real | client |
| `qrAdminActions.ts` | live | 2 | client |
| `settingsActions.ts` | live | ~10 | mostly client |
| `subscriptionActions.ts` | live | 2 client components **+ root `proxy.ts` middleware** | flag below |
| `subscriptionAnalyticsActions.ts` | live | 1 | client |
| `surfboardActions.ts` | live | ~17 | mostly client |
| `verificationActions.ts` | live | 1 | client |

### Cross-cutting findings

- **`reva/apiClient.ts` doesn't exist.** `surfboard/apiClient.ts` and `gbc/apiClient.ts` both do. Building it, mirroring their existing convention, is a prerequisite before any REVA client-component consumer can be repointed.
- **Four "shared-dependency" files** (`reva/awsActions.ts`, `reva/paystackActions.ts`, `surfboard/notificationActions.ts`, `surfboard/ossgActions.ts`) are imported directly by *new* services, not just by other legacy action files or old pages. These can't simply be deleted once their page/component callers move — the logic they hold needs to actually be absorbed into the relevant service (or a shared util under `lib/`/the product's own folder) first. Treat each as its own small extraction step, sequenced before that product's bulk page-repointing.
- **`proxy.ts` imports `getUserAndActiveSub` from `surfboardActions.ts` directly in Next.js middleware.** Middleware can't call a Server Action the normal way this already does today (it works because it's a plain async function, not a "use server" boundary crossing) — repointing this one is a special case: either extract `getUserAndActiveSub` into a lib-level Prisma helper `proxy.ts` can call directly, or into `surfboard/services/` and call the service function directly (proxy.ts already does this for the route/nav registries — same pattern, not a fetch call, since middleware runs server-side with direct DB access already established elsewhere in this file).
- **GBC's `contact-actions.ts`** is a preview of a pattern likely to repeat: repointing all *live* consumers off a file doesn't always mean the whole file is dead afterward — check for a residual unused tail before deleting.

## Resolved decisions

- **Server-component consumers get repointed to call the service function directly** (e.g. `import { getTickets } from "@/gbc/services/ticketService"` instead of the action), not routed through the API client — there's no reason for a server component to make an HTTP round-trip to its own app when it can call the service in-process, and this matches how every new server page built in Phases 2-4 already works.
- **Client-component consumers get repointed to the product's typed `apiClient.ts`** (`surfboardApi`/`revaApi`/`gbcApi`), extending it with any endpoint groups it doesn't yet cover — mirrors `gbc/apiClient.ts`'s existing `{resource}.{action}` shape.
- **Shared-dependency files get their logic extracted into the relevant service (or a shared lib helper) as a small dedicated step**, before their remaining page/component callers are repointed and the action file deleted — not repointed onto the action file's own now-orphaned function, which would leave dead weight behind.
- **Dead files get deleted immediately, product by product, as each product's pass starts** — zero consumer-repointing risk, and shrinks the surface before the real work begins.
- **`proxy.ts`'s `subscriptionActions.ts` dependency gets its own tiny extraction** (a Prisma helper or a service call), not bundled into Surfboard's bulk page-repointing pass, since a middleware regression has a much larger blast radius than a single page.

## Sequencing

Product order: **GBC → REVA → Surfboard**, smallest-to-largest surface, each product's pass fully verified (tsc/build/vitest/live) before starting the next. Every commit follows the same per-step discipline as Phases 2-4: repoint → typecheck → test → live-verify → commit → push, on `rebuild/foundations`, with a matching `progress.md` update on `rebuild/housekeeping`.

1. **GBC dead-file cleanup**: delete `partners-actions.ts`, `user-actions.ts`; trim `contact-actions.ts`'s dead tail.
2. **GBC consumer repointing**, file by file in ascending consumer-count order (`certificate-actions.ts` → `admin-actions.ts` → `gallery-actions.ts` → `speaker-actions.ts` → `sponsor-actions.ts` → `settings-actions.ts` → `upload-actions.ts` → `ticket-actions.ts`), each followed by deleting the now-dead action file.
3. **REVA dead-file cleanup**: delete `otherActions.ts` (reva), `profileActions.ts`.
4. **`reva/apiClient.ts`** — new file, mirrors `surfboard/apiClient.ts`'s/`gbc/apiClient.ts`'s convention.
5. **`reva/awsActions.ts` + `reva/paystackActions.ts` extraction** — absorb their logic into the services that already import them directly, then repoint their remaining page/component callers.
6. **REVA consumer repointing**: `authActions.ts` → `otherActions.ts` (restricted) → `adminDbActions.ts` → `revaActions.ts`.
7. **Surfboard dead-file cleanup**: delete `userActions.ts`, `migrate/` folder.
8. **`proxy.ts`'s `subscriptionActions.ts` dependency extraction** — its own tiny, carefully-verified step.
9. **`surfboard/notificationActions.ts` + `ossgActions.ts` extraction** — same shared-dependency treatment as REVA's step 5.
10. **Surfboard consumer repointing**, ascending consumer count: `auditLogActions.ts` → `subscriptionAnalyticsActions.ts` → `verificationActions.ts` → `adminActions.ts` → `aiExtractionActions.ts` → `qrAdminActions.ts` → `paystackActions.ts` → `mdaRemarkActions.ts` → `authActions.ts` → `awsActions.ts` → `settingsActions.ts` → `subscriptionActions.ts` → `surfboardActions.ts` → `codActions.ts`.
11. **Zero-remaining-action-imports confirmation**: a repo-wide grep for every deleted file's old path, confirming nothing references it anymore (dead code, stale comments, `revalidatePath` strings referencing an old action's behavior, etc.).
12. **Full-repo verification pass**: `tsc --noEmit`, full production build, full `vitest run`, and a live smoke pass across all three products' key flows (not just GBC's, which Phase 4 already covered in depth) — REVA's guest request flow and admin review, Surfboard's plan purchase and MDA review.
13. **Merge `rebuild/foundations` to `main`** via PR, per the standing rule that `main` is never pushed to directly.

## Completion Report

### What was built

All three products' `actions/` folders are now empty of the legacy files this phase targeted — full step-by-step log (every commit) lives in `docs/development-history/progress.md`; this section summarizes the shape of the work, not every commit.

- **GBC** — all 11 real action files repointed and deleted (`app/(projects)/(GBC)/actions/` fully empty), 2 more than the original 9-file estimate (`contact-actions.ts`, `qr-verification.ts` were initially missed by the source survey). Playwright browser testing introduced here for public-page verification, used alongside curl for admin routes.
- **REVA** — `reva/apiClient.ts` built from scratch (the one product with no client yet), then `authActions.ts`/`revaActions.ts`/`adminDbActions.ts` repointed and deleted. `awsActions.ts`/`paystackActions.ts` deliberately kept as shared server-side utilities, still imported directly by `paymentService.ts`/`reportService.ts` — not a gap, a documented exception (both files stay `"use server"` but have zero remaining page/component consumers of their own).
- **Surfboard** (largest, ~19 action files) — `surfboard/apiClient.ts` extended from QR-earnings-only to the full route surface; `userActions.ts`, `paystackSubscriptions.ts`, and the dead `migrate/` folder deleted outright; then, in strict grep-verified batches: `auditLogActions.ts`, `authActions.ts`, `settingsActions.ts`, `subscriptionAnalyticsActions.ts`, `verificationActions.ts`, `qrAdminActions.ts`, `profile.ts`, `mdaRemarkActions.ts`, `adminActions.ts`, `subscriptionActions.ts`, `paystackActions.ts`, `ossgActions.ts`, `aiExtractionActions.ts`, `notificationActions.ts`, `awsActions.ts`, `surfboardActions.ts`, and finally `codActions.ts` — the last two, both ~5,000+ line files with ~17-20 real consumers each, closed out the pass. `app/(projects)/(surfboard)/actions/` is now fully empty.

Two small backend gaps surfaced and filled while repointing `codActions.ts`'s consumers, both because a function existed in a service but had never been wired to a route: a dev-only `POST /api/v1/surfboard/cod/batches/reset` route (+ `deleteAllBatches` ported into `remitaVerificationService.ts`, SUPERADMIN-only, refuses outside development) for the debug "wipe all batches" tool in `SubmittedBatchesModal.tsx`; and `GET /api/v1/surfboard/mda/records-ii/batches` (+ `apiClient.mda.recordsII.batches()`) since `getRecordsIIBatches`/`getRecordsIIHistoryBatches` existed in `batchApprovalService.ts` but nothing exposed them.

### Judgment calls made during implementation

- **Preserve exact behavior over "fixing" it, twice** — `awsActions.ts`'s `uploadSurfboardFileToS3` took a `userId` slot every real caller actually filled with `plan.planNumber`, kept exactly rather than switched to the real user id, to avoid changing the S3 key namespace of already-uploaded files. `getPlanPublicUrl` (a server-only base-URL formatter using request headers) became a plain client-side `window.location.origin` computation in `SinglePlan.tsx`, since that component was already `"use client"` and needed no server round-trip for a URL string.
- **Real bugs found and fixed rather than replicated**: silently-swallowed notification failures (`notificationActions.ts`'s helpers checked a legacy cookie session that services calling them internally never had); dropped QR styling options and missing filter/sort forwarding on 3 routes that only ever used service defaults; an eager Paystack-secret-key evaluation at module scope that built fine as a `"use server"` file but threw at production-build time once imported directly by a plain route module (`qrAdminService.ts`, caught and fixed, then proactively avoided in `paystackSubscriptionService.ts`).
- **Two confirmed-dead-code drops, not migrations**: `aiExtractionActions.ts`'s `extractSurveyPlanDataFromPdf`/`extractEBSReceiptFields`/`extractRemitaReceiptFromHtml` (zero real call sites, one only reachable via commented-out code); `verificationActions.ts`'s `verifyPlanRecordCopy` (imported but never called — the one apparent consumer runs its own client-side verification instead).
- **`proxy.ts`'s middleware dependency turned out to be a non-issue** — the spec flagged extracting `getUserAndActiveSub` out of `subscriptionActions.ts` as a special middleware-safe step; grep confirmed the import was dead code, never actually called, so the fix was deleting an unused import plus its stale comment, not a careful extraction.

### Verification performed

- `tsc --noEmit`, `vitest run` (242/242), and a full production build all clean after every commit in the sequence above, not just at the end — the same per-step discipline used throughout Phases 2-4.
- A repo-wide `grep` for every deleted file's old import path confirmed zero remaining references at each step, and a final sweep for `"use server"` directives across `app/`, `reva/`, `surfboard/`, `gbc/` after `codActions.ts`'s deletion turned up only the expected survivors: REVA's two intentionally-kept utility files, plus a handful of `utils/`-level auth/cookie helpers (`revaAuth.ts`, `surfAuth.ts`, `customCookieSetter.ts`) that were never in scope for this phase — they live outside any product's `actions/` folder and were never enumerated in the source inventory.
- **Live smoke pass (2026-09-02)**: real curl+minted-native-JWT sessions against a scratch `next dev` server on the local Postgres (no real Kinde login needed — the same `signAccessToken`/`access_token_{platform}` cookie mechanism `withAuth` verifies). REVA: `auth/me`, admin request/user lists, and a user's own properties all real 200s for freshly-seeded USER/SUPERADMIN accounts. Surfboard (the deeper pass, since this is what this phase's Surfboard step actually changed): a real plan created via `POST /plans`, then a `CertificateOfDepositBatch` seeded directly via Prisma at `LASG_PAID` (real `POST /cod/batches` needs a PostGIS raw-SQL zone lookup this machine's local Postgres can't run — the same environment gap Phase 4's report already flagged, not something this phase's changes touch), walked through the real HTTP decision routes for every MDA stage in dependency order (Charting → Surcon → Records I → Accounts → Intake → Records II → Archive), plus batch list/get, pending-counts, plan-lock claim/release, the dev-only reset tool, and dashboard analytics — 25/25 real 200s. All seeded rows deleted and confirmed at 0 afterward. **Not exercised**: the guest one-time-property submission (real external Paystack call + multipart upload, unchanged this phase, already verified in Phase 3) and real Kinde-authenticated admin-panel page rendering (same documented gap as every prior phase).
- The merge of `rebuild/foundations` to `main` via PR (per the standing rule that `main` is never pushed to directly) has not happened yet.

### Next up

Open the PR merging `rebuild/foundations` into `main`.
