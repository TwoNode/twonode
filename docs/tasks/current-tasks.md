# Current Tasks (Live Dashboard)

State as of 2026-10-09 10:25 UTC: PR #312 merged into main. PR #313 opened (main→prod) for long-name fix and ADRs (awaiting user merge). Odd issue dates corrected on staging and prod RDS. ADR-0008 certificate access change in progress on `feat/gbc-certificate-access`.

---

## Active Session Batch

**Current Batch:** [`TASK-0002: Session Batch — 2026-10-08 to 2026-10-09`](./0002-certificate-handoff-and-access-oct-08-09.md)  
**Active Branch:** `feat/gbc-certificate-access`  
**Started:** 2026-10-08 08:00:00 UTC | **Status:** `In Progress`

### Active Working Checklist

- [x] Odd issue dates corrected on staging and prod RDS (Nov 30, 2025 and Jul 9, 2026 → Apr 30, 2026)
- [x] PR #312 merged to `main` (long name font scaling + ADRs)
- [x] PR #313 opened `main` → `prod` (Release: long names fix + ADRs)
- [x] Database migration SQL & schema updated for OTP model and frozen edition fields
- [x] `certificateOtpService.ts` built (keyed HMAC, browser cookie binding, 5-attempt lockout, signed download token)
- [x] API routes built (`request-code`, `verify-code`, `download`, and direct PDF route lockdown)
- [x] Verify-only public page created (`/gbc/verify/[publicId]`)
- [x] "Are you the holder? Request certificate copy" OTP modal added to `CertificateClient.tsx`
- [x] Write unit & integration tests (`vitest run`) for OTP service and routes
- [x] Quality gates check (`npx tsc --noEmit` clean, `vitest` 855 passed, `prettier` clean)
- [ ] Commit with attribution footer and open PR to `dev`

---

## Open Tasks Waiting on Action

- **PR #313 Merge to Prod:** [PR #313](https://github.com/TwoNode/twonode/pull/313) is open and waiting on user merge to release long-name fix and ADRs to production. _(Waiting on: roji-tech)_
- **GOOGLE_MAPS_SERVER_API_KEY:** Waiting on Google Cloud project owner to enable billing before setting in Vercel. _(Waiting on: roji-tech / Cloud Admin)_
- **Paystack Renewal Webhook:** Waiting on live renewal event payload log to verify payload schema. _(Waiting on: roji-tech)_
- **Activate GBC 3.0 on Prod:** Edition 2.0 is past; admin dashboard activation needed when ready. _(Waiting on: roji-tech / Admin)_
- **Staging Password Rotation:** Neon console password rotation needed. _(Waiting on: roji-tech)_

---

## Session Batches & Sprints Summary

| #                                                          | Batch Title                                         | Period                  | Modules                                | Status        |
| ---------------------------------------------------------- | --------------------------------------------------- | ----------------------- | -------------------------------------- | ------------- |
| [0001](./0001-initial-corrections-oct-05-07.md)            | **Initial Corrections & Production Audit**          | 2026-10-05 – 2026-10-07 | Maps, Database, Certificates           | `Completed`   |
| [0002](./0002-certificate-handoff-and-access-oct-08-09.md) | **Certificate Handoff, Data Fix & Access Security** | 2026-10-08 – Present    | Certificates, Security, Database, ADRs | `In Progress` |
| [0003](./0003-active-backlog.md)                           | **Active Backlog & Upcoming Integrations**          | Active Backlog          | Payments, REVA, DevOps, Auth           | `Pending`     |
