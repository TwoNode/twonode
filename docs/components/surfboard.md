# Surfboard — Components

Surfboard has no dedicated `surfboard/components/` folder — every component
lives colocated with its page under `app/(projects)/(surfboard)/`, either in
a shared `components/`/`hooks/` folder for the whole product or directly
next to the page that uses it.

## Shared across all three Surfboard shells (`app/(projects)/(surfboard)/components/`)

| File | Description |
|---|---|
| `AIAutofillButton.tsx` | Autofills a plan form from an uploaded document via AI extraction |
| `AmendPlanModal.tsx` | Modal to amend/correct a submitted plan |
| `CertificateBatchSelection.tsx` | Select plans to include in a certificate batch |
| `CertificateStatus.tsx` | Certificate status badge/indicator |
| `DownloadSubmissionLetterBtn.tsx` | Download the plan's submission letter |
| `ErrorStates.tsx` | Shared error-state UI |
| `LoadingStates.tsx` | Shared loading-state UI |
| `maps/MaplibreMap.tsx` | Single-plan MapLibre map |
| `maps/MaplibreMultiPlans.tsx` | Multi-plan MapLibre map |
| `maps/MapPreview.tsx` | Small map preview thumbnail |
| `OptimizedSinglePlanDetails.tsx` | Performance-optimized single-plan detail view |
| `OptimizedSurfboardPlanForm.tsx` | Performance-optimized plan create/edit form |
| `PhysicalSubmissionModal.tsx` | Mark plans as physically submitted |
| `PlanLockIndicator.tsx` | Shows whether a plan is locked (being edited by someone else) |
| `PlanLockWarningDialog.tsx` | Warning dialog when a plan is locked |
| `PlansMapClient.tsx` | Client wrapper for the plans map page |
| `PlanView.tsx` | Read-only plan detail view |
| `QRPaywallModal.tsx` | Paywall modal for the QR-earnings feature |
| `QRServiceIllustrations.tsx` | Illustrations used on QR-earnings marketing panels |
| `RecordCopyUploadModal.tsx` | Upload a record copy document |
| `RedCopySubmissionPDF.tsx` | Red-copy submission PDF document definition |
| `RemarkSelector.tsx` | Select a standard MDA remark/reason |
| `RemitaPaymentModal.tsx` | Remita payment modal |
| `SubmitConfirmationModal.tsx` | Confirm-before-submit modal |
| `SubmittedBatchesModal.tsx` | View submitted Certificate-of-Deposit batches |
| `SurfboardPlanForm.tsx` | Plan create/edit form |
| `UnlockButton.tsx` | Force-unlock a locked plan |
| `VerificationResultModal.tsx` | Shows a verification result (SPCode/record copy) |

## Shared hooks (`app/(projects)/(surfboard)/hooks/`)

| File | Description |
|---|---|
| `useBatchLock.ts` | Lock/unlock state for a Certificate-of-Deposit batch |
| `usePlanLock.ts` | Lock/unlock state for a single plan |

## Shared types & utils (product-wide, not platform-wide)

| File | Description |
|---|---|
| `types/certificateOfDepositTypes.ts` | Types for the Certificate-of-Deposit feature |
| `types/surfboardTypes.ts` | Core Surfboard domain types (plans, analytics, etc.) |
| `utils/auditLogger.ts` | Client-side audit-log helper |
| `utils/CoDFees.ts` | Certificate-of-Deposit fee calculation |
| `utils/computePeriod.ts` | Date-period computation helper |
| `utils/dbUtils.ts` | Misc. database helper functions |
| `utils/geojson.ts` | GeoJSON conversion/validation helpers |
| `utils/paystackSubscription.ts` | Paystack subscription helper functions |
| `utils/paystack.ts` | Paystack one-off payment helper functions |
| `utils/pdfExtraction.ts` | Extract structured data from an uploaded PDF |
| `utils/pdfUtils.ts` | General PDF helper functions |
| `utils/prismaErrorHandler.ts` | Normalizes Prisma errors into API-friendly errors |
| `utils/recordCopyVerification.ts` | Record-copy verification logic |
| `utils/remita.ts` | Remita payment gateway helpers |
| `utils/surfboardUtils.ts` | General Surfboard helper functions |
| `utils/validation.ts` | Form/input validation helpers |

## Surveyor shell (`surfboard/`)

| File | Description |
|---|---|
| `(auth)/error-login/error-login.tsx` | Login-error page content |
| `(auth)/error-login/SurfboardErrorLogin.tsx` | Login-error page component |
| `dashboard/analytics/AnalyticsDashboard.tsx` | Analytics tab — stats, charts, dimension breakdowns |
| `dashboard/analytics/BarChart.tsx` | Reusable bar chart |
| `dashboard/analytics/PieChart.tsx` | Reusable (donut-capable) pie chart |
| `dashboard/analytics/StatsCard.tsx` | Analytics stat tile |
| `dashboard/analytics/index.ts` | Barrel export |
| `dashboard/newplan/CreateSurfBoardPlan.tsx` | New-plan creation flow |
| `dashboard/plan/edit/EditPlan.tsx` | Edit-plan flow |
| `dashboard/plan/RedCopyButton.tsx` | Trigger red-copy submission |
| `dashboard/plan/RedCopyModal.tsx` | Red-copy submission modal |
| `dashboard/plan/SharePlanModal.tsx` | Share a plan with another user |
| `dashboard/plan/SinglePlan.tsx` | Single plan detail page content |
| `dashboard/plans/AllPlans.tsx` | All plans list/table |
| `dashboard/plans/QueriedPlans.tsx` | Queried plans list |
| `dashboard/settings/InquiryModal.tsx` | Submit a support inquiry |
| `dashboard/settings/SurveyorProfileSettings.tsx` | Surveyor profile/settings form |
| `dashboard/shared/SharedPlans.tsx` | Plans shared with/by the surveyor |
| `dashboard/subscription/callback/SubCallback.tsx` | Subscription payment callback handler |
| `dashboard/subscription/SubscriptionAdminFAB.tsx` | Floating action button for subscription admin actions |
| `dashboard/subscription/SubscriptionManager.tsx` | Subscription plan management UI |

## Public plan viewer

| File | Description |
|---|---|
| `surfboardplan/[id]/PublicSurfPlan.tsx` | Public/shareable plan viewer |

## Admin shell (`surfboard-restricted/`)

| File | Description |
|---|---|
| `dashboard/kyc/KycClient.tsx` | KYC review page client component |
| `SurfRestrictedLandingPage.tsx` | Admin landing page |

## Not found

| File | Description |
|---|---|
| `not-found.tsx` | Surfboard-scoped 404 page |
