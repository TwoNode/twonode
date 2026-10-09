# TASK-0001: Session Batch — 2026-10-05 to 2026-10-07 (Map Corrections, Prod DB Audit & Certificate Fixes)

- **Status:** Completed
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `main` / PR #291, PR #295, PR #297, PR #298, PR #300, PR #307
- **Created:** 2026-10-05 10:00:00 UTC
- **Started:** 2026-10-05 10:00:00 UTC
- **Ended:** 2026-10-07 16:30:00 UTC
- **Duration:** 2 days 6 hrs 30 mins

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Deliver coordinate shift corrections for Lagos, resolve pillarless and missing-state plans on production without owner disruption, verify database migrations state, and fix initial GBC certificate layout and dynamic routing issues.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Surfboard Maps & Coordinate Shifts

- [x] **CSV uploads get Lagos correction:** CSV uploads without explicit state are automatically assigned the Lagos coordinate correction (`surfboard/utils/csvState.ts`). Released in PR #291.
- [x] **Plans with no pillars (58 on prod):** 58 plans on prod had 0 to 2 pillars (26 with none, 32 with 1-2). Shifted stored outline on screen by PR #300; confirmed on staging and released to prod in PR #307. No owner notified by decision.
- [x] **Plans with no state defaulted to Lagos:** Null/empty state plans defaulted to Lagos on prod and staging (2026-10-06) and test_db (2026-10-07). Backups saved in `out/*-missing-state-backup.csv`.
- [x] **Ogun, Ondo, Oyo, FCT shift values:** Audited shift parameters; none exist currently, remaining uncorrected until parameters are supplied.
- [x] **Example of an uncorrected plan:** Scrapped by decision 2026-10-07.
- [x] **CSV upload right after page load:** Scrapped by decision 2026-10-07.

### Module B: Database & Migrations

- [x] **Prod database migrations check:** Audited production RDS `_prisma_migrations`; confirmed `0_init` applied cleanly.

### Module C: GBC Certificates

- [x] **Wrong name on every certificate link:** Fixed by awaiting Next.js dynamic params in PR #295; `getTicketByNumber` now rejects empty inputs. Released to prod 2026-10-06.
- [x] **Web page matches PDF design:** Aligned certificate web view typography, layout, and colors with generated PDF. Released in PR #297 and PR #298.
- [x] **Prod edition 2.0 held wrong event:** Updated event association on prod 2026-10-07 (backup saved in `out/prod-gbc-edition-2.0-backup.csv`).

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean across all modified files
- [x] Staging previews deployed and validated on Vercel
- [x] Production database transactions guarded with backups and row count assertions
- [x] Live certificate URLs and map views verified

---

## 4. Deliverables

- **PRs:** #291, #295, #297, #298, #300, #307 (all merged to prod)
- **Database Backups:** `out/*-missing-state-backup.csv`, `out/prod-gbc-edition-2.0-backup.csv`
