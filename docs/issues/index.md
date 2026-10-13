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
| I-027 | P1 | Access control | `GET /plans/[planId]/public/full` was open to anyone with a plan id and returned the plan's file links and the surveyor's name, email and registration numbers. **Fixed in this PR: now behind login** (staff any plan; a surveyor their own or a shared one; no QR scan counted), nothing in the app called it. Still open: the QR-gated `plans/[planId]/public` response keeps `pdfFilePaths`, `cadFilePaths`, `certificateFilePaths` and `redCopyFileUrl` for unpaid visitors, so scanning a plan QR code returns file links without paying (dead links once the bucket is private, but the paths still leak). Strip those fields from the redacted response | Yes | Fix in PR (route gated); file fields now stripped from the unpaid public response (PR `fix/gated-public-plan-no-files`) | TASK-0011 |
| I-026 | P2 | File storage | The public plan page `/surfboardplan/[id]` (`PublicSurfPlan.tsx`, `CoDAccessPanel`) links the Certificate of Deposit files by raw bucket URL for anonymous visitors, as a paid QR-gated feature. Once `surfboard/*` is private it breaks and the login-only gateway cannot serve it. Needs a gated route that checks the same access state (`getPlanQRAccessState`: paid session or free) before signing a short link | Yes | Open (blocks bucket policy v1) | TASK-0011 |
| I-025 | P3 | Dead code | `submitRedCopy` posts to `https://api.redcopy.com/submit`, which does not resolve; no Surfboard screen was found calling `/plans/[planId]/red-copy`. To be replaced by the OSSG integration | Yes | Open | TASK-0012 |
| I-024 | P2 | Data integrity | Plan numbers are free text with no shared normaliser. Of 2,373 plans: 14 have lowercase letters, 93 contain a space, colon, underscore or dash, and 15 pairs collide once trailing `_` or `.`, case, or an inner `/` are ignored (e.g. `…/LA` vs `…/LA_`, `D/012` vs `D012`). The duplicate check in `planService.ts` only trims, so these slipped through. Two places turn `/` into `_` for file names (`awsService.ts`, `lib/storage/utils.ts`) and a third, private normaliser lives in `aiExtractionService.ts`. Needs one shared function used by every lookup and key | Yes | Open | TASK-0011 |
| I-023 | P3 | File storage | Red copy files are stored under `surfboard/<plan number>/redcopy/…` (the plan number, with its slashes, takes the place of the user id), not under the user's folder as ADR-0012 says. 303 files, 136 referenced, 167 unreferenced; 77 stored links point at files that do not exist (66 from one plan-number series). The gateway refused a surveyor their own record copy because the folder is not their id (found on staging 2026-10-13, fixed in PR #375: a key under `surfboard/<plan number>/redcopy/` is accepted when the plan number is the plan's own; 2 of 215 plans, whose number was edited after upload, are still refused for surveyors and open for staff); the odd top-level `surfboard/` folders (`BYA/`, `AAA/`, numeric) are mostly these | Yes | Open | TASK-0011 |
| I-022 | P3 | File storage | `GBC2/` is hard-coded in `gbc/utils/aws-s3.ts` for every GBC upload; GBC 3.0 uploads would land under the 2.0 name | Yes | Open (ADR-0013 proposes `public/gbc/<edition>/…`) | TASK-0011 |
| I-021 | P1 | File storage | `uploads/PrivateSurveyPlans/` (about 360 old survey plan scans) is publicly readable; no REVA record points at it | Yes | Open (private in policy v1) | TASK-0011 |
| I-020 | P1 | Access control | REVA stores permanent public links for client documents, site photos and reports (`reva/uploads/`), so anyone with a link can bypass the OTP download | Yes | Open (needs signed links in the REVA pages first) | TASK-0011 |
| I-019 | P2 | File storage | Several Surfboard screens put a stored file URL straight into a link or `<img>`, so they break once `surfboard/*` is private: settings logo and signature (`<img src>`), the red copy links on the plan edit modal and on six MDA dashboards (archive, records-i, charting, intake, surcon, records-ii), the Certificate of Deposit receipt links (restricted certificates, accounts, `SubmittedBatchesModal`), and the existing-file list in `SurfboardPlanForm` (new and edit plan). Use the gateway link (`apiClient` `getViewUrl`) in each, as `SinglePlan`, `AllPlans`, `OptimizedSinglePlanDetails`, `CertificateBatchSelection`, `RecordCopyUploadModal` already do | Yes | Fix in PR #370 (gateway links on every screen; the public plan page is separate, see I-026) | TASK-0010, TASK-0011 |
| I-018 | P1 | Access control | `/api/webhooks/redcopy` skips its secret check when `REDCOPY_WEBHOOK_SECRET` is unset, so anyone could post red copy status updates (`app/api/webhooks/redcopy/route.ts`). Fail closed when the secret is missing | Unknown (depends on Vercel) | Open (code still fails open) | review 2026-10-12 |
| I-017 | P1 | Access control | `/api/cron/subscription-expiry-reminders` skips its check when `CRON_SECRET` is unset, so anyone could trigger reminder emails/SMS. Fail closed when the secret is missing | Unknown (depends on Vercel) | Open: `CRON_SECRET` set on Vercel Production and Preview 2026-10-12 (applies on next deploy); code still fails open if it is missing | review 2026-10-12 |
| I-016 | P3 | Access control | `getClientIp` trusts the first `x-forwarded-for` value (fine on Vercel, spoofable elsewhere) | No | Fix in the P2 hardening PR (2026-10-12); captcha for request flooding is optional | R1 |
| I-015 | P3 | File storage | Local storage adapter joins keys without normalising (dev only) | No | Fix in the P2 hardening PR (2026-10-12); captcha for request flooding is optional | R1 |
| I-014 | P2 | Auth | Certificate download token travels in the URL query | Yes | Fix in the P2 hardening PR (2026-10-12); captcha for request flooding is optional | R1 |
| I-013 | P2 | Access control | Attacker can lock out or flood a holder's email within the OTP limits | Yes | Fix in the P2 hardening PR (2026-10-12); captcha for request flooding is optional | R1 |
| I-012 | P2 | Reliability | OTP "exists" vs "does not exist" timing difference | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-011 | P2 | CI and deploy | Post-flight `prisma migrate status` ended in `\|\| true` | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-010 | P1 | Access control | `files/view` ownership: self-attached file URLs grant signed links; `contains` match; empty key | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-009 | P1 | File storage | `expiresIn` taken from the query string with no cap | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-008 | P1 | Secrets and config | OTP signing key falls back to auth secrets and a constant | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-007 | P1 | Data integrity | 3 tickets sent before the change have no `certificateIssued`, `certificatePublicId` or frozen fields | No | Fixed 2026-10-11: no backfill; the 3 were test sends, sent count reset to 0 (backup `out/db/backups/backup-gbc-sentcount-2026-10-11.csv`), public pages now 404 | R1 |
| I-006 | P1 | Certificates and PDF | PDF read the live edition, not the frozen fields | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-005 | P1 | Data exposure | QR code and emails used the guessable `/gbc/certificate/<ticketNumber>` link | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
| I-004 | P0 | File storage | `reva-store` bucket objects readable anonymously (213 red copies, 2,063 plans with PDFs) | Yes | Open (needs AWS admin). Do NOT make the whole bucket private: GBC public images share it, see below | R1 |
| I-003 | P0 | Data exposure | Certificate pages sent the whole ticket row (email, phone, payment data, publicId) to the browser | Yes | Fixed 2026-10-11; live on prod 2026-10-12 (PR #362) | R1 |
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

## Bucket privacy plan (I-004), searched 2026-10-11

Counts are stored URLs that point at the bucket (read-only query). Key prefix is the top folder.

| Stored in | Count | Prefix | Browser uses the raw URL? | Needs to stay public? |
|---|---|---|---|---|
| `SurfboardPlan` red copies / PDFs / CAD / certificates | 213 / 2,063 / 2,066 / 810 | `surfboard/` | No, signed links via the gateway | No: make private |
| `surfboard_plan_viewer_attachments.url`, `CertificateOfDepositBatch.lasgReceiptUrl` | 1 / 8 | `surfboard/` | Via gateway | No: make private |
| `SurfboardUser.logo` | 22 | `surfboard/` | Yes: plain `<img src>` on the settings page | Serve through the gateway first (I-019) |
| `gbc_tickets.qrCode` | 155 | `GBC2/` | Yes: `<img src>` and a link on the ticket pages | Yes, unless ticket pages sign it |
| `gbc_gallery`, `gbc_speakers.photo`, `gbc_sponsors.logo` | 30 / 10 / 6 | `GBC2/` | Yes: public GBC website | Yes |
| REVA `Property.site_images` / `documentsUrls`, `OneTimeUserProperty`, reports | 26 + 2 / 10 + 8 + 4, 18 reports | `reva/uploads/` (4 documents under `uploads/`) | Yes: plain links in the REVA pages | No: make private after signed links (TASK-0011 Phase 2) |

Consequence: block public access on the whole bucket and the GBC website images and ticket QR codes break. Safer order: (1) a bucket policy that allows public read only on `GBC2/*` and denies the rest, or move GBC public assets to their own bucket or CloudFront; (2) check `SurfboardUser.logo` and the REVA property files; (3) then close `surfboard/*` and re-test with an anonymous request. GBC ticket QR codes encode the ticket number only, so a public `GBC2/qrcodes/` prefix is a lower risk than surveyor files.
