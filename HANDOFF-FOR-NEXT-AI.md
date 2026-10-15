# TwoNode Development Hand-Off for the Next AI

> **Repository:** `/home/rojitech/Desktop/CODEC/NextJS/twonodes`  
> **Maintainer:** `roji-tech` (they/them if unsure)  
> **GitHub Remote:** `TwoNode/twonode`  
> **Date:** 2026-10-15  
> **Target Audience:** Incoming AI assistants taking over development on the TwoNode platform.  
> **Notice:** This repository is standalone. Do NOT confuse it with Octalve Edu or AlEemaan.

---

## 1. Ground Rules & Next.js Conventions

1. **Read `AGENTS.md` first:**
   - This version of Next.js has custom conventions, internal file structures, and breaking changes.
   - Always consult `node_modules/next/dist/docs/` before implementing new patterns or writing low-level Next.js code.
   - Heed all deprecation notices.
2. **Task List HUD:**
   - Active work tracker is `docs/tasks/current-tasks.md` (pointer in `out/tasks.md`).
   - Check it at the start of every session and whenever asked "what's left" or "what's next".
   - Update it in the **same turn** as code changes: check off items with the date and PR, and never delete tasks.
3. **Branching & Git Discipline:**
   - **Never push directly to `main` or `prod`.**
   - Commits end with the trailer:  
     `Co-Authored-By: <model> <noreply@anthropic.com>`
   - Format only the exact files touched using `npx prettier --write <files>` (never run Prettier across directories).
   - **Never use `git stash`:** Uncommitted files often contain local changes by the maintainer. Stage files explicitly with `git add <file>`.
   - Never use `--delete-branch` on shared branches.
   - Check that a PR is still **OPEN** before pushing commits to its branch.

---

## 2. Environments, Databases & Deployment Pipeline

### 2.1 Branch & Environment Mapping

| Branch        | Role               | Environment / Hosting                              | Notes                                                                 |
| ------------- | ------------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| `dev`         | Active Integration | Local & CI                                         | All feature branches merge here via PR.                               |
| `main`        | Staging            | Vercel (`twonodetech`, scope `rojitechs-projects`) | Protected behind auth. Staging smoke tests run here.                  |
| `prod`        | Live Production    | Vercel Production                                  | Live customer traffic. Needs explicit maintainer approval to promote. |
| `prod_backup` | Safety Backup      | GitHub Remote                                      | **Keep intact. Do not delete.**                                       |

### 2.2 Database Configuration & Safety Rules

- **Staging Database:** Neon `twonode_staging` (connection URL in `.env.staging`).
- **Production Database:** `twonode_db` (connection URL in `.env`).
- **Local Dev / Test DB:** RDS `test_db` (`.env.local`) and `twonodes_db` (`.env`).
- **PROD IS READ-ONLY BY DEFAULT:**
  - Any write to staging or production requires explicit, per-operation authorization from the maintainer in the session.
  - Every planned write must specify: exact SQL/Prisma statement, expected row count, a pre-write backup of affected rows saved to `out/db/backups/`, execution in a guarded transaction that rolls back if row count differs, and a documented rollback statement.
  - For audits or read-only queries, always prefix with `SET TRANSACTION READ ONLY`.
  - **Never print connection strings or passwords.** Print only the database name to confirm connection context.
  - **Never read or print `out/credentials.txt` or passwords in `out/promote.sh`.**

### 2.3 Deployment & Promotion Workflow

For every change, follow this strict pipeline:

```mermaid
flowchart LR
    A[Feature Branch] -->|PR| B(dev branch)
    B -->|PR: "Dev"| C(main branch / Staging)
    C -->|Wait for Vercel Success| D{Staging Smoke Check}
    D -->|Explicit User Approval| E[PR: "Promote main to Prod"]
    E -->|Merge| F(prod branch / Live Production)
```

1. Feature branch off `origin/dev` $\rightarrow$ open PR to `dev` $\rightarrow$ merge into `dev`.
2. PR `dev` $\rightarrow$ `main` titled `"Dev"` $\rightarrow$ merge into `main`.
3. Check Vercel staging deployment status:  
   `gh api repos/TwoNode/twonode/commits/<sha>/statuses --jq '.[0]'`  
   _(Average deploy duration: 4 to 11 minutes; builds pending past 15 min indicate a hang)._
4. Once verified on staging, open PR `main` $\rightarrow$ `prod` titled `"Promote main to Prod"`.
5. **CRITICAL:** Check for new `prisma/migrations` before promotions (migrations run before code).
6. **CRITICAL:** Wait for explicit approval from the maintainer before merging `main` into `prod`.

---

## 3. Project Areas & Architecture

### 3.1 Surfboard (Survey Plan Verification & Geometry)

