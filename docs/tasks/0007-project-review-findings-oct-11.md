# TASK-0007: Session Batch — 2026-10-11 (Project Review: Certificate Leak, File Privacy, Hardening)

- **Status:** In Progress (all code fixes merged to dev and main except the P2 fix PR; waiting to promote to prod; bucket privacy still open)
- **Priority:** Critical
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `docs/review-findings-2026-10-11` / PR #340 (record only; fixes get their own branches)
- **Created:** 2026-10-11 UTC
- **Started:** 2026-10-11 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Record the findings of the 2026-10-11 review of the work done by other AIs since 2026-10-09 (PRs #313–#339) and fix them in priority order. No fix starts without the maintainer's go. Related decisions: [ADR-0008](../adr/0008-gbc-certificate-access.md), [ADR-0010](../adr/0010-guarded-production-data-changes.md), [ADR-0012](../adr/0012-multi-provider-storage-and-surveyor-file-privacy.md).

---

## 2. Work Breakdown (Grouped by Module)

- [x] **P0: public certificate page leaks attendee data (live on prod).** `certificate/[ticketNumber]/page.tsx` and `verify/[publicId]/page.tsx` pass the whole ticket row to the client component, so the page source contains the holder's email, phone, `paymentRef`, price, `paymentDetails`, the check-in admin, the ticket QR URL and `certificatePublicId`. Anyone with a ticket number (6 hex characters, guessable) can read them. Fix: pass only name, ticket number, check-in time and the event fields. _(Waiting on: go to fix)_ Merged to dev 2026-10-11 (PR #341); not yet on main/prod.
- [ ] **P0: surveyor files are still publicly readable.** The new signed-URL gateway is not enough: stored `reva-store` S3 URLs (213 red copies, 2,063 plans with PDFs) answer anonymous requests with 200. Make the bucket private (and check the GBC ticket QR images in the same bucket), then migrate stored URLs to keys. ADR-0012 and TASK-0005 should not say "completed" until this is done. _(Waiting on: roji-tech / AWS admin)_ **(blocked: needs the AWS admin; PR #343 only limits the gateway)**
- [x] **P1: legacy QR and email links still point at the guessable page.** The PDF and the email use `/gbc/certificate/<ticketNumber>`, not `/gbc/verify/<publicId>`. Switch both to the verify URL once the page stops leaking. Merged to dev 2026-10-11 (PR #342); not yet on main/prod.
- [x] **P1: the PDF does not use the frozen event fields.** The page reads `certificateEventName` and friends; `gbc/pdf-worker/certificate.render.cjs` still reads `ticket.editionRef`. Editing an edition changes the PDF but not the page. Merged to dev 2026-10-11 (PR #342); not yet on main/prod.
- [x] **P1: nobody can download yet, and old certificates are stranded.** The 3 sent tickets were test sends: no backfill, sent count reset to 0 on 2026-10-11 (backup in `out/`); new sends are issued automatically (PR #342).
- [x] **P1: OTP signing key falls back to other secrets and a hard-coded string.** `certificateOtpService.ts` uses `CERTIFICATE_OTP_SECRET`, else `AUTH_SECRET`, `NEXTAUTH_SECRET`, `KINDE_CLIENT_SECRET`, else a constant in the source. Set a dedicated `CERTIFICATE_OTP_SECRET` in Vercel and make the code fail closed in production when it is missing. Merged to dev 2026-10-11 (PR #342); secret set in Vercel by roji-tech; not yet on main/prod.
- [x] **P1: signed file links can be made long-lived.** `files/view` takes `expiresIn` from the query string without a cap, so the "5-minute" link can be minted for days. Clamp it. Also review the ownership test (`contains: key` on the plan's URL fields, and trusting URL fields a user can set). Merged to dev 2026-10-11 (PR #343); not yet on main/prod.
- [x] **P2: CI hides migration problems.** `migrate-production.yml` now ends both `prisma migrate status` steps with `|| true`. Keep it on the pre-flight step only; the post-flight check should fail the job. Merged to dev 2026-10-11 (PR #343); not yet on main/prod.
- [x] **P2: smaller items, fixed in this batch:** OTP email sent after the response (PR #344); lockout counted per email and IP; certificate download token moved from the URL to a POST body and the old GET route retired; `getClientIp` prefers platform headers; local storage adapter refuses keys that leave the upload folder (fix PR open, 2026-10-12).
- [ ] **P2: still open (optional).** An attacker can still use up a holder's 5 code requests per hour and send them emails; a captcha (such as Cloudflare Turnstile) on the request form would stop it. Needs a new service and keys. _(Waiting on: roji-tech decision)_

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean (each fix branch)
- [x] `vitest run` clean (867 to 873+ passing across the fix branches)
- [ ] (Check after promotion to prod) Page source of `/gbc/certificate/<ticketNumber>` and `/gbc/verify/<publicId>` checked for leaked fields after the fix
- [ ] Anonymous request to a stored `reva-store` object returns 403 after the bucket change
- [x] Guarded data change verified: no backfill was needed; sent count reset to 0 for the 3 test tickets with a backup, an exact-3-rows guard and a check (2026-10-11)

---

## 4. Deliverables

- **Commits:** none yet
- **PR:** #340 (docs)
- **Artifacts / Backups:** none yet

---

## 5. Notes

- ADR-0012 and TASK-0005 say the file privacy work is complete. An accepted ADR is not rewritten (ADR rules): once the bucket is private, record it in a new ADR that follows ADR-0012.
- `docs/functions/*.md` must be updated in the same change for any service-layer function touched (`certificateOtpService`, `certificateService`, `awsService`).
