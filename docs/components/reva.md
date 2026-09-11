# REVA — Components

Components specific to the REVA platform: the shared `reva/components/`
library plus files colocated directly with REVA pages under
`app/(projects)/(reva)/`.

## `reva/components/` — shared library

| File | Description |
|---|---|
| `RevaAdminDashboardHeader.tsx` | Header bar for the admin dashboard |
| `RevaLoading.tsx` | Loading spinner/state |
| `RevaUserDashboardHeader.tsx` | Header bar for the user dashboard |
| `shared/AuthLinks.tsx` | Login/signup link block reused across auth pages |
| `shared/ComingSoon.tsx` | Placeholder "coming soon" panel |
| `shared/index.ts` | Barrel export for the shared folder |
| `shared/RevaFooterSection.tsx` | Public-site footer |
| `shared/RevaHeroSection.tsx` | Public-site hero banner |
| `shared/Welcome.tsx` | Dashboard welcome/greeting panel |

## Colocated with pages (`app/(projects)/(reva)/`)

### Public site (`reva/`)

| File | Description |
|---|---|
| `AuthLinks.tsx` | Auth link block for the public site |
| `RevaFooterSection.tsx` | Footer (public site instance) |
| `RevaHeroSection.tsx` | Hero banner (public site instance) |
| `RevaLandingPage.tsx` | Full landing page composition |
| `actions/awsActions.ts` | Server actions for AWS S3 uploads |
| `actions/paystackActions.ts` | Server actions for Paystack payment init/verification |
| `(auth)/error-login/RevaErrorLogin.tsx` | Login-error page content |
| `(auth)/login/RevaLogin.tsx` | Login form |
| `details/viewDetails.tsx` | Public request/property details view |
| `onetimerequest/OneTimeRequest.tsx` | One-time due-diligence request form |
| `onetimerequest/components/DownloadReportButton.tsx` | Download-report button for one-time requests |
| `requestform/RevaDueDiligenceForm.tsx` | Standard due-diligence request form |
| `verifypayment/PaymentErrorPage.tsx` | Payment verification error state |
| `verifypayment/viewDetails.tsx` | Payment verification result view |

### User dashboard (`reva/dashboard/`)

| File | Description |
|---|---|
| `DashboardClient.tsx` | Dashboard home client component |
| `allrequests/AllRequestsClient.tsx` | All-requests page client wrapper |
| `allrequests/AllRequests.tsx` | All-requests list/table |
| `components/ComingSoon.tsx` | Placeholder panel |
| `components/ErrorComponent.tsx` | Generic error state |
| `components/UserPropertyRequests.tsx` | User's property requests list |
| `components/UserSearchFilters.tsx` | Search/filter bar for the user dashboard |
| `details/SingleRequestPage.tsx` | Single request detail view (user) |
| `newrequest/RevaDueDiligenceForm.tsx` | New-request form (dashboard instance) |
| `notifications/NotificationsList.tsx` | User notifications list |
| `settings/UserProfile.tsx` | User profile/settings form |
| `verifypayment/PaymentErrorPage.tsx` | Payment error state (dashboard instance) |
| `verifypayment/viewDetails.tsx` | Payment verification view (dashboard instance) |
| `viewmap/RequestsMap.tsx` | Map view of the user's requests |

## Colocated with pages (`app/(projects)/(reva)/reva-restricted/`) — admin

| File | Description |
|---|---|
| `AuthLinks.tsx` | Auth link block (admin site) |
| `RevaFooterSection.tsx` | Footer (admin landing) |
| `RevaHeroSection.tsx` | Hero banner (admin landing) |
| `RevaLandingPage.tsx` | Admin landing page composition |
| `(auth)/login/RevaAdminLogin.tsx` | Admin login form |
| `components/AdminMiniHeader.tsx` | Compact page header used across admin pages |
| `components/AdminUsersList.tsx` | Admin user accounts list |
| `components/AllUsersList.tsx` | All platform users list |
| `components/CreateAdminUserForm.tsx` | Form to create a new admin user |
| `components/CreateNotificationForm.tsx` | Form to compose a notification |
| `components/OneTimeRequestList.tsx` | One-time requests list (admin) |
| `components/RequestsList.tsx` | Standard requests list (admin) |
| `components/SearchFilters.tsx` | Search/filter bar for admin lists |
| `components/UserRoleManagementForm.tsx` | Form to change a user's role |
| `dashboard/alluserrequests/AllRequestsClient.tsx` | All-user-requests page client wrapper |
| `dashboard/alluserrequests/AllRequests.tsx` | All-user-requests list/table |
| `dashboard/alluserrequests/ProgressComponent.tsx` | Request progress/status indicator |
| `dashboard/components/ComingSoon.tsx` | Placeholder panel |
| `dashboard/components/OneTimeRequestView.tsx` | One-time request detail view |
| `dashboard/components/Welcome.tsx` | Dashboard welcome/greeting panel |
| `dashboard/details/AdminDirectLinkUpload.tsx` | Upload a direct file link for a request |
| `dashboard/details/AdminReport.tsx` | Admin report view/generation panel |
| `dashboard/details/AdminReportUpload.tsx` | Upload a report file for a request |
| `dashboard/details/UserRequestDataView.tsx` | Main request detail view (admin) |
| `dashboard/details/viewDetails.tsx` | Request details wrapper |
| `dashboard/details/components/index.ts` | Barrel export |
| `dashboard/details/components/PDFDownloadButton.tsx` | Download-as-PDF button (report/receipt) |
| `dashboard/details/components/RevaReceiptPDF.tsx` | Receipt PDF document definition |
| `dashboard/details/components/RevaReportPDF.tsx` | Report PDF document definition |
| `dashboard/notifications/AdminNotificationsList.tsx` | Admin notifications list |
| `dashboard/payment-verification/PaymentVerification.tsx` | Payment verification tool |
| `dashboard/review/AllRequestsWithReportClient.tsx` | Review-queue page client wrapper |
| `dashboard/review/AllRequestsWithReport.tsx` | Review-queue list/table |
| `dashboard/spatial-record/SpatialRecordMap.tsx` | Spatial/GIS record map tool |