- **Core Functionality:** Survey plan coordinate validation, pillar searches, boundary calculations, plan viewing, and record copy verification.
- **Key Files:**
  - UI & Panels: `app/(projects)/(surfboard)/components/CertificateBatchSelection.tsx`, `PillarsTable.tsx`, `MapViewer.tsx`
  - Services: `surfboard/services/verificationService.ts`, `surfboard/services/s3Service.ts`
  - Routes: `app/api/surfboard/`
- **S3 Security Constraint:**
  - All files in `surfboard/` on S3 are strictly private (403 on raw fetch).
  - Any backend file fetch (e.g. downloading a record copy PDF for batch verification) **must** generate a presigned download URL via `getPresignedDownloadUrl()` from `@/app/(projects)/(surfboard)/services/s3Service`.
  - Raw unsigned HTTP fetches will fail with a 403 Forbidden error.

### 3.2 REVA (Real Estate Valuation & Appraisal)

- **Core Functionality:** Valuation requests (one-time vs. regular), appraisal workflows, admin review screens, property inspection reports.
- **Key Files:**
  - Admin & Review: `app/(projects)/(reva)/reva-restricted/dashboard/`
  - Services: `reva/services/`
- **Spatial Record Map:**
  - Esri / `@arcgis/core` has been removed because it caused Vercel production builds to hang past 10 minutes.
  - The map page is currently set to "Coming Soon". Parked unimported code resides in `SpatialRecordMap.tsx` and `SpatialRecordMapLoader.tsx`.
  - Architecture decision: MapLibre GL + the `nigeria_ward_admin_boundaries` PostGIS table (ward, LGA, state, LCDA boundaries). Individual spatial record point sourcing is pending maintainer specification.

### 3.3 GBC (Geospatial & Business Conference)

- **Core Functionality:** Event landing, ticket purchases, registration QR codes, speaker & gallery showcases.
- **Asset Storage & Policy v4:**
  - Public prefixes: `GBC2/gallery/*`, `GBC2/speakers/*`, `GBC2/logos/*`, and `public/gbc/*`.
  - Private prefixes: `private/gbc/*` (including `GBC2/qrcodes`).
  - PR #471 / #472 migrated new uploads to `public/gbc/<edition>/…`.

### 3.4 Website Redesign (`/v2`)

- **Core Functionality:** Primary public landing pages, navigation header, footer, insight articles with in-article step navigation, and contact flows.
- **Key Files:**
  - App Directory: `app/v2/`
  - Data: `app/v2/data/insights.ts`
  - Styling: `app/v2/styles/` and `app/v4.css`
  - Internal routing: All links within `/v2` must route to `/v2/...` (legacy `/v3` and `/v4` references were removed).
  - Cross-platform visual fix: Asterisks/stars must use inline SVGs, not Unicode characters (e.g. `✳` `U+2733`) which render as colored emoji blocks on iOS.

---

## 4. S3 Bucket Privacy & Key Layout Architecture

### 4.1 Bucket Policy State (Policy v4 Live)

- S3 Bucket: `twonode-bucket`
- **Public Read (`s3:GetObject` allowed anonymously):**
  - `GBC2/gallery/*`
  - `GBC2/speakers/*`
  - `GBC2/logos/*`
  - `public/gbc/*`
- **Private Read (Requires Presigned URL / App Gateway):**
  - `surfboard/*`
  - `private/reva/*`
  - `private/gbc/*` (including ticket QR codes)
  - `uploads/*` and `PrivateSurveyPlans/*`
  - `archive/*`

### 4.2 S3 Phase 4 Archival Strategy

- The maintainer prefers **ARCHIVE over DELETE** for unreferenced/legacy files.
- Pending targets:
  - `uploads/PrivateSurveyPlans/` (363 files, 630 MB) $\rightarrow$ move to `archive/PrivateSurveyPlans/`.
  - 22 unreferenced `surfboard/` folders (764 files, 345 MB, listed in `out/s3-odd-surfboard-2026-10-14.tsv`) $\rightarrow$ move to `archive/surfboard/`.
  - Old REVA files: retain until after 2026-11-12.
- Rules: Show exact counts and keys, test server-side copy, verify object sizes, and get explicit approval before deleting originals.

---

## 5. Recent Work Completed (October 14–15, 2026)

