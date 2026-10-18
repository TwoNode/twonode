# 0016. Cloudflare R2 adoption for zero-egress storage and migration strategy

- **Status:** Proposed
- **Date:** 2026-10-16
- **Decided by:** roji-tech & AI Pair
- **Related:** [ADR-0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md), [ADR-0013](./0013-bucket-key-layout-public-and-private-prefixes.md), [TASK-0011](../tasks/0011-s3-privacy-and-key-layout.md), `lib/storage/providers/cloudflare-r2.ts`, `lib/storage/providers/imagekit.ts`
- **Enforced by:** `lib/storage/` multi-provider abstraction, `STORAGE_PROVIDER` environment variable, and Vitest storage test suite (`115/115` test files passing).

> **Corrections (2026-10-18):** see [R2 research findings](../tasks/0014-r2-research-findings-2026-10-18.md). R2 public access is per bucket, so the private data must live in a private bucket with no custom domain, and any public serving needs a separate public bucket or another route. A custom domain also needs the domain as a Cloudflare zone (the main domain is on Vercel nameservers), so the `storage.twonodetechnologies.com` plan is on hold. Status stays Proposed.

## Context

1. **Current S3 Baseline & Inventory Audit (2026-10-14):**
   - The active `reva-store` S3 bucket holds **7,344 objects** totaling **3,872,022,947 bytes (~3.69 GB)**:
     - `surfboard/`: 6,521 objects (~2.98 GB) — survey plan PDFs, DWG/DXF CAD files, CoD red copies.
     - `uploads/`: 361 objects (~0.60 GB) — legacy survey scans and payment receipts.
     - `reva/` and `private/reva/`: 219 objects (~0.09 GB) — due diligence reports, client documents, site inspection photos.
     - `GBC2/`: 242 objects (~0.02 GB) — conference gallery media, speaker photos, sponsor logos.
   - Over **75% of all stored files are cadastral PDFs and CAD drawings**; images constitute less than 15% of the total dataset.

2. **AWS S3 Cost Dynamics & Bandwidth Risk:**
   - AWS S3 Standard (`eu-north-1`) costs $0.023 / GB / month for storage and $0.005 / 1k Class A requests. Because TwoNode holds under 4 GB, current monthly storage costs are negligible (**~$0.50 – $3.00 / month**).
   - However, AWS charges **$0.09 / GB ($90 / TB) for Data Transfer Out (Egress)** beyond the first 100 GB/month. With the rollout of in-page media viewers (TASK-0013) where surveyors and clients frequently stream 20MB–50MB cadastral plans and CAD files, bandwidth poses an unpredictable financial liability as traffic scales.

3. **Storage Provider Alternatives Evaluated:**
   - **Cloudflare R2:** $0.015 / GB / month storage, **$0.00 egress forever**, 10 GB free tier, 100% S3 API compatibility.
   - **Backblaze B2:** $0.006 / GB / month, but requires egress management and Bandwidth Alliance routing.
   - **Wasabi:** $0.0069 / GB / month, but enforces a 1 TB ($6.99/mo) minimum billing threshold and 90-day retention lock.
   - **ImageKit:** Generous 20 GB free tier, but $49/mo minimum on paid tiers with $0.05/GB storage (more than 3x R2). Designed for image/video transformations, offering zero optimization value for binary CAD `.dwg` or cadastral PDFs.

## Decision

1. **Adopt Cloudflare R2 as TwoNode's Primary Storage Provider:**
   - Transition production storage from AWS S3 to Cloudflare R2 by activating the pre-built [`CloudflareR2StorageAdapter`](file:///home/rojitech/Desktop/CODEC/NextJS/twonodes/lib/storage/providers/cloudflare-r2.ts) (`STORAGE_PROVIDER=r2`).
   - Eliminate egress volatility: all file streaming and in-page viewer downloads will incur **$0.00 bandwidth fees**.
   - TwoNode's entire ~3.69 GB footprint fits within R2's **10 GB perpetual free tier**, reducing primary storage costs to **$0.00 / month**.

2. **Reject ImageKit as Primary Object Storage:**
   - ImageKit is rejected as a general storage backend because TwoNode is predominantly a cadastral document platform, not an image/video gallery.
   - If dynamic image transformations (e.g. on-the-fly resizing of conference photos) are required in the future, ImageKit will be utilized strictly as a stateless CDN proxy reading from R2 as an external web origin.

3. **Zero-Downtime Migration Execution via Cloudflare Sippy / Super Slurper:**
   - **Phase 1 (One-Shot Bulk Sync):** Execute a direct cloud-to-cloud copy of all 7,344 objects (~3.69 GB) using Cloudflare Super Slurper, preserving exact key hierarchies (`surfboard/...`, `private/reva/...`, `public/gbc/...`).
   - **Phase 2 (Fallback / Lazy Sync):** Enable Cloudflare Sippy to dynamically fetch and cache any newly written S3 objects in R2 on first request.
   - **Phase 3 (Cutover):** Switch environment variables in Vercel (`STORAGE_PROVIDER=r2`, `CLOUDFLARE_R2_*`), leaving AWS S3 read-only for a 30-day verification grace period before decommissioning.

4. **Custom Domain Branding:**
   - Attach `storage.twonodetechnologies.com` (or `media.twonodetechnologies.com`) to the R2 bucket with automated Cloudflare SSL and global CDN edge distribution.

## Alternatives Considered and Rejected

- **Staying on AWS S3:** Rejected due to $0.09/GB egress pricing. While current bills are minor (~$2/mo), scaling to 500 GB or 1 TB of monthly PDF/CAD downloads would cost $45–$90/mo in pure egress.
- **Backblaze B2:** Highly cost-effective for deep cold archive, but lacks the seamless edge integration and unconditional $0 egress of Cloudflare R2.
- **ImageKit as Primary Storage:** Attractive 20 GB free tier, but unusable for CAD files and expensive ($49/mo base, $0.05/GB) once scaled.

## Consequences & Downsides

- **Cloudflare Account & Credentials:** Requires maintaining Cloudflare R2 API tokens in Vercel environment variables.
- **CORS Configuration:** The R2 bucket must be configured with CORS headers allowing `GET` / `PUT` from TwoNode production, staging, and local development origins.
- **Database URL Compatibility:** Handled transparently: our existing [`extractKeyFromUrl()`](file:///home/rojitech/Desktop/CODEC/NextJS/twonodes/lib/storage/utils.ts) parses S3 hostnames into relative keys, so legacy database records point seamlessly to R2 objects without requiring immediate SQL migrations.
