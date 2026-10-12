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

## 3. Work breakdown

### Phase 1: Surfboard and `PrivateSurveyPlans` private

- [ ] Serve `SurfboardUser.logo` through the file gateway on the settings page (I-019); search for any other plain-URL use of `surfboard/` files first. _(Waiting on: roji-tech go)_
- [ ] Add `Cache-Control: private, max-age=240` to the gateway redirect so a refresh does not re-download private images; test that the header is below the link's expiry.
- [ ] Back up the current policy to `out/`, then apply policy v1: public read on `GBC2/*`, `reva/*` and the 4 referenced `uploads/` keys only. This makes `surfboard/*`, `uploads/PrivateSurveyPlans/*` and the rest of `uploads/` private. _(Waiting on: roji-tech go, and an identity that can write the policy or the AWS admin)_
- [ ] Verify with curl: a `surfboard/` and a `PrivateSurveyPlans/` file return 403, a `GBC2/` image 200, a signed link from the app works, and the surveyor logo shows. Confirm with roji-tech that no other app reads `uploads/`.

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
