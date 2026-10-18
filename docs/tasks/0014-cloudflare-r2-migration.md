# TASK-0014: Session Batch — Cloudflare R2 Zero-Downtime Migration Blueprint

- **Status:** Planned
- **Priority:** High (eliminate AWS S3 egress liability and reduce monthly storage expenditure to $0.00)
- **Assignee:** Maintainer / AI Pair
- **Target Branch / PR:** `chore/r2-migration` → `dev` → `main` → `prod`
- **Created:** 2026-10-16 15:10:00 UTC
- **Related:** [ADR-0012](../adr/0012-multi-provider-storage-and-surveyor-file-privacy.md), [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md), [ADR-0016](../adr/0016-storage-provider-evaluation-and-r2-migration.md), [TASK-0011](./0011-s3-privacy-and-key-layout.md), [TASK-0013](./0013-media-viewer.md)

---

## 1. Objective

Safely migrate all 7,344 objects (~3.69 GB) across Surfboard, REVA, and GBC from AWS S3 (`reva-store` in `eu-north-1`) to Cloudflare R2 (`twonode-store`) with **zero downtime**, **zero broken URLs**, and **zero data loss**. Activate TwoNode's pre-built [`CloudflareR2StorageAdapter`](../../lib/storage/providers/cloudflare-r2.ts) to permanently eliminate AWS egress fees ($0.09/GB) and reduce storage costs to $0.00/month under R2's 10 GB perpetual free tier.

---

## 2. Architecture & Safety Guarantees

1. **Zero Database Breaking Changes:**
   TwoNode's database tables (`Property`, `OneTimeUserProperty`, `SurfboardPlan`, `GBCTicket`) store relative paths or S3 URLs. Our [`extractKeyFromUrl()`](../../lib/storage/utils.ts) utility strips protocol and host prefixes dynamically, extracting the canonical key. Stored database records do not require immediate SQL updates.

2. **Zero-Downtime Double Caching (Cloudflare Sippy):**
   Cloudflare Sippy acts as a lazy migration proxy. If an object is requested before the bulk copy finishes, Sippy dynamically copies it from S3 into R2 on the fly and serves it immediately.

3. **Reversible at Every Stage:**
   The AWS S3 bucket remains in read-only mode for a 30-day grace period. If any unforeseen anomaly arises, switching `STORAGE_PROVIDER=s3` in Vercel rolls back the system instantly.

---

## 3. Step-by-Step Migration Phases

### Phase 1: Cloudflare R2 Account & Bucket Setup

- [ ] **1.1. Enable Cloudflare R2:**
  - Log into the Cloudflare Dashboard (`dash.cloudflare.com`).
  - Navigate to **R2** in the left sidebar and enable R2 subscription (includes 10 GB free tier, 10M Class B reads/mo, 1M Class A writes/mo).
  - Record the **Cloudflare Account ID** (found on the right sidebar of the Dashboard overview).

- [ ] **1.2. Create Target R2 Bucket:**
  - Click **Create Bucket**.
  - Name: `twonode-store` (or `twonode-production-storage`).
  - Location Hint: Choose **Western Europe (WEUR)** or **Automatic** (closest to AWS Stockholm `eu-north-1`).
  - Storage Class: **Standard**.

- [ ] **1.3. Apply CORS Rules on R2:**
  - In bucket settings (`twonode-store` > **Settings** > **CORS Policy**), add the following JSON policy to allow presigned direct uploads and browser media viewing:

  ```json
  [
    {
      "AllowedOrigins": [
        "https://twonodetechnologies.com",
        "https://*.twonodetechnologies.com",
        "https://<project-preview-domain>.vercel.app",
        "http://localhost:3000",
        "http://localhost:3211"
      ],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Type", "Content-Disposition"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

- [ ] **1.4. Configure Custom Domain & Public Edge:** **ON HOLD (2026-10-18).** Do not connect a domain to `twonode-store`: it would make every object public. Public serving needs a separate public bucket and a domain that is a Cloudflare zone. See [findings](./0014-r2-research-findings-2026-10-18.md).
  - Under **Settings** > **Public Access** > **Custom Domains**, click **Connect Domain**.
  - Connect `storage.twonodetechnologies.com` (or `media.twonodetechnologies.com`).
  - Cloudflare automatically provisions an SSL/TLS certificate and activates global edge caching.

- [ ] **1.5. Generate R2 API Tokens:**
  - Navigate to **R2** > **Manage R2 API Tokens** > **Create API Token**.
  - Token name: `twonode-app-r2-adapter`.
  - Permissions: **Object Read & Write** (or Admin Read & Write).
  - Bucket scope: Specific bucket (`twonode-store`).
  - TTL: **Forever** (or aligned with security rotation policy).
  - Record values securely:
    - `CLOUDFLARE_R2_ACCESS_KEY_ID` (24 or 32 character hex string)
    - `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (64 character secret)
    - Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

