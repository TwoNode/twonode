# Phase 14: Multi-Provider Storage, Surveyor Privacy & V2 Redesign (October 9–10, 2026)

**Status:** Completed. **Date:** 2026-10-10. **Branch/PRs:** PR #316–#321.

## Why

1. Surveyors upload confidential land boundary documents (PDFs, CAD drawings, pillar coordinates). Storing them as public AWS S3 URLs exposed private legal boundaries to public scraping.
2. Record Copy (Red Copy) PDFs were missing from Cadastre / Certificate on Demand (CoD) batch views.
3. Teams required zero cloud vendor lock-in with ability to dynamically switch between AWS S3, Cloudflare R2, MinIO, Supabase Storage, Cloudinary, Vercel Blob, ImageKit, or local disk for offline dev.
4. Corporate landing page `/v2` redesign needed implementation of the "18. Nodes" aesthetic with kinetic network graph motion, mobile drawer navigation, and upgraded 4-column Obsidian footer.

## Scope

- [x] **Pluggable Multi-Provider Storage Architecture ([ADR-0012](../../adr/0012-multi-provider-storage-and-surveyor-file-privacy.md)):**
  - Built unified `StorageAdapter` interface under `lib/storage/`.
  - Implemented 8 modular drivers:
    - `s3`: AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
    - `cloudflare` / `r2`: Cloudflare R2 (zero egress fee S3 compatibility).
    - `minio`: MinIO self-hosted S3-compatible storage.
    - `supabase`: Supabase Storage S3-compatible API.
    - `cloudinary`: Cloudinary media delivery with signed URLs.
    - `vercel-blob`: Vercel Blob storage.
    - `imagekit`: ImageKit media processing & storage.
    - `local`: Native Node.js `fs/promises` (`public/uploads/`) for zero-credential offline testing.
  - Dynamically selectable via `STORAGE_PROVIDER` or `SURFBOARD_STORAGE_PROVIDER` environment variables.
- [x] **Surveyor File Privacy & Authenticated Gateway:**
  - Replaced raw public URLs with authenticated gateway endpoint `/api/v1/surfboard/files/view`.
  - Enforced permission checks (plan ownership, explicit share list, MDA reviewer role) before issuing short-lived signed download URLs (5-minute TTL).
- [x] **CoD Record Copy (Red Copy) Availability:**
  - Selected `redCopyFileUrl` in batch queries and added download/preview cards in `SinglePlan.tsx`, `OptimizedSinglePlanDetails.tsx`, `AllPlans.tsx`, and `RecordCopyUploadModal.tsx`.
- [x] **Twonode Landing Page /v2 Redesign:**
  - Implemented "18. Nodes" design direction with kinetic SVG network motion in `HeroNetworkGraph.tsx`, responsive drawer (390px mobile), and upgraded 4-column Obsidian footer (`FooterV2.tsx`).
- [x] **Environment Template & Production Deployment:**
  - Created comprehensive, sanitized `.env.example` documenting all 8 storage adapters, runtime, auth, payments, and messaging.
  - Merged PR #318 & PR #321 to `prod`.
  - Executed manual production migration workflow (`migrate-production.yml` Run #38034359383), applying `20261009100000_gbc_certificate_access` to `twonode_db`.

## Verification Plan & Completion Report

- All 77 test suites passing, **867/867 tests passing**.
- `npx tsc --noEmit` clean across the entire repository.
- Staging and production databases fully migrated and operational.
