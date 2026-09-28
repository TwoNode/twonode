# Surfboard — Functions (services, utils, access, hooks, layouts)

Non-component logic files specific to the Surfboard platform: the
product-wide `surfboard/` folder plus the shared `utils/`/`hooks`/`types`
colocated under `app/(projects)/(surfboard)/`.

## `surfboard/services/` — business logic (DB access, orchestration)

| File | Description |
|---|---|
| `adminUserService.ts` | Admin/surveyor user account CRUD |
| `aiExtractionService.ts` | AI-based data extraction from uploaded documents |
| `analyticsService.ts` | Dashboard analytics — stat cards, dimension breakdowns, trends, date-range filtering; `getTopSurveyors` ranks surveyors by plan count (admin-only, counted like the Total Plans card); `getUserDashboardAnalytics`'s `pillarStats` sums unique pillars per plan (not plan rows) bucketed Regular/Special, `pendingCertificatesCount` is a true count (`certificateFilePaths` empty, any planType) decoupled from the capped table list; exports `PROVISIONAL_TYPES` (`["PROVISIONAL", "PROVISIONAL LAYOUT"]`) — the "Total Plans" convention used throughout this file (excludes those types) that `planService.getAdminSurfPlansStats` also now follows, for one consistent Total Plans figure app-wide |
| `awsService.ts` | S3 upload/download helpers |
| `batchApprovalService.ts` | Certificate-of-Deposit batch approval workflow |
| `codFeeService.ts` | Certificate-of-Deposit fee calculation |
| `mdaRemarkService.ts` | MDA stage remarks/reasons CRUD |
| `notificationService.ts` | Notification CRUD + read/dismiss state |
| `paystackSubscriptionService.ts` | Paystack subscription billing logic. `initiateSubscription`/`verifySubscription` attach a Paystack `plan` (recurring — Bank Transfer unavailable at checkout, since a transfer can't authorize future auto-charges). `initiateOneTimeSubscription`/`verifyOneTimeSubscription` are the non-recurring counterpart — same pricing, no `plan` attached (Transfer available), no auto-renewal; persists `Subscription.provider = "paystack_onetime"` so `disableSubscription()` and the UI can tell it apart from a genuinely-recurring subscription with an empty `subCode` (a transient "not yet synced" state, vs. a one-time payment's permanently-empty `subCode`) |
| `planLockService.ts` | Plan/batch locking (prevents concurrent edits), role-field-prefix helper |
| `planService.ts` | Survey plan CRUD, filtering (including `dateOnSurveyPlan` range and pillar-number substring match via raw SQL, `findPlanIdsByPillarNumber`), sharing; `respondToPlanShare`/`getSharedAwaitingResponseCount` track per-recipient acknowledgment of a shared plan (`SurfboardPlanShareResponse`, additive alongside `sharedTo`); `getAdminSurfPlansStats`'s `total`/status counts exclude `PROVISIONAL_TYPES` (imported from `analyticsService.ts`), matching every other "Total Plans" figure in the app |
| `profileService.ts` | Surveyor profile CRUD |
| `qrAdminService.ts` | QR-earnings admin configuration |
| `qrEarningsService.ts` | QR-code referral earnings calculation; bank-account verification for payouts (`toggleBankVerification`, audited with the acting admin); `getSurveyorEarningsThisMonth` is a server-side aggregate for the current calendar month (not a client-side sum over the capped `getSurveyorEarningsOverview` transaction list) |
| `receiptPdfService.ts` | Spawns the receipt PDF worker and returns a buffer |
| `remitaVerificationService.ts` | Remita payment verification |
| `settingsService.ts` | Platform settings CRUD; surveyor KYC validation (`toggleUserKycValidation`, audited with the acting admin) |
| `subscriptionAnalyticsService.ts` | Subscription-related analytics |
| `subscriptionReminderService.ts` | Daily cron job: emails + WhatsApp-nudges users whose subscription expires within 3 days (dedup'd per expiry date via `expiryReminderSentAt`) |
| `subscriptionService.ts` | Subscription plan CRUD/lifecycle |
| `verificationService.ts` | SPCode / record-copy verification logic |

## `surfboard/utils/`

| File | Description |
|---|---|
| `ossg.ts` | OSSG (Osun State/coordinate system) helpers |
| `subscriptionExpiry.ts` | How a subscription end date reads in User Management (expired / expiring soon / ok / no end date); owns the 7-day "expiring soon" window shared with the list filter |
| `surfAuth.ts` | Surfboard-specific auth helpers (session/role checks) |
| `kycFilter.ts` | Filters and per-filter counts for the admin KYC review page (`matchesKycFilter`, `countByKycFilter`) |

## `surfboard/access/`

| File | Description |
|---|---|
| `routes.ts` | Role → allowed-route map, shared across the surveyor/MDA/admin shells |

## `surfboard/hooks/`

| File | Description |
|---|---|
| `useSurfUserProfile.ts` | Fetches and caches the current surveyor's profile |

## `surfboard/layouts/`

| File | Description |
|---|---|
| `surfboardUserPanelLayout.tsx` | Surveyor dashboard shell layout (navbar + sidebar composition) |

## `surfboard/pdf-worker/` — standalone Node PDF renderer

| File | Description |
|---|---|
| `receipt.render.cjs` | Renders the batch payment receipt PDF (spawned as a child process) |

## Top level

| File | Description |
|---|---|
| `surfboard/apiClient.ts` | Typed client wrapper around `/api/v1/surfboard/*` routes |
| `surfboard/colors.ts` | Surfboard brand color palette (blue/teal) |
| `surfboard/statusTone.ts` | Maps plan/payment status strings to display labels and badge tones |

## Shared across the three Surfboard shells, colocated (`app/(projects)/(surfboard)/`)

| File | Description |
|---|---|
| `types/certificateOfDepositTypes.ts` | Types for the Certificate-of-Deposit feature |
| `types/surfboardTypes.ts` | Core Surfboard domain types (plans, analytics, etc.) |
| `utils/auditLogger.ts` | Client-side audit-log helper |
| `utils/CoDFees.ts` | Certificate-of-Deposit fee calculation (client-side) |
| `utils/computePeriod.ts` | Date-period computation helper |
| `utils/dbUtils.ts` | Misc. database helper functions |
| `utils/geojson.ts` | GeoJSON conversion/validation helpers |
| `utils/paystackSubscription.ts` | Paystack subscription helper functions (client-side) |
| `utils/paystack.ts` | Paystack one-off payment helper functions (client-side) |
| `utils/pdfExtraction.ts` | Extract structured data from an uploaded PDF |
| `utils/pdfUtils.ts` | General PDF helper functions |
| `utils/prismaErrorHandler.ts` | Normalizes Prisma errors into API-friendly errors |
| `utils/recordCopyVerification.ts` | Record-copy verification logic |
| `utils/remita.ts` | Remita payment gateway helpers |
| `utils/surfboardUtils.ts` | General Surfboard helper functions |
| `utils/validation.ts` | Form/input validation helpers |
| `hooks/useBatchLock.ts` | Lock/unlock state for a Certificate-of-Deposit batch |
| `hooks/usePlanLock.ts` | Lock/unlock state for a single plan |
