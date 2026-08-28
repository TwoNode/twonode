# Phase: Architecture Rebuild Phase 5 — Retirement

**Status:** Spec written, execution starting. **Date:** 2026-08-28.

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

_(Filled in once this phase finishes — see every prior phase's file for the structure this will follow.)_
