# MDA-Requested Enhancements — Full Implementation Specification

> **Purpose**: This document is the single source of truth for implementing all MDA-requested feature additions to the Surfboard CoD (Certificate of Deposit) system. It is written for AI consumption and provides exact file paths, database models, existing patterns, data flows, and acceptance criteria so that each feature can be implemented correctly in one pass.

---

## System Context

### Tech Stack

| Layer     | Technology                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Framework | **Next.js 15** (App Router, `"use client"` / `"use server"`)                                          |
| Language  | **TypeScript** (strict)                                                                               |
| Database  | **PostgreSQL + PostGIS** via **Prisma ORM**                                                           |
| Auth      | **Kinde Auth** (`@kinde-oss/kinde-auth-nextjs`) + encrypted cookies (`utils/surfAuth.ts`)             |
| Payments  | **Remita Biller API** (RRR generation, status check) + **LASG EBS Portal** (two-receipt verification) |
| UI        | **React**, **shadcn/ui**, **Framer Motion**, **Lucide Icons**, **Sonner** toasts                      |
| Storage   | **AWS S3** (`actions/awsActions.ts`)                                                                  |
| AI        | **OpenAI GPT-4o-mini** for PDF data extraction                                                        |

### Project Root

```
/home/roji/UBUNTU/RTG_CODE/NextJS/twonodes/
```

### Key Directories

```
app/(projects)/(surfboard)/
├── actions/                    # Server actions ("use server")
│   ├── codActions.ts           # CoD batch, MDA approval, lock, query logic
│   ├── aiExtractionActions.ts  # AI PDF/receipt extraction
│   ├── surfboardActions.ts     # CRUD for SurfboardPlan
│   ├── notificationActions.ts  # Email/notification dispatch
│   └── authActions.ts          # Auth helpers
├── components/                 # Shared UI components
│   ├── CertificateBatchSelection.tsx  # Batch selection + submission modal
│   ├── SubmittedBatchesModal.tsx       # View/retry past batches
│   ├── RemitaPaymentModal.tsx         # Payment verification (two-link)
│   ├── PlanLockIndicator.tsx          # Lock badge UI
│   └── PlanLockWarningDialog.tsx      # Lock leave warning
├── hooks/
│   └── usePlanLock.ts          # Client-side lock management hook
├── utils/
│   ├── remita.ts               # Remita API: generateRRR, checkPaymentStatus
│   ├── pdfUtils.ts             # PDF text extraction (pdfjs-dist)
│   └── auditLogger.ts          # Audit trail logging
├── surfboard/dashboard/        # SURVEYOR dashboard
│   └── plans/AllPlans.tsx      # Surveyor plan list + batch selection
├── surf-mda/dashboard/         # MDA ADMIN dashboard
│   ├── layout.tsx              # MDA layout (role-aware)
│   ├── page.tsx                # MDA landing with pending counts per role
│   ├── accounts/page.tsx       # Accounts admin
│   ├── charting/page.tsx       # Charting admin
│   ├── surcon/page.tsx         # SURCON admin
│   ├── records-i/page.tsx      # Records I admin
│   ├── records-ii/page.tsx     # Records II admin
│   └── settings/page.tsx       # Super admin settings
└── types/
    └── surfboardTypes.ts       # Shared TypeScript types & enums
```

### Database Models (Prisma — `prisma/schema.prisma`)

#### `SurfboardPlan` — Core plan record

Key fields relevant to these enhancements:

```prisma
model SurfboardPlan {
  id                String    @id @default(uuid()) @db.Uuid
  planNumber        String    @unique
  surveyTitle       String
  planType          String                          // e.g., "APPROVED LAYOUT", "DEED"
  referencePlanNumber String?                       // Optional link to a previous plan
  deededArea        String
  pillars           Json                            // Array of {pillarNumber, easting, northing, ...}
  locality          String?
  lga               String?

  // Red copy / CoD
  redCopyStatus     SurfboardRedCopyStatus @default(NOT_SUBMITTED)
  batchId           String?
  batch             CertificateOfDepositBatch? @relation(...)

  // Zone-based fee
  zone              String?    // "lagosZoneA", "lagosZoneB", etc.
  codFee            Float?     // Calculated CoD fee

  // Per-role approval tracking (pattern repeated for each role):
  // <role>ApprovedBy, <role>ApprovedAt, <role>Status, <role>Comment
  // <role>LockedBy, <role>LockedAt, <role>LockExpiresAt
  accountsStatus    ApprovalStatus? @default(PENDING)
  chartingStatus    ApprovalStatus? @default(PENDING)
  surconStatus      ApprovalStatus? @default(PENDING)
  recordsIStatus    ApprovalStatus? @default(PENDING)
  recordsIIStatus   ApprovalStatus? @default(PENDING)

  chartingRemarks         String?   // Final charting remarks
  possibleChartingRemarks String?   // Auto-populated from LASG GIS dataset

  status            SurfboardPlanStatus @default(PENDING) // PENDING, LODGED, QUERIED, UNDER_REVIEW
}
```

