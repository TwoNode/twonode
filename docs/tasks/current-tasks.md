# Current Tasks (Live Dashboard)

State as of 2026-10-09 11:05 UTC: PR #313 merged into prod (long-name fix and ADRs live on production). PR #314 (certificate access security overhaul) and PR #315 (database mapping sanitization) merged into dev. No open PRs.

---

## Active Session Batch

**Next Action:** Twonode Landing Page /v2 Redesign Implementation ([TASK-0004](./0004-twonode-v2-landing-redesign.md))  
**Active Branch:** `dev`  
**Status:** `In Progress`

### Promotion & Staging Verification Checklist

- [x] PR #313 merged into `prod` (Long attendee name fix #310 & ADRs 0001–0011 live on production)
- [x] PR #314 merged into `dev` (ADR-0008 Certificate access security overhaul)
- [x] PR #315 merged into `dev` (Sanitized database mapping in DEPLOYMENT.md and CI workflows)
- [x] Open promotion PR `dev` → `main` (Staging release) — PR #316 merged (2026-10-10)
- [x] Merge promotion PR into `main` (PR #316 merged to `main`, 2026-10-10)
- [x] Run `npx prisma migrate deploy` on staging database (`twonode_staging`) via CI workflow `Deploy migrations to staging` (#38002510334, 2026-10-10)
- [x] Verify certificate verification page (`/gbc/verify/[publicId]`) and OTP download on staging (2026-10-10)
- [x] **Red Copy PDF Access & Availability:** Ensure survey plan red copy PDF is accessible, previewable, and downloadable in CoD and plan views. Scoped in [TASK-0005](./0005-surfboard-cod-red-copy-and-file-privacy.md). (2026-10-09, PR #316 / commit `4a84af6c`)
- [x] **Surveyor Upload File Privacy (Private S3 & Presigned URLs):** Replace raw public S3 URLs with private storage and authenticated presigned GET URLs for surveyor uploads. Multi-provider storage adapters for S3, R2, Cloudinary, Vercel Blob, ImageKit, and Local. Scoped in [TASK-0005](./0005-surfboard-cod-red-copy-and-file-privacy.md), [ADR-0012](../adr/0012-multi-provider-storage-and-surveyor-file-privacy.md). (2026-10-09, PR #316 / commit `4a84af6c`)

---

## Open Tasks Waiting on Action

- **GOOGLE_MAPS_SERVER_API_KEY:** Waiting on Google Cloud project owner to enable billing before setting in Vercel. _(Waiting on: roji-tech / Cloud Admin)_
- **Paystack Renewal Webhook:** Waiting on live renewal event payload log to verify payload schema. _(Waiting on: roji-tech)_
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
| [0004](./0004-twonode-v2-landing-redesign.md)              | **Twonode Landing Page /v2 Redesign (Nodes)**       | Active Sprint           | Landing Page, V2, UI/UX, Design Tokens | `In Progress` |
| [0005](./0005-surfboard-cod-red-copy-and-file-privacy.md)  | **Surfboard CoD Red Copy & Surveyor File Privacy**   | Active Sprint           | Surfboard, CoD, S3 Security, Storage   | `Completed`   |


