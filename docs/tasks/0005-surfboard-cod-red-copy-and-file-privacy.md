# TASK-0005: Surfboard CoD Red Copy PDF Availability & S3 Surveyor File Privacy

- **Status:** Completed
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `dev`
- **Created:** 2026-10-09 16:15:00 UTC
- **Started:** 2026-10-09 16:15:00 UTC
- **Ended:** 2026-10-09 21:10:00 UTC
- **Duration:** 4h 55m

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Debug and resolve the issue where survey plan Red Copy (Record Copy) PDFs are inaccessible to surveyors in the Cadastre/Certificate on Demand (CoD) feature, ensure surveyors can view and download their red copy documents across all relevant dashboard views, and transition surveyor uploaded files (`pdf`, `cad`, `certificate`, `redcopy`, `viewer-attachment`) from raw public S3 URLs to secure, private storage accessed via authenticated, short-lived presigned URLs.

---

## 2. Root Cause & Architectural Diagnosis

### A. Red Copy PDF Inaccessibility
1. **Omission in Single Plan & Detail Views:**
   - In `SinglePlan.tsx` and `OptimizedSinglePlanDetails.tsx`, the `Documents` card only displayed `plan.pdfFilePaths` ("PDF Documents"), `plan.certificateFilePaths` ("Certificates"), and `plan.cadFilePaths` ("CAD Files"). `plan.redCopyFileUrl` was completely omitted from the UI and Prisma queries (`remitaVerificationService.ts`).
2. **Missing Actions on Dashboard & Modals:**
   - In `AllPlans.tsx`, the Record Copy column only rendered a static badge (`Record Copy Uploaded`). There was no button, preview modal, or download action to view the file.
   - In `SubmittedBatchesModal.tsx`, plans within an active/historical batch showed plan number and status badges, but offered no link or button to view or download the attached Red Copy PDF.
   - In `RecordCopyUploadModal.tsx`, plans with an uploaded record copy displayed a static confirmation without a preview/download link to verify the uploaded document.
3. **CoD Initial Submission Gaps:**
   - When surveyors register plans via `SurfboardPlanForm.tsx`, they upload the survey plan PDF into `pdfFilePaths`. When initiating CoD, they were forced to re-upload the same document as `redCopyFileUrl` instead of having the option to attach/reuse their existing survey plan PDF.

### B. S3 File Privacy Flaw
1. **Raw Public S3 URLs Stored & Exposed:**
   - `surfboard/services/awsService.ts` constructed raw URLs in the format `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}` and returned them directly to clients and the database.
   - Proprietary survey records, land coordinates, client names, and legal boundary documents were accessible to anyone with the URL.
2. **403 Forbidden on Private Buckets:**
   - When standard AWS S3 security best practices (Block Public Access) are applied to the bucket, raw S3 URLs returned `403 Forbidden` / `AccessDenied`, causing inline PDF previews, iframe renderers, and download links to fail.
3. **Alignment with Platform Standards:**
   - REVA (`reva/actions/awsActions.ts`) and GBC (ADR-0008 Certificate Access Security Overhaul in PR #314) already use presigned S3 URLs (`getSignedUrl` with `GetObjectCommand`) and authenticated download gates. Surfboard now shares this secure architecture with pluggable multi-provider support.

---

## 3. Work Breakdown (Grouped by Module)

### Module A: Pluggable Multi-Provider Storage & Presigned URL Architecture

- [x] **Unified Storage Adapter Interface (`lib/storage/`):** Defined `StorageAdapter` contract supporting `upload`, `getPresignedUploadUrl`, `getDownloadUrl` (signed/private URL generation), and `delete`. (2026-10-09)
- [x] **Implement Provider Backends (switchable via `STORAGE_PROVIDER` env):** (2026-10-09)
  - **`s3`:** AWS S3 via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
  - **`cloudflare` / `r2`:** Cloudflare R2 via `@aws-sdk/client-s3` S3-compatible API.
  - **`cloudinary`:** Cloudinary asset management with signed private delivery URLs.
  - **`vercel-blob`:** Vercel Blob storage (`@vercel/blob`) with tokenized access.
  - **`imagekit`:** ImageKit media storage with signed URLs.
  - **`local`:** Local filesystem storage (`storage/uploads/` or `public/uploads/`) for zero-credential offline development.
- [x] **Create authenticated file download/view API route:** Implemented `/api/v1/surfboard/files/view` protected with `withAuth`, verifying ownership, share recipient status, or MDA admin role before returning a short-lived presigned URL or redirecting. (2026-10-09)
- [x] **Expose API client helper in `surfboard/apiClient.ts`:** Added `surfboardApi.files.getViewUrl(keyOrUrl: string)` and `surfboardApi.files.getSignedUrl(keyOrUrl: string)`. (2026-10-09)
- [x] **Preserve backward compatibility in `awsService.ts`:** Delegated `awsService.ts` methods to the active storage adapter while maintaining identical parameter signatures. (2026-10-09)

### Module B: CoD Red Copy PDF UI & Availability

- [x] **Add Red Copy Document section to `SinglePlan.tsx`:** Updated `PlanWithPillars` type and rendered a dedicated "Record Copy / Red Copy" document card with View PDF and Download actions when `plan.redCopyFileUrl` exists. (2026-10-09)
- [x] **Add Red Copy Document section to `OptimizedSinglePlanDetails.tsx`:** Rendered the Red Copy document with View/Download actions in the plan detail modal. (2026-10-09)
- [x] **Add View/Download Red Copy action to `AllPlans.tsx`:** Updated the Record Copy column pill to be clickable (opens preview/view modal or download) and added a "View Record Copy" option in the row dropdown menu (`...`). (2026-10-09)
- [x] **Add Red Copy link to `SubmittedBatchesModal.tsx`:** Added a "View Red Copy" button/link next to each plan in the batch plan list. (2026-10-09)
- [x] **Enhance `RecordCopyUploadModal.tsx`:** Allowed surveyors to preview/download an already uploaded record copy, and provided a 1-click option to "Use uploaded Plan PDF" from `plan.pdfFilePaths[0]` if available. (2026-10-09)
- [x] **Ensure `CertificateBatchSelection.tsx` preview reliability:** Updated PDF preview iframe in `CertificateBatchSelection.tsx` to use the authenticated/presigned URL instead of raw S3 URLs. (2026-10-09)

### Module C: Housekeeping & Documentation

- [x] **Document architectural decision:** Created [ADR-0012](../adr/0012-multi-provider-storage-and-surveyor-file-privacy.md) documenting multi-provider storage and file privacy. (2026-10-09)
- [x] **Update live HUD & backlog:** Reflected progress in `docs/tasks/current-tasks.md` and `docs/tasks/0005-surfboard-cod-red-copy-and-file-privacy.md`. (2026-10-09)

---

## 4. Unified Verification Gates

- [x] `npx tsc --noEmit` succeeds with zero errors. (2026-10-09)
- [x] All unit tests pass (`npx vitest run`: 76/76 test files, 855/855 tests passed). (2026-10-09)
- [x] Presigned download URLs tested with short TTLs and verified against S3 key formats. (2026-10-09)
- [x] Verified non-owners and unauthenticated users cannot access surveyor files without authorization. (2026-10-09)