#### `CertificateOfDepositBatch` — Batch payment record

```prisma
model CertificateOfDepositBatch {
  id             String  @id @default(uuid())
  batchCode      String  @unique
  submittedBy    String
  planCount      Int
  totalFees      Float
  systemCharges  Float
  totalAmount    Float
  paymentStatus  BatchPaymentStatus @default(PENDING_USER_PAYMENT)
  // PENDING_USER_PAYMENT → USER_PAID → LASG_PAID → ACCOUNTS_APPROVED → COMPLETED
}
```

#### Enums

```prisma
enum SurfboardRole {
  USER | ADMIN | SUPERADMIN | RECORDS_I | RECORDS_II | ACCOUNTS | CHARTING | SURCON | MDA_SUPERADMIN
}

enum ApprovalStatus { PENDING | APPROVED | QUERIED }

enum BatchPaymentStatus {
  PENDING_USER_PAYMENT | USER_PAID | PENDING_LASG_PAYMENT | LASG_PAID
  | ACCOUNTS_APPROVED | ACCOUNTS_DISAPPROVED | COMPLETED
}

enum SurfboardRedCopyStatus {
  NOT_SUBMITTED | SUBMITTED | COMPLETED | FAILED | APPROVED | QUERIED
}
```

### Existing Workflow (Current State)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SURVEYOR SIDE                                    │
│  1. Surveyor creates plan (AllPlans.tsx)                                │
│  2. Uploads record copy (PDF)                                          │
│  3. Selects plans → "Submit for Certificate" batch                     │
│  4. System calculates zone-based fees                                   │
│  5. Surveyor pays via Remita (two-link verification):                   │
│     - LASG receipt (printreceipt.ebs-rcm.com)                          │
│     - Remita receipt (login.remita.net)                                 │
│  6. Batch status → LASG_PAID                                           │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ Plans become visible to MDA
┌─────────────────────────────────────────────────────────────────────────┐
│                         MDA SIDE (Parallel Review)                      │
│  Plans are reviewed independently by each role:                         │
│                                                                         │
│  ACCOUNTS  → Approves/disapproves LASG payment receipt                 │
│  CHARTING  → Edits/confirms charting remarks (from LASG GIS dataset)   │
│  SURCON    → Verifies pillar numbers and coordinates                   │
│  RECORDS I → Reviews record copy quality/completeness                  │
│  RECORDS II → Final physical copy check + lodge with OSSG              │
│               (requires all 4 above to be APPROVED first)              │
│                                                                         │
│  Each role can: APPROVE or QUERY a plan                                │
│  Each role has a plan-lock system (6-min expiry) for FIFO processing   │
│  Queries are sent to surveyor immediately (current behavior)           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Existing Patterns to Follow

- **Server Actions**: All DB mutations in `actions/codActions.ts`, prefixed with `"use server"`
- **Role field mapping**: `getRoleFieldPrefix(role)` maps `RECORDS_I` → `recordsI`, etc.
- **Lock system**: `acquirePlanLock()`, `releasePlanLock()`, `getAndLockOldestAvailablePlan()`
- **Toast notifications**: `toast.success()`, `toast.error()` via Sonner
- **Settings**: `SurfboardSettings` model stores JSON config, editable by super admin at `surf-mda/dashboard/settings/page.tsx`
- **Notifications**: `notificationActions.ts` sends email/in-app notifications

---

## Feature 1: CoD Submission — Acceptance Checkbox + Policy Popup

### What

Before a surveyor pays during CoD batch submission, they must:

