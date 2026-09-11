# Phase: Design System Rebuild Phase 7 — Surfboard Theming & Responsiveness

**Status:** In progress — batch 1 shipped (PR #67). **Date:** 2026-09-11.

## Why

Phase 6 builds the token system; this phase spends it on Surfboard's three
shells (surveyor dashboard, MDA officer shell, admin panel) — the platform
with the most existing (but inconsistent) dark-mode work, so it's the
cheapest place to prove the new tokens hold up before doing the same for
REVA and GBC.

Design principles from `phase-6-design-tokens.md` apply here unchanged:
restraint, AA contrast, one shadow/radius scale, no reinventing `ui/*`.

## Scope

Work through every page listed in `docs/pages/surfboard.md`:

- [x] Surveyor dashboard (`/surfboard/dashboard/*`) — dark-mode sweep done
      (21 files). Inline `SURFBOARD_COLORS` usage for hero
      gradients/error-tint accents left as-is (deliberate per-product art
      direction, same call as Phase 6's `DashboardHero`).
- [x] MDA shell (`/surfboard-mda/*`) — dark-mode sweep done (9 files),
      verified live (Intake queue, MDA home) in both themes.
- [x] Admin panel (`/surfboard-restricted/*`) — dark-mode sweep done (21
      files) plus hand-fixes for native `<select>` elements across 4
      pages (User Management, Audit Logs, Secure Plans, Analytics) that
      had no explicit background class at all. Verified live (User
      Management, Admin home) in both themes.
- [x] Shared plan-related components (`app/(projects)/(surfboard)/components/`)
      — a gap the per-shell scoping above didn't originally cover; found
      during verification, swept separately (19 files). Includes the
      shared new-plan/edit-plan form's base style constants — the single
      highest-leverage fix in this phase, since both `SurfboardPlanForm.tsx`
      and `OptimizedSurfboardPlanForm.tsx` reuse the same 8 constants for
      every field in the form.
- [x] Responsiveness spot-check at 375px / 768px / 1024px — the three
      dashboard homes (surveyor, admin, MDA), live-verified. All three
      already collapse/stack correctly at every width with no overflow or
      cramped touch targets; no fixes needed. **Not yet checked**: the
      other ~45 pages in `docs/pages/surfboard.md` beyond these three —
      the mechanical dark-mode sweep doesn't touch layout/breakpoints, so
      those pages' existing responsive behavior (mostly pre-dating this
      phase) is assumed fine but unverified.

## Fixes landed after batch 1

Two issues flagged as out-of-scope during batch 1 were fixed in a follow-up
pass, since both were real bugs rather than styling work:

- **Hardcoded `http://localhost:3000` in auth redirects.** All ten
  `NextResponse.redirect(addBaseUrl(...))` call sites (`login_redirect`,
  `logout_redirect`, and all eight `success/*` platform callback routes)
  built their redirect target from `process.env.BASE_URL`, which `.env` has
  pinned to `http://localhost:3000` — wrong whenever the app runs on a
  different host/port (e.g. this dev server on 3101), and generally fragile
  since it couples every redirect to one env value instead of the actual
  incoming request. Replaced with `new URL(path, request.url)` everywhere,
  so each redirect resolves relative to whatever host/port/protocol the
  request actually arrived on. `utils/addBaseUrl.ts` itself is untouched —
  it's still correct for the two remaining non-redirect callers
  (`paystackActions.ts`'s webhook callback URL, `notificationService.ts`'s
  email links) that genuinely need an absolute, externally-reachable URL
  rather than one relative to an internal request.
- **`getTimeTrend` concurrency flake.** Previously a `$queryRaw` tagged-SQL
  call (`DATE_TRUNC`/`TO_CHAR` grouping); reproduced the
  `argument of WHERE must be type boolean, not type jsonb` error twice more
  during this phase's testing, including once immediately after a full
  dev-server restart (ruling out Phase 6's "stale connection" theory).
  Isolated reproduction of the exact query always succeeded — it only broke
  under `getUserDashboardAnalytics`'s real concurrent load (8 parallel
  queries via `Promise.all`), pointing at a Postgres
  prepared-statement/connection-pool collision between concurrent
  `$queryRaw` calls, not a logic bug. Fixed by removing the raw query
  entirely: `getTimeTrend` now uses a type-safe `findMany` (same
  `planType`/`createdAt`/`userId` filters) and buckets by month in JS. Same
  output shape, no raw SQL left in the concurrent batch, so the collision
  surface is gone. `tsc --noEmit` clean; not able to re-trigger the original
  concurrency scenario for a before/after comparison since this dev
  database currently has zero seeded `SurfboardPlan` rows.

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of each shell's key pages (dashboard home, one
  representative list/table page, one form page) at the three widths
  above, shown before moving to Phase 8.

## Completion report

**Batch 1 (this session, PR #67 — merged pending review):** the mechanical
dark-mode sweep across all three shells plus the shared components gap,
hand-fixes for native selects and JS-driven stat-card colors, and a
responsiveness spot-check on the three dashboard homes. `tsc --noEmit`
clean throughout; live-verified against a real authenticated test account
(temporarily elevated to SUPERADMIN, restored to USER after each session)
in both themes.

**Still open:** individual light+dark verification of the ~45 remaining
pages beyond the ones spot-checked here (each shell's list/table pages,
form pages, and settings pages) — the sweep should have gotten most of
them right mechanically (same patterns, same fix), but per the plan's own
verification bar, "should have" isn't "verified." Next session should
either continue spot-checking a wider sample or do a full page-by-page
pass before marking this phase complete.
