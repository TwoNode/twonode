# Certificate of Deposit (CoD) - Unified User & Technical Flow

This document describes the end-to-end journey of a survey plan, from the surveyor's dashboard to the final lodging with the Office of the State Surveyor General (OSSG), detailing both the user experience and the underlying technical architecture.

> **Current file locations** (post 2026-08 rebuild — see `docs/development-history/phases/phase-2-surfboard.md`): every function named below now lives in one of four services under `surfboard/services/`, migrated with the same names, unchanged logic. There's no `codActions.ts` any more (deleted, see `docs/development-history/phases/phase-5-retirement.md`) — every "Function: `x`" reference below resolves to whichever of these four files owns it:
>
> - **`planLockService.ts`** — `acquirePlanLock`, `releasePlanLock`, `getAndLockOldestAvailablePlan`, `canWorkOnPlan`, `getAndLockBatchForAccounts`/`ForIntake`/`ForRecordsII`, and the release/status counterparts of each.
> - **`codFeeService.ts`** — `getChartingInterpretation`, `getZoneFromGeometry`, `calculatePlanFeeByZone`.
> - **`remitaVerificationService.ts`** — `submitRedCopyBatch`, `verifyBatchPayment`, `verifyBatchPaymentWithLinks`, `verifyLASGReceiptLink`, `retryBatchPayment`, `uploadLASGReceipt`, `getCurrentPayerProfile`, and the batch list/read functions.
> - **`batchApprovalService.ts`** — `updateAccountsApproval`, `updateChartingStatus`, `updateSurconStatus`, `updateRecordsIStatus`, `updateIntakeStatus`, `updateIntakeBatchStatus`, `updateRecordsIIStatus`, `markPlanArchived`, `checkAndDispatchQueries`, `resubmitQueriedPlan`, `submitPhysicalCopies`, and every per-role queue/history read.
>
> All four sit behind typed `/api/v1/surfboard/{cod,mda}/*` routes — see `docs/development-history/route-inventory.md` for the full route table. Every "Function: `x`" below is that function's _service-side_ name; a client component reaches it via `surfboardApi.*` (`surfboard/apiClient.ts`) hitting the matching route, never by importing the service directly — see `docs/payment/subscription-payments-flow.md`'s note on this same pattern.

---

## 1. Constants & Configuration

_(Technical Only)_

### A. Key Constants

- **Role Identification**: `SurfboardRole` (RECORDS_I, RECORDS_II, ACCOUNTS, CHARTING, SURCON, INTAKE).
- **Plan Types**: `PLAN_TYPES` (e.g., "APPROVED LAYOUT", "DEED").
- **Fee Rates**: `SURB_LGA_RATES` (Stored in `SurfboardSettings`).
- **System Charge**: `SYSTEM_CHARGE_PERCENT` (Default: 10%).
- **Lock Duration** (`surfboard/services/planLockService.ts` — confirmed against current code, three distinct schemes):
  - **Charting, SURCON, Records I**: single-plan lock, `LOCK_DURATION_MINUTES = 6` flat, oldest-unlocked-plan-first (FIFO).
  - **Accounts**: a _batch-level_ lock (locks every plan in the batch at once, not one plan) — flat `3` minutes regardless of batch size.
  - **Intake, Records II**: batch-level lock, `3` minutes × the number of plans in the batch (`RECORDS_II_LOCK_MINUTES_PER_PLAN = 3`).

### B. Database Schema (Prisma)

- **`SurfboardPlan`**: Tracks approval status for all 6 roles (`accountsStatus`, `chartingStatus`, `surconStatus`, `recordsIStatus`, `intakeStatus`, `recordsIIStatus`) and lock metadata (`{role}LockedBy`, `{role}LockExpiresAt`).
- **`CertificateOfDepositBatch`**: Groups plans for unified payment (`paymentStatus`, `userPaymentRef`, `totalFees`, `lasgReceiptUrl`, `lasgReceiptS3Key`).

