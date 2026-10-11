# Issues Register

The list of known and *possible* problems in the twonodes apps, ranked so debugging can be prioritised. Review work adds to it; fixes tick it. Same habit as `docs/tasks/`: update it in the same turn as the work, never delete an entry, no secrets or customer emails.

- **One file per confirmed issue:** `ISSUE-NNNN-short-title.md`, from [template.md](./template.md). Small ones can stay as a row in the register below until they need detail.
- **Task link:** when a fix is scheduled, add it to the live batch in [`../tasks/`](../tasks/current-tasks.md) and put the TASK/PR number in the row.

## Priority

| P | Meaning | Examples |
|---|---|---|
| P0 | Live harm: data exposed, money wrong, users locked out | public page leaking personal data |
| P1 | Real defect or security gap, not yet causing harm | secret with a fallback, unbounded link lifetime |
| P2 | Hardening, hidden failures, edge cases | CI step that hides errors, timing differences |
| P3 | Cleanup and nice to have | dead code, unclear naming |

## Issue types to look for (checklist for every review)

Work through these when searching for new problems. Add a type when a new kind of issue shows up.

| Type | What to look for here |
|---|---|
| **Data exposure** | Whole database rows passed to client components or JSON responses; public URLs to private files; guessable ids (6-hex ticket numbers); personal data in logs, page source or emails |
| **Access control** | Routes without `withAuth` or role checks; ownership checks using `contains`; fields users can edit that grant access to others' data (IDOR); admin-only actions reachable by users |
| **Secrets and config** | Fallback secrets or hard-coded constants; secrets reused across purposes; missing env vars that fail silently or only in production; `.env` values committed |
| **Payments** | Client-supplied prices; webhook replay or missing signature checks; test/live key mixups (`lib/paystackMode.ts`); renewals and refunds with no handler; money rounding |
| **Data integrity** | Writes without transactions; counters updated twice; migrations not applied on prod; nullable columns assumed non-null; duplicate rows; stale snapshots vs live data (frozen fields) |
| **Next.js 16 specifics** | `params` and `searchParams` are Promises; caching and `force-dynamic`; server vs client component boundaries; `after()` outside a request |
| **Map and geometry** | Display-only shifts applied twice or to the wrong state; missing state defaulting to Lagos; plans with fewer than 3 pillars; CRS mixups (4326 vs 26331) |
| **Certificates and PDF** | Name fitting for long or bracketed names; PDF and web page disagreeing; worker process failing in serverless; edition changes altering issued certificates |
| **Auth and sessions** | Token expiry, refresh rotation, Kinde callback differences, unverified emails, lockout abuse, rate limits trusting spoofable headers |
| **File storage** | Provider switch breaking old URLs; public buckets; signed-link lifetime; key traversal; uploads without type or size limits |
| **Reliability** | Email sent inline and slow; external calls (Google geocode, ArcGIS, Paystack, S3) with no timeout or fallback; background work killed after the response; cron and retries |
| **Performance** | N+1 queries; unpaginated lists (2,000+ plans); large JSON in page props; heavy client bundles; PDF render cost |
| **CI and deploy** | `|| true` hiding failures; migrations running before deploy order is safe; env drift between staging and prod; Vercel build extraction failures |
| **Testing gaps** | Code with no test (routes read but never run); tests that mock away the risky part; no browser check of the public pages |
| **Docs drift** | `docs/functions/*.md`, ADR status, or task files saying "done" when it is not |
| **UX and copy** | Wrong names, dates or themes shown; unclear error messages; mobile layout; accessibility |

## Register

Newest first. Status: Open, Fix in PR, Fixed, Won't fix. Source `R1` = review of 2026-10-11 (see [TASK-0007](../tasks/0007-project-review-findings-oct-11.md)).

| ID | P | Type | Issue | Live on prod | Status | Link |
|---|---|---|---|---|---|---|
| I-016 | P3 | Access control | `getClientIp` trusts the first `x-forwarded-for` value (fine on Vercel, spoofable elsewhere) | No | Open | R1 |
| I-015 | P3 | File storage | Local storage adapter joins keys without normalising (dev only) | No | Open | R1 |
| I-014 | P2 | Auth | Certificate download token travels in the URL query | Yes | Open | R1 |
| I-013 | P2 | Access control | Attacker can lock out or flood a holder's email within the OTP limits | Yes | Open | R1 |
| I-012 | P2 | Reliability | OTP "exists" vs "does not exist" timing difference | Yes | Fix in PR #344 | R1 |
| I-011 | P2 | CI and deploy | Post-flight `prisma migrate status` ended in `\|\| true` | Yes | Fix in PR #343 | R1 |
| I-010 | P1 | Access control | `files/view` ownership: self-attached file URLs grant signed links; `contains` match; empty key | Yes | Fix in PR #343 | R1 |
| I-009 | P1 | File storage | `expiresIn` taken from the query string with no cap | Yes | Fix in PR #343 | R1 |
| I-008 | P1 | Secrets and config | OTP signing key falls back to auth secrets and a constant | Yes | Fix in PR #342 (needs `CERTIFICATE_OTP_SECRET` in Vercel) | R1 |
| I-007 | P1 | Data integrity | 3 tickets sent before the change have no `certificateIssued`, `certificatePublicId` or frozen fields | No | Fixed 2026-10-11: no backfill; the 3 were test sends, sent count reset to 0 (backup `out/backup-gbc-sentcount-2026-10-11.csv`), public pages now 404 | R1 |
| I-006 | P1 | Certificates and PDF | PDF read the live edition, not the frozen fields | Yes | Fix in PR #342 | R1 |
| I-005 | P1 | Data exposure | QR code and emails used the guessable `/gbc/certificate/<ticketNumber>` link | Yes | Fix in PR #342 | R1 |
| I-004 | P0 | File storage | `reva-store` bucket objects readable anonymously (213 red copies, 2,063 plans with PDFs) | Yes | Open (needs AWS admin) | R1 |
| I-003 | P0 | Data exposure | Certificate pages sent the whole ticket row (email, phone, payment data, publicId) to the browser | Yes | Fix in PR #341 | R1 |
| I-002 | P3 | Docs drift | ADR-0012 and TASK-0005 say file privacy is complete while the bucket is public | n/a | Open (new ADR once bucket is private) | R1 |
| I-001 | P2 | Testing gaps | Certificate routes (`request-code`, `verify-code`, `download`) read but never run end to end; public pages not browser-checked | n/a | Open | R1 |

## Suspects not yet investigated

Possible problems worth a look in a later pass. Move one into the register once it is confirmed.

- REVA address lookup: `GOOGLE_MAPS_SERVER_API_KEY` is unset in Vercel, so the address-vs-pin price check is skipped.
- Paystack renewal webhook payload has never been seen from a live event.
- Plans with zero to two pillars still draw from a shifted fallback geometry; confirm after more states get shift values.
- Staging: leftover test accounts, un-rotated database password, Kinde not fully configured.
- The /v2 landing pages: only commit messages and tests were reviewed, not the rendered pages.
- Vercel environment values and the S3 bucket policy were not checked.
