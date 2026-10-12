# Current Tasks (Live Dashboard)

State as of 2026-10-12: `main` was promoted to `prod` (PR #362); the certificate page leak fix and the `AWS_*` rename are live. The certificate email redesign (#363, #365) and the docs updates (#364) reached `prod` on 2026-10-12 through #366 (`dev` → `main`) and #367 (`main` → `prod`); live checks passed. Vercel env cleaned up (see TASK-0010). 882/882 tests passing.

---

## Active Session Batch: TASK-0010 — Vercel env cleanup, staging promotion, /v4 responsive

**Batch Reference:** [TASK-0010](./0010-env-cleanup-staging-promotion-v4-responsive.md)  
**Active Branch:** `feat/v4-responsive` (PR #360)  
**Status:** `In Progress`. Responsive PR #360 is open. Waiting on roji-tech: go to remove `REVA_AWS_*`, the AWS admin for the S3 bucket policy, go to make the cron route and Red Copy webhook fail closed.

- [x] **Vercel env:** `AWS_*` added, `CRON_SECRET` set, seven unused variables removed with a backup. (Done 2026-10-12)
- [x] **`dev` → `main` (PR #358) and staging smoke tests (17 checks) passed.** (Done 2026-10-12)
- [x] **Promote `main` → `prod`.** PR #362, prod build Ready, live smoke checks passed. (Done 2026-10-12)
- [ ] **S3 bucket: policy limited to `GBC2/*`, ACL blocks on.** Needs the AWS admin. _(Waiting on: AWS admin)_
- [ ] **Surveyor logo through the file gateway before `surfboard/*` goes private.** _(Waiting on: roji-tech go)_
- [ ] **Remove `REVA_AWS_*` from Vercel.** Prod runs on `AWS_*` now. _(Waiting on: roji-tech go after seeing the exact list)_
- [x] **/v4 mobile and tablet responsiveness** (PR #360, open for review). (Done 2026-10-12)

---

## Planned Session Batch: TASK-0011 — S3 privacy and key layout

**Batch Reference:** [TASK-0011](./0011-s3-privacy-and-key-layout.md)  
**Status:** `Planned`. Plan and [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md) (Proposed) written 2026-10-12. Waiting on roji-tech: go for Phase 1 (surveyor logo through the gateway, then policy v1), accept ADR-0013, and an identity or the AWS admin that can write the bucket policy.

- [ ] **Phase 1:** `surfboard/` and `uploads/PrivateSurveyPlans/` private. _(Waiting on: roji-tech go)_
- [ ] **Phase 2:** REVA files private with signed links.
- [ ] **Phase 3:** GBC key layout `public/gbc/<edition>/…`, QR codes under `private/gbc/<edition>/qrcodes/`.
- [ ] **Phase 5 (optional):** move the legacy files (copy, rewrite rows in a guarded transaction, delete after a grace period). Not needed for privacy.
- [ ] **Phase 4:** cleanup of odd folders, junk and orphans (separate go each).

---

## Active Session Batch: TASK-0013 — In-page media viewer

**Batch Reference:** [TASK-0013](./0013-media-viewer.md)  
**Active Branch:** `feat/media-viewer`  
**Status:** `In Progress`. Viewer built and the 26 Surfboard file links moved (ADR-0015). Waiting on roji-tech: a check on real phones on staging, then REVA, GBC and the build check come next.

- [x] **Viewer, gateway download, Surfboard screens.** (Done 2026-10-13, PR open)
- [ ] **Phone check on staging, REVA and GBC links, build check.** _(Waiting on: roji-tech for the phone check)_

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
- [ ] **P0: surveyor files are still publicly readable in S3.** _(Waiting on: roji-tech / AWS admin)_
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
- [x] **"What We Believe" Kinetic Motion Triangle (`WhatWeBelieve.tsx`):** Remove integrity banner; introduce circulating motion triangle connecting *Understand deeply → Build simply → Connect the pieces*. (Done 2026-10-10)
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

| #                                                          | Batch Title                                         | Period                  | Modules                                | Status        |
| ---------------------------------------------------------- | --------------------------------------------------- | ----------------------- | -------------------------------------- | ------------- |
| [0001](./0001-initial-corrections-oct-05-07.md)            | **Initial Corrections & Production Audit**          | 2026-10-05 – 2026-10-07 | Maps, Database, Certificates           | `Completed`   |
| [0002](./0002-certificate-handoff-and-access-oct-08-09.md) | **Certificate Handoff, Data Fix & Access Security** | 2026-10-08 – 2026-10-09 | Certificates, Security, Database, ADRs | `Completed`   |
| [0003](./0003-active-backlog.md)                           | **Active Backlog & Upcoming Integrations**          | Active Backlog          | Payments, REVA, DevOps, Auth           | `Pending`     |
| [0004](./0004-twonode-v2-landing-redesign.md)              | **Twonode Landing Page /v2 Redesign (Nodes)**       | Active Sprint           | Landing Page, V2, UI/UX, Design Tokens | `Completed`   |
| [0005](./0005-surfboard-cod-red-copy-and-file-privacy.md)  | **Surfboard CoD Red Copy & Surveyor File Privacy**   | Active Sprint           | Surfboard, CoD, S3 Security, Storage   | `Completed`   |
| [0006](./0006-v2-motion-design-and-editorial-polish.md)    | **V2 Motion Design Storytelling & Polish**          | Active Sprint           | Motion Design, V2, UI/UX, Editorial    | `In Progress` |
| [0007](./0007-project-review-findings-oct-11.md)           | **Project Review Findings (Certificate Leak, File Privacy)** | 2026-10-11 | Certificates, Security, Storage, CI | `In Progress` |
| [0008](./0008-v3-prototype-port.md)                        | **Port the Static Prototype to /v3**                | 2026-10-11              | Landing Page, V3, Next.js              | `In Progress` |
| [0009](./0009-v4-edits.md)                                  | **/v4: Edits on a Copy of the /v3 Port**            | 2026-10-11              | Landing Page, V4, Accessibility        | `In Progress` |
| [0010](./0010-env-cleanup-staging-promotion-v4-responsive.md) | **Vercel Env Cleanup, Staging Promotion, /v4 Responsive** | 2026-10-12 | DevOps, Security, Landing Page, V4 | `In Progress` |



