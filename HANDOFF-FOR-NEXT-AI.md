# TwoNode Development Hand-Off for the Next AI

> **Repository:** `/home/rojitech/Desktop/CODEC/NextJS/twonodes`  
> **Maintainer:** `roji-tech` (they/them if unsure)  
> **GitHub Remote:** `TwoNode/twonode`  
> **Date:** 2026-10-19 (`dev` holds PRs #494 to #497 and the docs sweep; `main` and `prod` are behind `dev`, see 6.1)  
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
3. **Keep every affected doc current, not just one:** when work lands, sweep what it touches: the task files (`docs/tasks/current-tasks.md` and the batch file), this handoff, `docs/future-plans.md`, the area README and the topic docs, `docs/functions/*.md`, the ADR index and the issues register (`docs/issues/index.md`), and run `npm run docs:routes` if a route changed (`-- --check` fails when it is stale).
4. **Branching & Git Discipline:**
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

### 3.4 Public Website (root, `app/(site)/`)

- **Core Functionality:** Primary public landing pages, navigation header, footer, insight articles with in-article step navigation, and contact flows.
- **Key Files:**
  - App Directory: `app/(site)/` (the site is served at the root; the `/v2`, `/v3` and `/v4` prefixes no longer exist)
  - Data: `app/(site)/` insights data; components such as `ArticleStepNav.tsx` and `Footer.tsx` under `app/(site)/components/`
  - Styling: `app/(site)/v4.css`
  - Internal routing: links are root-relative (e.g. `/insights/...`, `/our-story`).
  - Cross-platform visual fix: Asterisks/stars must use inline SVGs, not Unicode characters (e.g. `✳` `U+2733`) which render as colored emoji blocks on iOS.

---

## 4. S3 Bucket Privacy & Key Layout Architecture

### 4.1 Bucket Policy State (Policy v4 Live)

- S3 Bucket: `reva-store` (eu-north-1)
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

### 3.5 The mobile app (in progress) and the paused association subscription

- **Where it lives:** its own repo, **`TwoNode/twonode-mobile`** (private; local copy `/home/rojitech/Desktop/CODEC/REACT-NATIVE/twonode-mobile`; branch `main`, changes by pull request, CI on every PR). Expo SDK 58, TypeScript strict, Expo Router native tabs, phones only, English only, `com.twonode.surfboard`. Read its `docs/SCOPE.md` and `AGENTS.md` before changing it.
- **Scope in one line:** five tabs (Home, Plans, **Records** in the centre, Stats, Profile) for surveyors; creating and processing records, uploads, admin, registration and any purchase stay on the web.
- **Built (2026-10-19 and 2026-10-20):** the app foundation (email and password sign-in, secure session storage, single-flight refresh, authenticated API client, five-tab shell), the design system, the restyled sign-in and Profile and the signed-in devices screen (app PR #4, merged), and the **Plans and Records screens** (plans with search and a status filter, the plan detail with where it stands and its files, batches and the batch detail; app PR #6, **merged 2026-10-20**, 350 tests, reads the routes from #500 and #501, so it runs only against a local API from `dev` until `dev` is promoted), the **email verification and forgot password screens** (app PR #7, **merged 2026-10-20** into the #6 branch and carried to `main` by app PR #8, 454 tests; they use the routes from #503, merged to `dev` 2026-10-20, so they too run only against a local API from `dev`), the **Stats tab, the wallet and Profile's firm, subscription and wallet sections** (app PR #9, **merged 2026-10-20**, 686 tests; they use the routes from #505, merged to `dev` 2026-10-20, so they too run only against a local API from `dev`) and, in this repo, native auth: `/api/v1/auth/mobile/{login,refresh,logout,devices}`, bearer in `getServerSession`, bearer-aware CSRF, device sessions, per-email and per-device rate limits, role `USER` only ([ADR-0017](docs/adr/0017-the-mobile-app-signs-in-with-bearer-tokens.md), PR #495). Run on an Android emulator on 2026-10-20 (which found and fixed a crash in the app's tab bar); not yet on iOS or a physical phone. Also built here (#500): the read API for the Plans and Records tabs, `GET plans/summary`, `plans/counts`, `cod/batches/summary` and `cod/batches/{batchId}/summary`, on one status definition, `surfboard/utils/planStatus.ts` (`displayStatus`, the website's "ready" rule, "queried"); checked live against a throwaway database (137 checks). Also built (2026-10-20, #505, merged to `dev`): `GET plans/stats` (the Stats tab's figures: totals, a count per display status, places, facilitators, pillars, plans per month, active batches; each counted by the rules of the list it opens, checked live with 202 checks), `GET qr/wallet-summary`, `GET subscription/summary` and `GET profile/summary`, all masked for the phone; the plans list's exact filters now ignore capitals and surrounding spaces. Also built (#501): `GET plans/{planId}/summary`, the lean plan detail (key facts, area and centre, review dates, files; the owner gets everything, someone it is shared with never gets the record copy, a reviewer comment, the batch or another person's details) and the shared-viewer fix (I-037): `plans/{id}` and `public/full` no longer send a shared viewer the record copy link, the owner's email or the other viewers, and the file gateway opens a record copy only for its owner and staff. Enforcing the "ready" rule in `POST plans/physical-copy` is **not** done: it waits on decision D16.
- **Plan and decisions:** [`docs/tasks/0015-mobile-app-and-api.md`](docs/tasks/0015-mobile-app-and-api.md) (decisions D1 to D15, phases 0 to 8, API changes with status). Research: `docs/mobile/` (evaluation, Kinde and Google sign-in, association and mobile refresh). Index: `docs/future-plans.md`.
- **Key decisions:** self-hosted open map tiles, no satellite; email and password everywhere, Google on Android and Sign in with Apple on iOS (through Kinde, existing accounts only, not built yet); no account creation and no purchase call to action in the app; Google developer verification deferred.
- **Association subscription is PAUSED until further notice (2026-10-19).** Phase 0 prerequisites are merged (#261, #262, #263, #273); no association model, role or route exists.

---

## 5. Recent Work Completed (October 14–19, 2026)

| Feature / Fix                                  | PR / Commit                        | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile app foundation**                      | repo `TwoNode/twonode-mobile`      | Expo SDK 58 app: sign-in, secure session, API client, five-tab shell, design system, devices screen, tests, CI, scope doc (app PRs #1 to #5). Plans and Records (app PR #6) and email verification (PR #7, carried by #8) merged 2026-10-20; Stats, the wallet and Profile sections merged as app PR #9 (2026-10-20); the Home map's pure logic (coordinates, the display correction, how typed coordinates are read) merged as app PR #10 (2026-10-20). The Home screen is app PR #11 (open) and the first-run intro is app draft PR #12, stacked on #11 (2026-10-22). Run on an Android emulator 2026-10-20 to 2026-10-22; not yet on iOS or a physical phone. |
| **Plans and Records read API for the app**     | PR #500 (`dev`)                    | `plans/summary` (lean list, `displayStatus`, filters, search by number, title, place and pillar), `plans/counts` (tab badges), `cod/batches/summary` and `cod/batches/{id}/summary`; `planStatus.ts` is the one status definition; the Active/History batch rule moved to `batchScope.ts`. Additive, no migration, website routes unchanged. Found while building: I-041 to I-045.                                                                                                                                                  |
| **Plan detail for the app, shared-viewer fix** | PR #501 (`dev`)                    | `plans/{planId}/summary` (lean detail), and the I-037 fix on `plans/{id}`, `public/full` and the file gateway. **Web behaviour change:** a shared viewer no longer sees the Record Copy card. Additive otherwise, no migration. Found while building: I-046 and I-047 (open).                                                                                                                                                                                                                                                       |
| **Stats, wallet, subscription, profile**       | PR #505 (`dev`)                    | `plans/stats`, `qr/wallet-summary`, `subscription/summary`, `profile/summary`: the Stats and Profile tabs' data, masked for the phone, each Stats figure counted by the rules of the list it opens (202 live checks). Additive, no migration; website routes unchanged. Found: I-049.                                                                                                                                                                                                                                               |
| **Verification and reset routes for the app**  | PR #503 (`dev`)                    | `mobile/verify-email`, `mobile/resend-verification`, `mobile/request-password-reset` (the app's twins of the website's routes: no IP key, no cookie session, no CSRF check for the request), `firstName`/`lastName` on `/auth/me`. Additive, no migration. 29 live checks, 1390 tests.                                                                                                                                                                                                                                              |
| **Google sign-in no longer keeps a password**  | PR #497 (`dev`), ADR-0018          | Linking a Kinde sign-in to an unverified account with a password removes that password, revokes sessions and emails the person (`verifyEmailViaOAuth`). Changes web behaviour; not on prod yet.                                                                                                                                                                                                                                                                                                                                     |
| **Kinde and Google sign-in research**          | PR #496 (`dev`)                    | Recommended server-side PKCE exchange with a new Kinde mobile application; Apple guideline 4.8; decisions D12 to D15.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Mobile native auth**                         | PR #495 (`dev`), ADR-0017          | Bearer sessions and `/api/v1/auth/mobile/*`, device sessions, bearer-aware CSRF, role `USER` only. Migration `20261019100000_refresh_token_device_sessions`. Not on prod yet.                                                                                                                                                                                                                                                                                                                                                       |
| **Dev build fix and promotion**                | PR #488, #489, #490                | Excluded the one-off storage PDF script from type checking; dev, main and prod in sync on 2026-10-18.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Surfboard Record Copy Verification Fix**     | PR #478 (`main`), PR #479 (`prod`) | Fixed `"Verification failed ... Invalid request"` bug. Cause was raw unsigned `fetch` returning 403 on private S3 PDF. Resolved via `getPresignedDownloadUrl` in `downloadPlanPdfAsBase64`, typed 502 `UPSTREAM_FILE_ERROR`, and error extraction in `CertificateBatchSelection.tsx`.                                                                                                                                                                                                                                               |
| **iOS Emoji Rendering Bug Fix**                | PR #478 (`main`), PR #479 (`prod`) | Replaced Unicode asterisk `✳` (`U+2733`) on GBC cards with inline SVG in the site home page (`app/(site)/page.tsx`) and updated `v4.css` to eliminate the green emoji box on iPhones.                                                                                                                                                                                                                                                                                                                                               |
| **Route Links Cleanup (old prefixes removed)** | PR #476 (`dev`), PR #477 (`main`)  | Updated all internal links across `/v2` pages, navigation header, footer, and insight articles to point to the root site instead of `/v4`. Removed dead `/v3` and `/v4` files.                                                                                                                                                                                                                                                                                                                                                      |
| **GBC Public Key Layout**                      | PR #471 (`dev`), PR #472 (`main`)  | Uploads routed to `public/gbc/<edition>/…`; S3 Policy v4 applied and verified live.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Vercel Build Hang Resolution**               | PR #448, #451                      | Replaced heavy `@arcgis/core` import in REVA spatial-record map with a Coming Soon state. Deploys now succeed reliably in 6–11 minutes.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Surfboard Record Copy Hardening**            | PR #456                            | Removed misleading "Use as Record Copy" button (survey plan PDF is never the record copy); added numeric validation on verification scores.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Google Sign-in Return URL**                  | PR #438                            | Google/Kinde auth returns users to their deep-linked destination via a 15-minute lax cookie.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **REVA Admin Redesign**                        | PR #424, #433, #455                | Rebuilt request list cards, summary tabs, and detail views; removed duplicate admin report form.                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 6. Current In-Flight Status & Next Actions

### 6.1 In-Flight Right Now

- **`dev` is ahead of `main` and `prod`** by PRs #494 to #497, the Plans and Records read API (#500, additive routes, no migration), the docs PRs (#498, #499), the plan detail and shared-viewer fix (#501), the verification and reset routes (#503) and the Stats, wallet, subscription and profile summaries (#505; additive routes, no migration). The batch includes **migration `20261019100000_refresh_token_device_sessions`** (four nullable columns on `RefreshToken`; runs before the code; undo: drop the columns and the index) and **two web behaviour changes** (#497: an unverified password account loses its password on its first Google sign-in and is emailed; #501: a plan shared with someone no longer shows them its Record Copy card). It waits on the maintainer's go; after staging, test #497 with a real Google sign-in. Nothing in this batch is on prod.
- **Mobile app:** foundation built (see 3.5), the Plans and Records read API (#500) and the plan detail (#501) built and merged to `dev`, the email verification and password reset routes (#503) merged to `dev`, and the app's Plans and Records screens (app PR #6) and verification and forgot-password screens (app PR #7, carried by #8) merged, its Stats, wallet and Profile sections (app PR #9) merged, and the Home map's pure logic (app PR #10) merged; the own-plans map route `plans/map` (1E.1, #508) is built and merged to `dev`, and the app's Home screen that reads it is written, unit tested and run on an Android emulator on 2026-10-21 (four sessions: the map, the base map, search, the plan sheet, My location, the notices, the error and no-network states, large text, dark mode, a 320 point phone and 600 plans all work; the defects found are fixed in the same PR, including one that made 600 plans take 1.1 s; no text and no location dot draw on the emulator's map, so a physical phone is the one check left, app issue A-032) (app PR #11, marked ready for review by roji-tech but not finished; its hand-over is section 0 of the app's `HANDOFF-FOR-NEXT-AI.md`); the app's first-run intro (onboarding, TASK-0015 6.7; no API change) is built and was run on the emulator on 2026-10-22 (app draft PR #12, stacked on #11), the permission primers wait for Phase 6; open work is in TASK-0015 (Phase 1: the LINK method's deep link 1H.2, whether a code was sent 1A.14, security review 1A.11, Google and Apple exchange 1A.12, version gate, OpenAPI, the map's tile hosting and geocoder (1E.5, 1E.6), the website dashboard's counts 1F.7 (I-038, I-043), `physical-copy` enforcement 1F.2 (D16), push; the stats, wallet, subscription and profile summaries (1F.3 to 1F.5) are built and merged to `dev` (#505); then the remaining app screens: opening files, Physical Copies Submitted, Home).
- **R2 migration:** ADR-0016 / TASK-0014 are Proposed/Planned and **paused**; nothing is provisioned. Findings: `docs/tasks/0014-r2-research-findings-2026-10-18.md` (R2 public access is per bucket, so use a private bucket for all data; a custom domain needs the domain as a Cloudflare zone). Pre-work: move REVA `awsActions.ts` and GBC `aws-s3.ts` onto `lib/storage`.
- **Association subscription:** paused (see 3.5).
- **Known trade-offs recorded in the issues register** (`docs/issues/index.md`): I-032 (a known email can be locked out of mobile sign-in for 15 minutes), I-034 (access tokens are stateless for 15 minutes), I-035 (the app's refresh grace window re-rotates). **Open security findings:** I-046 (P1: `record-copy/download` returns any plan's record copy to any signed-in Surfboard account) and I-047 (P2: `record-copy/verification` lets any signed-in account overwrite a plan's verification result); both live on prod, small fixes, waiting on the maintainer's go (TASK-0015 1D.8).

### 6.2 Items Waiting on Maintainer Decisions

1. ~~Approval to merge PR #479 into `prod`~~ — done.
2. **Google Site Verification:** Maintainer must click "Verify" in Google Search Console for twonodetechnologies.com (TXT and CNAME records already present in Vercel DNS).
3. **PROD Record Copy Audit:** Approval to execute read-only audit on production to verify no existing plans have `redCopyFileUrl` identical to their survey plan PDF path.
4. **REVA Spatial Map Record Source:** Decision on where individual property record coordinate points will be fetched from (boundaries are provided by `nigeria_ward_admin_boundaries`).
5. **Email Verification Enforcement:** Feature is fully built (147 tests pass, OTP signup, banners, settings toggles) but disabled. Requires decision on initial platform rollout, grace period duration, and staging test plan.
6. **S3 Phase 4 Archival:** Decision on standard `archive/` prefix vs. AWS S3 Glacier Deep Archive storage class for inactive survey plans and odd folders.
7. **Mobile app, waiting on the maintainer:** **D15** (create the Kinde "Front-end and mobile" application with callback `com.twonode.surfboard://oauth/callback` and Google and Apple enabled, so the Google sign-in spike can run); **D16** (adopt the web's "ready for physical submission" rule on the server; examined 2026-10-19); **D7** (support WhatsApp number, email and support page URL); **D10** (icon and brand assets, and check the name "Surfboard" is free on both stores); **task 0.1** (enrol the Apple Developer and Google Play organisation accounts, the longest lead time); a go for the read-only **production count** of surveyors by state, real versus placeholder SURCON numbers and Google-only accounts (`out/db/surveyor-state-and-surcon-count.sql`; the permission classifier blocked pulling the prod env, so the maintainer runs it or adds a permission rule). **A go to fix I-046 and I-047** (recommended next, small). **The promotion go** for the batch in 6.1.
8. **R2:** how to serve public GBC images, and whether the main domain's DNS may move.
9. **Paystack Renewal Webhook:** Provide real renewal webhook payloads from Paystack dashboard (`invoice.create` $\rightarrow$ `charge.success` $\rightarrow$ `invoice.update`) to verify subscription renewal pipeline.

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
- **Mobile app (`TwoNode/twonode-mobile`, Expo):**
  ```bash
  cd /home/rojitech/Desktop/CODEC/REACT-NATIVE/twonode-mobile
  npm run check            # typecheck + lint + tests (what CI runs)
  npx expo install <pkg>   # add packages this way, never npm install <pkg>
  npx expo start           # API defaults to http://10.0.2.2:3211 (Android emulator) / localhost:3211
  ```
  Run the API with `npx next dev -p 3211` (never 3000). Release builds need `EXPO_PUBLIC_API_BASE_URL` (https). Expo's docs change every SDK: read `AGENTS.md` there and fetch the versioned docs before writing Expo code.
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
