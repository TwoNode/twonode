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

## Known dev-environment flake (not a code bug)

Hit the same `getTimeTrend` raw-query error from Phase 6's verification
twice more during this phase's testing — including once immediately after
a full dev-server restart, which ruled out the "stale long-lived
connection" explanation from Phase 6. Isolated reproduction (the exact
same query, run standalone) succeeds every time; it only fails under the
dashboard's real concurrent request load (8 parallel queries fired via
`Promise.all` in `getUserDashboardAnalytics`). Most likely a Postgres
prepared-statement/connection-pool interaction under concurrency, not a
logic bug — flagged here in case it recurs, not fixed (out of scope for a
styling phase, and not reproducible in isolation to actually debug).

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
