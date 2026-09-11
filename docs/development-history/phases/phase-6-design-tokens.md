# Phase: Design System Rebuild Phase 6 — Design Token Foundation

**Status:** Complete. **Date:** 2026-09-11.

## Why

The 2026-08 architecture rebuild (Phases 0–5) covered the backend/routing
architecture; it never touched styling. Dark mode infrastructure already
exists — `hooks/useTheme.tsx` (class-based, persisted, respects OS
preference), `tailwind.config.ts`'s `darkMode: "class"`, and a `ThemeToggle`
component already wired into the Surfboard/GBC navbars — but coverage is
wildly inconsistent: Surfboard dashboards touch `dark:` in ~12/112 files
(mostly from a recent redesign pass), REVA ~6/97, GBC ~2/36, the main
marketing site 0/22, the shared `components/` library ~37/89.

The root cause isn't missing `dark:` classes — it's that each product's
palette (`SURFBOARD_COLORS`, `REVA_COLORS`, `GBC_COLORS`) is a plain TS
object of hex strings, applied via inline `style={{ color:
SURFBOARD_COLORS.primary.main }}`. Inline styles can't respond to a CSS
class toggle, so wherever `dark:` classes were added ad hoc, they sit next
to inline hex that never changes — exactly the "colors/backgrounds don't
match" symptom reported. `app/globals.css` defines zero semantic color
tokens today (no `--background`/`--foreground`/etc., only font and
scrollbar variables). REVA even has a half-built `REVA_CSS_VARS` export
that's never actually injected anywhere — dead code pointing at the right
idea, never finished.

This phase builds the real token system once, so Phases 7–10 (per-product
page work) have something correct to build on instead of propagating the
same inline-hex pattern to more pages.

## Design principles (apply to this phase and every one after it)

- **Restraint over decoration.** Fewer colors, used consistently, beats
  many colors used loosely. Each product keeps one brand primary + one
  accent; everything else (surfaces, borders, text) comes from the shared
  neutral scale so pages don't compete with their own chrome.
- **Contrast is non-negotiable.** Every text/background pairing introduced
  or touched meets WCAG AA (4.5:1 body text, 3:1 large text/icons) in both
  themes — checked, not eyeballed.
- **Consistent elevation language.** One shadow scale, one border-radius
  scale, reused everywhere (cards, modals, dropdowns) instead of each page
  inventing its own. A dark theme uses subtle borders/lighter surfaces for
  separation, not the same drop-shadows that work on a light background.
- **Don't reinvent shadcn's primitives.** `components/ui/*` already gives
  buttons, inputs, cards, dialogs a consistent shape — token migration
  should make them theme-correct, not redesign them.

## Scope

- [x] Define shared semantic tokens in `app/globals.css` — `--background`,
      `--foreground`, `--surface`, `--surface-muted`, `--border`,
      `--muted-foreground`, `--success`, `--warning`, `--danger`, `--info` —
      light values in `:root`, dark overrides in `.dark`. These back every
      shadcn `components/ui/*` primitive and any UI that isn't
      brand-colored.
- [x] Define per-product brand tokens (`--brand-primary`,
      `--brand-primary-dark`, `--brand-primary-light`, `--brand-secondary`,
      `--brand-accent`) scoped under a `[data-product="surfboard|reva|gbc"]`
      attribute. Values mirror the existing `SURFBOARD_COLORS`/
      `REVA_COLORS`/`GBC_COLORS` TS files exactly (comment cross-references
      the `.ts` file so the two stay in sync) — those files remain the
      source of truth since PDF workers and canvas rendering can't consume
      CSS vars.
- [x] ~~Extend `tailwind.config.ts` with matching color utilities~~ —
      **changed during execution**, see "Deviations from the plan" below.
- [x] Add the `data-product` attribute to each product's root layout —
      **done one level higher than originally scoped**, see "Deviations"
      below.
- [x] Migrate the shared component library off inline `colorPalette` hex
      onto token classes — the highest-leverage, highest-risk step, since
      every product's dashboard renders through these:
      `components/sidebars/menu.tsx`, `components/sidebars/sidebar.tsx`,
      `components/dashboard/StatCard.tsx`, `DashboardHero.tsx`,
      `DashboardBadge.tsx`, `DashboardSearch.tsx`, `DateRangeFilter.tsx`,
      `components/admin-panel/*`, `components/auth/*`. Once migrated, the
      DOM scope supplies the right brand color automatically — no more
      prop-drilling a color object through every layer.
- [x] Leave PDF/canvas consumers untouched — `gbc/pdf-worker/*.cjs`,
      `surfboard/pdf-worker/*.cjs`, `PieChart.tsx`'s canvas fill keep
      reading the `*_COLORS` TS constants directly; they render outside the
      DOM and don't need dark mode. Confirmed via `git diff main...` stat:
      zero `.cjs`/pdf-worker files touched on this branch.

## Deviations from the plan

- **Tokens live in `app/globals.css` via Tailwind v4's `@theme` directive,
  not `tailwind.config.ts`.** Checking the compiled dev output (Turbopack)
  for `tailwind.config.ts`'s existing `theme.extend` entries —
  `accordion-down`/`accordion-up` keyframes, the `font-bricolage` and
  `shadow-shadow` utilities — found none of them in the actual CSS shipped
  to the browser. There is no `@config` directive anywhere in the CSS
  entry point, and Tailwind v4 only reads a JS config file when one is
  explicitly imported that way — so `tailwind.config.ts` has been dead
  configuration since the v4 migration, unrelated to this phase. `@theme`
  is the v4-native mechanism and was used instead; the file itself was
  left alone (out of scope to fix separately).
