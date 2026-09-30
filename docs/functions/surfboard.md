# Surfboard — Functions (services, utils, access, hooks, layouts)

Non-component logic files specific to the Surfboard platform: the
product-wide `surfboard/` folder plus the shared `utils/`/`hooks`/`types`
colocated under `app/(projects)/(surfboard)/`.

## `surfboard/services/` — business logic (DB access, orchestration)

| File | Description |
|---|---|
| `adminUserService.ts` | Admin/surveyor user account CRUD |
| `aiExtractionService.ts` | AI-based data extraction from uploaded documents. `extractLASGReceiptFromHtml` asks the model to extract `payerId`/`payerType` (per its prompt's numbered instructions) but its final returned `data` object never mapped them in — always `undefined` regardless of what the receipt said, so `remitaVerificationService.ts`'s payer-ID mismatch check silently never ran for any non-legacy LASG receipt URL. Now mapped through |
| `analyticsService.ts` | Dashboard analytics — stat cards, dimension breakdowns, trends, date-range filtering; `getTopSurveyors` ranks surveyors by plan count (admin-only, counted like the Total Plans card); `getUserDashboardAnalytics`'s `pillarStats` sums unique pillars per plan (not plan rows) bucketed Regular/Special, `pendingCertificatesCount` is a true count (`certificateFilePaths` empty, any planType) decoupled from the capped table list, `sharedAccessStats` (Shared Access) is `computeSharedAccessStats(userId)` — one count per (plan, recipient) pair this user has shared out, bucketed by the recipient's own current subscription status (active/expired/none), computed in the same `Promise.all` as `facilitatorStats`; exports `PROVISIONAL_TYPES` (`["PROVISIONAL", "PROVISIONAL LAYOUT"]`) — the "Total Plans" convention used throughout this file (excludes those types) that `planService.getAdminSurfPlansStats` also now follows, for one consistent Total Plans figure app-wide |
| `awsService.ts` | S3 upload/download helpers. `uploadSurfboardFileToS3`'s `fileType` union includes `"viewer-attachment"` (Shared Access private attachments — keyed under the uploading viewer's own S3 prefix, `surfboard/{viewerId}/viewer-attachment/...`) alongside `pdf`/`cad`/`certificate`/`redcopy` |
| `batchApprovalService.ts` | Certificate-of-Deposit batch approval workflow |
| `codFeeService.ts` | Certificate-of-Deposit fee calculation |
| `mdaRemarkService.ts` | MDA stage remarks/reasons CRUD |
| `notificationService.ts` | Notification CRUD + read/dismiss state. `createNotification`/`SurfboardNotification` support `showAsModal`/`startsAt`/`endsAt` — an admin-authored announcement important enough to show as a blocking modal on login, not just the bell dropdown, only while active in its optional date window; `getActiveModalAnnouncement(userId, role)` resolves the current one (if any) matching the caller's audience and not yet in `dismissedBy`, reusing `getUserNotifications`' own audience-matching shape |
| `planCommentService.ts` | Per-plan Comments (Shared Access) — a shared discussion thread visible to the plan's owner and everyone in `sharedTo` (unlike `planViewerAttachmentService.ts`, deliberately not private). `addPlanComment`/`getPlanComments`/`deletePlanComment`; `assertCanAccessComments` checks the caller is the owner or a recipient before any read/write, not subscription-gated (access-not-capability, same principle as reading a shared plan). Author names resolved in one bulk `findMany`, not N+1; each returned comment carries `isOwner` so the UI can badge the surveyor's own replies |
| `planViewerAttachmentService.ts` | Private per-viewer plan attachments (Shared Access) — a shared-plan recipient's own files, fully private: never visible to the owner or to any other recipient of the same share. `addViewerAttachment`/`getViewerAttachments`/`deleteViewerAttachment`, every function scoped by BOTH `planId` and `viewerId` (never `planId` alone); `assertIsRecipient` (must be in the plan's `sharedTo`) doubles as the privacy boundary, not just a UI hide |
| `paystackSubscriptionService.ts` | Paystack subscription billing logic. `initiateSubscription`/`verifySubscription` attach a Paystack `plan` (recurring — Bank Transfer unavailable at checkout, since a transfer can't authorize future auto-charges). `initiateOneTimeSubscription`/`verifyOneTimeSubscription` are the non-recurring counterpart — same pricing, no `plan` attached (Transfer available), no auto-renewal; persists `Subscription.provider = "paystack_onetime"` so `disableSubscription()` and the UI can tell it apart from a genuinely-recurring subscription with an empty `subCode` (a transient "not yet synced" state, vs. a one-time payment's permanently-empty `subCode`) |
| `planLockService.ts` | Plan/batch locking (prevents concurrent edits), role-field-prefix helper |
| `planService.ts` | Survey plan CRUD, filtering (including `dateOnSurveyPlan` range and pillar-number substring match via raw SQL, `findPlanIdsByPillarNumber`), sharing; `getAdminSurfPlansStats`'s `total`/status counts exclude `PROVISIONAL_TYPES` (imported from `analyticsService.ts`), matching every other "Total Plans" figure in the app. **Shared Access** (`out/Surfboard Shared Access.pdf` — subscription determines capability, access determines visibility): `createSurfPlan`/`updateSurfPlan`/`sharePlanWithUser`/`unsharePlanWithUser`/`generatePlanQRCode` all call `requireActiveSubscription` (`subscriptionService.ts`) first — read paths (`getSurfPlanById`, `getAllSurfPlans`, `getSharedWithMeSurfPlans`) are deliberately NOT gated. Sharing is immediate access, no accept step: `sharePlanWithUser` no longer resets `SurfboardPlanShareResponse.respondedAt`/`response` on a re-share, so that table is now a pure audit trail, not a gate — `getSharedAwaitingResponseCount`/`respondToPlanShare`'s "awaiting" semantics were removed accordingly (the response endpoint itself still exists as an optional courtesy acknowledgment). `invitePlanShareByEmail` shares with an email that may not have an account yet: an existing account behaves exactly like `sharePlanWithUser`; a new one gets a `SurfboardPlanShareInvite` row (token/hash/7-day-expiry, mirrors `lib/auth/adminInvitations.ts`'s shape) + an emailed signup link. `acceptPendingPlanShareInvites(userId, email)` resolves any pending invites the moment a matching `SurfboardUser` is created — wired into the Kinde auth-success callback (`app/api/auth/success/surfboard/route.ts`), never throws (a resolution failure must not block login). `getSurfPlanById` now also returns `sharedToUsers` — `sharedTo`'s raw id array resolved into full user objects, since the plan itself only stores ids (needed for SharePlanModal's "Shared with" list and the Comments section's visibility check, both of which read this on the initial plan fetch, not just after an in-session share action) |
| `profileService.ts` | Surveyor profile CRUD |
| `qrAdminService.ts` | QR-earnings admin configuration |
| `qrEarningsService.ts` | QR-code referral earnings calculation; bank-account verification for payouts (`toggleBankVerification`, audited with the acting admin); `getSurveyorEarningsThisMonth` is a server-side aggregate for the current calendar month (not a client-side sum over the capped `getSurveyorEarningsOverview` transaction list); `requestWithdrawal` calls `requireActiveSubscription` first (Shared Access capability gate — see `planService.ts`); `initiateQRServicePayment` is deliberately NOT gated, since it's paid by an anonymous member of the public scanning the plan's QR code, not the surveyor |
| `receiptPdfService.ts` | Spawns the receipt PDF worker and returns a buffer |
| `remitaVerificationService.ts` | Remita payment verification. `getUserBatches` (surveyor-facing "My Batches") now also selects `lasgReceiptUrl`/`remitaReceiptUrl` and each plan's `facilitator` — previously only the admin/MDA-facing batch query selected the real LASG receipt link, so the surveyor's own "Receipt" button could only ever point at the self-generated PDF summary |
| `settingsService.ts` | Platform settings CRUD; surveyor KYC validation (`toggleUserKycValidation`, audited with the acting admin) |
| `subscriptionAnalyticsService.ts` | Subscription-related analytics |
| `subscriptionReminderService.ts` | Daily cron job: emails + WhatsApp-nudges users whose subscription expires within 3 days (dedup'd per expiry date via `expiryReminderSentAt`) |
| `subscriptionService.ts` | Subscription plan CRUD/lifecycle. `getUserActiveSubscription`/`getUserAndActiveSub` apply a 24h-grace-period-aware "is this subscription usable right now" rule (active/past_due count, canceled-but-not-past-`currentEnd` still counts) via the exported `isSubActiveOrGrace(status, expiresAt)` — reused by `analyticsService.ts`'s bulk `sharedAccessStats` classification so it matches the single-row check exactly. `requireActiveSubscription(userId)` wraps `getUserActiveSubscription`, throwing `SubscriptionRequiredError` (`lib/api/errors.ts`) when it returns null — the server-side capability guard `planService.ts`/`qrEarningsService.ts`'s write actions call; page-level access is a separate, narrower gate in `proxy.ts`'s `alwaysAllowedEvenUnsubscribed` list |
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
| `surfboardUserPanelLayout.tsx` | Surveyor dashboard shell layout (navbar + sidebar composition). Sidebar passes `railBackground={SURFBOARD_GRADIENTS.hero}`. Mounts `AnnouncementModal` once, which fetches the current active modal-announcement notification on app-shell mount |

## `surfboard/pdf-worker/` — standalone Node PDF renderer

| File | Description |
|---|---|
| `receipt.render.cjs` | Renders the batch payment receipt PDF (spawned as a child process) |

## Top level

| File | Description |
|---|---|
| `surfboard/apiClient.ts` | Typed client wrapper around `/api/v1/surfboard/*` routes |
| `surfboard/colors.ts` | Surfboard brand color palette (blue/teal). `SURFBOARD_GRADIENTS.hero` is the navy→electric-blue gradient matching the public landing page (`surfboard-landing.module.css`) exactly, reused on the login page and the surveyor dashboard header so all three surfaces read as one identity |
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
| `utils/surfboardUtils.ts` | General Surfboard helper functions. `parseCSVContent` parses an uploaded pillar CSV via `normalizeCsvHeader` (strips BOM, whitespace, punctuation, lowercases) and `findCsvColumnIndex`/`resolvePillarColumnIndices` (substring-matches against ordered header-variation lists, e.g. "Pillar No.", "Easting(X)", "Northings (Y)") so header formatting differences don't break column detection; also used directly by `MaplibreMultiPlans.tsx`'s CSV-upload handler |
| `utils/validation.ts` | Form/input validation helpers |
| `hooks/useBatchLock.ts` | Lock/unlock state for a Certificate-of-Deposit batch |
| `hooks/usePlanLock.ts` | Lock/unlock state for a single plan |
