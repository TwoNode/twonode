# TASK-0006: V2 Motion Design Storytelling, Interactive Trinity & Editorial Polish

- **Status:** Completed
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `dev` → `main` → `prod` (PR #332 & PR #333)
- **Created:** 2026-10-10 19:15:00 UTC
- **Started:** 2026-10-10 19:15:00 UTC
- **Ended:** 2026-10-10 19:36:00 UTC
- **Duration:** 21m

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Transform the TwoNode `/v2` landing page into a world-class, visually intuitive storytelling experience:
1. Strip away synthetic/AI-ish visual markers (glowing neon status pills) in favor of mature human editorial typography (`Industries.tsx`).
2. Upgrade the Hero motion design to visually tell the story of the 6 ecosystem elements (people, information, problems, systems, relationships, opportunities) through an "Understand → Build" kinetic cycle (`Opening.tsx` / `HeroNetworkGraph.tsx`).
3. Replace the dense 50-word paragraph in "How We Build" with a 4-beat visual motion pipeline (Fieldwork → People & Workflows → Locate Fracture → Bridge the Gap) (`HowWeBuild.tsx`).
4. Introduce an interactive, mind-blowing motion canvas in "The Bigger Idea" that visually expresses that solutions can be one thing, two things, or all three (Software + Workflow + The Room) converging into one unified ecosystem (`BiggerIdea.tsx`).
5. Replace the static 3-card + integrity banner in "What We Believe" with a kinetic Motion Triangle connecting: *Understand deeply → Build simply → Connect the pieces*, removing the integrity banner (`WhatWeBelieve.tsx`).
6. Synchronize the design canvas (`TwoNode_V2_Design_Canvas.html`) and deploy through the standard release sequence (`dev` → `main` → `prod`).

---

## 2. Work Breakdown (Grouped by Module)

### Module A: De-AI Industry Status Badges (`Industries.tsx`)
- [x] **Remove AI-ish Neon Pills:** Eliminate rounded glowing background pills (`bg-[#0fb5a6]/10`, `bg-[#ff4d6d]/10`) and hyperactive pulsing beacons (`animation: ndp`). (Done 2026-10-10)
- [x] **Clean Editorial Typography:** Replace buzzwords ("Active Ecosystem", "Next Frontier") with quiet, confident labels: `Active` and `Next`. (Done 2026-10-10)
- [x] **Refined Monospace Metadata:** Align status and product counts (`Active` · `2 Products`, `Next` · `1 Product`) using understated tracking (`font-mono text-xs uppercase tracking-widest text-[#767490]`). (Done 2026-10-10)

### Module B: Hero Motion Design Storytelling (`HeroNetworkGraph.tsx` & `Opening.tsx`)
- [x] **Exact 6-Pillar Ecosystem Mapping:**
  - Core Node 1: `People` (Human operators, surveyors, regulators)
  - Core Node 2: `Information` (Structured land records, titles, data)
  - Orbit Satellites: Exactly the story elements: `Problems`, `Systems`, `Relationships`, `Opportunities`
  (Done 2026-10-10)
- [x] **"Understand, Then Build" Two-Beat Kinetic Cycle:**
  - **Beat 1: "We understand these things" (0–4s):** Ambient radar sweeps and data threads flowing inward from outer friction nodes (`Problems`, `Systems`, `Relationships`, `Opportunities`) into the core (`People` & `Information`).
  - **Beat 2: "Then we build" (4–8s):** The TwoNode bridge illuminates, transferring accelerated data packets and locking the network into a harmonious pulse.
  (Done 2026-10-10)
- [x] **Interactive Node Hover Inspection:** Hovering any node highlights its specific connections and context across the ecosystem. (Done 2026-10-10)

### Module C: "How We Build" Visual Motion Pipeline (`HowWeBuild.tsx`)
- [x] **Deprecate Paragraph Wall of Text:** Replace the 50-word dense block of text with an intuitive 4-beat kinetic pipeline with minimal words. (Done 2026-10-10)
- [x] **4-Beat Visual Pipeline:**
  - **Beat 01 / Field Work:** "Go where the work is" (locating physical ground reality & desks).
  - **Beat 02 / The People:** "Understand the people & workflows" (mapping daily human movement & relationships).
  - **Beat 03 / The Breakdown:** "Pinpoint the breakdown" (visualizing where paper & trust fracture).
  - **Beat 04 / Build:** "Build around the gaps" (TwoNode bridge locking in to close the gap into a continuous, trusted circuit).
  (Done 2026-10-10)
- [x] **Lightweight 60fps Motion:** Pure SVG and CSS hardware-accelerated animations, responsive down to 390px mobile, dark-mode compatible. (Done 2026-10-10)

### Module D: "The Bigger Idea" Interactive Motion Canvas — 1, 2, or All 3 (`BiggerIdea.tsx`)
- [x] **Interactive Triad / Convergence Engine:**
  - Dimension 1: `Software` (Surfboard & REVA)
  - Dimension 2: `Better Workflow` (Streamlined lodgements & standards)
  - Dimension 3: `The Room` (Convening people, GBC summit)
  (Done 2026-10-10)
- [x] **Dynamic Interactive States ("One thing, Two things, or Everything"):**
  - Interactive switches / toggles: `Software`, `Workflow`, `The Room`, and `All Three`.
  - Selecting 1 activates that node with contextual micro-story.
  - Selecting 2 connects their shared axis with bidirectional data pulses.
  - Selecting All 3 triggers the grand convergence: all three nodes gravitated together with radiant central illumination ("Sometimes it's all three").
  (Done 2026-10-10)
- [x] **Auto-cycle + Manual Touch:** Cycles smoothly automatically unless paused or clicked by the user. (Done 2026-10-10)

### Module E: "What We Believe" Kinetic Motion Triangle (`WhatWeBelieve.tsx`)
- [x] **Remove Integrity Banner:** Remove `"Integrity holds all three together — it's what makes any of it trustworthy."` (Done 2026-10-10)
- [x] **Kinetic Motion Triangle Engine:**
  - Vertex A: `01. Understand deeply` (We start with the way work actually happens)
  - Vertex B: `02. Build simply` (Complex problems should result in simple experiences)
  - Vertex C: `03. Connect the pieces` (Value often exists between disconnected players, systems and information)
  - Continuous circulating energy beams traveling around the triangle perimeter: Understand → Build → Connect → Repeat.
  - Interactive vertex hover highlighting each belief and its corresponding principle card.
  (Done 2026-10-10)

### Module F: "Behind the Build" Section Title (`InsideTwoNode.tsx` & `insights/page.tsx`)
- [x] **Title Streamlining:** Updated `"Things we're thinking about."` to `"Behind the Build."` on `/v2` and `/v2/insights`. (Done 2026-10-10)

### Module G: Design Canvas Synchronization (`out/TwoNode_V2_Design_Canvas.html`)
- [x] **Desktop Frame Sync:** Update desktop artboard `frame-nodes` with the new badges, hero graph, pipeline, bigger idea interactive triad, and motion triangle. (Done 2026-10-10)
- [x] **Mobile Frame Sync:** Update mobile artboard `frame-nodes-mobile` with touch-friendly representations. (Done 2026-10-10)

### Module H: Quality Gates & Promotion Sequence (`dev` → `main` → `prod`)
- [x] **Vitest Quality Gate:** Run `npm run test` to verify 100% pass rate (867/867 tests). (Done 2026-10-10)
- [x] **Commit & Push to `dev`:** Commit on local `dev` and push to `origin/dev`. (Done 2026-10-10)
- [x] **Staging PR (`dev` → `main`):** Open PR via `gh pr create` and merge without branch deletion (PR #332). (Done 2026-10-10)
- [x] **Production Release PR (`main` → `prod`):** Open release PR and merge into `prod` (PR #333). (Done 2026-10-10)
- [x] **Local Alignment:** Pull and align local `dev`, `main`, and `prod`. (Done 2026-10-10)

---

## 3. Unified Verification Gates

- [ ] `npm test` clean (867/867 tests passing)
- [ ] Responsive check across desktop (1440px) and mobile (390px)
- [ ] Light & Dark mode visual contrast verification
- [ ] Zero uncommitted changes; branches in lockstep