1. **Check a mandatory acceptance checkbox** — text is admin-configurable
2. **Have access to a "View Policy" popup** — opens a scrollable dialog showing the full CoD submission policy; the policy content itself is admin-configurable (rich text/markdown)

### Where to Implement

| File                                                    | Change                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `components/CertificateBatchSelection.tsx`              | Add checkbox + "View Policy" link before the "Submit Batch" button; add Policy popup dialog                                     |
| `actions/codActions.ts` → `submitRedCopyBatch()`        | Add server-side validation: reject if `acceptanceAcknowledged !== true`                                                         |
| `actions/codActions.ts` or `actions/settingsActions.ts` | Add `getCodSettings()` server action that returns `{ codAcceptanceText, codPolicyContent }` from the latest `SurfboardSettings` |
| `surf-mda/dashboard/settings/page.tsx`                  | Add TWO configurable fields: (1) checkbox text, (2) policy content (multiline rich text / markdown textarea)                    |
| `prisma/schema.prisma` → `SurfboardSettings`            | No schema change needed — use existing `settings Json` field                                                                    |

### Functional Requirements

1. **Checkbox placement**: Inside `BatchSubmissionModal`, directly above the `<DialogFooter>` containing the "Submit Batch" button
2. **Default checkbox text**: `"I accept that queries on my submission will attract additional fees."`
3. **Checkbox behavior**:
   - Checkbox is unchecked by default
   - "Submit Batch" button is `disabled` until checkbox is checked
   - Visual style: use `<Checkbox>` from shadcn/ui with a `<label>` beside it
4. **Policy popup link**: A clickable "View Submission Policy" link sits beside or below the checkbox label. Clicking it opens a **scrollable `<Dialog>`** showing the full policy content.
5. **Policy popup behavior**:
   - Opens as a `shadcn/ui` `<Dialog>` with a `<DialogTitle>` of "CoD Submission Policy"
   - Content area is scrollable (`max-h-[60vh] overflow-y-auto`)
   - Renders the admin-configured policy content as formatted text (supports line breaks and basic markdown)
   - Has a single "Close" button at the bottom
   - Policy popup is **read-only** for surveyors — content is managed exclusively by admin
6. **Configurable content (admin side)**:
   - **Checkbox text**: Stored as `settings.codAcceptanceText` in the `SurfboardSettings` JSON field
   - **Policy content**: Stored as `settings.codPolicyContent` (multiline string, supports markdown/newlines) in the same `SurfboardSettings` JSON field
   - Both are editable via the Settings page (`surf-mda/dashboard/settings/page.tsx`)
   - Settings page uses a `<Textarea>` (rows=10+) for policy content editing with a live preview below
7. **Server validation**: `submitRedCopyBatch()` should accept an `acceptanceAcknowledged: boolean` parameter and reject with `"You must accept the terms before submitting"` if false
8. **Default policy content** (used when admin has not configured one):

   ```
   Certificate of Deposit (CoD) Submission Policy

   By submitting plans for Certificate of Deposit processing, you acknowledge and agree to the following:

   1. All information provided is accurate and complete.
   2. Any queries raised on your submission will attract additional fees equivalent to the CoD fee for the queried record(s).
   3. Query response fees are payable per individual record, not per batch.
   4. Payment must be completed before a query response can be submitted.
   5. The MDA reserves the right to query any submission that does not meet the required standards.

   For questions, contact the Office of the Surveyor General.
   ```

### Implementation Details

```tsx
// In CertificateBatchSelection.tsx — BatchSubmissionModal
// Add state:
const [accepted, setAccepted] = useState(false);
const [showPolicy, setShowPolicy] = useState(false);

// Before DialogFooter, add:
<div className="space-y-3">
  {/* Acceptance Checkbox */}
  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <Checkbox
      id="cod-acceptance"
      checked={accepted}
      onCheckedChange={(checked) => setAccepted(!!checked)}
    />
    <div className="space-y-1">
      <label htmlFor="cod-acceptance" className="text-sm text-amber-900 cursor-pointer leading-relaxed">
        {acceptanceText || "I accept that queries on my submission will attract additional fees."}
      </label>
      <button
        type="button"
        onClick={() => setShowPolicy(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 block"
      >
        View Submission Policy
      </button>
    </div>
  </div>
</div>

// Disable submit button:
<Button onClick={handleSubmit} disabled={isSubmitting || !accepted}>

// Policy Popup Dialog (render alongside the main dialog):
<Dialog open={showPolicy} onOpenChange={setShowPolicy}>
  <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        CoD Submission Policy
      </DialogTitle>
    </DialogHeader>
    <div className="flex-1 overflow-y-auto py-4 px-1 prose prose-sm max-w-none">
      {/* Render policy content with basic markdown/newline support */}
      {policyContent.split('\n').map((line, i) => (
        <p key={i} className="text-sm text-gray-700 mb-2">{line}</p>
      ))}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowPolicy(false)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

```tsx
// In surf-mda/dashboard/settings/page.tsx — Admin Settings
// Add TWO form fields inside the settings form:

