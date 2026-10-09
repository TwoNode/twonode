# TASK-0002: Session Batch — 2026-10-08 to 2026-10-09 (Certificate Handoff, Data Correction, ADRs & Access Security)

- **Status:** In Progress
- **Priority:** Critical
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `dev`, `main`, `prod` / PR #310, PR #311, PR #312, PR #313, `feat/gbc-certificate-access`
- **Created:** 2026-10-08 08:00:00 UTC
- **Started:** 2026-10-08 08:00:00 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Execute comprehensive certificate handoff, resolve long attendee name clipping via dynamic font scaling (#310), correct anomalous issue dates on staging and production RDS, formalize ADR documentation architecture (#311), and implement ADR-0008 certificate access security overhaul (public verify-only pages, emailed OTP download tokens, and edition data freezing).

---

## 2. Work Breakdown (Grouped by Module)

### Module A: GBC Certificates & Layout

- [x] **Certificate work handoff pack:** Documented all pending certificate fixes, edge cases, and architectural roadmap in `out/certificate-handoff.md`.
- [x] **Long names run off the certificate (#310):** Handled names up to 67 characters with dynamic canvas font scaling for 1-line and 2-line layouts. Merged to `dev` in #310, merged to `main` in #312 (2026-10-09 05:42 UTC), release PR #313 opened to `prod`. Live preview verified.
- [ ] **Release #310 long name fix to production:** PR #313 awaiting merge to `prod`.

### Module B: Database Data Integrity & Audits

- [x] **Odd issue dates correction:** Audited all 147 checked-in tickets. Tickets `GBC2_c3de35` and `GBC2_2aff9d` exhibited dates of Nov 30, 2025 and Jul 9, 2026. Backed up to CSV and corrected both to `2026-04-30 10:00:00 UTC` in guarded transactions on `twonode_staging` and `twonode_db` (RDS). Verified on live URLs.

### Module C: Architecture & ADR Governance

- [x] **Architecture Decision Records (ADRs):** Recorded ADRs 0001 through 0011 with 11 strict rules, `template.md`, and index. Merged to `dev` (#311), merged to `main` (#312), in release PR #313.

### Module D: ADR-0008 Certificate Access Security Overhaul

- [x] **Schema migration for OTP & edition freeze:** Added `GBCCertificateOtp` model, `certificatePublicId`, `certificateIssued`, `certificateIssuedAt`, and frozen edition fields to `GBCTicket`. Generated migration SQL and Prisma client.
- [x] **Keyed HMAC OTP service (`certificateOtpService.ts`):** 6-digit cryptographic OTP, keyed HMAC-SHA256 comparison, generic timing-safe responses, browser nonce cookie `cn` binding, 5-attempt lockout, and signed 15-minute download token.
- [x] **Verify-only public endpoint & UI:** Created `app/(projects)/(GBC)/gbc/verify/[publicId]/page.tsx` displaying attendee name, event, issue date, and validity banner without exposing PII or PDF. Added `noindex, nofollow` to `/gbc/certificate/[ticketNumber]`.
- [x] **OTP request & verification API routes:** Built `/api/v1/gbc/certificates/request-code`, `/api/v1/gbc/certificates/verify-code`, and `/api/v1/gbc/certificates/download`. Protected `/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf` against unauthenticated direct access.
- [x] **Verification page OTP modal flow:** Updated `CertificateClient.tsx` with "Are you the holder? Request certificate copy" modal supporting the 2-step OTP verification flow.
- [x] **Unit & integration test suite:** Automated vitest coverage for OTP lifecycle, token signatures, anti-enumeration, and browser binding (855 tests passing platform-wide).
- [x] **Open PR into `dev`:** Pushed branch `feat/gbc-certificate-access` and opened [PR #314](https://github.com/TwoNode/twonode/pull/314) into `dev` (2026-10-09 10:17 UTC).

---

## 3. Unified Verification Gates

- [x] Staging preview build and bypass verification (`x-vercel-protection-bypass`)
- [x] Guarded database transactions verified on RDS with row count assertions
- [x] `npx tsc --noEmit` clean across certificate access changes
- [x] `npx vitest run` passes all 855 test suites across 76 test files
- [x] `npx prettier --check` clean across modified files

---

## 4. Deliverables

- **PR #310 / PR #312:** Long names scaling merged to dev & main
- **PR #311 / PR #312:** ADR documentation merged to dev & main
- **PR #313:** Open release PR `main` → `prod` (Release: long names fix + ADRs)
- **PR #314:** Open feature PR `feat/gbc-certificate-access` → `dev` (ADR-0008 certificate access security overhaul)
- **Branch `feat/gbc-certificate-access`:** Complete ADR-0008 security implementation
- **Backups:** `out/staging-odd-dates-backup.csv`, `out/prod-odd-dates-backup.csv`
