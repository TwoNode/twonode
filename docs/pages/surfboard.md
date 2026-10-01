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
| `/surfboard/accept-invite` | `surfboard/(auth)/accept-invite/page.tsx` | Accept an admin/MDA-officer invitation — set a password from the emailed single-use link |
| `/surfboard/dashboard` | `surfboard/dashboard/page.tsx` | Dashboard home — stats, analytics, recent/shared plans |
| `/surfboard/dashboard/map` | `surfboard/dashboard/map/page.tsx` | Map viewer |
| `/surfboard/dashboard/viewmap` | `surfboard/dashboard/viewmap/page.tsx` | Map viewer (alternate view) |
| `/surfboard/dashboard/newplan` | `surfboard/dashboard/newplan/page.tsx` | Create a new survey plan |
| `/surfboard/dashboard/plan` | `surfboard/dashboard/plan/page.tsx` | Single plan view |
| `/surfboard/dashboard/plan/edit` | `surfboard/dashboard/plan/edit/page.tsx` | Edit a plan |
| `/surfboard/dashboard/plans` | `surfboard/dashboard/plans/page.tsx` | All of the surveyor's plans — "My Plans"/"Shared with me"/"My Shared Plans" scope filter (Shared Access), "Queried Plans" tab. The old standalone `/surfboard/dashboard/shared` route was retired — Shared Access is a filter here now, not a separate page |
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

The per-stage review pages below (`intake`/`records-i`/`records-ii`/`charting`/`surcon`/`archive`/`settings`/`profile`) share a near-duplicate "info box" pattern (a `bg-{emerald,green,amber,purple}-50` panel for surveyor info / warnings / possible remarks) that had no dark-mode background override at all, while the value text inside them already used `dark:text-white` — in dark mode this rendered as white text on a near-white box, illegible. Fixed across all of them with matching `dark:bg-{color}-500/10`/`dark:border-{color}-500/20` overrides; the reject-button destructive styling (`border-red-300 text-red-600 hover:bg-red-50`) got the same treatment.

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
| `/surfboard-restricted/dashboard/analytics` | `surfboard-restricted/dashboard/analytics/page.tsx` | Platform-wide analytics: stat cards, top LGAs, top surveyors by plan count, recent activity, plans over time |
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
| `/surfboard-restricted/dashboard/user-management` | `surfboard-restricted/dashboard/user-management/page.tsx` | Manage surveyor/user accounts; each subscription shows its expiry date ("Expires Sep 24, 2026 · in 3 days", red once expired) |
| `/surfboard-restricted/dashboard/admin-tools` | `surfboard-restricted/dashboard/admin-tools/page.tsx` | Misc. admin tools |
| `/surfboard-restricted/dashboard/audit-logs` | `surfboard-restricted/dashboard/audit-logs/page.tsx` | Audit log viewer — superadmin only (shared `AuditLogViewer`) |
| `/surfboard-restricted/dashboard/notifications` | `surfboard-restricted/dashboard/notifications/page.tsx` | Notifications list. "Create Notification" dialog can mark one as a modal announcement (start/end date window), shown as a blocking modal on the surveyor dashboard rather than only in the bell dropdown |
| `/surfboard-restricted/dashboard/settings` | `surfboard-restricted/dashboard/settings/page.tsx` | Admin settings |
| `/surfboard-restricted/dashboard/superadmin` | `surfboard-restricted/dashboard/superadmin/page.tsx` | Superadmin-only panel |