{
  /* CoD Acceptance Checkbox Text */
}
<div className="space-y-2">
  <label className="text-sm font-medium">Acceptance Checkbox Text</label>
  <Input
    value={settings.codAcceptanceText || ""}
    onChange={(e) => updateSetting("codAcceptanceText", e.target.value)}
    placeholder="I accept that queries on my submission will attract additional fees."
  />
  <p className="text-xs text-gray-500">
    Text shown beside the mandatory checkbox during CoD submission.
  </p>
</div>;

{
  /* CoD Policy Content */
}
<div className="space-y-2">
  <label className="text-sm font-medium">Submission Policy Content</label>
  <Textarea
    value={settings.codPolicyContent || ""}
    onChange={(e) => updateSetting("codPolicyContent", e.target.value)}
    placeholder="Enter the full submission policy text here..."
    rows={12}
  />
  <p className="text-xs text-gray-500">
    Full policy text shown in the "View Submission Policy" popup. Supports line
    breaks.
  </p>
</div>;
```

### Settings JSON Shape

```json
{
  "codAcceptanceText": "I accept that queries on my submission will attract additional fees.",
  "codPolicyContent": "Certificate of Deposit (CoD) Submission Policy\n\nBy submitting plans...",
  "queryResponseFeePercent": 100,
  "...other existing settings..."
}
```

### Acceptance Criteria

- [ ] Checkbox renders before "Submit Batch" button in `BatchSubmissionModal`
- [ ] Button disabled when unchecked
- [ ] "View Submission Policy" link is visible below the checkbox label
- [ ] Clicking the link opens a scrollable dialog showing the full policy content
- [ ] Policy dialog has a "Close" button and does not block the main submission flow
- [ ] Server rejects submission if `acceptanceAcknowledged` is false
- [ ] Admin can edit **both** the checkbox text and the policy content in Settings
- [ ] Both values persist across sessions (stored in `SurfboardSettings.settings` JSON)
- [ ] When no admin-configured policy exists, the default policy text is shown

---

## Feature 2: Query Management Enhancements

### 2.1 Charting Roles Can Now Raise Queries

#### What

Currently, only SURCON, Records I, and Records II can query plans. **Charting** must also be able to raise queries (i.e., set `chartingStatus = "QUERIED"` with a comment).

#### Where to Implement

| File                                   | Change                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `surf-mda/dashboard/charting/page.tsx` | Add "Query" button alongside "Approve" in the edit dialog                                                                         |
| `actions/codActions.ts`                | Add `queryPlanAsCharting(planId, comment)` action, or modify `updateChartingStatus()` to accept an action type (APPROVE or QUERY) |

#### Implementation Details

- The Charting page currently only has an "Approve" action via `updateChartingStatus(planId, chartingRemarks)`.
- Modify to accept a `mode: "APPROVE" | "QUERY"` parameter.
- When `mode === "QUERY"`:
  - Set `chartingStatus = "QUERIED"`
  - Set `chartingComment = comment`
  - Do **NOT** set `chartingRemarks` (leave it null or unchanged)
- UI: Add a secondary "Query" button (red/amber styled) in the `DialogFooter` of the edit dialog.
- Query button requires a comment in the `Textarea`.

#### Acceptance Criteria

- [ ] Charting admin sees both "Approve" and "Query" buttons
- [ ] "Query" sets `chartingStatus` to `QUERIED` and saves the comment
- [ ] Queried plans appear differently in the surveyor's view (existing `isQueried()` helper in `AllPlans.tsx` already checks `surconStatus`, `recordsIStatus`, `recordsIIStatus` — must add `chartingStatus` check)
- [ ] The `getQueryInfo()` function in `AllPlans.tsx` must include Charting in the queriers list

---

### 2.2 Batched Query Dispatch Logic

#### What

Queries must NOT be sent to surveyors immediately. Instead, the system holds all queries until **all required workflow roles** have either APPROVED or QUERIED. Only then are all accumulated queries sent as a **single consolidated notification**.

#### Current Behavior (to change)

Currently in `codActions.ts`, when a role queries a plan, `notifyPlanQueried()` is called immediately, sending an individual notification per query.

#### New Behavior

```
Role actions on a plan happen independently (Accounts, Charting, SURCON, Records I):
  ┌───────────────────────────────────────────────────────┐
  │ Each role either APPROVES or QUERIES                  │
  │                                                       │
  │ After each action, system checks:                     │
  │   Have ALL required roles acted? (status ≠ PENDING)   │
  │     YES → Collect all QUERIED roles + comments        │
  │           → If any queries exist:                     │
  │               Send ONE consolidated notification      │
  │           → If all approved:                          │
  │               Proceed to Records II availability      │
  │     NO  → Hold. Do not notify surveyor.               │
  └───────────────────────────────────────────────────────┘
