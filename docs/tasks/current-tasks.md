# Current Tasks (Live Dashboard)

State as of 2026-10-09 11:05 UTC: PR #313 merged into prod (long-name fix and ADRs live on production). PR #314 (certificate access security overhaul) and PR #315 (database mapping sanitization) merged into dev. No open PRs.

---

## Active Session Batch

**Next Action:** Promote `dev` → `main` (Staging) & Apply Migration `20261009100000_gbc_certificate_access`  
**Active Branch:** `dev`  
**Status:** `Ready for Promotion`

### Promotion & Staging Verification Checklist

- [x] PR #313 merged into `prod` (Long attendee name fix #310 & ADRs 0001–0011 live on production)
- [x] PR #314 merged into `dev` (ADR-0008 Certificate access security overhaul)
- [x] PR #315 merged into `dev` (Sanitized database mapping in DEPLOYMENT.md and CI workflows)
- [ ] Open promotion PR `dev` → `main` (Staging release)
- [ ] Merge promotion PR into `main`
- [ ] Run `npx prisma migrate deploy` on staging database (`twonode_staging`)
- [ ] Verify certificate verification page (`/gbc/verify/[publicId]`) and OTP download on staging

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

| #                                                          | Batch Title                                         | Period                  | Modules                                | Status      |
| ---------------------------------------------------------- | --------------------------------------------------- | ----------------------- | -------------------------------------- | ----------- |
| [0001](./0001-initial-corrections-oct-05-07.md)            | **Initial Corrections & Production Audit**          | 2026-10-05 – 2026-10-07 | Maps, Database, Certificates           | `Completed` |
| [0002](./0002-certificate-handoff-and-access-oct-08-09.md) | **Certificate Handoff, Data Fix & Access Security** | 2026-10-08 – 2026-10-09 | Certificates, Security, Database, ADRs | `Completed` |
| [0003](./0003-active-backlog.md)                           | **Active Backlog & Upcoming Integrations**          | Active Backlog          | Payments, REVA, DevOps, Auth           | `Pending`   |

