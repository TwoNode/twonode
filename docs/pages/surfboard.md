# Surfboard — Pages

All routes under `app/(projects)/(surfboard)/`. Surfboard has three separate
shells: the surveyor-facing site (`/surfboard/*`), the MDA officer shell
(`/surfboard-mda/*`), and the admin panel (`/surfboard-restricted/*`).

## Surveyor site & dashboard (`/surfboard`)

| Route | File | Description |
|---|---|---|
| `/surfboard` | `surfboard/page.tsx` | Homepage/landing page |
| `/surfboard/badge` | `surfboard/badge/page.tsx` | QR/verification badge page |
| `/surfboard/login` | `surfboard/(auth)/login/page.tsx` | Surveyor login |
| `/surfboard/error-login` | `surfboard/(auth)/error-login/page.tsx` | Login error page |
| `/surfboard/reset-password` | `surfboard/(auth)/reset-password/page.tsx` | Password reset |
| `/surfboard/verify-email` | `surfboard/(auth)/verify-email/page.tsx` | Email verification |
| `/surfboard/dashboard` | `surfboard/dashboard/page.tsx` | Dashboard home — stats, analytics, recent/shared plans |
| `/surfboard/dashboard/map` | `surfboard/dashboard/map/page.tsx` | Map viewer |
| `/surfboard/dashboard/viewmap` | `surfboard/dashboard/viewmap/page.tsx` | Map viewer (alternate view) |
| `/surfboard/dashboard/newplan` | `surfboard/dashboard/newplan/page.tsx` | Create a new survey plan |
| `/surfboard/dashboard/plan` | `surfboard/dashboard/plan/page.tsx` | Single plan view |
| `/surfboard/dashboard/plan/edit` | `surfboard/dashboard/plan/edit/page.tsx` | Edit a plan |
| `/surfboard/dashboard/plans` | `surfboard/dashboard/plans/page.tsx` | All of the surveyor's plans |
| `/surfboard/dashboard/shared` | `surfboard/dashboard/shared/page.tsx` | Plans shared with/by the surveyor |
| `/surfboard/dashboard/queried-plans` | `surfboard/dashboard/queried-plans/page.tsx` | Plans returned with a query/objection |
| `/surfboard/dashboard/notifications` | `surfboard/dashboard/notifications/page.tsx` | Notifications list |
| `/surfboard/dashboard/qr-earnings` | `surfboard/dashboard/qr-earnings/page.tsx` | QR-code referral earnings |
| `/surfboard/dashboard/spcode-verification` | `surfboard/dashboard/spcode-verification/page.tsx` | Surveyor practice code (SPCode) verification |
| `/surfboard/dashboard/settings` | `surfboard/dashboard/settings/page.tsx` | Account settings |
| `/surfboard/dashboard/subscription` | `surfboard/dashboard/subscription/page.tsx` | Subscription plan/billing |
| `/surfboard/dashboard/subscription/callback` | `surfboard/dashboard/subscription/callback/page.tsx` | Payment gateway callback for subscription |
| `/surfboard/dashboard/payment/callback` | `surfboard/dashboard/payment/callback/page.tsx` | Payment gateway callback (plan/COD payment) |
| `/surfboardplan/[id]` | `surfboardplan/[id]/page.tsx` | Public/shareable plan viewer |

## MDA shell (`/surfboard-mda`)

