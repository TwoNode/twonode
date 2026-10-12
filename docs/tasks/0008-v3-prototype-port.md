# TASK-0008: Session Batch — 2026-10-11 (Port the static prototype to Next.js as /v3)

- **Status:** In Progress (port done and verified; waiting on roji-tech decisions in Module B)
- **Priority:** Medium
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `feat/v3-prototype-port` / PR pending
- **Created:** 2026-10-11 UTC
- **Started:** 2026-10-11 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Create `out/twonode-website` (the static prototype, gitignored) as Next.js routes under `/v3`, **as it is**, so the maintainer can review and then edit it. No content or design edits in this batch. The comparison with `/v2` is in the session notes below.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Port (as is)

- [x] `/v3` home and `/v3/our-story` as JSX pages, copied from `index.html` and `story.html`
- [x] `v3.css` copied from `styles.css` (only the font stack gained fallbacks) (Done 2026-10-11)
- [x] Motion layer ported from `script.js` into `components/motion.ts` with cleanup (menu and year moved to React)
- [x] Images copied to `public/v3/`
- [x] Compare `/v3` screenshots with the prototype at 1440 / 768 / 390 px: identical page heights, under 1.3% of pixels differ (animated canvas frames)

### Module B: Decisions needed before it can go public (not done; wait for roji-tech)

- [ ] **Proof numbers:** prototype says 9,567 plans, 38,431 beacons, 4 states, since 2023; prod shows 2,369 plans, earliest 2025, Lagos/Ogun/Ondo/Oyo plus one FCT. Pick a source. _(Waiting on: roji-tech)_
- [ ] **Survey plan photo:** a real client's plan; crop shows beacon labels. Get permission or replace. _(Waiting on: roji-tech)_
- [x] **Phone number:** `+234 916 0002 740` confirmed correct by roji-tech 2026-10-12; the old `+234 706 9227 677` was replaced on the live site (`/v2/contact` and the main-site footer). Social links still to confirm.
- [ ] **Logo:** prototype uses an invented blue slash mark, not the TwoNode logo.
- [ ] **Missing from the prototype:** contact page, industries and insights pages, Active/Next statuses.
- [ ] **Accessibility and sizing** to fix when editing: text under 11px (21 elements), tap targets, tablet layout.

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean
- [x] `vitest run` clean (873/873)
- [x] `/v3` and `/v3/our-story` render with no console errors and no horizontal scroll at 320 / 390 / 768 / 1440 (only dev-time preload warnings from the shared not-found page)
- [x] Client-side navigation Home ↔ Story leaves no duplicate scroll bars or listeners

---

## 4. Deliverables

- **Commits:** none yet
- **PR:** pending
- **Artifacts:** `out/twonode-website/` (source prototype, gitignored)

---

## 5. Notes

- `/v3` has its own root layout (like `/v2`) and is set `noindex` until the content decisions above are made.
- The route for the story page is `/v3/our-story`, matching `/v2`.
- `motion.ts` is a verbatim port with `// @ts-nocheck`; type it when the motion layer is edited.
