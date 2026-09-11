# Phase: Design System Rebuild Phase 8 — REVA Theming & Responsiveness

**Status:** Planned — blocked on Phase 6 (and ideally Phase 7, so patterns are proven). **Date:** 2026-09-11.

## Why

Same token system, same treatment, applied to REVA's user dashboard and
admin panel — currently ~6/97 files touch `dark:` at all. Design principles
from `phase-6-design-tokens.md` apply unchanged.

## Scope

Work through every page listed in `docs/pages/reva.md`:

- [ ] User dashboard (`/reva/dashboard/*`) — all-requests, details,
      new-request, notifications, settings, verify-payment, view-map.
- [ ] Admin panel (`/reva-restricted/dashboard/*`) — all-user-requests,
      details (including the report/receipt PDF-download buttons — visual
      only, not the PDF content itself), notifications (list/create/manage),
      payment-verification, review, settings, spatial-record, superadmin.
- [ ] Responsiveness pass at 375px / 768px / 1024px+ on every page above,
      fixed as each page is touched for theming.

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of both shells' key pages at the three widths
  above, shown before moving to Phase 9.

## Completion report

_Not started yet._
