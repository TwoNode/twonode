# TASK-0010: Session Batch — 2026-10-12 (Vercel env cleanup, staging promotion, /v4 responsive)

- **Status:** In Progress (promoted to prod 2026-10-12; waiting on roji-tech for the `REVA_AWS_*` removal and the AWS admin for the S3 bucket)
- **Priority:** High
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `docs/env-cleanup-and-promotion` (this record), `feat/v4-responsive` (responsive work)
- **Created:** 2026-10-12 UTC
- **Started:** 2026-10-12 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Tidy the Vercel environment variables, promote the review fixes to staging and test them, record what is left on the AWS S3 side, and make `/v4` work properly on phones and tablets.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: Vercel environment variables

- [x] **`AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` set** for Production, Preview and Development from the local `.env` values (identical to the existing `REVA_AWS_*`, checked by fingerprint). Code reads only these names since PR #356. (Done 2026-10-12)
- [x] **`CRON_SECRET` set** for Production and Preview (separate random values, stored as secrets). Applies from the next deploy. (Done 2026-10-12)
- [x] **Seven unused variables removed** from every environment, after backing up their values to a private local file: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_LOGIN_URL`, `NOTIF_EMAIL`, `NOTIF_EMAIL_PASS`, `PAYSTACK_CALLBACK_URL`, `NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY`. `KINDE_*` kept (the Kinde SDK reads them implicitly). (Done 2026-10-12)
- [x] Local `.env`, `.env.staging`, `.env.local`: `REVA_AWS_*` renamed to `AWS_*` (values unchanged). (Done 2026-10-12)
- [ ] **Remove `REVA_AWS_*` from Vercel** once the `AWS_*` code is deployed to prod and working. _(Waiting on: roji-tech go to remove them; prod now runs on `AWS_*`)_
- [ ] **`REDCOPY_WEBHOOK_SECRET`** not set anywhere; the webhook accepts anyone (issue I-018). Needs Red Copy to send the same value. _(Waiting on: roji-tech / Red Copy)_
- [x] **Make the cron route and the Red Copy webhook refuse requests when their secret is missing** (I-017, I-018). Done 2026-10-13: fails closed, tests added, PR to `dev`. The Red Copy webhook now rejects everything until `REDCOPY_WEBHOOK_SECRET` is set (OSSG replaces it).
- [ ] **`GOOGLE_MAPS_SERVER_API_KEY`** still missing (Google billing). _(Waiting on: roji-tech / Cloud Admin)_
- [ ] Leftovers to review: `PAYSTACK_SECRET` (read by no code), `ONLINE_BASE_URL`, the legacy `utils/paystackConfig.ts` (reads `PAYSTACK_LIVE_PUBLIC_KEY` / `PAYSTACK_TEST_PUBLIC_KEY`, not set on Vercel).

### Module B: Promotion and tests

- [x] PRs #353, #355, #356, #357 merged to `dev`; `dev` → `main` PR #358 merged (staging). (Done 2026-10-12)
- [x] **Staging smoke tests passed** (17 checks, using `vercel curl` because staging is behind Vercel login protection): home, /v4, /v4/contact, /v4/insights, /v4/industries/real-estate, /v2, /v2/contact (new phone number in the page), /gbc, /gbc/gallery, /reva, /surfboard all 200; certificate page for a bogus ticket 404; legacy certificate PDF route 403; certificate download GET 405 and POST with empty body 400; cron route without the secret 401; surveyor file gateway without login 401. (Done 2026-10-12)
- [ ] **Not covered by the smoke tests:** a real S3 upload and a signed file link on staging (needs a login); the certificate download button in a browser against an issued ticket; page source of a real certificate page. _(Waiting on: someone with a staging login)_
- [x] **Promote `main` → `prod`.** PR #362 merged on roji-tech's go; the production build finished Ready. (Done 2026-10-12)

### Module C: AWS S3 dashboard (needs the AWS admin; code cannot do this)

See issue I-004. Do not turn on Block Public Access for the whole bucket: the GBC website images and ticket QR codes (`GBC2/`) are served from the same bucket by plain URL.

- [ ] Find the public-read statement in the bucket policy (or a bucket ACL) and replace it with one that allows public `s3:GetObject` only on `GBC2/*`. _(Waiting on: AWS admin)_
- [ ] Turn on the ACL blocks (Block public ACLs, Ignore public ACLs) so no object-level ACL can expose a file. _(Waiting on: AWS admin)_
- [ ] Confirm the app's IAM user has `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the bucket (signed links depend on it).
- [ ] Leave `reva/*` and `uploads/*` alone until we know whether the REVA pages show those files with plain URLs (26 property images, 10 + 4 documents).
- [ ] **Code change first:** the surveyor logo (`SurfboardUser.logo`, 22 rows under `surfboard/`) is shown with a plain `<img src>` on the Surfboard settings page and will break once `surfboard/*` is private. Serve it through `/api/v1/surfboard/files/view`. (Issue I-019) _(Waiting on: roji-tech go)_
- [ ] After the change: an anonymous request to a `surfboard/` object returns 403, a `GBC2/` image returns 200, a signed link from the app works. Then record it in a new ADR (ADR-0012 is not rewritten).

### Module D: /v4 mobile and tablet responsiveness

- [x] Reviewed `/v4` at 320, 390, 768 and 1024 px and fixed (PR #360): tablet hero stacks, work cards one per row with art beside copy, the "Our work" heading stacks instead of wrapping word by word, tablet footer in three columns with the email on one line, shorter hero art on phones, footer links at 44px on touch. (Done 2026-10-12)
- [x] Re-measured on 7 pages x 4 widths: no horizontal scroll, no text under 12px, no page errors, no link under 43px on touch widths; home page screenshots compared before and after. (Done 2026-10-12)
- [ ] Not checked: real devices, phone landscape, and the inner pages by eye at tablet width (measured only). The hero art is still mostly empty on tablet and phone (the network is small inside a large panel).

---

## 3. Unified Verification Gates

- [x] `tsc --noEmit` clean and 882/882 tests on `dev` before promotion
- [x] Staging smoke tests (Module B)
- [x] Prod promotion verified after deploy: home, `/v4` and `/v2/contact` (new phone number) 200; bogus verify page and old certificate page 404; old certificate PDF route 403; download route without a token 400; cron route without the secret 401; file gateway without login 401. Not tested: a real certificate download and an S3 upload (need a login). (Done 2026-10-12)
- [ ] Anonymous 403 on `surfboard/*` after the bucket change

---

## 4. Deliverables

- **PRs:** #353, #355, #356, #357 (merged to `dev`), #358 (`dev` → `main`); this docs PR; responsive PR to follow
- **Artifacts / Backups:** the removed Vercel variables' values are in a private local backup file (not in the repo)

---

## 5. Notes

- Staging (`main`) is protected by Vercel Authentication. To test it from a terminal: `vercel curl <path> --deployment <staging url>` (needs `vercel login`). Plain `curl` gets a 302 to the Vercel login page.
- `.env.example` and `SURFBOARD_ENV_TEMPLATE.env` now list only the plain `AWS_*` names.
- [x] **Second promotion 2026-10-12:** certificate email redesign (#363, #365) and docs (#364) promoted `dev` → `main` → `prod` (#366, #367). Production build Ready; home, `/v4`, `/v4/contact`, `/v2/contact` 200; bogus verify and certificate pages 404; cron 401; file gateway 401; old certificate PDF route 403; download without a token 400. Not tested: a real certificate email send.
- [ ] **Vercel "Git information retrieval failed" on two Preview builds** (feature-branch commits, not production). Cause not found; check Project Settings → Git (the repo remote still uses the old lowercase `twonode/twonode` URL). _(Waiting on: roji-tech, Vercel dashboard)_
