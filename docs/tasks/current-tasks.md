# Current Tasks (Live Dashboard)

State as of 2026-10-13: `main` was promoted to `prod` again (PR #402): file gateways, REVA private uploads, swipe/enlarge viewer, plan number key and fail-closed cron/webhook are live. S3 bucket policy v1 is applied (`surfboard/`, `PrivateSurveyPlans/` and other old `uploads/` are private). and #367 (`main` → `prod`); live checks passed. Vercel env cleaned up (see TASK-0010). 882/882 tests passing.

---

## Active Session Batch: TASK-0010 — Vercel env cleanup, staging promotion, /v4 responsive

**Batch Reference:** [TASK-0010](./0010-env-cleanup-staging-promotion-v4-responsive.md)  
**Active Branch:** `feat/v4-responsive` (PR #360)  
**Status:** `In Progress`. Responsive PR #360 is open. Waiting on roji-tech: go to remove `REVA_AWS_*`, the AWS admin for the S3 bucket policy, go to make the cron route and Red Copy webhook fail closed.

- [x] **Vercel env:** `AWS_*` added, `CRON_SECRET` set, seven unused variables removed with a backup. (Done 2026-10-12)
- [x] **`dev` → `main` (PR #358) and staging smoke tests (17 checks) passed.** (Done 2026-10-12)
- [x] **Promote `main` → `prod`.** PR #362, prod build Ready, live smoke checks passed. (Done 2026-10-12)
- [x] **S3 bucket policy v1** applied in the console by roji-tech (public read only on `GBC2/*`, `reva/*` and 5 legacy `uploads/` files); anonymous checks passed. (Done 2026-10-13) The ACL blocks (Block public ACLs, Ignore public ACLs) are still off. _(Waiting on: AWS admin / roji-tech)_
- [x] **Surveyor logo through the file gateway.** Settings page uses the gateway (#370); nothing else shows the raw URL. (Done 2026-10-13) Worth a look on prod that the logo still shows.
- [x] **Remove `REVA_AWS_*` from Vercel.** Removed from production, preview and development; values backed up to `out/`. (Done 2026-10-13)
- [x] **Surveyor picture in the Surfboard dashboard** went through the raw bucket URL (403); now the gateway (PR #423, I-030). (Done 2026-10-14: PR #423, on prod.)
- [x] **Surfboard user dashboard: no spinner screen.** Server reads name and subscription, panel draws on first paint, skeleton as fallback (PR to `dev`). _(Waiting on: merge, then a staging check with a subscribed and an unsubscribed surveyor)_
- [x] **REVA admin request screens redesign** (list cards, section headers, detail pages; presentation only, PR to `dev`). (Done 2026-10-14: merged and on prod.)
- [x] **REVA all-requests page: summary cards and tabs** (All, One-time, Regular, Needs report, In review, Approved; PR to `dev`). (Done 2026-10-14: PR #424, on prod.)
- [x] **REVA review page: summary cards and tabs** (same as the all-requests page, without "Needs report"; PR to `dev`). (Done 2026-10-14: merged and on prod.)
- [x] **REVA admin home redesign** (summary cards, needs-attention links, latest requests; PR to `dev`). (Done 2026-10-14: PR #433, on prod.)
- [x] **Google sign-in returns to the page the user was on** (PR to `dev`: return cookie set on all login pages, lax, 15 min, cleared after use). (Done 2026-10-14: PR #438, on prod.)
- [x] **REVA spatial record page: rebuild the map from our own data, no Esri.** Deferred (2026-10-16): user decision to pend spatial record point sourcing. Page remains safely on the Coming Soon card, and legacy ArcGIS code is parked.
- [x] **Vercel build hang fixed (2026-10-14).** Cause was `@arcgis/core` in the REVA spatial-record map; page now shows Coming Soon (PRs #448, #451). Main and prod deploy again (about 6 to 11 minutes).
- [ ] **Email verification enforcement: already built, switched off (found 2026-10-15).** Backend, verify screen, reminder banner, OTP-first sign-up and the GBC and Surfboard settings controls shipped 2026-10-01 to 10-04 and are on prod (commits `f3b0a7e9`, `66227824`, `cff82873`); 147 auth tests pass. The `enabled` flag is off for GBC, Surfboard and REVA (no `emailVerification` key saved). In the database checked, 124 of 126 Surfboard users, 34 of 36 REVA users and 3 of 4 GBC users are unverified, so switching it on locks nearly everyone out after the grace period (default 30 days in code). REVA has no settings screen by design. _(Waiting on: roji-tech, which platform to switch on first and the grace length; test on staging with a mailbox you control before prod)_
- [x] **/v4 insight articles use the /our-story layout (2026-10-14, PR to `dev`).** Sticky "IN THIS ARTICLE" index with scroll highlight, numbered sections, closing call to action. The three articles are now the real text, split into sections in `app/v4/data/insights.ts` (`body` became `intro` plus `sections`). Article 1's title now says "lodged". _(Waiting on: roji-tech to read the copy on staging and say if any line should become a pull-quote)_
- [x] **Surfboard: removed "Use as Record Copy" and hardened record-copy verification (2026-10-14, PR #456 to `dev`).** The survey plan PDF is never the record copy. The batch verify step now stops with a clear message when the score is not a number, and shows the route's field message instead of "Invalid request". Audit of existing plans (`redCopyFileUrl` equal to a survey-plan PDF path) found 0 of 209 in the database `.env.local` points at; not yet run against prod.
- [x] **Surfboard: fix record-copy batch verification "Invalid request" error (2026-10-15).** Cause identified: `downloadPlanPdfAsBase64` used an unsigned raw `fetch` on `plan.redCopyFileUrl`, which returned 403 Forbidden because `surfboard/` is private in S3 (TASK-0011 Phase 1). The failure was rethrown as `ValidationError`, masking the 403 as "Invalid request". Fixed by presigning the S3 URL via `getPresignedDownloadUrl` before download, throwing a descriptive 502 `UPSTREAM_FILE_ERROR` on upstream fetch failure, and extracting nested error messages in `CertificateBatchSelection.tsx`.
- [x] **Promote corporate site from /v2 to root / (2026-10-15).** Promoted /v2 marketing site to / in `app/(site)`. Relocated original landing page to `app/(legacy)/previous-landing-page` rendering 404 via `notFound()`. Removed /v2 route completely. Updated all internal links, sitemap, and full production metadata. Fully promoted through `dev` (PR #480) → `main` (PR #481) → `prod` (PR #482) and verified live on production.
- [x] **REVA landing page redesign, navbar responsiveness, and click-outside (2026-10-16).** Redesigned `/reva` public landing page with modern dark and light modes (defaulting to system preference), glassmorphic top navbar with spacious responsive layout and click-outside/Escape dismissal drawer, interactive sample report inspection card, 5-reason Why Choose REVA grid, 5-feature Core Features grid, 3-step connected workflow, interactive GIS solutions & report preview carousel with 6 solutions, Informed Decision CTA, TwoNode corporate home links, and comprehensive multi-column footer while retaining 100% of original content.
- [x] **REVA one-time request tracking portal & requestform redesign (2026-10-16).** Fixed broken direct visits to `/reva/onetimerequest` by implementing a standalone lookup and tracking portal with reference ID and email lookup; redesigned `/reva/requestform` into an executive 2-column workspace with live GPS accuracy check, cadastral summary, Paystack flow, and full light/dark mode support blending seamlessly across viewports.
- [x] **REVA landing page: replace GIS solutions with Due Diligence Report Preview (2026-10-16).** Removed all GIS solutions copy and navigation links; replaced dummy utility text in the carousel with authentic real estate due diligence report preview pages matching reva1.jpg–reva6.jpg (Title Investigation, OSSG Cadastral Vector 04 framework, Acquisition & Canal setbacks, Historical survey archives, and Physical Planning & building approvals).
- [x] **REVA landing page: responsive footer & narrow viewport overflow fix (2026-10-16).** Streamlined footer to compact 2x2 grid at ~450px and ~767px viewports (halving vertical footprint), enforced `whitespace-nowrap` on all link text to eliminate awkward wrapping, and eliminated 350px/360px horizontal overflow via flexible copyright line and overflow-x clipping.
- [x] **Load & Stress, Mutation, Security, Anomaly, Fuzz, Integration & Functional Testing (2026-10-16).** Executed multi-tier load & stress testing (50/150/300 concurrency) discovering and fixing SSR window access in @paystack/inline-js; completed mutation testing for Surfboard and REVA (102/139 mutants killed, 73.4% overall score, 100% on date and plan normalizers); built and passed 54 new tests across Functional features, Integration lifecycles, Security auditing, Security fuzzing (4,500+ iterations, hardening CSRF protocol checks and login return decoding), Anomaly detection, and Property-based parser fuzzing. All 115 test files and 1,086 unit/integration tests passing.
- [x] **Google site verification DNS records added** for twonodetechnologies.com in Vercel DNS (TXT at root, CNAME `wz4tswlnwfw6`), 2026-10-14. _(Waiting on: roji-tech to click Verify in Google)_
- [ ] **Staging checks after the 2026-10-14 promotion.** Google sign-in return to a deep link; expiry reminder and thank-you emails from a real payment; a plan shared to another account (green record-copy chip); pillar labels at about 1:5000; viewer shows the plan number as its name; REVA redesign screens with real data. _(Waiting on: roji-tech or a staging login)_
- [x] **One-time request detail page showed the report form twice.** Removed the extra "Admin Actions" copy; `AdminReport` already holds the form (Done 2026-10-14, PR to `dev`). Check on staging with a one-time request.
- [x] **/v4 mobile and tablet responsiveness** (PR #360, open for review). (Done 2026-10-12)

---

## Planned Session Batch: TASK-0011 — S3 privacy and key layout

**Batch Reference:** [TASK-0011](./0011-s3-privacy-and-key-layout.md)  
**Status:** `Planned`. Plan and [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md) (Proposed) written 2026-10-12. Waiting on roji-tech: go for Phase 1 (surveyor logo through the gateway, then policy v1), accept ADR-0013, and an identity or the AWS admin that can write the bucket policy.

- [x] **Phase 1:** `surfboard/` and `uploads/PrivateSurveyPlans/` private. (Done 2026-10-13, policy v1)
- [x] **Phase 2:** REVA files private with signed links. (Done 2026-10-16: 80 legacy files moved to `private/reva/`, policy v2 verified 403 on `reva/uploads/*`, signed links active via `/api/v1/reva/files/view` and `downloadOtpService`).
- [x] **Phase 3:** GBC key layout `public/gbc/<edition>/…`, QR codes under `private/gbc/<edition>/qrcodes/`. (Done 2026-10-16: `gbcPublicKey` / `gbcQrCodeKey` standard, 155 QR codes migrated to private prefix, signed QR links in responses, policy v4 drafted).
- [x] **Phase 5 (optional):** move the legacy files. (Done 2026-10-14 for Group B 155 GBC QR codes, 2026-10-13 for Group C 80 REVA files, backups in `out/db/backups/`).
- [ ] **Phase 4:** cleanup of odd folders, junk and orphans (separate go each). Tier 1 (111 files) and tier 2 (415 files) deleted 2026-10-13; odd `surfboard/` folders, `.db` junk and `PrivateSurveyPlans` still need a decision. _(Waiting on: roji-tech decision)_

---

## Active Session Batch: TASK-0013 — In-page media viewer

**Batch Reference:** [TASK-0013](./0013-media-viewer.md)  
**Active Branch:** `dev`  
**Status:** `Completed`. Viewer built, 26 Surfboard file links, REVA documents & reports, GBC gallery and public links migrated to `MediaLink` / `EnlargeableImage`. Zero unauthorized new-tab links across the repository (`noNewTabFiles.test.ts` passed).

- [x] **Viewer, gateway download, Surfboard screens.** (Done 2026-10-13, PR open)
- [x] **REVA, GBC and public plan links moved to the viewer, plus the new-tab test.** (Done 2026-10-13 / verified 2026-10-16: all REVA and GBC links open in-page with zero external new tabs)
- [x] **Self-host the six Google fonts** (v2 layout and Surfboard landing page) so builds stop failing on the Google Fonts fetch. 29 files, 512 KB in `public/fonts/self-hosted/` with OFL licences. (Done 2026-10-13, branch `chore/self-host-fonts`)
- [x] **Plan file display names:** plan page and plan details show every file as the plan number (`/` as `_`, capitals), `_2`, `_3` for more of one kind; viewer header and Download use it. (Done 2026-10-13, branch `feat/plan-file-display-names`)
- [x] **Stored file names for new uploads** `surfboard/<userId>/<type>/<PLAN_NUMBER>[_n].<ext>`; an earlier file is kept (S3 conditional write, next free `_n`). Built in PR #381; old files keep their names. Needs an upload check on staging. (Done 2026-10-13)
- [x] **Plan numbers: uppercase everywhere.** Existing lowercase test plans converted and the lowercase TNT duplicate deleted in prod, staging, test_db and dev_db (guarded transactions, backups in `out/`). App: numbers are saved in capitals; the plan form shows a calm warning under the field for similar own plans (clickable, opens the plan in a popup) and an error for an exact match; nothing is ever shown about another surveyor's plan. (Done 2026-10-13, branch `feat/plan-number-uppercase`)
- [ ] **Phone check on staging.** Viewer is on staging (#374, build Ready). _(Waiting on: roji-tech or someone with a staging login)_

---

## Planned Session Batch: TASK-0012 — OSSG integration and the red copy flow

**Batch Reference:** [TASK-0012](./0012-ossg-integration-and-red-copy.md)  
**Status:** `Planned`, paused 2026-10-12. Resume from "Where we stopped" in the task file. Red copy private: decided 2026-10-12. Hash ledger, no QR, `.jpg`: decided 2026-10-12 (ADR-0014 Accepted). Waiting on roji-tech: the questions to OSSG.

---

## Previous Session Batch: TASK-0009 — /v4: edits on a copy of the /v3 port

**Batch Reference:** [TASK-0009](./0009-v4-edits.md)  
**Active Branch:** `feat/v4-edits` (merged)  
**Status:** `In Progress`. `/v3` is left as is. In `/v4`: real logo, 12px text, 44px tap targets, hard-coded proof numbers, contact / insights / industry pages, Active/Next chips, new footer. Waiting on roji-tech: survey plan photo, phone number, real insight copy.

- [x] **Create `/v4` and apply defect fixes (logo, text size, tap targets).** (Done 2026-10-11)
- [ ] **Content decisions and remaining edits.** Listed in TASK-0009. _(Waiting on: roji-tech)_

---

## Previous Session Batch: TASK-0008 — Port the static prototype to /v3

**Batch Reference:** [TASK-0008](./0008-v3-prototype-port.md)  
**Active Branch:** `feat/v3-prototype-port` (merged)  
**Status:** `In Progress`. Port done and verified on branch `feat/v3-prototype-port`, PR open. No edits to the design yet. Waiting on roji-tech: proof numbers, survey plan photo, phone number.

- [x] **Port `out/twonode-website` to `/v3` and `/v3/our-story`, as is.** Same page heights as the prototype, under 1.3% pixel difference, tsc clean, 873/873 tests. (Done 2026-10-11)
- [ ] **Content and design decisions before it can go public.** Listed in TASK-0008. _(Waiting on: roji-tech)_

---

## Previous Session Batch: TASK-0007 — Project Review Findings (2026-10-11)

**Batch Reference:** [TASK-0007](./0007-project-review-findings-oct-11.md)  
**Active Branch:** `docs/review-findings-2026-10-11`  
**Status:** `In Progress`. Fixes #341–#345 are on `dev`, `main` and `prod` (promoted 2026-10-12, PR #362). `CERTIFICATE_OTP_SECRET` is set. Waiting on the AWS admin for the bucket (see I-004 in the issues register).

- [x] **P0: public certificate page leaks attendee data.** Fixed in PR #341; live on `prod` since 2026-10-12 (PR #362). A bogus certificate page returns 404.
- [x] **P0: surveyor files are still publicly readable in S3.** _(Waiting on: roji-tech / AWS admin)_ Done 2026-10-13: bucket policy v1 applied; anonymous requests to `surfboard/` and `PrivateSurveyPlans/` return 403.
- [x] **P1 items and the CI check:** QR/email links, PDF frozen fields, OTP secret, `expiresIn` cap, CI `|| true`, and the 3 test tickets: all done (PRs #342, #343). (Done 2026-10-11)
- [x] **P2 smaller items** (timing, lockout, token in URL, client IP, local paths): PR #344 plus the hardening PR. Only the optional captcha remains. _(Waiting on: roji-tech decision)_

---

## Previous Session Batch: TASK-0006 — V2 Motion Design Storytelling, Interactive Trinity & Editorial Polish

**Batch Reference:** [TASK-0006](./0006-v2-motion-design-and-editorial-polish.md)  
**Active Branch:** `dev`  
**Status:** `Completed`

### Session Checklist

- [x] **De-AI Industry Status Badges (`Industries.tsx`):** Replace synthetic neon pills with quiet editorial typography (`Active` and `Next`). (Done 2026-10-10)
- [x] **Hero Motion Design Storytelling (`HeroNetworkGraph.tsx` & `Opening.tsx`):** Align graph to the 6 pillars (`People`, `Information`, `Problems`, `Systems`, `Relationships`, `Opportunities`) with "Understand → Build" kinetic cycle. (Done 2026-10-10)
- [x] **"How We Build" Kinetic Motion Pipeline (`HowWeBuild.tsx`):** Replace 50-word dense paragraph with 4-beat visual motion journey (Field Work → People & Workflows → The Gap → Build). (Done 2026-10-10)
- [x] **"The Bigger Idea" Interactive Motion Canvas — 1, 2, or All 3 (`BiggerIdea.tsx`):** Interactive triad canvas (Software + Workflow + The Room → All Three convergence). (Done 2026-10-10)
- [x] **"What We Believe" Kinetic Motion Triangle (`WhatWeBelieve.tsx`):** Remove integrity banner; introduce circulating motion triangle connecting _Understand deeply → Build simply → Connect the pieces_. (Done 2026-10-10)
- [x] **"Behind the Build" Section Title (`InsideTwoNode.tsx` & `insights/page.tsx`):** Change to "Behind the Build". (Done 2026-10-10)
- [x] **Design Canvas Sync (`TwoNode_V2_Design_Canvas.html`):** Update desktop and mobile artboards. (Done 2026-10-10)
- [x] **Quality Gate & Release Promotion:** Verify 867/867 tests, commit on `dev`, merge `dev` → `main` → `prod` (PR #332 & #333). (Done 2026-10-10)

---

## Open Tasks Waiting on Action

- **GOOGLE_MAPS_SERVER_API_KEY:** Waiting on Google Cloud project owner to enable billing before setting in Vercel. _(Waiting on: roji-tech / Cloud Admin)_
- **Paystack Renewal Webhook:** Waiting on live renewal event payload log to verify payload schema. _(Waiting on: roji-tech)_
- **Trigger Vercel Prod Deploy:** Done 2026-10-12 (PR #362, TASK-0010). Remaining: later `dev` work (/v4 responsive, certificate email) reaches prod through the next `dev` → `main` → `prod` promotion.
- **Activate GBC 3.0 on Prod:** Edition 2.0 is past; admin dashboard activation needed when ready. _(Waiting on: roji-tech / Admin)_
- **Staging Password Rotation:** Neon console password rotation needed. _(Waiting on: roji-tech)_
- **Complete Kinde Configuration on Staging:** Kinde credentials and callback URLs pending. _(Waiting on: roji-tech)_
- **Web Map Tile Licensing:** Product/legal decision on Google map tiles. _(Waiting on: roji-tech)_
- **Clean Up Staging Test Accounts:** Decide whether to keep or prune test accounts. _(Waiting on: roji-tech)_

---

## Session Batches & Sprints Summary

| #                                                             | Batch Title                                                  | Period                  | Modules                                | Status        |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------- | -------------------------------------- | ------------- |
| [0001](./0001-initial-corrections-oct-05-07.md)               | **Initial Corrections & Production Audit**                   | 2026-10-05 – 2026-10-07 | Maps, Database, Certificates           | `Completed`   |
| [0002](./0002-certificate-handoff-and-access-oct-08-09.md)    | **Certificate Handoff, Data Fix & Access Security**          | 2026-10-08 – 2026-10-09 | Certificates, Security, Database, ADRs | `Completed`   |
| [0003](./0003-active-backlog.md)                              | **Active Backlog & Upcoming Integrations**                   | Active Backlog          | Payments, REVA, DevOps, Auth           | `Pending`     |
| [0004](./0004-twonode-v2-landing-redesign.md)                 | **Twonode Landing Page /v2 Redesign (Nodes)**                | Active Sprint           | Landing Page, V2, UI/UX, Design Tokens | `Completed`   |
| [0005](./0005-surfboard-cod-red-copy-and-file-privacy.md)     | **Surfboard CoD Red Copy & Surveyor File Privacy**           | Active Sprint           | Surfboard, CoD, S3 Security, Storage   | `Completed`   |
| [0006](./0006-v2-motion-design-and-editorial-polish.md)       | **V2 Motion Design Storytelling & Polish**                   | Active Sprint           | Motion Design, V2, UI/UX, Editorial    | `In Progress` |
| [0007](./0007-project-review-findings-oct-11.md)              | **Project Review Findings (Certificate Leak, File Privacy)** | 2026-10-11              | Certificates, Security, Storage, CI    | `In Progress` |
| [0008](./0008-v3-prototype-port.md)                           | **Port the Static Prototype to /v3**                         | 2026-10-11              | Landing Page, V3, Next.js              | `In Progress` |
| [0009](./0009-v4-edits.md)                                    | **/v4: Edits on a Copy of the /v3 Port**                     | 2026-10-11              | Landing Page, V4, Accessibility        | `In Progress` |
| [0010](./0010-env-cleanup-staging-promotion-v4-responsive.md) | **Vercel Env Cleanup, Staging Promotion, /v4 Responsive**    | 2026-10-12              | DevOps, Security, Landing Page, V4     | `In Progress` |
