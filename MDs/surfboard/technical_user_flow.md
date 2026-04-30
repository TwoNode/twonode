# Certificate of Deposit (CoD) - Technical User Flow

This document outlines the technical architecture, functions, and logic governing the Certificate of Deposit (CoD) and MDA approval workflow.

---

## 1. Constants & Configuration

### A. Key Constants
*   **Role Identification**: `SurfboardRole` (RECORDS_I, RECORDS_II, ACCOUNTS, CHARTING, SURCON).
*   **Plan Types**: `PLAN_TYPES` (e.g., "APPROVED LAYOUT", "DEED").
*   **Fee Rates**: `SURB_LGA_RATES` (Stored in `SurfboardSettings`).
*   **System Charge**: `SYSTEM_CHARGE_PERCENT` (Default: 10%).
*   **Lock Duration**: `LOCK_DURATION_MINUTES = 30`.

### B. Database Schema (Prisma)
*   **`SurfboardPlan`**: Tracks approval status for all 5 roles (`accountsStatus`, `chartingStatus`, etc.) and lock metadata (`{role}LockedBy`, `{role}LockExpiresAt`).
*   **`CertificateOfDepositBatch`**: Groups plans for unified payment (`paymentStatus`, `userPaymentRef`, `totalFees`).

---

## 2. Technical Workflow: Surveyor Side

### Step 1: Selection & Eligibility
*   **UI Component**: `AllPlans.tsx` filtering `redCopyStatus === 'NOT_SUBMITTED'`.
*   **Logic**: `isPlanEligibleForCertificate(plan)` (verifies status and missing certificate files).

### Step 2: Record Copy Upload
*   **Function**: `uploadSurfboardFileWithAuth()` (S3 upload).
*   **API Route**: `POST /api/surfboard/update-record-copy` updates the `redCopyFileUrl` on the `SurfboardPlan` record.

### Step 3: Batch Creation & Fee Calculation
*   **Function**: `submitRedCopyBatch(planIds, acceptanceAcknowledged)`
*   **Logic**:
    1.  **Fee Calculation**: `calculatePlanFee(lga, deededArea)` fetches rates from `getLGAFees()`.
    2.  **Spatial Intersection**: `getChartingInterpretation(geometry)` uses PostGIS `ST_Intersects` on `LASG_charting_interpretation` table to auto-populate `possibleChartingRemarks`.
    3.  **Batch Code**: Generates a unique `batchCode` (e.g., `COD_XXXXXX`).
    4.  **Acceptance Gate**: Validates `acceptanceAcknowledged` is true before committing to DB.

### Step 4: Payment via Remita & Verification
*   **UI Component**: `RemitaPaymentModal.tsx` — split-panel modal with payer info, receipt link inputs (left), and embedded Remita portal iframe (right).
*   **Portal**: User pays directly on the Remita LASG portal (`login.remita.net/remita/lirs/internal/pay.reg`), entering their Payer ID and the batch amount.
*   **Receipt Submission**: After payment, user pastes two emailed receipt links:
    1.  **LASG Receipt** — URL from `printreceipt.ebs-rcm.com`
    2.  **Remita Receipt** — URL from `login.remita.net`
*   **Function**: `verifyBatchPaymentWithLinks(batchId, lasgReceiptUrl, remitaReceiptUrl)`
*   **Verification Logic**:
    1.  **URL Parsing**: Extracts `transId`, `transCode`, `payerId`, `payerType` from LASG URL.
    2.  **Payer Cross-check**: Validates `payerId` and `payerType` against the submitter's profile.
    3.  **HTML Fetch**: Fetches HTML content from both receipt URLs.
    4.  **AI Extraction**: `extractLASGReceiptFromHtml()` and `extractRemitaReceiptFromHtml()` use AI to extract structured fields (amount, anchor/transaction code, RRR, payment status).
    5.  **RRR Uniqueness**: Cross-checks the database to ensure the RRR has not been used in any initial batch submission or any other query response.
    6.  **Link Reuse Prevention**: Ensures the exact receipt URLs have not been submitted previously.
    7.  **Storage**: Stores both receipt URLs on the batch record (no S3 upload needed).
