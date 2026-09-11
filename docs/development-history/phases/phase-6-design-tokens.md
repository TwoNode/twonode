# Phase: Design System Rebuild Phase 6 — Design Token Foundation

**Status:** Planned — spec written, execution not yet started. **Date:** 2026-09-11.

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

- [ ] Define shared semantic tokens in `app/globals.css` — `--background`,
      `--foreground`, `--surface`, `--surface-muted`, `--border`,
      `--muted-foreground`, `--success`, `--warning`, `--danger`, `--info` —
      light values in `:root`, dark overrides in `.dark`. These back every
      shadcn `components/ui/*` primitive and any UI that isn't
      brand-colored.
- [ ] Define per-product brand tokens (`--brand-primary`,
      `--brand-primary-dark`, `--brand-primary-light`, `--brand-secondary`,
      `--brand-accent`) scoped under a `[data-product="surfboard|reva|gbc"]`
      attribute. Values mirror the existing `SURFBOARD_COLORS`/
      `REVA_COLORS`/`GBC_COLORS` TS files exactly (comment cross-references
      the `.ts` file so the two stay in sync) — those files remain the
      source of truth since PDF workers and canvas rendering can't consume
      CSS vars.
- [ ] Extend `tailwind.config.ts` with matching color utilities
      (`bg-background`, `text-foreground`, `bg-brand-primary`,
      `border-border`, etc.) so components use plain Tailwind classes
      instead of `style={{ ... }}`.
- [ ] Add the `data-product` attribute to each product's root layout:
      `surfboard/layouts/surfboardUserPanelLayout.tsx`,
      `reva/layouts/revaAdminPanelLayout.tsx` /
      `revaUserPanelLayout.tsx`, GBC's admin layout
      (`app/(projects)/(GBC)/gbc-restricted/(admin)/layout.tsx`), and each
      product's public-site layout.
- [ ] Migrate the shared component library off inline `colorPalette` hex
      onto token classes — the highest-leverage, highest-risk step, since
      every product's dashboard renders through these:
      `components/sidebars/menu.tsx`, `components/sidebars/sidebar.tsx`,
      `components/dashboard/StatCard.tsx`, `DashboardHero.tsx`,
      `DashboardBadge.tsx`, `DashboardSearch.tsx`, `DateRangeFilter.tsx`,
      `components/admin-panel/*`, `components/auth/*`. Once migrated, the
      DOM scope supplies the right brand color automatically — no more
      prop-drilling a color object through every layer.
- [ ] Leave PDF/canvas consumers untouched — `gbc/pdf-worker/*.cjs`,
      `surfboard/pdf-worker/*.cjs`, `PieChart.tsx`'s canvas fill keep
      reading the `*_COLORS` TS constants directly; they render outside the
      DOM and don't need dark mode.

## Verification plan

- `tsc --noEmit` clean.
- Screenshot every shared component (sidebar, navbar, stat card, hero
  banner, badges, search, date-range filter, buttons, dialogs, forms) in
  light + dark, once per product — a regression here breaks everything
  downstream, so this gets checked before Phase 7 starts.
- Spot-check certificate/receipt PDF generation still renders correctly
  (workers must keep using the TS constants, not the new CSS vars).

## Completion report

_Not started yet._
