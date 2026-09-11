# Phase: Design System Rebuild Phase 7 — Surfboard Theming & Responsiveness

**Status:** Complete — batches 1-3 shipped (PR #67, #68, #69, and this
session's follow-up PR). **Date:** 2026-09-11.

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
  surface is gone. `tsc --noEmit` clean. Verified under real load: seeded
  120 dummy `SurfboardPlan` rows spread across 12 months for the test
  account, fired 30 concurrent `getUserDashboardAnalytics()` calls via
  `Promise.allSettled` (the same shape of load — 8 parallel queries per
  call — that used to intermittently break under `$queryRaw`), got 30/30
  successes with identical `timeTrends` output across every call, then
  deleted the seeded rows. No recurrence of the original error.

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

**Batch 2 (this session, follow-up): 31 of the ~45 remaining pages spot-checked
live**, light+dark, at 1440px, via a scripted authenticated Playwright pass
(screenshot every page, flag any with >15% near-white pixels as a heuristic
for un-migrated backgrounds, then eyeball the flagged ones). Found and fixed
four real bugs the batch-1 sweep missed, all now confirmed live in both
themes:

- **`surfboardUserPanelLayout.tsx`'s content pane** set its background via
  `style={{ background: theme === "dark" ? "#0B1A26" : ... }}` — React-state
  driven, not the CSS-token cascade the rest of Phase 6/7 uses. Under a
  desync between the `theme` context and the DOM's `.dark` class (the
  surveyor shell is the only layout still wired this way), the whole content
  pane rendered light with barely-visible text while the sidebar/header
  (already token-based) rendered dark. Replaced with `bg-background`;
  removed the now-fully-dead `theme`/`useTheme` usage from the file.
- **`slate-*` color family never covered by batch 1's sweep.** The original
  regex only targeted `gray-*`/`white`; 12 files across the codebase use
  `slate-*` instead, none of it dark-aware. Surveyor Settings and both
  shells' QR-Earnings pages had page-level hero gradients/banners
  (`bg-linear-to-br from-slate-50 ...`, `text-slate-900`) with zero `dark:`
  variants — legible-breaking in dark mode (dark-on-dark or light-panel-on
  dark-page). Hand-fixed Settings' hero gradient + cards; wrote a scoped
  Python sweep (same "pair bare utility with its dark: equivalent, skip if
  a dark: already exists for that property family" approach as batch 1, but
  for `slate-*`) for the other 11 files with `slate-*` usage.
  - The sweep script produced two real regressions, both caught by
    re-screenshotting rather than trusting the mechanical pass: (1) it
    matched `QRPaywallModal.tsx`, a modal that's intentionally
    always-dark-styled (`bg-slate-900`, hardcoded regardless of site theme)
    — reverted that file entirely, it needed no `dark:` variants. (2) on
    `bg-slate-50/60` (an opacity-suffixed class), the regex inserted the
    `dark:` class *before* the `/60` suffix instead of after it, silently
    stripping the intended translucency from the light-mode class in two
    files (`qr-earnings/page.tsx` in both the surveyor and admin shells) —
    hand-fixed both.
- **Notification-card unread background** (`typeColors` map in
  `surfboard/dashboard/notifications/page.tsx`): `bg-blue-50`/`bg-green-50`/
  etc. per notification type, no `dark:` variants — unread cards rendered as
  a near-white panel with white-on-near-white title text. Added a
  `dark:bg-{color}-500/10` + `dark:border-{color}-500/20` tint per type
  (the existing text colors already had correct `dark:` variants, so only
  the backgrounds needed it).

**Also fixed this session (unrelated to dark mode, found while verifying
against a real login):** the dev environment itself had `KINDE_SITE_URL`
pinned to `http://localhost:3000` in `.env`, and an unrelated project's dev
server (ApproveHR, a different repo entirely) was squatting on port 3000 —
Kinde's own `withAuth` middleware builds its unauthenticated-redirect URL
from that env var, so any logged-out request landed on a stranger's app
instead of this one's login page. Stopped that process and moved this
project's dev server onto port 3000 to match `KINDE_SITE_URL`; confirmed
the redirect now resolves to a same-origin relative path.

**Batch 3 (this session, follow-up): remaining ~14 pages covered** — all
auth pages (login/error-login/reset-password/verify-email across all three
shells), the public homepage, the badge page, both plan-detail pages
(single view + edit, via a temporary seeded test plan), the payment and
subscription callback pages, and the admin plan-update page (confirmed its
access-guard redirect works correctly, couldn't view its authenticated
content without re-elevating the test account's role, which this session
chose not to do again for a single page). Two more real bugs found and
fixed:

- **Admin `error-login` page** (`surfboard-restricted/(auth)/error-login/page.tsx`)
  had zero dark-mode treatment at all — a standalone page (not using
  `AuthSplitLayout`), entirely light regardless of theme. Contrast with the
  surveyor/MDA equivalents, which already show a dark card on a
  (deliberately theme-independent, brand-gradient) light backdrop and are
  fine. Added `dark:` variants directly rather than rebuilding it onto
  `AuthSplitLayout` (a bigger change than this bug warranted).
- **Single-plan detail page's header card and section banners** — the same
  `from-{color}-50 to-{color}-50` gradient-strip pattern as the Settings/
  QR-Earnings hero fixes in batch 2, this time in `SinglePlan.tsx` (the
  page actually wired to `/surfboard/dashboard/plan`) — the near-identical
  `OptimizedSinglePlanDetails.tsx` in `components/` looked like the same
  component at a glance and was fixed too, but turned out to be unused by
  any route; fixed for consistency in case it's wired up later, but the
  real bug was only visible through `SinglePlan.tsx`. Also fixed the
  payment-callback page's success/error info boxes (`bg-green-50`/
  `bg-red-50`, no `dark:` variant).

**Confirmed fine, no changes needed:** all auth pages (already routed
through the Phase 6-fixed `AuthSplitLayout`/`NativeAuthCard` family), the
badge page, both subscription-related pages (the subscription/callback
page in particular already fully dark-themed with no gaps).

**Out of scope, noted for later phases (not fixed here):**
- The public marketing homepage (`/surfboard`) has an un-migrated light
  section below its hero (`bg-white`-ish, `text-white` heading rendering
  invisible-on-light) — belongs to Phase 10 (public/marketing sites), not
  this dashboard-focused phase.
- The public plan-verification page (`/surfboardplan/[id]`) has no dark
  mode treatment either — same reasoning, it's a public page outside
  Phase 7's three authenticated shells.

**Phase 7 status:** every page in `docs/pages/surfboard.md` across all
three shells has now been individually verified at least once (the ~45
count from batch 1 is fully worked through across all three batches).
Ready to move to Phase 8 (REVA) once this batch's PR lands.