### Phase 2: Data Migration (Cloudflare Super Slurper & Sippy)

- [ ] **2.1. Provision AWS Read-Only Migration IAM Credentials:**
  - In AWS IAM Console, create a temporary policy `TwoNodeS3MigrationRead`:

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:GetObjectTagging",
          "s3:GetObjectMetadata"
        ],
        "Resource": ["arn:aws:s3:::reva-store", "arn:aws:s3:::reva-store/*"]
      }
    ]
  }
  ```
  - Create a temporary IAM user `cloudflare-migration-slurper`, attach the policy, and generate an Access Key + Secret Key.

- [ ] **2.2. Launch Cloudflare Super Slurper (One-Shot Bulk Copy):**
  - In Cloudflare Dashboard, go to **R2** > **Data Migration**.
  - Click **Migrate Data**.
  - Source provider: **Amazon S3**.
  - Source bucket name: `reva-store`.
  - Source bucket region: `eu-north-1`.
  - Enter the `cloudflare-migration-slurper` AWS credentials.
  - Target R2 bucket: `twonode-store`.
  - Click **Start Migration**.
  - _Metrics to observe:_ ~7,344 objects (~3.69 GB). Direct cloud-to-cloud transfer runs at ~100–300 MB/s, finishing in approximately **10 to 15 minutes**.

- [ ] **2.3. Enable Cloudflare Sippy (Lazy On-Demand Fallback):**
  - Go to `twonode-store` > **Settings** > **Incremental Migration (Sippy)**.
  - Enable Sippy:
    - Source: Amazon S3 (`reva-store`, region `eu-north-1`).
    - AWS Access Key & Secret Key.
  - _Benefit:_ If any surveyor or client uploads a new plan to S3 before final Vercel cutover, Sippy dynamically copies it to R2 upon first read.

---

### Phase 3: Migration Audit & Verification

- [ ] **3.1. Verify Object Counts & Storage Sizes:**
  - Verify Cloudflare R2 bucket metrics:
    - Object count: **~7,344 objects** (matching `out/s3-inventory-2026-10-14.tsv`).
    - Total size: **~3.69 GB**.
  - Key prefixes present:
    - `surfboard/` (~6,521 objects)
    - `private/reva/` and legacy `reva/` (~219 objects)
    - `public/gbc/` and legacy `GBC2/` (~242 objects)
    - `uploads/` (~361 objects)

- [ ] **3.2. Checksum & Header Integrity Verification:**
  - Run test cURL requests against public assets on custom domain:
  ```bash
  # Check public GBC gallery photo
  curl -I https://storage.twonodetechnologies.com/public/gbc/2.0/gallery/photo-1.jpg
  # Expected: HTTP/2 200, Content-Type: image/jpeg, Cache-Control headers
  ```
  - Verify private objects are blocked from public read without signature:
  ```bash
  # Direct anonymous access to private survey plan
  curl -I https://storage.twonodetechnologies.com/surfboard/<user-id>/pdf/<plan>.pdf
  # Expected: HTTP/2 403 Forbidden
  ```

---

### Phase 4: Staging Environment Verification

- [ ] **4.1. Set Vercel Preview/Staging Environment Variables:**
  - Add to Vercel (Preview & Development environments):
    - `STORAGE_PROVIDER`: `r2`
    - `CLOUDFLARE_R2_ACCOUNT_ID`: `<ACCOUNT_ID>`
    - `CLOUDFLARE_R2_ACCESS_KEY_ID`: `<ACCESS_KEY_ID>`
    - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: `<SECRET_ACCESS_KEY>`
    - `CLOUDFLARE_R2_BUCKET_NAME`: `twonode-store`
    - `CLOUDFLARE_R2_PUBLIC_DOMAIN`: `storage.twonodetechnologies.com`

- [ ] **4.2. Run Local & CI Test Suite:**
  - Run the full test suite with R2 provider enabled:

  ```bash
  STORAGE_PROVIDER=r2 npm test
  ```
  - Verify `lib/storage/__tests__/storage.test.ts` passes (115/115 test files passing).

- [ ] **4.3. End-to-End Functional Walkthrough on Staging:**
  - **Surfboard:**
    - Log in as test surveyor.
    - Upload a test survey plan (PDF + DWG CAD file). Confirm upload succeeds via presigned URL pointing to `twonode-store`.
    - Open the plan in the in-page media viewer. Confirm the file gateway (`/api/v1/surfboard/files/view`) signs and streams from R2.
    - Open a legacy plan uploaded last year. Confirm `extractKeyFromUrl` retrieves the bare key and streams cleanly from R2.
  - **REVA:**
    - Submit a one-time property due diligence request with land documents.
    - Confirm files are saved under `private/reva/<reqId>/...`.
    - Log in as REVA admin; open client documents and site inspection photos in viewer. Confirm signed links work.
  - **GBC 2.0:**
    - Visit `/gbc/gallery` and `/gbc/speakers`. Confirm all images render crisp at 60fps with zero layout shifts.
    - Request attendee ticket QR code. Confirm private signed link renders the QR code.

---

### Phase 5: Production Cutover (Zero Downtime)

- [ ] **5.1. Add Production Environment Variables in Vercel:**
  - Set `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, and `CLOUDFLARE_R2_PUBLIC_DOMAIN` on Vercel **Production**.
  - Update `STORAGE_PROVIDER`: `r2`.

