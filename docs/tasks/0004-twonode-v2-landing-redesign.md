# TASK-0004: Twonode Landing Page & /v2 Redesign (Design Selection & Implementation)

- **Status:** Completed
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `dev`
- **Created:** 2026-10-09 11:25:00 UTC
- **Started:** 2026-10-09 15:55:00 UTC
- **Ended:** 2026-10-10 00:15:00 UTC
- **Duration:** 8h 20m

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Review and evaluate candidate artboard frames from [`out/TwoNode_V2_Design_Canvas.html`](../../out/TwoNode_V2_Design_Canvas.html), select the winning design direction for the TwoNode corporate web presence, and implement high-craft, production-ready Next.js components for `/v2` (with path to root `/` cutover).

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Design Review & Aesthetic Selection

- [x] **Design canvas evaluation & winner selection:** Selected **`18. Nodes`** (Brand Network Graph &bull; Sora + DM Sans + JetBrains Mono, doubled-down kinetic motion design). Pruned all other 20 exploratory concepts from `out/TwoNode_V2_Design_Canvas.html` (2026-10-09).
- [x] **Mobile layout selection:** Built dedicated `Nodes Mobile (390px)` artboard with vertical traverse timeline, compact radial graph, and touch interactions in `out/TwoNode_V2_Design_Canvas.html` (2026-10-09).
- [x] **Route & cutover strategy:** Refined staging preview at `/v2` with authentic PRB editorial content and doubled-down kinetic motion before cutover to root `/` (2026-10-10).

### Module B: Typography, Design Tokens & Core Styling

- [x] **Setup font configurations:** Configured Google font pairings via `next/font/google` in `app/v2/layout.tsx` (Sora, DM Sans, JetBrains Mono, Fraunces) (2026-10-10).
- [x] **CSS token architecture:** Defined CSS custom properties (colors, surface elevation, borders, accents, subtle glow, typography scale) for `[data-site="v2"]` in `app/globals.css` (2026-10-10).
- [x] **Responsive viewport primitives:** Established baseline fluid layout containers (1440px desktop, tablet, 390px mobile) (2026-10-10).

### Module C: Component Implementation (`app/v2/components/`)

- [x] **Header / Navigation (`NavV2.tsx`):** Animated TwoNode kinetic mark (coral pulse + connecting bridge + obsidian node), anchor links, contact CTA, and mobile hamburger drawer (2026-10-10).
- [x] **Opening Section (`Opening.tsx` & `HeroNetworkGraph.tsx`):** Hero headline with dual cadence, contextual eyebrow, and interactive kinetic SVG network graph with floating satellites and packet flow (2026-10-10).
- [x] **Methodology Section (`HowWeBuild.tsx`):** Flowing statement with animated glowing traverse beam underneath (2026-10-10).
- [x] **Industries Grid (`Industries.tsx`):** Dual-industry showcase (Surveying & Geospatial with Surfboard/GBC, Real Estate with REVA) with live status beacons and product capsules (2026-10-10).
- [x] **The Bigger Idea Section (`BiggerIdea.tsx`):** Four-row thesis card highlighting "Sometimes it's all three" in coral (2026-10-10).
- [x] **What We Believe (`WhatWeBelieve.tsx`):** Three foundational principles (Understand deeply, Build simply, Connect the pieces) bound by dashed Integrity banner (2026-10-10).
- [x] **Proof & Field Traction (`Proof.tsx`):** Structured evidence rows (Workshops with surveyors, Institutional ministry engagement, GBC annual summit) (2026-10-10).
- [x] **Our Story Teaser (`OurStory.tsx`):** Editorial Obsidian narrative banner with ambient radial glow and pill link (2026-10-10).
- [x] **Inside TwoNode Insights (`InsideTwoNode.tsx`):** 3-card curated thought-leadership preview with tags and hover micro-animations (2026-10-10).
- [x] **Call to Action & Footer (`WhatsNext.tsx` & `FooterV2.tsx`):** High-conversion closing banner ("Build with us") and upgraded 4-column Obsidian footer with editorial quote ribbon, live status beacon, and back-to-top action (2026-10-10).

### Module D: Interactive Polish, Responsive & Micro-interactions

- [x] **Micro-animations & transitions:** Kinetic SVG animations (`ndp`, `nd-orbit-spin`, `nd-packet-drift`, `nd-float`, `nd-shimmer-beam`) (2026-10-10).
- [x] **Mobile responsive polish (390px - 768px):** Hamburger menu, mobile drawer, stacked cards, and centered radial graph (2026-10-10).

### Module E: Metadata, SEO & Accessibility

- [x] **Metadata & OpenGraph:** Configured title, description, OpenGraph card, and favicon in `app/v2/layout.tsx` (2026-10-10).
- [x] **Accessibility audit:** Semantic HTML tags (`header`, `main`, `footer`, `section`, `nav`), WCAG color contrast, and keyboard-navigable links (2026-10-10).

---

## 3. Unified Verification Gates

- [x] `npx tsc --noEmit` passes clean with zero TypeScript errors (2026-10-10).
- [x] All unit tests pass (`npx vitest run`: 76/76 test files, 855/855 tests passed) (2026-10-10).

---

## 4. Deliverables

- **Design Reference:** [`out/TwoNode_V2_Design_Canvas.html`](../../out/TwoNode_V2_Design_Canvas.html)
- **Target Route:** `/v2` (staging preview) &bull; subsequent cutover to `/`
- **Branch:** `dev`
- **Commits:** Pending commit on `dev`
