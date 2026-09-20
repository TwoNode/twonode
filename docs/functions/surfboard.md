# Surfboard — Functions (services, utils, access, hooks, layouts)

Non-component logic files specific to the Surfboard platform: the
product-wide `surfboard/` folder plus the shared `utils/`/`hooks`/`types`
colocated under `app/(projects)/(surfboard)/`.

## `surfboard/services/` — business logic (DB access, orchestration)

| File | Description |
|---|---|
| `adminUserService.ts` | Admin/surveyor user account CRUD |
| `aiExtractionService.ts` | AI-based data extraction from uploaded documents |
| `analyticsService.ts` | Dashboard analytics — stat cards, dimension breakdowns, trends, date-range filtering |
| `awsService.ts` | S3 upload/download helpers |
| `batchApprovalService.ts` | Certificate-of-Deposit batch approval workflow |
| `codFeeService.ts` | Certificate-of-Deposit fee calculation |
| `mdaRemarkService.ts` | MDA stage remarks/reasons CRUD |
| `notificationService.ts` | Notification CRUD + read/dismiss state |
| `paystackSubscriptionService.ts` | Paystack subscription billing logic |
| `planLockService.ts` | Plan/batch locking (prevents concurrent edits), role-field-prefix helper |
| `planService.ts` | Survey plan CRUD, filtering (including `dateOnSurveyPlan` range), sharing |
| `profileService.ts` | Surveyor profile CRUD |
| `qrAdminService.ts` | QR-earnings admin configuration |
| `qrEarningsService.ts` | QR-code referral earnings calculation |
| `receiptPdfService.ts` | Spawns the receipt PDF worker and returns a buffer |
| `remitaVerificationService.ts` | Remita payment verification |
| `settingsService.ts` | Platform settings CRUD |
| `subscriptionAnalyticsService.ts` | Subscription-related analytics |
| `subscriptionReminderService.ts` | Daily cron job: emails + WhatsApp-nudges users whose subscription expires within 3 days (dedup'd per expiry date via `expiryReminderSentAt`) |
| `subscriptionService.ts` | Subscription plan CRUD/lifecycle |
| `verificationService.ts` | SPCode / record-copy verification logic |

## `surfboard/utils/`

| File | Description |
|---|---|
| `ossg.ts` | OSSG (Osun State/coordinate system) helpers |
| `surfAuth.ts` | Surfboard-specific auth helpers (session/role checks) |

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