- [ ] **5.2. Trigger Production Deployment:**
  - Merge verified migration branch to `main` and promote to `prod` (or redeploy production in Vercel dashboard).
  - Vercel performs zero-downtime rolling restart.

- [ ] **5.3. Live Smoke Checks:**
  - Check `/api/health` and homepage.
  - Perform live test upload on Surfboard.
  - Download an existing REVA sample report.
  - Check Cloudflare R2 Dashboard analytics to observe live incoming read/write operations.

---

### Phase 6: Post-Cutover Failsafe & Decommissioning

- [ ] **6.1. Day 1 – 30: Read-Only S3 Warm Standby:**
  - Do NOT delete the AWS S3 bucket immediately.
  - Lock AWS S3 bucket to read-only for the application user by removing `s3:PutObject` from `s3-uploader`.
  - Keep AWS S3 available as a warm backup. If any rollback is ever needed, changing `STORAGE_PROVIDER=s3` in Vercel restores AWS S3 in seconds.

- [ ] **6.2. Day 30: Final Audit & Decommissioning:**
  - Verify Cloudflare R2 has served 100% of traffic with zero S3 reads for 30 consecutive days.
  - Delete temporary AWS IAM migration user (`cloudflare-migration-slurper`).
  - Take a cold archive snapshot of AWS `reva-store` (e.g. download to cold local backup or AWS Glacier Vault).
  - Empty and delete AWS S3 bucket `reva-store` to eliminate all AWS storage and base charges permanently.
  - Transition ADR-0016 status from `Proposed` to `Accepted`.

---

## 4. Rollback Plan

If an unexpected critical failure occurs during Phase 5 (e.g., Cloudflare API outage):

1. In Vercel Project Settings > Environment Variables:
   - Change `STORAGE_PROVIDER` back to `s3`.
2. Redeploy production.
3. System immediately resumes reading and writing to AWS S3 `reva-store` without code changes.

---

## 5. Verification Checklist

| Gate    | Check                  | Command / Action                                | Status      |
| :------ | :--------------------- | :---------------------------------------------- | :---------- |
| **G-1** | R2 Bucket & CORS       | Inspect CORS JSON in Cloudflare R2 Dashboard    | [ ] Pending |
| **G-2** | Super Slurper Transfer | All 7,344 objects copied to `twonode-store`     | [ ] Pending |
| **G-3** | Sippy Active           | Fallback enabled for delta synchronization      | [ ] Pending |
| **G-4** | Test Suite             | `npm test` passing with `STORAGE_PROVIDER=r2`   | [ ] Pending |
| **G-5** | Staging E2E            | Surfboard, REVA, and GBC file actions verified  | [ ] Pending |
| **G-6** | Production Cutover     | Vercel env updated and live smoke checks passed | [ ] Pending |
| **G-7** | S3 Read-Only Lock      | AWS IAM write permissions revoked               | [ ] Pending |