```

#### Required Roles to Check

The roles that must all have acted before dispatch are the ones that work in parallel (i.e., all roles EXCEPT Records II, since Records II only acts after all others approve):

- **Accounts** (`accountsStatus`)
- **Charting** (`chartingStatus`)
- **SURCON** (`surconStatus`)
- **Records I** (`recordsIStatus`)

#### Where to Implement

| File                             | Change                                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/codActions.ts`          | Create helper `checkAllRolesActed(planId)` that returns `{ allActed: boolean, queries: {role, comment}[] }`. Call this after each role's approve/query action instead of immediately notifying. |
| `actions/notificationActions.ts` | Add `notifyConsolidatedQueries(planId, queries[])` that sends a single email/notification containing all query details                                                                          |

#### Implementation Details

```typescript
// New helper in codActions.ts
async function checkAndDispatchQueries(planId: string): Promise<void> {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: {
      accountsStatus: true,
      chartingStatus: true,
      surconStatus: true,
      recordsIStatus: true,
      accountsComment: true,
      chartingComment: true,
      surconComment: true,
      recordsIComment: true,
      planNumber: true,
      userId: true,
    },
  });

  if (!plan) return;

  const statuses = [
    plan.accountsStatus,
    plan.chartingStatus,
    plan.surconStatus,
    plan.recordsIStatus,
  ];

  // Check if ALL roles have acted (no PENDING remaining)
  const allActed = statuses.every((s) => s !== "PENDING");
  if (!allActed) return; // Hold — not all roles have decided

  // Collect queries
  const queries: { role: string; comment: string }[] = [];
  if (plan.accountsStatus === "QUERIED" && plan.accountsComment)
    queries.push({ role: "Accounts", comment: plan.accountsComment });
  if (plan.chartingStatus === "QUERIED" && plan.chartingComment)
    queries.push({ role: "Charting", comment: plan.chartingComment });
  if (plan.surconStatus === "QUERIED" && plan.surconComment)
    queries.push({ role: "SURCON", comment: plan.surconComment });
  if (plan.recordsIStatus === "QUERIED" && plan.recordsIComment)
    queries.push({ role: "Records I", comment: plan.recordsIComment });

  if (queries.length > 0) {
    // Send ONE consolidated notification
    await notifyConsolidatedQueries(plan.planNumber, plan.userId, queries);
    // Update plan redCopyStatus to QUERIED
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: { redCopyStatus: "QUERIED" },
    });
  }
  // If all APPROVED (no queries), Records II becomes available automatically
  // (the existing query in getAndLockOldestAvailablePlan already checks this)
}
```

#### Key Rule

> **Queries are dispatched only after ALL required workflow roles (Accounts, Charting, SURCON, Records I) have either APPROVED or QUERIED.**

#### Example Flow

1. Charting raises a query → `chartingStatus = "QUERIED"` — system checks: SURCON=PENDING, Records I=PENDING → **hold**
2. Accounts approves → `accountsStatus = "APPROVED"` — system checks: SURCON=PENDING, Records I=PENDING → **hold**
3. SURCON approves → `surconStatus = "APPROVED"` — system checks: Records I=PENDING → **hold**
4. Records I raises query → `recordsIStatus = "QUERIED"` — system checks: all acted → **dispatch** both queries (Charting + Records I) as one consolidated notification

