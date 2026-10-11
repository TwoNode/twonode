# Current Tasks (Live Dashboard)

State as of 2026-10-11: dev one trivial commit ahead of main and prod. PR #340 (docs) open. A project review found two live P0 problems (certificate page data leak, public surveyor files); see TASK-0007. 867/867 tests passing.

---

## Active Session Batch: TASK-0007 — Project Review Findings (2026-10-11)

**Batch Reference:** [TASK-0007](./0007-project-review-findings-oct-11.md)  
**Active Branch:** `docs/review-findings-2026-10-11`  
**Status:** `In Progress`. Fixes #341–#345 are merged to `dev`, not yet on `main`/`prod`. `CERTIFICATE_OTP_SECRET` is set. Waiting on roji-tech: go to promote, and the AWS admin for the bucket (see I-004 in the issues register).

- [ ] **P0: public certificate page leaks attendee data (live on prod).** _(Waiting on: go to fix)_
- [ ] **P0: surveyor files are still publicly readable in S3.** _(Waiting on: roji-tech / AWS admin)_
- [ ] **P1 and P2 items:** QR/email links, PDF frozen fields, nobody can download yet, OTP secret, `expiresIn` cap, CI `|| true`, smaller items. Full list in TASK-0007.

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
- **Trigger Vercel Prod Deploy:** Trigger redeploy on Vercel for `prod` branch. _(Waiting on: roji-tech / Vercel Admin)_
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