---

## 2. Surveyor Workflow: Submission & Payment

### User Flow

#### Page 1: All Plans Dashboard

- **Display**: A list of all survey plans uploaded by the surveyor.
- **Eligibility Check**: Plans eligible for CoD must have a `PENDING` status and `NOT_SUBMITTED` record copy status.
- **Action**: Select one or more eligible plans using **Checkboxes**.
- **Buttons**:
  - **Submit Red Copy Request**: Becomes active once at least one eligible plan is selected. Shows a badge with the count of selected plans.

#### Page 2: Record Copy Upload (Modal)

- **Display**: A list of the selected plans requiring a "Record Copy" (PDF or image).
- **Action**: Upload the corresponding document for each plan.
- **Validation**: The system ensures every selected plan has an uploaded document before allowing the user to proceed.

#### Page 3: Batch Submission Summary (Modal)

- **Display**: A summary of the total fees, including base fees (per LGA) and system charges.
- **Acceptance Component**:
  - **Checkbox**: "I accept that queries on my submission will attract additional fees." (**Mandatory**)
  - **Link**: "View Submission Policy" opens a detailed popup explaining the terms.
- **Buttons**:
  - **Submit Batch**: Disabled until the acceptance checkbox is ticked. Once clicked, a unique **Batch Code** is generated.

#### Page 4: Payment via Remita

- **Display**: A split-panel payment modal:
  - **Left Panel**: Payer information (Payer ID, Payer Type, name, email, phone), payment details (Agency: 4830000 -- 61004, Revenue: 4020002 -- 32202), and receipt link input fields. Includes copy-to-clipboard buttons for easy pasting.
  - **Right Panel**: An embedded **Remita Payment Portal** (iframe) where the user completes payment directly into the LASG MDA Remita account.
- **Payment Process**:
  1.  The user fills in the payment fields on the **Remita portal** (right panel) using the displayed Payer ID and amount.
  2.  After payment, **Remita sends two receipt emails** to the user: an **LASG Receipt** and a **Remita Receipt**.
  3.  The user pastes both receipt links into the corresponding input fields on the left panel.
  4.  Clicking **"Verify & Complete"** triggers server-side validation.
  5.  Upon successful verification, the batch receipt URLs are stored and the status moves to `LASG_PAID`.

### Technical Flow

- **Step 1: Selection & Eligibility**
  - **UI Component**: `AllPlans.tsx` filtering `redCopyStatus === 'NOT_SUBMITTED'`.
  - **Logic**: `isPlanEligibleForCertificate(plan)` (verifies status and missing certificate files).
- **Step 2: Record Copy Upload**
  - **Function**: `uploadSurfboardFileWithAuth()` (S3 upload).
  - **API Route**: `POST /api/surfboard/update-record-copy` updates the `redCopyFileUrl` on the `SurfboardPlan` record.
- **Step 3: Batch Creation & Fee Calculation**
  - **Function**: `submitRedCopyBatch(planIds, acceptanceAcknowledged)`
  - **Logic**:
    1.  **Fee Calculation**: `calculatePlanFee(lga, deededArea)` fetches rates from `getLGAFees()`.
    2.  **Spatial Intersection**: `getChartingInterpretation(geometry)` uses PostGIS `ST_Intersects` on `LASG_charting_interpretation` table to auto-populate `possibleChartingRemarks`.
    3.  **Batch Code**: Generates a unique `batchCode` (e.g., `COD_XXXXXX`).
    4.  **Acceptance Gate**: Validates `acceptanceAcknowledged` is true before committing to DB.
