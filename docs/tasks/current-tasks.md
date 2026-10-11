# Current Tasks (Live Dashboard)

State as of 2026-10-10 19:36 UTC: PR #332 & PR #333 merged into prod (V2 interactive motion storytelling, triad canvas, motion triangle, behind the build, and editorial polish). All features live on prod branch. 867/867 tests passing.

---

## Active Session Batch: TASK-0006 — V2 Motion Design Storytelling, Interactive Trinity & Editorial Polish

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

## Review Findings 2026-10-11 (needs fixing, in priority order)

- [ ] **P0: public certificate page leaks attendee data (live on prod).** `certificate/[ticketNumber]/page.tsx` and `verify/[publicId]/page.tsx` pass the whole ticket row to the client component, so the page source contains the holder's email, phone, `paymentRef`, price, `paymentDetails`, the check-in admin, the ticket QR URL and `certificatePublicId`. Anyone with a ticket number (6 hex characters, guessable) can read them. Fix: pass only name, ticket number, check-in time and the event fields. _(Waiting on: go to fix)_
- [ ] **P0: surveyor files are still publicly readable.** The new signed-URL gateway is not enough: stored `reva-store` S3 URLs (213 red copies, 2,063 plans with PDFs) answer anonymous requests with 200. Make the bucket private (and check the GBC ticket QR images in the same bucket), then migrate stored URLs to keys. ADR-0012 and TASK-0005 should not say "completed" until this is done. _(Waiting on: roji-tech / AWS admin)_
- [ ] **P1: legacy QR and email links still point at the guessable page.** The PDF and the email use `/gbc/certificate/<ticketNumber>`, not `/gbc/verify/<publicId>`. Switch both to the verify URL once the page stops leaking.
- [ ] **P1: the PDF does not use the frozen event fields.** The page reads `certificateEventName` and friends; `gbc/pdf-worker/certificate.render.cjs` still reads `ticket.editionRef`. Editing an edition changes the PDF but not the page.
- [ ] **P1: nobody can download yet, and old certificates are stranded.** Prod has 240 tickets, 0 with `certificateIssued`, 0 with `certificatePublicId`, 3 sent before the change. The code flow requires `certificateIssued`. Backfill the 3 sent ones (guarded write) and add an admin way to issue: `issueCertificates` has no caller.
- [ ] **P1: OTP signing key falls back to other secrets and a hard-coded string.** `certificateOtpService.ts` uses `CERTIFICATE_OTP_SECRET`, else `AUTH_SECRET`, `NEXTAUTH_SECRET`, `KINDE_CLIENT_SECRET`, else a constant in the source. Set a dedicated `CERTIFICATE_OTP_SECRET` in Vercel and make the code fail closed in production when it is missing.
- [ ] **P1: signed file links can be made long-lived.** `files/view` takes `expiresIn` from the query string without a cap, so the "5-minute" link can be minted for days. Clamp it. Also review the ownership test (`contains: key` on the plan's URL fields, and trusting URL fields a user can set).
- [ ] **P2: CI hides migration problems.** `migrate-production.yml` now ends both `prisma migrate status` steps with `|| true`. Keep it on the pre-flight step only; the post-flight check should fail the job.
- [ ] **P2: smaller items.** Existence timing difference in `requestCertificateOtp` (the email send is slower than the 120 ms delay); an attacker can lock out or flood a holder's email within the limits; the download token travels in the URL query; `getClientIp` trusts the first `x-forwarded-for` value (fine on Vercel, spoofable elsewhere); the local storage adapter joins keys without normalising (dev only).

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
| [0005](./0005-surfboard-cod-red-copy-and-file-privacy.md)  | **Surfboard CoD Red Copy & Surveyor File Privacy**  | Active Sprint           | Surfboard, CoD, S3 Security, Storage   | `Completed`   |
| [0006](./0006-v2-motion-design-and-editorial-polish.md)    | **V2 Motion Design Storytelling & Polish**          | Active Sprint           | Motion Design, V2, UI/UX, Editorial    | `In Progress` |