| Feature / Fix                                       | PR / Commit                        | Details                                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surfboard Record Copy Verification Fix**          | PR #478 (`main`), PR #479 (`prod`) | Fixed `"Verification failed ... Invalid request"` bug. Cause was raw unsigned `fetch` returning 403 on private S3 PDF. Resolved via `getPresignedDownloadUrl` in `downloadPlanPdfAsBase64`, typed 502 `UPSTREAM_FILE_ERROR`, and error extraction in `CertificateBatchSelection.tsx`. |
| **iOS Emoji Rendering Bug Fix**                     | PR #478 (`main`), PR #479 (`prod`) | Replaced Unicode asterisk `✳` (`U+2733`) on GBC cards with inline SVG in `app/v2/page.tsx` and updated `v4.css` to eliminate the green emoji box on iPhones.                                                                                                                          |
| **Route Links Cleanup (`/v4` $\rightarrow$ `/v2`)** | PR #476 (`dev`), PR #477 (`main`)  | Updated all internal links across `/v2` pages, navigation header, footer, and insight articles to point to `/v2` instead of `/v4`. Removed dead `/v3` and `/v4` files.                                                                                                                |
| **GBC Public Key Layout**                           | PR #471 (`dev`), PR #472 (`main`)  | Uploads routed to `public/gbc/<edition>/…`; S3 Policy v4 applied and verified live.                                                                                                                                                                                                   |
| **Vercel Build Hang Resolution**                    | PR #448, #451                      | Replaced heavy `@arcgis/core` import in REVA spatial-record map with a Coming Soon state. Deploys now succeed reliably in 6–11 minutes.                                                                                                                                               |
| **Surfboard Record Copy Hardening**                 | PR #456                            | Removed misleading "Use as Record Copy" button (survey plan PDF is never the record copy); added numeric validation on verification scores.                                                                                                                                           |
| **Google Sign-in Return URL**                       | PR #438                            | Google/Kinde auth returns users to their deep-linked destination via a 15-minute lax cookie.                                                                                                                                                                                          |
| **REVA Admin Redesign**                             | PR #424, #433, #455                | Rebuilt request list cards, summary tabs, and detail views; removed duplicate admin report form.                                                                                                                                                                                      |

---

## 6. Current In-Flight Status & Next Actions

### 6.1 In-Flight Right Now

- **PR #479 ("Promote main to Prod"):**
  - Status: **OPEN** ([TwoNode/twonode#479](https://github.com/TwoNode/twonode/pull/479)).
  - Contains: Surfboard S3 presigning fix, iOS emoji fix, and internal `/v2` route updates.
  - Action required: Await explicit maintainer instruction before merging into `prod`.

### 6.2 Items Waiting on Maintainer Decisions

1. **Approval to merge PR #479 into `prod`:** Confirm staging verification and trigger production promotion.
2. **Google Site Verification:** Maintainer must click "Verify" in Google Search Console for twonodetechnologies.com (TXT and CNAME records already present in Vercel DNS).
3. **PROD Record Copy Audit:** Approval to execute read-only audit on production to verify no existing plans have `redCopyFileUrl` identical to their survey plan PDF path.
4. **REVA Spatial Map Record Source:** Decision on where individual property record coordinate points will be fetched from (boundaries are provided by `nigeria_ward_admin_boundaries`).
5. **Email Verification Enforcement:** Feature is fully built (147 tests pass, OTP signup, banners, settings toggles) but disabled. Requires decision on initial platform rollout, grace period duration, and staging test plan.
6. **S3 Phase 4 Archival:** Decision on standard `archive/` prefix vs. AWS S3 Glacier Deep Archive storage class for inactive survey plans and odd folders.
7. **Paystack Renewal Webhook:** Provide real renewal webhook payloads from Paystack dashboard (`invoice.create` $\rightarrow$ `charge.success` $\rightarrow$ `invoice.update`) to verify subscription renewal pipeline.

---

## 7. Developer Cheatsheet & Operational Commands

- **Local Development Server:**
  ```bash
  # Always run on port 3211. NEVER touch port 3000 (reserved by maintainer).
  (npx next dev -p 3211 > dev.log 2>&1 &)

  # Check server status
  fuser 3211/tcp

  # Stop dev server cleanly
  fuser -k 3211/tcp
  # NEVER run pkill -f next
  ```
- **Formatting Files Touched:**
  ```bash
  # Only format explicit files you modified
  npx prettier --write path/to/file1.tsx path/to/file2.ts
  ```
- **Running Tests:**
  ```bash
  pnpm test
  # or single test:
  pnpm vitest run path/to/test.test.ts
  ```
- **Checking Vercel Deployment Status:**
  ```bash
  gh api repos/TwoNode/twonode/commits/<commit-sha>/statuses --jq '.[0]'
  ```
- **GitHub CLI Workaround for TLS / GraphQL Timeouts:**
  - If `gh pr view` or `gh pr list` fails with GraphQL deprecation or TLS handshake timeout:
  ```bash
  # Use REST API directly:
  gh api repos/TwoNode/twonode/pulls?state=open
  gh api repos/TwoNode/twonode/pulls/<pr_number>
  ```
