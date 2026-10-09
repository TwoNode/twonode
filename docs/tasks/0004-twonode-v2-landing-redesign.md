# TASK-0004: Twonode Landing Page & /v2 Redesign (Design Selection & Implementation)

- **Status:** Pending
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `feat/landing-v2-redesign` / TBD
- **Created:** 2026-10-09 11:25:00 UTC
- **Started:** Pending
- **Ended:** Pending
- **Duration:** Pending

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Review and evaluate 22 comparison artboard frames from [`out/TwoNode_V2_Design_Canvas.html`](../../out/TwoNode_V2_Design_Canvas.html), select the winning design direction for the TwoNode corporate web presence, and implement high-craft, production-ready Next.js components for `/v2` (with path to root `/` cutover).

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Design Review & Aesthetic Selection

- [ ] **Design canvas evaluation:** Review candidate design directions in [`out/TwoNode_V2_Design_Canvas.html`](../../out/TwoNode_V2_Design_Canvas.html) against TwoNode's brand thesis ("We build for industries. We connect every actor in the ecosystem."):
  - `01. Obsidian Slate Studio` (Recommended Dark Studio &bull; Plus Jakarta Sans + Newsreader, cyan glow)
  - `02. Swiss Alabaster Monograph` (Light Architectural &bull; Plus Jakarta Sans, warm stone)
  - `03. Cadastral Blueprint` (Deep Navy HUD &bull; Space Grotesk, laser grid, coordinates engine)
  - `04. Monocle Edition` (Intellectual Editorial &bull; Playfair Display, forest green & parchment)
  - `05. Minimal Indigo` (Linear-Style SaaS Precision &bull; Inter, purple accents)
  - `06. Cyber-Brutalist Ledger` (Raw Monospace &bull; JetBrains Mono, acid lime, terminal telemetry)
  - `07. Neo Aurora` (Tier-1 Tech &bull; Stripe-style kinetic mesh, Plus Jakarta Sans)
  - `08. Bauhaus Modernist` (Structural Grid &bull; Space Grotesk, bold Swiss architecture)
  - `09. Tri-Partite Ecosystem Hub` (Interactive Flywheel &bull; Surfboard + GBC + REVA node mapping)
  - `13. Contour` (Survey Topography &bull; Manrope + Fraunces, ink green + safety orange)
  - `14. Dispatch` (Long-Form Chapter Rail &bull; Bricolage Grotesque + Newsreader, electric cobalt)
  - `15. Registry` (Official Record &bull; Manrope + IBM Plex Mono, verification stamps, ledger rows)
  - `16. Spectrum` (Product Bento &bull; Bricolage Grotesque, category color chips)
  - `18. Nodes` (Brand Network Graph &bull; Sora + DM Sans, animated pulse nodes)
  - `19. Deck` (Keynote Slides &bull; Archivo, high-impact expanded type)
  - `20. Showcase` (Product-Led Mockups &bull; Figtree, real UI preview windows & tickets)
  _(Waiting on: roji-tech / Design Selection Decision)_
- [ ] **Mobile layout selection:** Determine mobile responsive archetype (e.g. Frame 17 `Contour Mobile`, Frame 10 `Mobile Dark`, or Frame 11 `Mobile Light`). _(Waiting on: roji-tech)_
- [ ] **Route & cutover strategy:** Decide rollout path: refine staging preview at `/v2` first vs direct cutover to root `/`. _(Waiting on: roji-tech)_

### Module B: Typography, Design Tokens & Core Styling

- [ ] **Setup font configurations:** Configure chosen Google font pairings via `next/font/google` in `app/v2/layout.tsx` (e.g. Manrope/Fraunces, Plus Jakarta Sans/Newsreader, or Bricolage Grotesque).
- [ ] **CSS token architecture:** Define CSS custom properties (colors, surface elevation, borders, accents, subtle glow, typography scale) in `app/globals.css` or scoped `v2` stylesheet.
- [ ] **Responsive viewport primitives:** Establish baseline grid, fluid spacing tokens, and max-width layout containers (1440px desktop, tablet, 390px mobile).

### Module C: Component Implementation (`app/v2/components/`)

- [ ] **Header / Navigation (`NavV2.tsx`):** Brand mark with status pill, anchor links (Industries, How We Build, Our Story, Insights), and primary CTA button.
- [ ] **Opening Section (`Opening.tsx`):** Hero headline with dual cadence ("Every industry has its own way of working... Then we build."), contextual eyebrow, and visual centerpiece (topographic mesh, node graph, or cadastral HUD).
- [ ] **Methodology Section (`HowWeBuild.tsx`):** 5-step traverse / linear flow (Go where work is &rarr; Learn industry &rarr; Understand people &rarr; Identify breakdown &rarr; Build around gaps).
- [ ] **Industries Grid (`Industries.tsx`):** Dual-industry showcase:
  - *Surveying & Geospatial (Active):* Surfboard (digital survey records) + GBC (industry forum).
  - *Real Estate (Next):* REVA (intelligent due diligence & spatial title verification).
- [ ] **The Bigger Idea Section (`BiggerIdea.tsx`):** Four-row thesis (Software &bull; Workflow &bull; Convening &bull; All three).
- [ ] **What We Believe (`WhatWeBelieve.tsx`):** Three foundational principles (Understand deeply, Build simply, Connect the pieces) bound by Integrity.
- [ ] **Proof & Field Traction (`Proof.tsx`):** Concrete milestones (Workshops with surveyors, Institutional ministry engagement, GBC annual summit).
- [ ] **Our Story Teaser (`OurStory.tsx`):** Editorial narrative banner with link to `/v2/our-story`.
- [ ] **Inside TwoNode Insights (`InsideTwoNode.tsx`):** 3-card curated thought-leadership preview with tags (Industry observations, Founder perspectives, Product stories) linking to `/v2/insights`.
- [ ] **Call to Action & Footer (`WhatsNext.tsx` & `FooterV2.tsx`):** High-conversion closing banner ("Build with us"), partner contact action, and comprehensive brand footer.

### Module D: Interactive Polish, Responsive & Micro-interactions

- [ ] **Micro-animations & transitions:** Refined hover states on product cards, subtle SVG animations (contour warp / node pulse), and accessible `prefers-reduced-motion` fallbacks.
- [ ] **Mobile responsive polish (390px - 768px):** Hamburger menu, vertical station stepper, stacked bento cards, and responsive typography clamp.
- [ ] **Interactive elements:** Plan preview widgets, live status pills, and chapter navigation rail (if Dispatch/Monocle pattern selected).

### Module E: Metadata, SEO & Accessibility

- [ ] **Metadata & OpenGraph:** Configure title, description, keywords, OpenGraph card, and Twitter cards for `/v2`.
- [ ] **Accessibility audit:** Verify WCAG 2.1 AA color contrast, screen reader landmarks, keyboard focus rings, and valid semantic markup.

---

## 3. Unified Verification Gates

- [ ] `npx tsc --noEmit` passes clean with zero TypeScript errors
- [ ] `npm run build` succeeds without build or SSR warnings
- [ ] Cross-browser visual validation (Chrome, Firefox, Safari, Mobile viewport)
- [ ] Lighthouse accessibility score &ge; 95

---

## 4. Deliverables

- **Design Reference:** [`out/TwoNode_V2_Design_Canvas.html`](../../out/TwoNode_V2_Design_Canvas.html)
- **Target Route:** `/v2` (staging preview) &bull; subsequent cutover to `/`
- **Branch:** `feat/landing-v2-redesign` (or current working branch)
- **Commits:** Pending