*   **Status Change**: `paymentStatus` → `LASG_PAID` (skips `USER_PAID` since payment goes directly to MDA account).
*   **Fallback Function**: `verifyBatchPayment(reference)` — verifies payment via Remita Biller API using RRR status check (`checkPaymentStatus()`).

---

## 3. Technical Workflow: MDA Parallel Review

### Chronological Enforcement (FIFO)
*   **Function**: `canWorkOnPlan(planId, role, userId)`
*   **Logic**: Checks if there are older pending submissions for the same role.
*   **Exception**: If an older plan is locked by someone else, the next available can be accessed.

### Concurrency Lock Management
*   **Function**: `acquirePlanLock(planId, role, userId)`
*   **Logic**: Sets `{role}LockedBy = userId` and `{role}LockExpiresAt = now + 30 mins`.
*   **Hook**: `usePlanLock.ts` manages periodic heartbeats and release upon window navigation.

### Role-Specific Processing
*   **Accounts**: `updateAccountsApproval(batchId, approved, comment)` — verifies CoD and any subsequent query fee receipts.
    *   **Workflow Revival**: If a previously approved batch has a plan resubmitted with a query fee, the batch is automatically returned to the Accounts "Pending" view.
*   **Charting**: `updateChartingStatus(planId, chartingRemarks, mode: "APPROVE" | "QUERY")`
*   **SURCON**: `updateSurconStatus(planId, approved, comment)`
*   **Records I**: `updateRecordsIStatus(planId, approved, comment)`

---

## 4. Query & Dispatch Logic

### Immediate Status Nullification
*   **Logic Function**: `handlePlanQuery(planId, role, comment)` (or similar role-specific trigger).
*   **Execution**: Triggered immediately when *any* parallel role (Charting, SURCON, Records I) submits a "QUERY" action.
*   **Criteria & Effect**:
    1.  The `redCopyStatus` is immediately set to `'QUERIED'`.
    2.  The statuses of all *other* parallel review roles (Charting, SURCON, Records I) are nullified or reset to preventing them from wasting time reviewing a plan that needs rework.
    3.  `notifyPlanQueried(planId, queryComment)` is dispatched immediately to the surveyor.

### Query Response Fee
*   **Logic**: `resubmitFee = plan.codFee * (queryResponseFeePercent / 100)`.
*   **Selective Account Review**: `resubmitQueriedPlan` only sets `accountsStatus` to `PENDING` if:
    1.  `plan.accountsStatus === 'QUERIED'` (Accounts issued the query).
    2.  `lasgReceiptUrl` is provided (New payment made).
*   **Mechanism**: System blocks the "Resubmit" interface until `verifyQueryPayment(planId)` returns success.

---

## 5. OSSG Finalization & Lodging

### Final Approval (Records II)
*   **Requirement**: `accountsStatus`, `chartingStatus`, `surconStatus`, and `recordsIStatus` all must be `APPROVED`.
*   **Function**: `updateRecordsIIStatus(planId, approved)`

### Document Processing Integration
*   **Function**: `submitToOSSG(planId)`
*   **Logic**:
    1.  **Hashing**: `crypto.createHash('sha256')` applied to the final document buffer.
    2.  **QR Code**: `generatePlanQRCode(hash, planNumber)` generated via `utils/qrCodeEmbed.ts`.
    3.  **Export**: Puppeteer/Canvas converts the final certificate to PNG format.
    4.  **API Call**: Payload mapping (OSSG Field vs Prisma Field):
        *   `BEACON_USED` ← `compressPillarNumbers(plan.pillars)`
        *   `QUOTED_COORDINATE` ← `{northing, easting}` from `pillars[0]`
        *   `REMARKS` ← `chartingRemarks`

### Pillar Compression Algorithm
*   **Function**: `compressPillarNumbers(pillarNumbers: string[])`
*   **Logic**: Groups by common prefix/suffix, detects continuous numeric sequences, and formats as `START–END` (using en-dash).

---

## 6. Internal Archiving
*   **Function**: `markPlanArchived(planId, userId)`
*   **Logic**: Updates `archiveReceivedBy` and `archiveReceivedAt` for physical plan tracking. (Status-Neutral).