| Route | File | Description |
|---|---|---|
| `/surfboard-mda/login` | `surfboard-mda/login/page.tsx` | MDA officer login |
| `/surfboard-mda/error-login` | `surfboard-mda/error-login/page.tsx` | Login error page |
| `/surfboard-mda/dashboard` | `surfboard-mda/dashboard/page.tsx` | MDA dashboard home |
| `/surfboard-mda/dashboard/intake` | `surfboard-mda/dashboard/intake/page.tsx` | Intake queue (newly submitted plans) |
| `/surfboard-mda/dashboard/records-i` | `surfboard-mda/dashboard/records-i/page.tsx` | Records I stage queue |
| `/surfboard-mda/dashboard/records-ii` | `surfboard-mda/dashboard/records-ii/page.tsx` | Records II stage queue |
| `/surfboard-mda/dashboard/charting` | `surfboard-mda/dashboard/charting/page.tsx` | Charting stage queue |
| `/surfboard-mda/dashboard/surcon` | `surfboard-mda/dashboard/surcon/page.tsx` | SURCON stage queue |
| `/surfboard-mda/dashboard/accounts` | `surfboard-mda/dashboard/accounts/page.tsx` | Accounts/Certificate-of-Deposit batch queue |
| `/surfboard-mda/dashboard/archive` | `surfboard-mda/dashboard/archive/page.tsx` | Archived/completed plans |
| `/surfboard-mda/dashboard/notifications` | `surfboard-mda/dashboard/notifications/page.tsx` | Notifications list |
| `/surfboard-mda/dashboard/profile` | `surfboard-mda/dashboard/profile/page.tsx` | Officer profile |
| `/surfboard-mda/dashboard/settings` | `surfboard-mda/dashboard/settings/page.tsx` | Settings |

## Admin panel (`/surfboard-restricted`)

| Route | File | Description |
|---|---|---|
| `/surfboard-restricted/login` | `surfboard-restricted/(auth)/login/page.tsx` | Admin login |
| `/surfboard-restricted/error-login` | `surfboard-restricted/(auth)/error-login/page.tsx` | Login error page |
| `/surfboard-restricted/dashboard` | `surfboard-restricted/dashboard/page.tsx` | Admin dashboard home |
| `/surfboard-restricted/dashboard/analytics` | `surfboard-restricted/dashboard/analytics/page.tsx` | Platform-wide analytics |
| `/surfboard-restricted/dashboard/map` | `surfboard-restricted/dashboard/map/page.tsx` | Map viewer, all plans |
| `/surfboard-restricted/dashboard/surf-plans` | `surfboard-restricted/dashboard/surf-plans/page.tsx` | All survey plans |
| `/surfboard-restricted/dashboard/surf-plans/update/[id]` | `surfboard-restricted/dashboard/surf-plans/update/[id]/page.tsx` | Edit a specific plan |
| `/surfboard-restricted/dashboard/secure-plans` | `surfboard-restricted/dashboard/secure-plans/page.tsx` | Secure/restricted plans |
| `/surfboard-restricted/dashboard/cod` | `surfboard-restricted/dashboard/cod/page.tsx` | Certificate of Deposit overview |
| `/surfboard-restricted/dashboard/cod/batches` | `surfboard-restricted/dashboard/cod/batches/page.tsx` | Certificate of Deposit batches |
| `/surfboard-restricted/dashboard/certificates` | `surfboard-restricted/dashboard/certificates/page.tsx` | Certificate management |
| `/surfboard-restricted/dashboard/kyc` | `surfboard-restricted/dashboard/kyc/page.tsx` | Surveyor KYC review |
| `/surfboard-restricted/dashboard/qr-earnings` | `surfboard-restricted/dashboard/qr-earnings/page.tsx` | QR-earnings overview |
| `/surfboard-restricted/dashboard/qr-earnings/settings` | `surfboard-restricted/dashboard/qr-earnings/settings/page.tsx` | QR-earnings settings |
| `/surfboard-restricted/dashboard/user-management` | `surfboard-restricted/dashboard/user-management/page.tsx` | Manage surveyor/user accounts |
| `/surfboard-restricted/dashboard/admin-tools` | `surfboard-restricted/dashboard/admin-tools/page.tsx` | Misc. admin tools |
| `/surfboard-restricted/dashboard/audit-logs` | `surfboard-restricted/dashboard/audit-logs/page.tsx` | Audit log viewer |
| `/surfboard-restricted/dashboard/notifications` | `surfboard-restricted/dashboard/notifications/page.tsx` | Notifications list |
| `/surfboard-restricted/dashboard/settings` | `surfboard-restricted/dashboard/settings/page.tsx` | Admin settings |
| `/surfboard-restricted/dashboard/superadmin` | `surfboard-restricted/dashboard/superadmin/page.tsx` | Superadmin-only panel |
