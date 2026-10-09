# TASK-0005: Surfboard CoD Red Copy PDF Availability & S3 Surveyor File Privacy

- **Status:** In Progress
- **Priority:** High
- **Assignee:** roji-tech / AI
- **Target Branch / PR:** `fix/surfboard-cod-red-copy-privacy` / TBD
- **Created:** 2026-10-09 16:15:00 UTC
- **Started:** 2026-10-09 16:15:00 UTC
- **Ended:** In Progress
- **Duration:** In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Debug and resolve the issue where survey plan Red Copy (Record Copy) PDFs are inaccessible to surveyors in the Cadastre/Certificate on Demand (CoD) feature, ensure surveyors can view and download their red copy documents across all relevant dashboard views, and transition surveyor uploaded files (`pdf`, `cad`, `certificate`, `redcopy`, `viewer-attachment`) from raw public S3 URLs to secure, private storage accessed via authenticated, short-lived presigned URLs.

---

## 2. Root Cause & Architectural Diagnosis

### A. Red Copy PDF Inaccessibility
1. **Omission in Single Plan & Detail Views:**
   - In `SinglePlan.tsx` and `OptimizedSinglePlanDetails.tsx`, the `Documents` card only displays `plan.pdfFilePaths` ("PDF Documents"), `plan.certificateFilePaths` ("Certificates"), and `plan.cadFilePaths` ("CAD Files"). `plan.redCopyFileUrl` is completely omitted from the UI.
2. **Missing Actions on Dashboard & Modals:**
   - In `AllPlans.tsx`, the Record Copy column only renders a static badge (`Record Copy Uploaded`). There is no button, preview modal, or download action to view the file.
   - In `SubmittedBatchesModal.tsx`, plans within an active/historical batch show plan number and status badges, but offer no link or button to view or download the attached Red Copy PDF.
   - In `RecordCopyUploadModal.tsx`, plans with an uploaded record copy display a static confirmation without a preview/download link to verify the uploaded document.
3. **CoD Initial Submission Gaps:**
   - When surveyors register plans via `SurfboardPlanForm.tsx`, they upload the survey plan PDF into `pdfFilePaths`. When initiating CoD, they are forced to re-upload the same document as `redCopyFileUrl` instead of having the option to attach/reuse their existing survey plan PDF.

### B. S3 File Privacy Flaw
1. **Raw Public S3 URLs Stored & Exposed:**
   - `surfboard/services/awsService.ts` constructs raw URLs in the format `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}` and returns them directly to clients and the database.
   - Proprietary survey records, land coordinates, client names, and legal boundary documents are accessible to anyone with the URL.
2. **403 Forbidden on Private Buckets:**
   - When standard AWS S3 security best practices (Block Public Access) are applied to the bucket, raw S3 URLs return `403 Forbidden` / `AccessDenied`, causing inline PDF previews, iframe renderers, and download links to fail.
3. **Alignment with Platform Standards:**
   - REVA (`reva/actions/awsActions.ts`) and GBC (ADR-0008 Certificate Access Security Overhaul in PR #314) already use presigned S3 URLs (`getSignedUrl` with `GetObjectCommand`) and authenticated download gates. Surfboard must adopt the same secure architecture.

---

## 3. Work Breakdown (Grouped by Module)

### Module A: S3 Private Storage & Presigned URL Architecture

- [ ] **Implement presigned GET download in `awsService.ts`:** Add `getPresignedDownloadUrl(keyOrUrl: string, expiresIn?: number)` and `extractS3KeyFromUrl(rawUrl: string)` in `surfboard/services/awsService.ts`.
- [ ] **Create authenticated file download/view API route:** Implement `/api/v1/surfboard/files/view` (or `/api/v1/surfboard/files/download`) protected with `withAuth`, verifying ownership, share recipient status, or MDA admin role before returning a short-lived presigned URL or redirecting.
- [ ] **Expose API client helper in `surfboard/apiClient.ts`:** Add `surfboardApi.files.getViewUrl(keyOrUrl: string)` and `surfboardApi.files.download(keyOrUrl: string)`.

### Module B: CoD Red Copy PDF UI & Availability

- [ ] **Add Red Copy Document section to `SinglePlan.tsx`:** Update `PlanWithPillars` type and render a dedicated "Record Copy / Red Copy" document card with View PDF and Download actions when `plan.redCopyFileUrl` exists.
- [ ] **Add Red Copy Document section to `OptimizedSinglePlanDetails.tsx`:** Render the Red Copy document with View/Download actions in the plan detail modal.
- [ ] **Add View/Download Red Copy action to `AllPlans.tsx`:** Update the Record Copy column pill to be clickable (opens preview/view modal or download) and add a "View Red Copy" option in the row dropdown menu (`...`).
- [ ] **Add Red Copy link to `SubmittedBatchesModal.tsx`:** Add a "View Red Copy" button/link next to each plan in the batch plan list.
- [ ] **Enhance `RecordCopyUploadModal.tsx`:** Allow surveyors to preview/download an already uploaded record copy, and provide a 1-click option to "Use uploaded Plan PDF" from `plan.pdfFilePaths[0]` if available.
- [ ] **Ensure `CertificateBatchSelection.tsx` preview reliability:** Update PDF preview iframe in `CertificateBatchSelection.tsx` to use the authenticated/presigned URL instead of raw S3 URLs.

### Module C: Housekeeping & Documentation

- [ ] **Document architectural decision:** Create ADR or update `docs/functions/surfboard.md` and `docs/surfboard/cod-user-and-technical-flow.md` with private S3 URL and Red Copy access flows.
- [ ] **Update live HUD & backlog:** Reflect progress in `docs/tasks/current-tasks.md` and `docs/tasks/0003-active-backlog.md`.

---

## 4. Unified Verification Gates

- [ ] `npm run build` / Next.js compilation succeeds with zero errors.
- [ ] All unit tests pass (`npm run test:vitest` / `npx vitest run`).
- [ ] Presigned download URLs tested with short TTLs and verified against S3 key formats.
- [ ] Verified non-owners and unauthenticated users cannot access surveyor files without authorization.
