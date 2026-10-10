# Current Tasks (Live Dashboard)

State as of 2026-10-10 17:20 UTC: PR #323 merged into prod (streamlined Industries UI/UX, canvas sync, and dev history). All features live on prod branch. 867/867 tests passing.

---

## Active Session Batch: TASK-0006 — V2 Motion Design Storytelling, Interactive Trinity & Editorial Polish

**Batch Reference:** [TASK-0006](./0006-v2-motion-design-and-editorial-polish.md)  
**Active Branch:** `dev`  
**Status:** `In Progress`

### Session Checklist

- [x] **De-AI Industry Status Badges (`Industries.tsx`):** Replace synthetic neon pills with quiet editorial typography (`Active` and `Next`). (Done 2026-10-10)
- [x] **Hero Motion Design Storytelling (`HeroNetworkGraph.tsx` & `Opening.tsx`):** Align graph to the 6 pillars (`People`, `Information`, `Problems`, `Systems`, `Relationships`, `Opportunities`) with "Understand → Build" kinetic cycle. (Done 2026-10-10)
- [x] **"How We Build" Kinetic Motion Pipeline (`HowWeBuild.tsx`):** Replace 50-word dense paragraph with 4-beat visual motion journey (Field Work → People & Workflows → The Gap → Build). (Done 2026-10-10)
- [x] **"The Bigger Idea" Interactive Motion Canvas — 1, 2, or All 3 (`BiggerIdea.tsx`):** Interactive triad canvas (Software + Workflow + The Room → All Three convergence). (Done 2026-10-10)
- [x] **"What We Believe" Kinetic Motion Triangle (`WhatWeBelieve.tsx`):** Remove integrity banner; introduce circulating motion triangle connecting *Understand deeply → Build simply → Connect the pieces*. (Done 2026-10-10)
- [x] **"Behind the Build" Section Title (`InsideTwoNode.tsx` & `insights/page.tsx`):** Change to "Behind the Build". (Done 2026-10-10)
- [x] **Design Canvas Sync (`TwoNode_V2_Design_Canvas.html`):** Update desktop and mobile artboards. (Done 2026-10-10)
- [ ] **Quality Gate & Release Promotion:** Verify 867/867 tests, commit on `dev`, merge `dev` → `main` → `prod`.

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



