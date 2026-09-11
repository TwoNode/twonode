# Phase: Design System Rebuild Phase 7 — Surfboard Theming & Responsiveness

**Status:** Planned — blocked on Phase 6 landing first. **Date:** 2026-09-11.

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

- [ ] Surveyor dashboard (`/surfboard/dashboard/*`) — reconcile this week's
      ad-hoc `dark:` classes onto the new `bg-brand-primary`/token classes,
      replace any remaining inline `SURFBOARD_COLORS` usage.
- [ ] MDA shell (`/surfboard-mda/*`) — currently near-zero dark-mode
      coverage; bring every stage queue (intake, records-i/ii, charting,
      surcon, accounts, archive) up to parity with the surveyor dashboard.
- [ ] Admin panel (`/surfboard-restricted/*`) — same treatment: analytics,
      map, plans, CoD, certificates, KYC, QR-earnings, user-management,
      audit-logs, superadmin.
- [ ] Responsiveness pass at 375px / 768px / 1024px+ on every page above —
      fix any overflow, cramped touch targets, or broken grid collapse
      found along the way (not a separate audit — fixed as each page is
      touched for theming).

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of each shell's key pages (dashboard home, one
  representative list/table page, one form page) at the three widths
  above, shown before moving to Phase 8.

## Completion report

_Not started yet._
