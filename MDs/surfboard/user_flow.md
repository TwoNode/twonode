# Certificate of Deposit (CoD) - User Flow

This document describes the end-to-end journey of a survey plan, from the surveyor's dashboard to the final lodging with the Office of the State Surveyor General (OSSG).

---

## 1. Surveyor Workflow: Submission & Payment

### Page 1: All Plans Dashboard
*   **Display**: A list of all survey plans uploaded by the surveyor.
*   **Eligibility Check**: Plans eligible for CoD must have a `PENDING` status and `NOT_SUBMITTED` record copy status.
*   **Action**: Select one or more eligible plans using **Checkboxes**.
*   **Buttons**:
    *   **Submit Red Copy Request**: Becomes active once at least one eligible plan is selected. Shows a badge with the count of selected plans.

### Page 2: Record Copy Upload (Modal)
*   **Display**: A list of the selected plans requiring a "Record Copy" (PDF or image).
*   **Action**: Upload the corresponding document for each plan.
*   **Validation**: The system ensures every selected plan has an uploaded document before allowing the user to proceed.

### Page 3: Batch Submission Summary (Modal)
*   **Display**: A summary of the total fees, including base fees (per LGA) and system charges.
*   **Acceptance Component**:
    *   **Checkbox**: "I accept that queries on my submission will attract additional fees." (**Mandatory**)
    *   **Link**: "View Submission Policy" opens a detailed popup explaining the terms.
*   **Buttons**:
    *   **Submit Batch**: Disabled until the acceptance checkbox is ticked. Once clicked, a unique **Batch Code** is generated.

### Page 4: Payment via Remita
*   **Display**: A split-panel payment modal:
    *   **Left Panel**: Payer information (Payer ID, Payer Type, name, email, phone), payment details (Agency: 4830000 -- 61004 -- Office of Surveyor General, Revenue: 4020002 -- 32202 -- Lands Registry Transactions), and receipt link input fields.
        * Copy to cliqboard button for each of the information on the left panel for easy pasting in the right panel
    *   **Right Panel**: An embedded **Remita Payment Portal** (iframe) where the user completes payment directly into the LASG MDA Remita account.
*   **Payment Process**:
    1.  The user fills in the payment fields on the **Remita portal** (right panel) using the displayed Payer ID and amount.
    2.  After payment, **Remita sends two receipt emails** to the user: an **LASG Receipt** (from `printreceipt.ebs-rcm.com`) and a **Remita Receipt** (from `login.remita.net`).
    3.  The user pastes both receipt links into the corresponding input fields on the left panel.
    4.  Clicking **"Verify & Complete"** triggers server-side validation:
        *   URL format validation (LASG vs Remita domains).
        *   Payer ID cross-check against the user's profile.
        *   AI-powered extraction of payment details (amount, RRR, anchor/transaction codes) from both receipt pages.
        *   Cross-validation: anchor match between receipts, amount match against batch total, and RRR uniqueness.
    5.  Upon successful verification, the batch receipt URLs are stored and the status moves to `LASG_PAID`.
*   **Important**: The user's **Payer ID** and **Payer Type** in their profile must match the LASG receipt for verification to succeed.

---

## 2. Admin & MDA Workflow: Review & Approval

### Payment Verification & MDA Notification
*   **Automatic**: Because the user pays **directly into the MDA's Remita account** (not through an intermediary), there is no manual admin remittance step.
*   **Effect**: Once the user's receipt links are verified and the batch status moves to `LASG_PAID`, all MDA roles (Accounts, Charting, SURCON, Records I) are automatically notified, and plans become visible for review.

### Role-Based Review (Parallel)
MDA admins process plans simultaneously. Each plan is **Locked** for 3 minutes when an admin starts reviewing it to prevent double-work.

#### A. Accounts Admin
*   **Display**: The LASG payment receipt and the batch details.
*   **Action**: Verify the payment.
*   **Decision**: **Approve** or **Disapprove** (requires a comment).

#### B. Charting Admin
*   **Display**: Plan map, coordinates, and automated "Possible Charting Remarks" from the government dataset.
*   **Action**: Confirm or edit the final **Charting Remarks**.
*   **Action**: Copy pillar coordinates for external verification.
*   **Decision**: **Approve** or **Query** (requires a comment).

#### C. SURCON Admin
*   **Display**: Plan number, survey title, and pillar data.
*   **Action**: Confirm pillar numbers and coordinates against the database.
*   **Decision**: **Approve** or **Query** (requires a comment).

#### D. Records I Admin
*   **Display**: The uploaded Record Copy (PDF/Image).
*   **Action**: Verify the quality and completeness of the digital document.
*   **Decision**: **Approve** or **Query** (requires a comment).

---

## 3. Query & Resubmission Management

### Consolidated Query Notification
*   **Logic**: If multiple roles raise a query, the system **holds** the notifications.
*   **Action**: Once all parallel roles have finished their review, a **single consolidated email** is sent to the surveyor listing all queries and comments.

### User Response to Query
*   **Page**: All Plans Dashboard.
*   **Indicator**: Plan shows a "QUERIED" status and a "Respond to Query" button.
*   **Action**: The user must pay a **Query Response Fee** (configured percentage of the original fee) for the specific queried record.
*   **Edit**: After payment, the user can edit coordinates or re-upload the record copy.
*   **Resubmit**: Plan returns to all the roles for re-review (Account (review the query fee receipt, while also showing the CoD receipt), Charting, SURCON, and Record I re-review).

---
## 4. Intake Admin
*   **Prerequisite**: Only visible once Accounts, Charting, SURCON, and Records I have all **Approved**.
*   **Display**: The uploaded Record Copy (PDF/Image).
*   **Action**: Collects the envelop (physical plan), and Verify that the physical plan submitted to the office matches the online digital copy.
*   **Decision**: **Approve** or **Query** (requires a comment).
    Here No Locking feature all records are sorted Sequentially - oldest to newest. (the reason is When Surveyor A is mailed to submit physical documents but delays doing so, the locking feature locks their records for the intake admin to work on. This prevents the intake admin from moving forward with other records that may perhaps have submitted their physical documents thereby stalling the workflow.)

## 5. Final Approvals & Lodging

### Records II Admin (Sequential by date approved by the intake admin oldest to newest)
*   **Prerequisite**: Only visible once Accounts, Charting, SURCON, and Records I have all **Approved**. and the intake Admin **Approved**
*   **Action**: Final Verification that the physical plan submitted to the office matches the online digital copy.
*   **Decision**: Final **Approve** or **Query**
    Here the Locking feature should lock records with same batch no to a Records II Admin (could be one or more however the timing should be calculated based on 3 minutes per record, meaning if we have three records that happens to be in a batch the time allocated will now be 9minutes)

### Automated Lodging (OSSG)
Upon Records II approval, the system automatically:
1.  **Hashes** the document (digital fingerprint).
2.  **Embeds a QR Code** in the top-right corner.
3.  **Exports to PNG**.
4.  **Transmits** data (Plan Number, Title, Area, Pillars, Remarks) to the OSSG server.

### Final State: Lodged
*   **Status**: `LODGED`.
*   **Notification**: The user receives a final email confirming the plan is successfully recorded.

### Archive Tracking (Internal)
*   **Role**: Archive Officer.
*   **Action**: Log the physical handover of the plan from Records II to the official archive. This is for internal tracking and does not affect the user's plan status.
