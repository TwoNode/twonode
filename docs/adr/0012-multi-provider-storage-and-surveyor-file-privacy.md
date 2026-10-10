# 0012. Multi-provider storage architecture and surveyor file privacy

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** roji-tech & AI Pair
- **Related:** [ADR-0008](./0008-gbc-certificate-access.md), [TASK-0005](../tasks/0005-surfboard-cod-red-copy-and-file-privacy.md), `lib/storage/`, `surfboard/services/awsService.ts`, `app/api/v1/surfboard/files/view/route.ts`
- **Enforced by:** Vitest tests (`855/855` passed), `npx tsc --noEmit` clean, and authenticated file view gateway with role-based checks.

## Context

1. **Unprotected S3 Public URLs:**
   Surveyors upload confidential cadastral documents (survey plan PDFs, CAD DWG/DXF drawings, pillar coordinates, and Certificate of Deposit record copies). Previously, these files were uploaded directly to AWS S3 with URLs persisted as raw public strings (`https://${bucket}.s3.${region}.amazonaws.com/...`). Anyone possessing or brute-forcing the URL could view private land boundaries, legal survey numbers, and client information.
2. **Missing Record Copy (Red Copy) PDFs in CoD:**
   In Cadastre/Certificate on Demand (CoD), queries and batch processing omitted `redCopyFileUrl` in database selects. Dashboard views and plan details rendered no link or viewer for the uploaded record copy, leaving surveyors unable to find or verify their documents.
3. **Provider Lock-in & Local Development Friction:**
   Developers working locally or staging deployments without AWS IAM credentials were unable to test file workflows cleanly. The business also needed agility to switch between providers: Cloudflare R2 (zero egress fees), Cloudinary, Vercel Blob, ImageKit, or a local filesystem adapter for offline development.

## Decision

1. **Pluggable Multi-Provider Storage Adapter (`lib/storage/`):**
   - Implemented a unified `StorageAdapter` interface covering: `upload`, `getPresignedUploadUrl`, `getDownloadUrl` (signed private URL generation), and `delete`.
   - Built 8 interchangeable provider adapters:
     - `s3`: AWS S3 via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
     - `r2` / `cloudflare`: Cloudflare R2 (S3-compatible API with zero egress fees).
     - `minio`: MinIO self-hosted S3-compatible object storage.
     - `supabase`: Supabase Storage S3-compatible protocol.
     - `cloudinary`: Cloudinary private asset delivery with signed expiration URLs.
     - `vercel-blob`: Vercel Blob storage (`@vercel/blob`) with tokenized access.
     - `imagekit`: ImageKit media storage with signed private delivery URLs.
     - `local`: Local disk storage (`storage/uploads/` and `app/api/storage/local/`) for development with zero external cloud credentials.
   - Provider selection is controlled via `STORAGE_PROVIDER` or `SURFBOARD_STORAGE_PROVIDER` environment variable with graceful fallback to `s3`.
2. **Authenticated Gateway (`/api/v1/surfboard/files/view`):**
   - Surveyors and consumers no longer receive direct public bucket URLs.
   - The `/api/v1/surfboard/files/view?url=...` endpoint is protected by `withAuth`. It verifies that:
     - The user is an MDA reviewer/admin (`ACCOUNTS`, `CHARTING`, `SURCON`, `RECORDS_I`, `INTAKE`, `RECORDS_II`, `ADMIN`, `SUPERADMIN`), or
     - The user owns the plan (`userId === session.sub`), or
     - The plan was explicitly shared with the user (`sharedTo.has(session.sub)`), or
     - The file key begins with the user's personal prefix (`surfboard/${userId}/`).
   - If authorized, generates a short-lived (5-minute TTL) signed download URL and redirects the browser, or returns `{ success: true, url }` if requested in JSON format.
3. **Record Copy (Red Copy) CoD Availability:**
   - Updated `remitaVerificationService.ts` (`getUserBatches` and `USER_BATCH_SELECT`) to select `redCopyFileUrl`.
   - Rendered dedicated "Record Copy (Red Copy)" cards in `SinglePlan.tsx` and `OptimizedSinglePlanDetails.tsx`.
   - Added clickable "Record Copy" links in `AllPlans.tsx` (table, cards, and row action menu) and `SubmittedBatchesModal.tsx`.
   - In `RecordCopyUploadModal.tsx`, added a "View PDF" button for existing files and a 1-click "Use Uploaded Plan PDF" fallback if a plan PDF already exists.

## Alternatives Considered and Rejected

- **Making S3 bucket permanently public:** Rejected; completely violates survey data confidentiality and client privacy requirements.
- **Serving entire PDF file payloads through Next.js server memory on every view:** Rejected; high memory consumption, worker exhaustion under load, and high Vercel execution timeouts for multi-megabyte CAD/PDF documents. Short-lived signed URLs offload bandwidth to storage edge securely.
- **Hardcoding Cloudflare R2 exclusively:** Rejected; business requirements require flexibility to operate across AWS S3, Cloudflare, Cloudinary, Vercel Blob, ImageKit, or local mock storage depending on environment.

## Consequences & Downsides

- Private S3 / R2 buckets must have CORS headers configured to allow signed URL direct browser downloads if accessed via AJAX/fetch.
- Preview iframe in browser relies on short-lived redirects via the authenticated endpoint.