- **Step 4: Payment via Remita & Verification**
  - **UI Component**: `RemitaPaymentModal.tsx` — split-panel modal.
  - **Portal**: User pays directly on the Remita LASG portal (`login.remita.net/remita/lirs/internal/pay.reg`).
  - **Function**: `verifyBatchPaymentWithLinks(batchId, lasgReceiptUrl, remitaReceiptUrl)`
  - **Verification Logic**:
    1.  **URL Parsing**: Extracts `transId`, `transCode`, `payerId`, `payerType` from LASG URL.
    2.  **Payer Cross-check**: Validates `payerId` and `payerType` against the submitter's profile.
    3.  **HTML Fetch**: Fetches HTML content from both receipt URLs.
    4.  **AI Extraction**: `extractLASGReceiptFromHtml()` and `extractRemitaReceiptFromHtml()` use AI to extract structured fields (amount, anchor/transaction code, RRR, payment status).
    5.  **RRR Uniqueness**: Cross-checks the database to ensure the RRR has not been used in any initial batch submission or query response.
    6.  **Link Reuse Prevention**: Ensures the exact receipt URLs have not been submitted previously.
    7.  **Storage**: Stores both receipt URLs on the batch record (no S3 upload needed).
  - **Status Change**: `paymentStatus` → `LASG_PAID` (skips `USER_PAID` since payment goes directly to MDA account).

---

## 3. Admin & MDA Workflow: Review & Approval

### User Flow

#### Payment Verification & MDA Notification

- **Automatic**: Because the user pays **directly into the MDA's Remita account**, there is no manual admin remittance step.
- **Effect**: Once the user's receipt links are verified and the batch status moves to `LASG_PAID`, all MDA roles (Accounts, Charting, SURCON, Records I) are automatically notified, and plans become visible for review.

#### Role-Based Review (Parallel)

MDA admins process plans simultaneously. Each plan is **Locked** for 6 minutes when an admin starts reviewing it, to prevent double-work.

- **A. Accounts Admin**: Verify the payment via LASG receipt.
- **B. Charting Admin**: Confirm or edit **Charting Remarks**, copy coordinates.
- **C. SURCON Admin**: Confirm pillar numbers and coordinates against the database.
- **D. Records I Admin**: Verify the quality and completeness of the digital document.
- **Decision**: Each role can **Approve** or **Query** (requires a comment).

### Technical Flow

- **Chronological Enforcement (FIFO)**
  - **Function**: `canWorkOnPlan(planId, role, userId)`
  - **Logic**: Checks if there are older pending submissions for the same role. If an older plan is locked by someone else, the next available can be accessed.
- **Concurrency Lock Management**
  - **Function**: `acquirePlanLock(planId, role, userId)` (explicit lock-a-specific-plan route) / `getAndLockOldestAvailablePlan(role, userId)` (the "claim next in queue" flow the MDA review UI actually drives).
  - **Logic**: Sets `{role}LockedBy = userId` and `{role}LockExpiresAt = now + 6 mins` for Charting/SURCON/Records I. See §1's Lock Duration breakdown for Accounts/Intake/Records II, which use a different (batch-level) scheme.
  - **Hook**: `usePlanLock.ts` (single-plan roles) / `useBatchLock.ts` (Accounts, Intake, Records II) auto-acquire on mount and release on navigation. Both hooks guard against overlapping/racing `acquireLock()` calls (an in-flight-promise ref) — a real bug found and fixed 2026-09-13 where React Strict Mode's double-invoked mount effect could leave the "Acquiring lock..." spinner stuck until a manual page refresh.
- **Role-Specific Processing**
  - **Accounts**: `updateAccountsApproval(batchId, approved, comment)` — verifies CoD and any subsequent query fee receipts.
  - **Charting**: `updateChartingStatus(planId, mode: "APPROVE" | "QUERY", comment)`
  - **SURCON**: `updateSurconStatus(planId, approved, comment)`
  - **Records I**: `updateRecordsIStatus(planId, approved, comment)`
  - **Trigger Evaluation**: Each of these actions concludes with `checkAndDispatchQueries(planId)` to evaluate if all four parallel roles have completed their reviews.

