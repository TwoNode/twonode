# TASK-0003: Active Backlog & Integrations (Upcoming)

- **Status:** Pending
- **Priority:** Medium
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** TBD
- **Created:** 2026-10-09 10:00:00 UTC
- **Started:** Pending
- **Ended:** Pending
- **Duration:** Pending

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Track open integrations, deferred configurations, and operational housekeeping items that are awaiting third-party credentials, administrative decisions, or future release cycles.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Payments & REVA

- [ ] **Set GOOGLE_MAPS_SERVER_API_KEY:** Set on Vercel (staging first, then prod) to enable server-side REVA address checks. Waiting on Google Cloud project owner to enable billing (current key returns REQUEST_DENIED; setting prematurely would 503 REVA payments). _(Assignee: roji-tech)_
- [ ] **Paystack renewal webhook payload verification:** Verify Paystack subscription renewal webhook payload against live event signatures once test renewal triggers. _(Assignee: roji-tech)_

### Module B: GBC Administration

- [ ] **Activate GBC 3.0 edition on prod:** Edition 2.0 is past. Create and activate GBC 3.0 in admin dashboard when ready. _(Assignee: roji-tech)_

### Module C: Infrastructure, DevOps & Security

- [x] **Update DEPLOYMENT.md database mapping:** Updated `docs/DEPLOYMENT.md` and migration workflow files using environment placeholders (`<prod-db>`, `<staging-db>`, `<local-db>`) in [PR #315](https://github.com/TwoNode/twonode/pull/315) (2026-10-09). _(Assignee: AI & roji-tech)_
- [ ] **Rotate staging database password:** Staging database password was pasted in chat earlier. Rotate in Neon console and Vercel staging environment variables. _(Assignee: roji-tech)_
- [ ] **Cloudflare R2 migration (TASK-0014, ADR-0016):** Execute zero-downtime migration of 7,344 objects (~3.69 GB) via Cloudflare Super Slurper + Sippy fallback, configure custom domain `storage.twonodetechnologies.com`, activate pre-built `CloudflareR2StorageAdapter`, and eliminate AWS egress fees. _(Assignee: roji-tech / AI)_
- [ ] **Complete Kinde configuration on staging:** Staging Kinde credentials and callback URLs are pending configuration. _(Assignee: roji-tech)_
- [ ] **Web map tile licensing decision:** Surfboard map requests Google tiles. Decide on commercial licensing or alternative tile provider. _(Assignee: roji-tech)_
- [ ] **Clean up disposable staging test accounts:** Decide whether to keep or prune test accounts created during staging verification on `twonode_staging`. _(Assignee: roji-tech)_

### Module D: Corporate Site & /v2 Redesign

- [x] **Twonode landing page /v2 design selection & implementation:** Evaluated artboards, selected "18. Nodes" with kinetic motion & mobile layout, and implemented production Next.js components on `/v2`. Completed in [TASK-0004](./0004-twonode-v2-landing-redesign.md) (2026-10-10). _(Assignee: roji-tech / AI)_

---

## 3. Unified Verification Gates

- [ ] Vercel environment variables verified
- [ ] Staging and production authentication smoke tests pass
- [ ] Docs match deployed infrastructure
