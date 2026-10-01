# Phase: Design System Rebuild Phase 10 — Public/Marketing Sites Theming & Responsiveness

**Status:** Planned — blocked on Phases 6–9 (dashboards) landing first. **Date:** 2026-09-11.

## Why

Per your call: dashboards (where the `ThemeToggle` already lives, and where
the mismatch is most visible day-to-day) come first; public/marketing pages
follow once the token system is proven across all three products' logged-in
experiences. This phase covers everything currently at 0/22 files touching
`dark:` — the shared TwoNode corporate site — plus each product's own
public pages.

## Scope

- [ ] Main corporate site — every page in `docs/pages/main-site.md`
      (homepage, about-us, contact, events, featurednews, gallery,
      services, present, login/signup, the standalone grid tools).
- [ ] GBC public site — the `/gbc/*` section of `docs/pages/gbc.md`
      (homepage, about, contact, gallery, speakers, sponsors, editions,
      tickets, certificate view, login).
- [ ] REVA public site — the `/reva/*` (non-dashboard) section of
      `docs/pages/reva.md`.
- [x] Surfboard homepage (`/surfboard`) — done ahead of this phase, outside
      phase tracking: fully redesigned on real design tokens with `.dark`
      overrides, plus a page-level light-default + nav toggle
      ([PR #99](https://github.com/roji-tech/twonodes/pull/99),
      [PR #100](https://github.com/roji-tech/twonodes/pull/100), 2026-09-15).
      See the resolved note in `phase-7-surfboard-theming.md`.
- [ ] Surfboard public site — the rest of the `/surfboard/*` (non-dashboard)
      section of `docs/pages/surfboard.md`, plus the public plan viewer
      (`/surfboardplan/[id]`) — still open.
- [ ] Responsiveness pass at 375px / 768px / 1024px+ on every page above,
      fixed as each page is touched for theming.
- [ ] Decide per-page whether dark mode is actually wanted on purely
      marketing pages that commit to one visual identity (e.g. a hero
      section deliberately designed dark-only) — not every public page
      needs a light/dark toggle if the page's own design already commits to
      one look; flag these rather than forcing a token swap that adds
      nothing.

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of each site's key pages (homepage + 2–3
  representative others) at the three widths above, shown before moving to
  Phase 11.

## Completion report

_Not started yet._