---

## 4. Query & Resubmission Management

### User Flow

#### Consolidated Query Notification

- **Logic**: As the parallel roles (Accounts, Charting, SURCON, Records I) evaluate the plan, the system **holds** any queries.
- **Action**: Once **all** parallel roles have finished their review (whether Approved or Queried), a **single consolidated email** is sent to the surveyor listing all queries and comments at once.

#### User Response to Query

- **Page**: All Plans Dashboard.
- **Indicator**: Plan shows a "QUERIED" status and a "Respond to Query" button.
- **Action**: The user must pay a **Query Response Fee** (configured percentage of the original fee) for the specific queried record.
- **Edit**: After payment, the user can edit coordinates or re-upload the record copy.
- **Resubmit**: Plan returns for mandatory re-review.
  - **Accounts Role**: Specifically notified to re-verify ONLY if a query fee was paid (new payment link provided) or if they originally queried the plan.

### Technical Flow

- **Consolidated Status Evaluation**
  - **Function**: `checkAndDispatchQueries(planId)`
  - **Logic**: Evaluates if `accountsStatus`, `chartingStatus`, `surconStatus`, and `recordsIStatus` are no longer `PENDING`.
  - **Criteria & Effect**: If all have acted and any status is `QUERIED`, the `redCopyStatus` is set to `'QUERIED'`. `notifyConsolidatedQueries` is dispatched.
- **Query Response Fee**
  - **Logic**: `resubmitFee = plan.codFee * (queryResponseFeePercent / 100)`.
  - **Selective Account Review**: `resubmitQueriedPlan` sets `accountsStatus` to `PENDING` if `plan.accountsStatus === 'QUERIED'` or if a new `lasgReceiptUrl` is provided.
  - **Mechanism**: System blocks the "Resubmit" interface until `verifyQueryPayment(planId)` returns success.

---

## 5. Intake Admin

### User Flow

- **Prerequisite**: Only visible once Accounts, Charting, SURCON, and Records I have all **Approved**.
- **Display**: The uploaded Record Copy (PDF/Image).
- **Action**: Collects the envelope (physical plan) and verifies that the physical plan submitted to the office matches the online digital copy.
- **Decision**: **Approve** or **Query** (requires a comment).
- **Locking**: Batch-level lock (locks every eligible plan in the batch at once, sorted oldest-`physicalCopySubmittedAt`-first) — this prevents a surveyor's delay in physical submission from stalling the workflow for others, since only their own batch locks, not the whole queue.

### Technical Flow

- **Function**: `updateIntakeStatus(planId, approved, comment)`
- **Locking Function**: `getAndLockBatchForIntake(userId)` — duration is `3` minutes × the number of plans in the locked batch.
- **Pre-check**: Validates that `accountsStatus`, `chartingStatus`, `surconStatus`, and `recordsIStatus` are all `"APPROVED"`.
- **Status Update**: Sets `intakeStatus`. If Queried, it immediately updates `redCopyStatus` to `"QUERIED"` and fires `notifyConsolidatedQueries`.

---

## 6. Final Approvals & Lodging

### User Flow

#### Records II Admin (Sequential)

- **Prerequisite**: Only visible once Accounts, Charting, SURCON, Records I, and Intake Admin have all **Approved**.
- **Action**: Final Verification that the physical plan submitted to the office matches the online digital copy.
- **Decision**: Final **Approve** or **Query**.
  - _Note on Queries_: If Records II issues a query at this final stage, it effectively resets the plan, requiring re-review by all MDA roles.
- **Locking**: Batch-level lock (`getAndLockBatchForRecordsII`) — `3` minutes × the number of plans in the batch, same formula as Intake.

#### Automated Lodging (OSSG)

- Upon Records II approval, the system automatically:
  1.  **Hashes** the document (digital fingerprint).
  2.  **Embeds a QR Code** in the top-right corner.
  3.  **Exports to PNG**.
  4.  **Transmits** data (Plan Number, Title, Area, Pillars, Remarks) to the OSSG server.

