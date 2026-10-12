# TASK-0009: Session Batch — 2026-10-11 (/v4: edits on a copy of the /v3 prototype port)

- **Status:** In Progress
- **Priority:** Medium
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `feat/v4-edits` / PR pending
- **Created:** 2026-10-11 UTC
- **Started:** 2026-10-11 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

`/v3` stays exactly as the prototype port (maintainer's instruction). `/v4` is a copy of it where edits are made. This first pass makes only defect fixes that need no content decision.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Done in /v4

- [x] Copy `/v3` to `/v4` (`app/v4`, `public/v4`), `noindex`. `/v3` untouched.
- [x] Real TwoNode logo (`/logo.svg`) instead of the prototype's placeholder mark, header and footer
- [x] Text floor of 12px (was 9–11px) via an appended override block in `v4.css`: undersized text elements 21 → 0 after the second pass
- [x] Touch targets of 44px for footer links, text links, story chapter index, brand and (on touch devices) nav and menu button
- [x] **Proof numbers hard-coded** in `app/v4/data/proof.ts`. First as the prototype had them; then, on 2026-10-12, changed to figures from the live database (read-only count 2026-10-11) rounded down with a "+": 125+ registered surveyors (127 Surfboard USER accounts), 2,300+ plans (2,358), 11,000+ beacons (11,493); places Lagos, Ogun, Ondo, Oyo, FCT; since 2025. Not read from the database at runtime.
- [x] Pages added: `/v4/contact`, `/v4/insights`, `/v4/insights/[slug]`, `/v4/industries/[slug]` (data copied from `/v2`: `app/v4/data/`). Header gained "Insights"; "Let's talk" goes to `/v4/contact` off the home page.
- [x] Active / Next chips on the three work cards, the footer and industry pages (Surfboard and GBC Active, REVA Next, as on `/v2`)
- [x] Footer redesigned (navy, gradient edge, logo, tagline, call to action, social pills, four link columns, RC number and address, back to top); no "all systems active" claim

### Module B: Not done yet (needs a decision or more work)

- [ ] **Survey plan photo** (real client plan; crop shows beacon labels). _(Waiting on: roji-tech)_
- [x] **Phone number** `+234 916 0002 740` confirmed correct; the old number replaced on the live site in PR #352. Social links still to confirm. _(Waiting on: roji-tech)_
- [ ] Insight articles still carry the `/v2` draft text ("Draft — to be replaced with the real write-up."); write the real copy before /v4 goes public _(Waiting on: roji-tech)_
- [ ] `/v4` data files are copies of `/v2`'s; keep one source when `/v2` is retired
- [ ] Hero first frame is mostly empty; diagram text sizes inside the canvas. (Tablet and mobile layout moved to TASK-0010, Module D.)
- [ ] Type `motion.ts` (currently `@ts-nocheck`)

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean
- [x] No horizontal scroll at 390 / 768 / 1440; no page errors
- [x] Undersized text re-measured in the browser
- [x] Seven /v4 pages rendered at 1440 / 768 / 390: no page errors, no horizontal scroll
- [ ] Visual review of /v4 by roji-tech

---

## 4. Deliverables

- **Commits:** none yet
- **PR:** pending

---

## 5. Notes

- Page height grows by about 140px (desktop) and 230px (mobile) because of the larger tap targets.
- Only the header is compared against `/v3` side by side; the rest was checked by measurement, not by eye.
