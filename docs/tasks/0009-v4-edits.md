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

### Module B: Not done yet (needs a decision or more work)

- [ ] **Proof numbers** (9,567 plans / 38,431 beacons / 4 states / since 2023) vs prod (2,369 plans, earliest 2025). _(Waiting on: roji-tech)_
- [ ] **Survey plan photo** (real client plan; crop shows beacon labels). _(Waiting on: roji-tech)_
- [ ] **Phone number** `+234 916 0002 740` vs live `/v2` `+234 706 9227 677`; social links. _(Waiting on: roji-tech)_
- [ ] Contact page, industries and insights pages, Active/Next statuses (REVA presented as equal to Surfboard)
- [ ] Hero first frame is mostly empty; tablet layout review; diagram text sizes inside the canvas
- [ ] Type `motion.ts` (currently `@ts-nocheck`)

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean
- [x] No horizontal scroll at 390 / 768 / 1440; no page errors
- [x] Undersized text re-measured in the browser
- [ ] Visual review of /v4 by roji-tech

---

## 4. Deliverables

- **Commits:** none yet
- **PR:** pending

---

## 5. Notes

- Page height grows by about 140px (desktop) and 230px (mobile) because of the larger tap targets.
- Only the header is compared against `/v3` side by side; the rest was checked by measurement, not by eye.
