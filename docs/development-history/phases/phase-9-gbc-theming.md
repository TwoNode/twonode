# Phase: Design System Rebuild Phase 9 — GBC Theming & Responsiveness

**Status:** Planned — blocked on Phase 6 (and ideally Phases 7–8, so patterns are proven). **Date:** 2026-09-11.

## Why

Same token system, same treatment, applied to GBC's admin panel — currently
~2/36 files touch `dark:`, effectively no real coverage. Design principles
from `phase-6-design-tokens.md` apply unchanged. (GBC's public/ticketing
pages are handled in Phase 10 along with the other products' public pages.)

## Scope

Work through the `/gbc-restricted/*` section of `docs/pages/gbc.md`:

- [ ] Admin dashboard home, attendees, certificates, check-in, editions,
      gallery, inquiries, notifications, settings, speakers, sponsors,
      tickets, users.
- [ ] Responsiveness pass at 375px / 768px / 1024px+ on every page above,
      fixed as each page is touched for theming.

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of the admin panel's key pages at the three
  widths above, shown before moving to Phase 10.

## Completion report

_Not started yet._
