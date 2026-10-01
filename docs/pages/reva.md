# REVA — Pages

All routes under `app/(projects)/(reva)/`. REVA has a public
marketing/request site + user dashboard (`/reva/*`) and a separate admin
panel (`/reva-restricted/*`).

## Public site & user dashboard (`/reva`)

| Route | File | Description |
|---|---|---|
| `/reva` | `reva/page.tsx` | Homepage/landing page |
| `/reva/contact` | `reva/contact/page.tsx` | Contact form |
| `/reva/details` | `reva/details/page.tsx` | Public property/request details view |
| `/reva/newsletter` | `reva/newsletter/page.tsx` | Newsletter signup |
| `/reva/onetimerequest` | `reva/onetimerequest/page.tsx` | One-time due-diligence request form (no account needed) |
| `/reva/requestform` | `reva/requestform/page.tsx` | Standard due-diligence request form |
| `/reva/verifypayment` | `reva/verifypayment/page.tsx` | Public payment verification lookup |
| `/reva/login` | `reva/(auth)/login/page.tsx` | User login |
| `/reva/error-login` | `reva/(auth)/error-login/page.tsx` | Login error page |
| `/reva/reset-password` | `reva/(auth)/reset-password/page.tsx` | Password reset |
| `/reva/verify-email` | `reva/(auth)/verify-email/page.tsx` | Email verification |
| `/reva/accept-invite` | `reva/(auth)/accept-invite/page.tsx` | Accept an admin invitation — set a password from the emailed single-use link |
| `/reva/dashboard` | `reva/dashboard/page.tsx` | User dashboard home |
| `/reva/dashboard/allrequests` | `reva/dashboard/allrequests/page.tsx` | All of the user's requests |
| `/reva/dashboard/details` | `reva/dashboard/details/page.tsx` | Single request details (user view) |
| `/reva/dashboard/newrequest` | `reva/dashboard/newrequest/page.tsx` | Submit a new due-diligence request |
| `/reva/dashboard/notifications` | `reva/dashboard/notifications/page.tsx` | Notifications list |
| `/reva/dashboard/settings` | `reva/dashboard/settings/page.tsx` | Account settings |
| `/reva/dashboard/verifypayment` | `reva/dashboard/verifypayment/page.tsx` | Payment verification (in-dashboard) |
| `/reva/dashboard/viewmap` | `reva/dashboard/viewmap/page.tsx` | Map viewer |

## Admin panel (`/reva-restricted`)

| Route | File | Description |
|---|---|---|
| `/reva-restricted` | `reva-restricted/page.tsx` | Admin landing page |
| `/reva-restricted/login` | `reva-restricted/(auth)/login/page.tsx` | Admin login |
| `/reva-restricted/dashboard` | `reva-restricted/dashboard/page.tsx` | Admin dashboard home |
| `/reva-restricted/dashboard/audit-logs` | `reva-restricted/dashboard/audit-logs/page.tsx` | Audit log viewer — who did what, superadmin only (shared `AuditLogViewer`) |
| `/reva-restricted/dashboard/alluserrequests` | `reva-restricted/dashboard/alluserrequests/page.tsx` | All user requests, platform-wide |
| `/reva-restricted/dashboard/details` | `reva-restricted/dashboard/details/page.tsx` | Request detail (admin view, with report/receipt PDF actions) |
| `/reva-restricted/dashboard/notifications` | `reva-restricted/dashboard/notifications/page.tsx` | Notifications list |
| `/reva-restricted/dashboard/notifications/create` | `reva-restricted/dashboard/notifications/create/page.tsx` | Compose a new notification |
| `/reva-restricted/dashboard/notifications/manage` | `reva-restricted/dashboard/notifications/manage/page.tsx` | Manage/edit existing notifications |
| `/reva-restricted/dashboard/payment-verification` | `reva-restricted/dashboard/payment-verification/page.tsx` | Verify user payments |
| `/reva-restricted/dashboard/review` | `reva-restricted/dashboard/review/page.tsx` | Request review queue |
| `/reva-restricted/dashboard/settings` | `reva-restricted/dashboard/settings/page.tsx` | Admin settings |
| `/reva-restricted/dashboard/spatial-record` | `reva-restricted/dashboard/spatial-record/page.tsx` | Spatial/GIS record tool |
| `/reva-restricted/dashboard/superadmin` | `reva-restricted/dashboard/superadmin/page.tsx` | Superadmin-only panel |
