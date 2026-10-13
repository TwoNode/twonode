# TASK-0011: Session Batch — 2026-10-12 (S3 privacy and key layout)

- **Status:** Planned (waiting on roji-tech's go for Phase 1)
- **Priority:** High (surveyors' files and clients' documents are readable by anyone with the link)
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** one PR per phase
- **Created:** 2026-10-12 UTC

> **How to tick:** change `[ ]` to `[x]`. Every AWS write needs roji-tech's go for that specific change: show the exact policy JSON, save the current policy to `out/` first, verify with curl afterwards.

---

## 1. Objective

Make the private files in `reva-store` private without breaking the public GBC website, and put new uploads on the layout in [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md). Findings are in the [issues register](../issues/index.md) (I-004, I-019 to I-023).

## 2. Findings (read-only, 2026-10-12)

- [x] Bucket policy allows public read of `*`; Block Public Access is off; ACLs are disabled (`BucketOwnerEnforced`), so the policy is the only exposure. Ticking "block public ACLs" is not needed.
- [x] Object counts: `surfboard/` 6,646, `GBC2/` 505 (`qrcodes` 418, `gallery` 68, `speakers` 12, `logos` 7), `reva/uploads/` 139, `uploads/` 469 (`PrivateSurveyPlans/` about 360).
- [x] REVA stores permanent public links in `Property` and `OneTimeUserProperty`: 18 documents, 28 site photos and 18 report links under `reva/uploads/`; 4 documents under `uploads/`. No REVA record points at `uploads/PrivateSurveyPlans/`.
- [x] Every public GBC page image (gallery 30 + 30 thumbnails, speakers 10, sponsors 6) points at `GBC2/`. Ticket QR codes (155 rows) show on the "my ticket" and payment-success pages.
- [x] The app key (`s3-uploader`) can read the policy and settings. Neither it nor the local `amplify-cli-admin` profile was tested for writing a policy (that needs a real write), and the profile cannot simulate IAM policies.

## 2b. Legacy classification (read-only, 2026-10-12)

Every link in the database (all text, JSON and array columns, 3,259 links) was matched against all 7,760 objects. No file is used by both a public and a private column. Companion `…S3Key` columns exist for GBC tickets, gallery, speakers and sponsors, and for the Certificate of Deposit receipt; a move must update them with the URL.

| Group                        | Files | Referenced | Orphan | Public or private                                                                                                                       |
| ---------------------------- | ----- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GBC2/gallery`               | 68    | 60         | 8      | **Public** (`gbc_gallery`: media + thumbnails)                                                                                          |
| `GBC2/speakers`              | 12    | 10         | 2      | **Public** (`gbc_speakers.photo`)                                                                                                       |
| `GBC2/logos`                 | 7     | 6          | 1      | **Public** (`gbc_sponsors.logo`)                                                                                                        |
| `GBC2/qrcodes`               | 418   | 155        | 263    | **Private** (`gbc_tickets.qrCode`, shown to the ticket owner)                                                                           |
| `reva/uploads`               | 139   | 65         | 74     | **Private** (documents, reports, site photos)                                                                                           |
| `uploads/` root              | 106   | 5          | 101    | **Private**; 4 documents and 1 report are referenced, the rest look like old user uploads and 4 plain-named `.svg` files of unknown use |
| `uploads/PrivateSurveyPlans` | 363   | 0          | 363    | **Private** (old scans, 630 MB, nothing points at them)                                                                                 |
| bucket root: `revaLogo.png`  | 1     | 0          | 1      | Unused: the app uses its own `public/reva/revaLogo.png`                                                                                 |
| `surfboard/<uuid>`           | 5,653 | 2,661      | 2,992  | **Private**, not moved                                                                                                                  |
| `surfboard/<other folder>`   | 993   | 136        | 857    | **Private**, not moved                                                                                                                  |

Also found: 94 stored links whose file is missing from the bucket (77 red copies, 5 CAD, 5 REVA documents, 3 PDFs, 3 reports, 1 attachment). 3,849 of the 6,646 `surfboard/` files are unreferenced (58%, about 3 GB); do not delete without a separate check.

Consequence for the move: only 30 + 30 + 10 + 6 = 76 database links are public ones. Orphans are not moved; they are only made private by the policy and listed for Phase 4.

## 3. Work breakdown

### Phase 1: Surfboard and `PrivateSurveyPlans` private

- [ ] **Red copy and the external service:** `submitRedCopy` (`surfboard/services/planService.ts`) sends the file's permanent S3 URL to `https://api.redcopy.com/submit`, so once `surfboard/*` is private the service cannot fetch it. From the dev machine `api.redcopy.com` does not resolve, and no Surfboard screen was found calling `/plans/[planId]/red-copy`; red copies seem to come in through the "record copy" upload (`AmendPlanModal.tsx`) instead. Red copy files are private (decided by roji-tech, 2026-10-12), so nothing here needs a public link. If an external service ever has to fetch a red copy, sign the link at submit time with a longer expiry.

- [x] **Replace every raw stored-URL link with the gateway link** (settings logo and signature, red copy links on the edit plan modal and six MDA pages, receipt links, viewer attachments, the plan form file list). Also fixed in the gateway: `ARCHIVE` and `MDA_SUPERADMIN` were not allowed; surveyors could not open staff-uploaded payment receipts (18 of 24 sit outside their folder); redirect cached privately. PR #370 (2026-10-12). Still to do: check each screen in a browser as a surveyor and as MDA staff on staging.
- [x] Cache the gateway redirect privately for less than the link life (`private, max-age=240`, `Vary: Cookie`), tested. PR #370.
- [ ] New red copies use `surfboard/<userId>/redcopy/<plan number>-<timestamp>…`, not the plan number as the folder (ADR-0012); old red copies stay where they are.
- [ ] **Public plan page Certificate of Deposit link (I-026):** add a gated route that checks `getPlanQRAccessState` before signing a short link, and use it in `PublicSurfPlan.tsx`. Policy v1 must wait for this. _(Waiting on: roji-tech go)_
- [x] **Public `plans/[planId]/public/full` route (I-027):** gated behind login (staff any plan, surveyor own or shared); nothing in the app called it, any outside caller must now send a login. (2026-10-12)
- [ ] **Strip file fields from the public QR-gated plan response (I-027):** `getGatedPublicSurfPlan` keeps `pdfFilePaths`, `cadFilePaths`, `certificateFilePaths`, `redCopyFileUrl` for unpaid visitors. _(Waiting on: roji-tech go)_
- [ ] Back up the current policy to `out/`, then apply policy v1: public read on `GBC2/*`, `reva/*` and the 4 referenced `uploads/` keys only. This makes `surfboard/*`, `uploads/PrivateSurveyPlans/*` and the rest of `uploads/` private. _(Waiting on: roji-tech go, and an identity that can write the policy or the AWS admin)_
- [ ] Verify with curl: a `surfboard/` and a `PrivateSurveyPlans/` file return 403, a `GBC2/` image 200, a signed link from the app works, and the surveyor logo shows. Confirm with roji-tech that no other app reads `uploads/`.

### Phase 1b: Plan number normalisation and the red copy key (I-024)

Decision (roji-tech, 2026-10-12): red copy key is `surfboard/<userId>/redcopy/<plan number, normalised>` and plan numbers are normalised wherever they are used.

- [x] (Done 2026-10-13, branch `feat/plan-number-normaliser`; the lookups below and the column are still open) One shared module (`surfboard/utils/planNumber.ts`): `normalizePlanNumber()` (trim, uppercase, collapse spaces, drop trailing `_` and `.`; keep `/`) and `planNumberToKeySegment()` (`/` to `_`), with tests built from the real variants. Replace the three existing copies (`awsService.ts`, `lib/storage/utils.ts`, `aiExtractionService.ts`).
- [ ] Use it for every lookup and check: the duplicate check in `planService.ts`, the Red Copy webhook lookup, search, CoD batches and payment references, certificates and QR.
- [ ] Store the canonical form in a new column (suggest `planNumberKey`, non-unique index first) and keep `planNumber` as typed, because certificates and PDFs print it. Needs a migration (migrate-deploy first) and a guarded backfill of 2,373 rows. _(Waiting on: roji-tech go, a prod write)_
- [ ] Resolve the 15 colliding pairs by hand before the canonical column can be unique; some are real duplicates (trailing `_`), some may be different plans (`D/012` vs `D012`). _(Waiting on: roji-tech)_
- [ ] Fix the red copy callers that pass the plan number in the user id slot (`submitRedCopy`); new key `surfboard/<userId>/redcopy/<planNumberKey>.<ext>`. Decide: overwrite on re-upload (as written) or `__<timestamp>` to keep history.

### Phase 2: REVA private

- [ ] Sign links when REVA pages render site photos, documents and reports (`SingleRequestPage.tsx`, `verifypayment/viewDetails.tsx`, `reva-restricted` views), after checking the database that the caller may see that request.
- [ ] New REVA uploads go to `private/reva/<requestId>/…` (`awsActions.ts`); stop writing to `uploads/` (`uploadToS3`).
- [ ] Apply policy v2: drop `reva/*` and the 4 `uploads/` keys. Verify.

### Phase 3: GBC key layout

- [ ] New GBC uploads go to `public/gbc/<edition>/{gallery,speakers,logos}/…` and `private/gbc/<edition>/qrcodes/…` (`gbc/utils/aws-s3.ts`); update the key-builder tests.
- [ ] Sign ticket QR links on the "my ticket" and payment-success pages; then drop `GBC2/qrcodes/*` from the policy. Old `GBC2/{gallery,speakers,logos}/*` stay public.
- [ ] Final policy: `public/*` plus the old `GBC2/` public folders. Verify the public GBC pages by eye.

### Phase 5 (optional): move the legacy files

Not needed for privacy: the policy already makes them private and signed links work from the stored key. Only worth doing to retire the legacy allow-list or to tidy. Default: not done. Per group, with a go each:

1. List the rows that point at the group and the exact rows to change; take a backup of those rows (CSV in `out/`).
2. Copy the objects server-side (`aws s3 cp s3://… s3://…`, no download) to the new key. Do not delete anything yet.
3. In one guarded transaction, update the URL (and `…S3Key`) columns; commit only if the row count matches exactly; arrays and the REVA `report` JSON are rewritten URL by URL.
4. Verify: new links load or sign, the page shows the file, old key still present as a fallback.
5. After a grace period (suggest 30 days) and a check that nothing logs requests for the old key, delete the old objects.

- [ ] Group A: GBC public images `GBC2/{gallery,speakers,logos}/` to `public/gbc/<2.0 edition>/…` (about 90 files; rows in `gbc_gallery` 30 + 30 thumbnails, `gbc_speakers` 10, `gbc_sponsors` 6, plus the `…S3Key` columns).
- [ ] Group B: GBC QR codes `GBC2/qrcodes/` to `private/gbc/<edition>/qrcodes/` (155 referenced rows in `gbc_tickets`; the other 263 files are orphans, see Phase 4).
- [ ] Group C: REVA files `reva/uploads/` and the 4 under `uploads/` to `private/reva/<requestId>/…` (about 64 files; `Property` and `OneTimeUserProperty` arrays and `report` JSON).
- [ ] Group D: `uploads/PrivateSurveyPlans/` and the old `uploads/` root: leave in place (private, no references); archive or delete only after roji-tech decides.
- [ ] Group E: `surfboard/`: not moved (ADR-0012 layout stays).

### Phase 4: Cleanup (separate go for each, list and back up first)

- [ ] 51 of 94 top-level `surfboard/` folders are not user IDs (numeric, 3-letter codes, tests); check which are referenced in the database before touching them (I-023).
- [ ] Remove `.db` junk in `uploads/PrivateSurveyPlans/` and orphaned QR files (418 files, 155 referenced).
- [ ] Remove `REVA_AWS_*` from Vercel. _(Waiting on: roji-tech go)_

## 4. Verification

- [ ] `npx tsc --noEmit` and `npx vitest run` after each code phase; `docs/functions/*.md` updated for any changed function.