#### Acceptance Criteria

- [ ] `notifyPlanQueried()` is no longer called immediately upon individual role query actions
- [ ] New `checkAndDispatchQueries()` runs after each role action (approve or query)
- [ ] Consolidated notification includes ALL query comments from all querying roles
- [ ] Surveyor receives a single notification with all queries, not multiple
- [ ] If all roles approve (zero queries), no query notification is sent; plan proceeds normally

---

### 2.3 Query Response Fee Logic

#### What

When a surveyor responds to a query, they must pay the plan's CoD fee (`codFee`) again before they can resubmit. The payable percentage is configurable (default: 100% of CoD fee).

#### Where to Implement

| File                                                 | Change                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                               | No new model needed — use existing `codFee` field on `SurfboardPlan`                                      |
| `surf-mda/dashboard/settings/page.tsx`               | Add `queryResponseFeePercent` setting (default: `100`) to `SurfboardSettings.settings` JSON               |
| `actions/codActions.ts`                              | Add `submitQueryResponse(planId, paymentRef)` action that validates payment before allowing re-submission |
| `surfboard/dashboard/plans/AllPlans.tsx`             | When a plan is `QUERIED`, show "Respond to Query" button that opens a payment flow                        |
| `components/RemitaPaymentModal.tsx` or new component | Payment flow for query response (reuse existing Remita pattern, single-plan context)                      |

#### Functional Requirements

1. **Fee calculation**: `queryResponseFee = plan.codFee × (queryResponseFeePercent / 100)`
2. **Per-record**: Fee applies per queried plan, NOT per batch
3. **Payment gate**: System blocks query response submission until payment is completed and verified
4. **Configurable**: Admin sets `queryResponseFeePercent` in Settings (e.g., 100 = full fee, 50 = half fee)

#### Acceptance Criteria

- [ ] Surveyor cannot respond to query without paying the query response fee
- [ ] Fee equals `codFee × queryResponseFeePercent / 100` for each queried plan
- [ ] Payment is verified before response submission proceeds
- [ ] Admin can configure the fee percentage via Settings
- [ ] Fee rule applies per individual queried record, not per batch

---

## Feature 3: Plan Type & Workflow Routing Visibility

### What

`planType` and `referencePlanNumber` must be clearly visible on MDA admin interfaces.

### Current State

- `planType` is stored on `SurfboardPlan.planType` (values from `PLAN_TYPES` enum in `surfboardTypes.ts`)
- `referencePlanNumber` is stored on `SurfboardPlan.referencePlanNumber`
- These fields exist in the DB but are NOT currently displayed on MDA admin pages

### Where to Implement

| File                                     | Change                                                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surf-mda/dashboard/charting/page.tsx`   | Add `planType` and `referencePlanNumber` to the plan card display                                                                                                      |
| `surf-mda/dashboard/surcon/page.tsx`     | Same                                                                                                                                                                   |
| `surf-mda/dashboard/records-i/page.tsx`  | Same                                                                                                                                                                   |
| `surf-mda/dashboard/records-ii/page.tsx` | Same                                                                                                                                                                   |
| `surf-mda/dashboard/accounts/page.tsx`   | Same                                                                                                                                                                   |
| `actions/codActions.ts`                  | Ensure `planType` and `referencePlanNumber` are included in `select` queries for all MDA page data fetchers (e.g., `getChartingPlans()`, `getAccountsBatches()`, etc.) |

### Implementation Details

Add to each MDA plan card's info grid (follow existing pattern in `charting/page.tsx` lines 369-386):

```tsx
<div>
  <p className="text-xs text-gray-500">Plan Type</p>
  <p className="text-sm font-medium">{plan.planType}</p>