- **`data-product` was added at each product's route-group root layout**
  (`app/(projects)/(surfboard)/layout.tsx`, `app/(projects)/(reva)/reva/layout.tsx`,
  `app/(projects)/(reva)/reva-restricted/layout.tsx`,
  `app/(projects)/(GBC)/layout.tsx`) instead of the more specific files the
  plan named. Since it's a plain DOM attribute inherited through the whole
  subtree, one attribute at the outermost wrapper covers every nested
  layout — public site, user dashboard, admin panel, and (for Surfboard)
  the MDA shell — in a single edit per product, rather than four separate
  ones. GBC's admin layout in particular needed no direct edit: it already
  nests inside the product root layout that now carries the attribute.

## Bugs found and fixed along the way

Three components silently defaulted to REVA's brand color (or worse, one
sniffed `window.location.pathname` for `/surfboard` to decide) regardless
of which product actually rendered them — the exact "colors don't match"
symptom this phase exists to fix, just not yet visible because no other
product had adopted the affected components in practice:

- `components/sidebars/sidebar.tsx` picked `SURFBOARD_COLORS` vs.
  `REVA_COLORS` by checking the current URL path, falling back to REVA for
  anything that wasn't `/surfboard*`.
- `components/sidebars/menu.tsx`'s avatar-fallback gradient and
  online-status dot fell back to `require("@/reva/colors").REVA_COLORS`
  whenever no `colorPalette` prop was passed.
- `components/admin-panel/sheet-menu.tsx` unconditionally imported
  `REVA_COLORS` for its background — no fallback logic at all, just always
  wrong for any other product.

All three now read the CSS var tokens, which resolve correctly per
product via `[data-product]` with no JS branching and no props to
thread through.

## Verification

- `tsc --noEmit` clean after every commit on this branch.
- Computed-style check (Playwright + the real compiled stylesheet):
  `[data-product="surfboard"|"reva"|"gbc"]` each resolve the correct
  brand hex for `--color-brand-primary`/`-dark`/`-light`, and
  `--color-background`/`--color-foreground` flip correctly under `.dark`.
- Visual regression: GBC homepage screenshot unchanged before/after the
  token foundation commit (nothing consumed the tokens yet at that point).
- **Real authenticated end-to-end pass** (not just synthetic checks): reset
  a Surfboard test account's password directly in the dev DB, logged in
  via Playwright driving the actual login form, and screenshotted the
  surveyor dashboard, admin dashboard, and MDA dashboard — all three, in
  both light and dark mode. Confirmed the sidebar rail, `StatCard` icon
  tints, `DashboardShell` header/content backgrounds, and the auth login card all
  render with the correct brand color and correct theme, with zero
  prop-drilled color objects. Found and fixed one real bug this way (a
  stale dev-server Postgres connection causing a raw-query 500 on the
  Analytics tab — resolved by restarting the dev server, not a code
  change; documented in case it recurs).
- REVA's and GBC's *authenticated* dashboards were not separately
  live-tested this pass (no REVA/GBC test account was available without a
  bulk user lookup, which the environment's own safety classifier
  declined to run) — their public/unauthenticated pages were visually
  confirmed instead (GBC homepage, REVA marketing site). Flagged as a
  verification gap to close at the start of Phase 8/9 if not done sooner.
- PDF/certificate generation: no PDF-worker file was touched on this
  branch (confirmed via `git diff main... --stat`), so the existing
  Phase-5-era verification still holds; not re-run here since there was
  nothing to regress.

## Completion report

Shipped across 4 commits on `design-system/phase-6-tokens`
(PR #66 — title updated mid-flight to reflect the implementation, not just
the planning docs):

1. `314280f` — shared semantic + per-product brand CSS vars in
   `app/globals.css`, `[data-product]` on all three products' root layouts.
2. `135e5e2` — migrated `StatCard` (5 call sites across Surfboard/REVA/GBC)
   off prop-drilled `colorPalette.primary.main/.light` onto the tokens.
3. `d3d8e66` — migrated `DashboardShell` (Surfboard admin/MDA shell) and
   the four auth-card components (`AuthSplitLayout`, `NativeAuthCard`,
   `ResetPasswordCard`, `VerifyEmailCard`) off inline hex/`colorPalette`.
4. `1e1623e` — fixed `sheet-menu.tsx`'s unconditional `REVA_COLORS` usage.

`DashboardHero.tsx`, `DashboardBadge.tsx`, and `DateRangeFilter.tsx` were
reviewed and intentionally left unchanged: the first's `gradient` prop is
deliberate per-product art direction (each product's hand-tuned hero
gradient, not a bug), and the other two already had full `dark:` coverage
with no per-product coupling. `components/admin-panel/navbar.tsx`,
`user-nav.tsx`, `content-layout.tsx`, `collapse-menu-button.tsx`, and
`sidebar-toggle.tsx` were found to be dead code (zero live consumers —
`ContentLayout`'s own `<Navbar>` call is commented out) and left alone
rather than styling something nothing renders.

One REVA-specific decision worth flagging for Phase 8: `REVA_COLORS`'
shape doesn't match Surfboard/GBC's (`primary.main` is a dark-ink color
used for headers, not a mid-tone brand color like the other two products'
`primary.main`). The token mapping treats `primary.light` (`#008cff`, the
vivid blue REVA actually uses for CTAs/accents) as `--brand-primary`, and
`primary.main` (`#032740`) as `--brand-primary-dark` — documented in
`globals.css` with the reasoning. This means REVA's shared-component
brand-tinted UI (e.g. `StatCard` tone="brand") now renders that vivid blue
instead of navy by default, a deliberate correction, not a regression.

Ready for Phase 7 (Surfboard page-by-page pass) once REVA/GBC authenticated
verification is either completed or explicitly deferred.
