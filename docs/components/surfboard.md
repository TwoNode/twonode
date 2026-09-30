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
| `AnnouncementModal.tsx` | Blocking modal for an admin-authored "important announcement" notification (`showAsModal`, active within its `startsAt`/`endsAt` window) — fetched once per app-shell mount, built on `components/ui/dialog.tsx` (Radix + portal) so it always renders above page content |
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
| `SubmittedBatchesModal.tsx` | View submitted Certificate-of-Deposit batches. "Receipt" button prefers the real LASG receipt (`batch.lasgReceiptUrl`) when on file, falling back to the self-generated PDF summary otherwise — previously always linked to the PDF summary since the underlying query never selected the LASG link. Search bar filters by batch code, plan number, title, or facilitator |
| `SurfboardPlanForm.tsx` | Plan create/edit form. Pillar Summary section has a "Download CSV" button (Pillar Number/Easting/Northing) reconstructing from the already-parsed `pillars` state |
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
| `dashboard/analytics/AnalyticsDashboard.tsx` | Analytics tab — stats, charts, dimension breakdowns. Stats Overview row has a "Shared Access" tile (Active N · Expired N · None N, from `analyticsService.ts`'s `sharedAccessStats`) alongside the existing Facilitators tile — 5 tiles on one line on large screens (tighter per-card padding than `StatCard`'s default so the breakdown line has room), wrapping on smaller screens |
| `dashboard/analytics/BarChart.tsx` | Reusable bar chart |
| `dashboard/analytics/PieChart.tsx` | Reusable (donut-capable) pie chart |
| `dashboard/analytics/StatsCard.tsx` | Analytics stat tile |
| `dashboard/analytics/index.ts` | Barrel export |
| `dashboard/newplan/CreateSurfBoardPlan.tsx` | New-plan creation flow |
| `dashboard/plan/edit/EditPlan.tsx` | Edit-plan flow |
| `dashboard/plan/RedCopyButton.tsx` | Trigger red-copy submission |
| `dashboard/plan/RedCopyModal.tsx` | Red-copy submission modal |
| `dashboard/plan/SharePlanModal.tsx` | Share a plan with another user — existing-user search, plus an "invite by email" fallback (`isEmailQuery` + no search results) for an address with no Surfboard account yet, calling `invitePlanShareByEmail`. Per-result "Share" button shows a loading state and disables while a share is in flight |
| `dashboard/plan/SinglePlan.tsx` | Single plan detail page content. Edit/Delete/Share/QR Code buttons are `isOwner`-gated (all four are owner-only server-side); non-owners see a "Mark Reviewed" button instead. "My Private Attachments" section (upload/list/delete, `surfboardApi.plans.viewerAttachments`) renders only for non-owner viewers, supports uploading multiple files at once (sequential single-file POSTs, per-file failure list). "Comments" section (thread + composer, `surfboardApi.plans.comments`) renders whenever the plan is actually shared — visible to the owner and every recipient, unlike the private-attachments section. Pillars table has a "Download CSV" button reconstructing the pillar CSV client-side from `plan.pillars` |
| `dashboard/plans/AllPlans.tsx` | All plans list/table. Scope switcher ("My Plans" / "Shared with me" / "My Shared Plans" — filters, not tabs) swaps the underlying list call (`plans.list`/`plans.sharedWithMe`/`plans.shared`); "Shared with me" carries its own count badge from a dedicated lightweight fetch on mount (the scope switcher's own `pagination.total` only reflects whichever scope is currently active); a "Shared" badge shows who a plan is shared by (recipient view) or how many people it's shared with (owner view); row/card action menus hide Edit/Delete/Certificate/QR in the "Shared with me" scope, since those are owner-only operations |
| `dashboard/plans/QueriedPlans.tsx` | Queried plans list |
| `dashboard/settings/InquiryModal.tsx` | Submit a support inquiry |
| `dashboard/settings/SurveyorProfileSettings.tsx` | Surveyor profile/settings form. `SurveyorBankSettings`'s save button is a plain `type="button"` + `onClick`, not a nested `<form>` — it renders inside the outer Settings page's own `<form>`, and a nested one used to let the bank-save submit bubble into the outer form's unrelated profile-save handler on every click |
| `dashboard/subscription/callback/SubCallback.tsx` | Subscription payment callback handler |
| `dashboard/subscription/SubscriptionAdminFAB.tsx` | Floating action button for subscription admin actions |
| `dashboard/subscription/SubscriptionManager.tsx` | Subscription plan management UI |

## Public plan viewer

| File | Description |
|---|---|
| `surfboardplan/[id]/PublicSurfPlan.tsx` | Public/shareable plan viewer. Fixed a response-shape mismatch: `getGatedPublicSurfPlan` returns `{ plan, accessInfo }`, but this component was treating that whole wrapper as the flat plan object (`setPlanData(res.data)`) — every field read off it (`planNumber`, `pillars`, `geometry`, `centroid`, `user`) was `undefined`, rendering "Survey Plan undefined" with a blank body instead of either real content or a clear error. Now correctly reads `res.data.plan`/`res.data.accessInfo` |

## Admin shell (`surfboard-restricted/`)

| File | Description |
|---|---|
| `dashboard/kyc/KycClient.tsx` | KYC review page: search, filter chips with counts (KYC pending/validated, bank awaiting/verified/missing), KYC switch, labelled "Verify account"/"Revoke" bank action behind a confirmation dialog |
| `dashboard/user-management/SubscriptionExpiry.tsx` | One-line subscription end date under a user's plan, colour-coded (amber expiring soon, red expired) |
| `SurfRestrictedLandingPage.tsx` | Admin landing page |

## Not found

| File | Description |
|---|---|
| `not-found.tsx` | Surfboard-scoped 404 page |