</div>;
{
  plan.referencePlanNumber && (
    <div>
      <p className="text-xs text-gray-500">Reference Plan No.</p>
      <p className="text-sm font-medium">{plan.referencePlanNumber}</p>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] `planType` visible on ALL MDA admin pages per plan record
- [ ] `referencePlanNumber` visible when present
- [ ] No new database fields required — uses existing columns

---

## Feature 4: OSSG API Integration & Document Hashing

### 4.1 Document Preparation

#### What

Before transmission to OSSG, the system must:

1. Generate a **SHA-256 hash** of the final document
2. Embed a **QR code** in the top-right corner of the document
3. Export the final document as **PNG**
4. Transmit to OSSG server via API

#### Where to Implement

| File                                                        | Change                                            |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `actions/codActions.ts` or **new** `actions/ossgActions.ts` | Server action for document preparation + API call |
| `utils/` → **new** `documentHash.ts`                        | Utility for SHA-256 hash generation               |
| `utils/` → **new** `qrCodeEmbed.ts`                         | QR code embedding into document image             |

#### Implementation Details

```typescript
import crypto from "crypto";

// Generate SHA-256 hash of document buffer
function hashDocument(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
```

- Use existing `generatePlanQRCode()` pattern from `surfboardActions.ts` for QR code generation
- For PNG export: render the certificate document as an image (consider using `puppeteer` or `@napi-rs/canvas` for server-side rendering)
- QR code content should include: plan number, hash, and a verification URL

---

### 4.2 OSSG API Payload Mapping

#### What

Send the following fields to the OSSG API with **exact** mappings:

| OSSG Field                      | Source in System            | Prisma Field                                                                               |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `PLAN NUMBER`                   | Plan Number                 | `SurfboardPlan.planNumber`                                                                 |
| `TITLE`                         | Survey Title                | `SurfboardPlan.surveyTitle`                                                                |
| `LOCALITY`                      | LGA                         | `SurfboardPlan.lga`                                                                        |
| `AREA`                          | Locality                    | `SurfboardPlan.locality`                                                                   |
| `BEACON USED`                   | Pillar Numbers (compressed) | `SurfboardPlan.pillars` → extract `pillarNumber` from each, apply compression logic (§4.3) |
| `SIZE`                          | Deeded Area                 | `SurfboardPlan.deededArea`                                                                 |
| `REMARKS`                       | Approved Charting Remarks   | `SurfboardPlan.chartingRemarks`                                                            |
| `QUOTED COORDINATE (REFERENCE)` | Coordinate of first pillar  | `SurfboardPlan.pillars[0]` → `{northing, easting}`                                         |

> **Note on LOCALITY vs AREA**: The original spec maps LOCALITY → `lga` and AREA → `Locality`. This appears intentional (OSSG uses these terms differently). Implement as specified.

#### Where to Implement

| File                                     | Change                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| **new** `actions/ossgActions.ts`         | `submitToOSSG(planId)` server action that builds payload and sends to OSSG API |
| `surf-mda/dashboard/records-ii/page.tsx` | Add "Submit to OSSG" button after Records II approval                          |

---

### 4.3 Beacon (Pillar) Number Compression Logic

#### What

Compress pillar numbers into range notation for the OSSG payload.

#### Input/Output Examples

```
Input:  ["DU5057ARA", "DU5058ARA", "DU5059ARA", "DC1695ARA"]
Output: "DU5057ARA–DU5059ARA, DC1695ARA"

Input:  ["PT01", "PT02", "PT03", "PT05"]
Output: "PT01–PT03, PT05"
```

#### Algorithm

```typescript
function compressPillarNumbers(pillarNumbers: string[]): string {
  // 1. Group by prefix (letters before the numeric part) and suffix (letters after)
  //    e.g., "DU5057ARA" → prefix="DU", number=5057, suffix="ARA"
  // 2. Within each group, sort by number
  // 3. Detect continuous ranges (consecutive numbers)
  // 4. Compress: continuous ranges → "PREFIX{start}SUFFIX–PREFIX{end}SUFFIX"
  // 5. Non-continuous → list individually
  // 6. Join groups with ", "
}
```

#### Rules

- Detect continuous numeric sequences within the same prefix+suffix group
- Compress continuous ranges using an en-dash (`–`, U+2013)
- Non-continuous values remain listed individually
- Different prefix groups (e.g., `DU` vs `DC`) are always separate

#### Where to Implement

| File                                                            | Change                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `utils/` → **new** `pillarCompression.ts`                       | Pure utility function `compressPillarNumbers(pillarNumbers: string[]): string` |
| Used by `actions/ossgActions.ts` when building the OSSG payload |

#### Acceptance Criteria

- [ ] `"DU5057ARA", "DU5058ARA", "DU5059ARA", "DC1695ARA"` → `"DU5057ARA–DU5059ARA, DC1695ARA"`
- [ ] Handles mixed prefixes correctly
- [ ] Handles single values (no range) correctly
- [ ] Handles non-sequential numbers within same prefix correctly
- [ ] Unit-testable pure function

---

## Feature 5: New Role — Archive

### What

Introduce a new **Archive** role for internal MDA tracking of physical plan deliveries from Records II Officer to Archive Officer.

### Characteristics

- **Does NOT** alter or interrupt the existing approval workflow
- **Does NOT** gate Records II or any other role's actions
- Used strictly as an **internal tracking/logging** role by MDA
- Tracks physical plan delivery: `Records II Officer → Archive Officer`

### Where to Implement

| File                                               | Change                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `prisma/schema.prisma`                             | Add `ARCHIVE` to `SurfboardRole` enum; add archive tracking fields to `SurfboardPlan`      |
| `surf-mda/dashboard/` → **new** `archive/page.tsx` | Archive admin page showing plans completed by Records II, with "Received" toggle/timestamp |
| `surf-mda/dashboard/page.tsx`                      | Add Archive to `roleConfigs` and `allQuickActions`                                         |
| `actions/codActions.ts`                            | Add `markPlanArchived(planId)` action                                                      |
| `surf-mda/dashboard/layout.tsx`                    | Add Archive route to navigation                                                            |

### Schema Changes

```prisma
// Add to SurfboardRole enum:
enum SurfboardRole {
  // ... existing ...
  ARCHIVE  // New: Internal tracking role for physical plan delivery
}

// Add to SurfboardPlan model:
model SurfboardPlan {
  // ... existing fields ...

  // Archive tracking (does not affect workflow)
  archiveReceivedBy     String?
  archiveReceivedAt     DateTime?
  archiveNotes          String?
}
```

### Functional Requirements

1. Archive page shows plans where `recordsIIStatus = "APPROVED"` (i.e., Records II has completed their work)
2. Archive officer marks plan as "Received" (sets `archiveReceivedBy` and `archiveReceivedAt`)
3. Optional notes field for Archive officer
4. This action does NOT change `status`, `redCopyStatus`, or any approval status
5. Read-only dashboard showing received vs pending handover counts

### Acceptance Criteria

- [ ] `ARCHIVE` role added to `SurfboardRole` enum
- [ ] Archive fields added to `SurfboardPlan` (non-breaking, nullable)
- [ ] Archive dashboard page created at `surf-mda/dashboard/archive/page.tsx`
- [ ] Archive appears in MDA landing page (`page.tsx`) for ARCHIVE and SUPERADMIN roles
- [ ] Marking as received does NOT affect existing workflow statuses
- [ ] Prisma migration runs successfully

---

## Implementation Priority Order

> Recommended order based on dependency chain and risk:

| Priority | Feature                           | Reason                                                        |
| -------- | --------------------------------- | ------------------------------------------------------------- |
| 1        | **3. Plan Type Visibility**       | Lowest risk, no schema changes, pure UI addition              |
| 2        | **1. Acceptance Checkbox**        | Simple, self-contained, improves compliance immediately       |
| 3        | **2.1 Charting Query Permission** | Small scope, enables 2.2                                      |
| 4        | **2.2 Batched Query Dispatch**    | Core logic change, must be done before 2.3                    |
| 5        | **2.3 Query Response Fee**        | Depends on 2.2 being complete                                 |
| 6        | **5. Archive Role**               | Independent, schema migration needed                          |
| 7        | **4. OSSG Integration**           | Most complex, needs API credentials and external coordination |

---

## Verification Plan

### Automated Tests

- Unit test `compressPillarNumbers()` with various pillar formats
- Unit test `checkAndDispatchQueries()` logic with mock data
- Unit test fee calculation: `codFee × queryResponseFeePercent / 100`

### Manual Verification

- Verify acceptance checkbox blocks submission when unchecked
- Verify Charting admin can raise queries
- Verify batched query dispatch by having multiple roles query a plan and confirming single notification
- Verify Plan Type and Reference Plan Number visibility on all MDA pages
- Verify Archive role page loads and "Received" action works without affecting workflow
- Verify OSSG payload mapping matches specification table exactly
