# Phase: Design System Rebuild Phase 8 — REVA Theming & Responsiveness

**Status:** In progress — mechanical dark-mode sweep complete across both shells (54/54 identified files), live-verified against a real authenticated admin account. Responsiveness pass not yet started. **Date:** 2026-09-11, continued 2026-09-14.

## Why

Same token system, same treatment, applied to REVA's user dashboard and
admin panel — currently ~6/97 files touch `dark:` at all. Design principles
from `phase-6-design-tokens.md` apply unchanged.

## Scope

Work through every page listed in `docs/pages/reva.md`:

- [x] User dashboard (`/reva/dashboard/*`) — dark-mode sweep done across
      all identified files (all-requests, details, new-request/request-form,
      notifications, settings, verify-payment, view-map). Live-verified:
      the public request-form page only; the rest not individually
      screenshotted this session (see Completion report gap note).
- [x] Admin panel (`/reva-restricted/dashboard/*`) — dark-mode sweep done
      across all identified files. Live-verified: dashboard home and
      All-Requests (with real seeded data). Not individually
      live-verified: details, notifications, payment-verification, review,
      settings, spatial-record, superadmin (swept but unscreenshotted).
- [ ] Responsiveness pass at 375px / 768px / 1024px+ — not started.

## Verification plan

- `tsc --noEmit` clean.
- Light + dark screenshots of both shells' key pages at the three widths
  above, shown before moving to Phase 9.

## Completion report

**Session 1 (2026-09-11, uncommitted-to-main WIP found and continued 2026-09-14):**
mechanical sweep pairing bare gray/slate/zinc utility classes with dark:
equivalents, 23 of 54 identified files (commit `efad982`), plus a fix for a
dark:hover ordering bug the sweep script introduced — `hover:bg-gray-200`
picked up an unconditional `dark:bg-...` instead of `dark:hover:bg-...`
(commit `3b856bf`). Both REVA panel layouts' content-pane background moved
from a REVA-specific `bg-zinc-50`/`dark:bg-zinc-900` onto the shared
`bg-background` token.

**Session 2 (2026-09-14): remaining 31 files + two bug classes the original
sweep script never covered, found by rewriting the sweep with three passes
instead of one:**

1. **className sweep** (24 files, 258 edits) — same bare-class-to-dark-pair
   convention, rewritten to fix two regex bugs discovered live before they
   could ship:
   - The bare-class regex (`\bbg-gray-100\b`) also matched inside
     `hover:bg-gray-100` (a colon-to-letter transition is a valid `\b`), so
     it fired *in addition to* the explicit `hover:` rule, appending an
     unprefixed `dark:bg-...` right next to the correct
     `dark:hover:bg-...` — silently applying that background
     unconditionally instead of only on hover. Exactly the bug class
     session 1 already hand-fixed once; this time closed at the regex
     level with a `(?<!:)` negative lookbehind so it can't recur.
   - Tailwind opacity suffixes (`bg-white/70`) satisfy the same bare regex,
     so the dark pair got spliced *inside* the token —
     `bg-white/70` → `bg-white dark:bg-surface/70` — silently promoting the
     light-mode class to fully opaque and stealing the `/70` onto the new
     dark class instead. Exactly the bug Phase 7 found and hand-fixed for
     `bg-slate-50/60`; this time the regex consumes the optional `/\d+` as
     part of the match so it can't split a token again.
2. **Gradient-wrapper sweep** (8 files, 12 edits) — the same "static grep
   doesn't match gradient utilities" gap Phase 7 found: page-root
   `bg-linear-to-* from-{color}-50/100/200 to-...` wrappers with zero dark
   coverage (would render as a light card on a dark page). Fixed with
   `dark:from-background dark:to-background`; explicitly left saturated
   brand gradients (e.g. `from-blue-700 to-blue-900`) untouched since
   they're fine in both themes by design.
3. **Ternary/string badge sweep** (3 files, 21 edits) — the biggest gap:
   status badges built as `className={cond ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`
   never match a `className="..."` regex at all, so both prior sweeps
   missed every one. Paired with the established Phase 7 convention
   (`dark:bg-{color}-500/15` + `dark:text-{color}-300`).

**Verification:**
- `tsc --noEmit` clean after every pass.
- Two full `next build` runs (not just `tsc`) — after the className sweep
  and again after all three passes — both exited 0 with zero prerender
  errors. Running an actual build rather than trusting `tsc` alone is a
  lesson from this same session's Surfboard/MDA PR, which passed `tsc`
  clean but broke Vercel's real build over a missing Suspense boundary
  elsewhere in the codebase.
- **Real authenticated live pass**: created a disposable REVA `ADMIN`
  account + one seeded `Property` request directly in the dev DB (no bulk
  user lookup needed, avoiding the classifier block Session 1's
  verification hit), logged in via Playwright driving the actual
  `/reva-restricted/login` form, screenshotted the admin dashboard home
  and the All-Requests page (the exact `RequestsList.tsx` component this
  session edited, with real seeded data rendering the request card, badges,
  and stat header) in both themes at 1440px. Also screenshotted the public
  `/reva/requestform` page (`RevaDueDiligenceForm.tsx`, 36 of the session's
  edits) unauthenticated. All three confirmed correct in both themes — no
  regressions, no unreadable text, no stray light panels. Test account and
  seeded request deleted after verification.
- REVA *user* dashboard's authenticated pages beyond the public request
  form (e.g. `/reva/dashboard/*`) were not live-verified this session —
  flagged as a gap, same as Session 1's note about REVA/GBC authenticated
  coverage.

**Not yet done:** the responsiveness pass (375px/768px/1024px+) hasn't
started — this session focused entirely on closing the dark-mode gap.
