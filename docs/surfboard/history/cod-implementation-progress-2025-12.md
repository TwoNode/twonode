# Certificate of Deposit Implementation - Progress Report

## ✅ Completed

### 1. Database Schema
- ✅ Added `chartingRemarks` field to `SurfboardPlan` model
- ✅ Created `SurfboardSettings` model for LGA fees and system configuration
- ✅ Added relation between `SurfboardUser` and `SurfboardSettings`
- ✅ Added lock tracking fields for all MDA roles:
  - `{role}LockedBy` - User ID who locked the plan
  - `{role}LockedAt` - When lock was acquired
  - `{role}LockExpiresAt` - When lock expires (30 min default)

### 2. Backend Actions (`codActions.ts`)
- ✅ **Lock Management**:
  - `acquirePlanLock()` - Acquire 30-min lock on a plan for a role
  - `releasePlanLock()` - Release lock manually
  - `canWorkOnPlan()` - Check chronological order enforcement
- ✅ `getChartingInterpretation()` - Spatial intersection with LASG dataset
- ✅ `getLGAFees()` - Fetch LGA fee configuration
- ✅ `calculatePlanFee()` - Calculate fees based on LGA and area
- ✅ `submitRedCopyBatch()` - Main batch submission logic
- ✅ `verifyBatchPayment()` - Paystack payment verification
- ✅ `uploadLASGReceipt()` - Admin uploads LASG receipt
- ✅ `updateAccountsApproval()` - Accounts admin approval
- ✅ `updateChartingStatus()` - Charting admin approval
- ✅ `updateSurconStatus()` - SURCON admin approval
- ✅ `updateRecordsIStatus()` - Records I admin approval
- ✅ `updateRecordsIIStatus()` - Records II final approval
- ✅ `getAccountsBatches()` - Fetch batches for Accounts view (sorted chronologically)
- ✅ `getChartingPlans()` - Fetch plans for Charting view (sorted chronologically)
- ✅ `getSurconPlans()` - Fetch plans for SURCON view (sorted chronologically)
- ✅ `getRecordsIPlans()` - Fetch plans for Records I view (sorted chronologically)
- ✅ `getRecordsIIPlans()` - Fetch plans for Records II view (sorted chronologically)

### 3. Components
- ✅ Updated `CertificateBatchSelection.tsx` to use new actions
- ✅ Created `RecordCopyUploadModal.tsx` for uploading record copies

### 4. API Routes
- ✅ Created `/api/surfboard/update-record-copy/route.ts`

### 5. Admin Dashboards
- ✅ Accounts Admin page (`/surf-restricted/dashboard/cod/accounts/page.tsx`)
- ✅ Charting Admin page (`/surf-restricted/dashboard/cod/charting/page.tsx`)

## 🚧 Remaining Tasks

### 1. Admin Dashboards (3 more)
- ⏳ SURCON Admin page (`/surf-restricted/dashboard/cod/surcon/page.tsx`)
- ⏳ Records I Admin page (`/surf-restricted/dashboard/cod/records-i/page.tsx`)
- ⏳ Records II Admin page (`/surf-restricted/dashboard/cod/records-ii/page.tsx`)

### 2. User Interface Updates
- ⏳ Update `surf-plans/page.tsx` to:
  - Connect to real data (replace mock data)
  - Add checkbox selection for plans
  - Integrate `RecordCopyUploadModal` and `BatchSubmissionModal`
  - Show CoD status badges

### 3. Payment Integration
- ⏳ Integrate Paystack payment initialization
- ⏳ Create payment callback/webhook handler
- ⏳ Update batch status after successful payment

### 4. Notifications
- ⏳ Email notifications to admins after user payment
- ⏳ Email notifications to MDA roles after LASG receipt upload
- ⏳ Email notifications to users when queried
- ⏳ Email notifications to users after final approval

### 5. Database Migration
- ⏳ Run `npx prisma migrate dev` to apply schema changes

### 6. Settings Management
- ⏳ Create Super Admin page for managing LGA fees
- ⏳ Seed initial LGA fee data

### 7. Query/Resubmission Flow
- ⏳ Update plan edit page to make pillars and record copy editable when `redCopyStatus = QUERIED`
- ⏳ Implement resubmission logic after query resolution

### 8. OSSG API Integration
- ⏳ Implement actual API call to OSSG Certificate of Deposit API
- ⏳ Handle API response and error cases

## 📝 Notes

### Key Features Implemented
1. **Batch Submission**: Users can select multiple plans and submit as a batch
2. **Spatial Intersection**: Automatically populates `possibleChartingRemarks` from LASG dataset
3. **Fee Calculation**: Dynamic fee calculation based on LGA rates and plan area
4. **Two-Fold Payment**: User pays via Paystack, Admin uploads LASG receipt
5. **Role-Based Workflows**: Separate dashboards for each MDA role
6. **Approval Tracking**: Each plan tracks approval status for all roles

### Important Implementation Details
- Record copies must be uploaded BEFORE batch submission
- All MDA role approvals happen simultaneously (not sequential)
- Plans become "invisible" to each role after approval
- Query status makes pillars and record copy editable
- Final approval (Records II) requires all other approvals first

### Environment Variables Needed
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- Paystack keys (for payment integration)

## 🎯 Next Steps
1. Run database migration
2. Create remaining 3 admin dashboards (SURCON, Records I, Records II)
3. Update main plans page with real data and batch submission UI
4. Implement payment integration
5. Add notification system
6. Test end-to-end workflow