#### Final State: Lodged

- **Status**: `LODGED`.
- **Notification**: The user receives a final email confirming the plan is successfully recorded.

#### Archive Tracking (Internal)

- **Role**: Archive Officer.
- **Action**: Log the physical handover of the plan from Records II to the official archive. This is for internal tracking and does not affect the user's plan status.

### Technical Flow

- **Final Approval (Records II)**
  - **Requirement**: `accountsStatus`, `chartingStatus`, `surconStatus`, `recordsIStatus`, and `intakeStatus` must all be `APPROVED`.
  - **Function**: `updateRecordsIIStatus(planId, approved, comment)`
  - **Query Nullification Logic**: If Records II queries the plan, it resets `accountsStatus`, `chartingStatus`, `surconStatus`, `recordsIStatus`, and `intakeStatus` back to `"PENDING"`.
- **Document Processing Integration**
  - **Function**: `submitToOSSG(planId)`
  - **Logic**:
    1.  **Hashing**: `crypto.createHash('sha256')` applied to the final document buffer.
    2.  **QR Code**: `generatePlanQRCode(hash, planNumber)` generated via `utils/qrCodeEmbed.ts`.
    3.  **Export**: Puppeteer/Canvas converts the final certificate to PNG format.
    4.  **API Call**: Payload mapping (OSSG Field vs Prisma Field):
        - `BEACON_USED` ← `compressPillarNumbers(plan.pillars)`
        - `QUOTED_COORDINATE` ← `{northing, easting}` from `pillars[0]`
        - `REMARKS` ← `chartingRemarks`
- **Pillar Compression Algorithm**
  - **Function**: `compressPillarNumbers(pillarNumbers: string[])`
  - **Logic**: Groups by common prefix/suffix, detects continuous numeric sequences, and formats as `START–END` (using en-dash).
- **Internal Archiving**
  - **Function**: `markPlanArchived(planId, userId)`
  - **Logic**: Updates `archiveReceivedBy` and `archiveReceivedAt` for physical plan tracking. (Status-Neutral).

---

## 7. Public Plan View & QR Paywall

### User Flow

#### Page 1: Public Survey Plan Page (`/surfboardplan/[id]`)

- **Display**: The public view of a survey plan accessed via URL or QR scan.
- **Access Check**: If the user has not reached their free scan limit or has an active paid session, they see the full plan details, map preview, and surveyor info.
- **Paywall Required**: If access is denied, the page displays a **Blurred Premium Skeleton** (Google-Meet style waiting room) and a fixed, non-dismissible **QR Paywall Overlay**.
- **Payment**:
  1. The user selects a service (e.g., Location Authenticity or CoD).
  2. Enters their email.
  3. Pays via Paystack in the overlay.
  4. Upon success, they are granted a 1-hour access token, sent to their email along with an access link.

### Technical Flow

- **Server-Side Gating**:
  - **Function**: `getGatedPublicSurfPlan(id, token)`
  - **Logic**: Checks the QR scan limit and transaction history using `getPlanQRAccessState`. If unauthorized, it redacts sensitive fields (geometry, pillars, user info, centroid, area) before sending to the client.
- **Client-Side Protection**:
  - **UI State**: Renders a `<LoadingSkeleton />` with a backdrop blur when `isAccessDenied` is true to prevent leaking empty layouts.
  - **Fixed Overlay**: The `QRPaywallModal` is a fixed, non-dismissible `motion.div` overlay rendered at `z-9999` to ensure users cannot bypass the payment required state.
- **Payment Verification**:
  - **Function**: `verifyQRServicePayment(reference, paystackRef)`
  - **Logic**: Verifies payment, creates a 1-hour session token, credits the surveyor's wallet, and uses `sendNotificationMail` to email the access link to the payer.
