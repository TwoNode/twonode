# 0008. GBC certificate access: verify publicly, download with an emailed code

- **Status:** Proposed
- **Date:** 2026-10-09
- **Decided by:** roji-tech
- **Related:** PR #295 (wrong-name fix), PR #310 (long names), [0011](./0011-branches-and-environments.md), `app/(projects)/(GBC)/gbc/certificate/`, `app/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf`, `gbc/services/certificateService.ts`
- **Enforced by:** Vitest tests (`certificateAccess.test.ts`), atomic database constraints on `gbc_certificate_otps`, and CI check (`npx vitest run && npx tsc --noEmit`)

## Context

The certificate page and the PDF download were public and needed only a ticket number (`GBC2_` plus 6 hex characters, which is ~24 bits of entropy and easily guessable). The page did not check that anyone qualifies: 93 of the 240 tickets were never checked in, yet each could open a "Certificate of Attendance". Every PDF download ran a heavy renderer child process. Certificates also read the edition live, so editing an edition retroactively altered certificates already given out.

## Decision

1. **Verify-only public endpoint:**
   - Both `/gbc/verify/<publicId>` (a random 128-bit base64url/UUID token) and existing `/gbc/certificate/<ticketNumber>` links act as **verify-only** pages.
   - They display: full attendee name, event name, date range, venue, issuer ("TwoNode Technologies"), and certificate validity status.
   - **No download button** is provided on verification pages. `X-Robots-Tag: noindex` is set.
   - Uniform 404 response is returned whether a ticket does not exist or has no certificate issued.
2. **Holder PDF download requires an emailed code:**
   - The attendee enters their email on the download request form.
   - A 6-digit one-time code is sent **only** to the email stored on the ticket (never to a typed address).
   - Response message and response time are uniform whether or not a certificate exists ("If an issued certificate exists for this email address, a 6-digit verification code has been sent.").
   - Codes are stored as keyed `HMAC-SHA256` (not plain SHA-256) and bound to the requesting browser via a secure `cn` nonce cookie.
   - Capped at 5 wrong attempts per code (10-minute expiry, single use). 10 failed attempts across codes locks the email for 15 minutes.
   - Upon successful verification, the server issues a short-lived download token (valid for 2 minutes) and streams the PDF directly with `Cache-Control: no-store`.
3. **Explicit admin issuance & content freezing:**
   - Certificates are granted via admin action (`certificateIssued = true`, `certificateIssuedAt = NOW()`), not tied to check-in.
   - Edition details (name, theme, sub-theme, venue, start date, end date) are snapshotted onto the ticket at issue time.

## Alternatives considered and rejected

- **Direct public PDF download via ticket number:** Rejected; allows bulk harvesting and denial-of-service via worker process exhaustion.
- **Attendee passwords / accounts:** Rejected; attendees are guest purchasers; forced account registration creates high friction.
- **Redis for OTP and rate limits:** Rejected; the stack has no Redis, and PostgreSQL-backed tables provide atomic counters without extra infrastructure.
- **Pre-rendering all PDFs to S3:** Rejected; incurs upfront render compute and storage costs for attendees who may never request their PDF.

## Consequences & Downsides

- Attendees without inbox access cannot self-serve download their PDF and require admin assistance.
- OTP requests and validations consume PostgreSQL writes.
- Schema migration must run on `twonode_staging` before staging deployment, and `twonode_db` before prod release (per [ADR 0011](./0011-branches-and-environments.md)).
