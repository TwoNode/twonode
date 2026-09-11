# Phase: Design System Rebuild Phase 11 — Cross-Cutting QA & Regression Pass

**Status:** Planned — blocked on Phases 6–10. **Date:** 2026-09-11.

## Why

Five phases of page-by-page work touching ~140 pages across four sections
inevitably misses a few spots or introduces small regressions along the
way. This phase is the final sweep: confirm the whole app is consistent in
both themes before calling the initiative done.

## Scope

- [ ] Full click-through of every page across all four sections
      (dashboards + public sites) in both light and dark, at
      375px/768px/1440px.
- [ ] Fix any straggler found (missed `dark:` coverage, leftover inline
      hex, contrast failures, responsive breakage).
- [ ] Confirm `docs/pages/`, `docs/components/`, `docs/functions/` still
      match reality — this initiative is styling-only so file locations
      shouldn't move, but flag and fix any doc drift found.
- [ ] Confirm certificate/receipt PDF generation (GBC + Surfboard) still
      renders correctly — those workers must still be reading the
      `*_COLORS` TS constants, untouched by the token migration.
- [ ] Write the completion report below and close out
      `docs/development-history/progress.md`'s entry for this initiative.

## Verification plan

- `tsc --noEmit` clean.
- Screenshot review across all sections/themes/widths — the actual sweep
  this phase exists to do, not a separate check on top of it.

## Completion report

_Not started yet._
