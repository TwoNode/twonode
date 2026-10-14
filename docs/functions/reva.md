# REVA — Functions (services, utils, access, hooks, layouts)

Non-component logic files specific to the REVA platform, under `reva/`.

## `reva/services/` — business logic (DB access, orchestration)

| File                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adminUserService.ts`       | Admin user management — promote/demote/deactivate/delete (each audited with the acting superadmin) and the "admin joined" team notification. Guards: the seeded dev account is untouchable; a superadmin can't demote, deactivate or delete their own account (403 `SELF_ACTION_FORBIDDEN`); and the last active superadmin can't be removed (409). New admins are not created here: they are invited via `lib/auth/adminInvitations.ts`                                                                                                                                                                                                                                                                                                       |
| `settingsService.ts`        | REVA's first settings service — a `RevaSettings` singleton (JSON) holding only `emailVerification` `{enabled, method, gracePeriodDays, enforcedSince}` for now (defaults `enabled: false`, `OTP`, 30 days). `updateSettings` stamps `enforcedSince` server-side on a genuine `false → true` transition. Read by `lib/auth/emailVerificationSettings.ts`; **no route or admin UI yet**                                                                                                                                                                                                                                                                                                                                                          |
| `downloadOtpService.ts`     | Email-OTP gate for secure report/document downloads (a separate feature from email-verification OTP): 6-digit code, sha256-hashed, 10-minute expiry, max 5 attempts, resolves the `"report"` / `"document:N"` target on either a `Property` or a `OneTimeUserProperty` row, then returns a presigned S3 URL (`sendDownloadOtpEmail` delivers the code). Used by `SecureDownloadDialog`                                                                                                                                                                                                                                                                                                                                                         |
| `notificationService.ts`    | Notification CRUD + read/dismiss state (user + admin)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pricingService.ts`         | The request price, looked up server-side: `getRevaPriceForLocation(lat,lng)` reads the LGA and `Price` from the public ArcGIS LGA layer; `resolveRevaPrice(location, postedTotalCost)` returns it and refuses (409 `PRICE_MISMATCH`) a different price posted by the browser. Fails closed (503) if the layer is unreachable. `assertAddressMatchesPrice(address, pinPrice)` (called from `resolveRevaPrice`, which now takes `address` as its third argument) geocodes the posted address with Google (`GOOGLE_MAPS_SERVER_API_KEY`; skipped with a warning if unset) and refuses a mismatch with the pin's price (422 `ADDRESS_LOCATION_MISMATCH`, 400 not found, 503 geocoder down). Used by both initiate functions in `paymentService.ts` |
| `paymentService.ts`         | Payment initiation/verification logic (verify paths require `data.status === "success"`, the same reference and an amount covering `totalCost`); `adminVerifyTransaction` writes a `RevaAuditLog` entry (`ADMIN_VERIFY_PAYMENT`) when passed the acting admin's `actorId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `profileService.ts`         | User profile CRUD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `propertyRequestService.ts` | Due-diligence request CRUD/lifecycle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `reportService.ts`          | Report generation/lookup, including admin request lookups; `approveDueDiligenceReport`/`approveOneTimeDueDiligenceReport` write a `RevaAuditLog` entry (`APPROVE_REPORT`/`DISAPPROVE_REPORT`) when passed the acting admin's `actorId` — previously REVA admin's Audit Logs page was effectively always empty (almost nothing in the app called `writeAudit`)                                                                                                                                                                                                                                                                                                                                                                                  |

## `reva/utils/`

| File            | Description                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `revaAuth.ts`   | REVA-specific auth helpers (session/role checks)                                                                  |
| `secureHtml.ts` | HTML sanitization helper                                                                                          |
| `welcome.ts`    | Pure helpers for the dashboard Welcome panel: `timeGreeting(hour)`, `getInitials(first, last)`, `roleLabel(role)` |

## `reva/access/`

| File        | Description                                       |
| ----------- | ------------------------------------------------- |
| `routes.ts` | Role → allowed-route map for the REVA admin panel |

## `reva/hooks/`

| File                    | Description                  |
| ----------------------- | ---------------------------- |
| `useRevaAdminAccess.ts` | Admin access/role check hook |
| `useRevaUserAccess.ts`  | User access/role check hook  |

## `reva/layouts/`

| File                       | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `revaAdminPanelLayout.tsx` | Admin dashboard shell layout (sidebar + navbar composition) |
| `revaUserPanelLayout.tsx`  | User dashboard shell layout                                 |

## Top level

| File                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `reva/apiClient.ts` | Typed client wrapper around `/api/v1/reva/*` routes. `revaApi.files.linkFor` / `getDownloadUrl` turn a REVA file URL into a gateway link (other links are returned unchanged) |
| `reva/utils/fileAccess.ts` | `isRevaStorageKey`, `isRevaFileRef`, `ownSitePhotoMatches` for the REVA file gateway `GET /api/v1/reva/files/view` (short-lived signed link, `format=json`, `download=1&name=`). Admins open any REVA file; a requester opens only the site photos of their own requests; documents and reports stay behind the emailed one-time code |
| `reva/utils/uploadKey.ts` | `revaUploadKey` / `safeUploadFileName`: new REVA uploads are stored as `private/reva/<reference>/<unique>-<name>` (report uploads keep their name; `unassigned` before a request has a reference). Opened through the REVA file gateway or the one-time download code; older files stay under `reva/uploads/` |
| `reva/colors.ts`    | REVA brand color palette                            |

## Admin request screens (`app/(projects)/(reva)/reva-restricted/`)

| File | Description |
| ---- | ----------- |
| `components/requestUi.tsx` | Presentation helpers shared by the request list and detail pages: `StatusPill`, `Fact`, `toneForStatus`, `toneForPayment`, `documentLabel` (presentation only; the tones match the old badges) |
| `components/RequestsList.tsx` | The request cards (address as title, requester / fee / due, document chips, report state, View details). Same props as before; every link goes through the file gateway |
| `components/requestView.tsx` | `useRequestView` (grid or list, remembered in this browser's localStorage, grid by default) and `RequestViewToggle` for the two request list pages; `RequestsList` takes `view="grid" \| "list"` |
| `components/requestStats.ts` | Pure counting for the all-requests page: `reportStateOf` (none / review / approved), `applyRequestTab`, `summarizeRequests` (totals, unpaid, fees from paid requests) |
| `components/RequestStatCards.tsx` | The summary cards above the tabs (six on all requests, five on the review page, which only lists requests with a report); the ones tied to a tab switch to it when clicked |
| `components/RequestTabs.tsx` | The coloured tab row (one accent per tab, filled when selected); `RequestStatCards` colours and icons come from the card id, and it also serves the payment verification page (`pay-*` ids) |
| `components/AdminHomeOverview.tsx` | The admin home (`/reva-restricted/dashboard`): welcome, the six summary cards, three "needs your attention" links (no report, awaiting approval, unpaid) and the six latest requests. Pure presentation; the page fetches with `getAllRequestsWithUserByAdmin` and `getAdminRequestSummaryRows` (counts every request from payment, fee and report only) |
| `components/AdminMiniHeader.tsx` | Section heading (title with a hairline; a trailing `<small>` count is shown quieter) |
| `components/RequestPageHeader.tsx` | Top of a request detail page: back link, kind, reference, page actions (PDF downloads) |
| `app/(projects)/(reva)/reva-restricted/dashboard/spatial-record/page.tsx` | Shows the shared Coming Soon card. The React map is kept parked, unimported, in `SpatialRecordMap.tsx` and `SpatialRecordMapLoader.tsx` in the same folder (also commit `eeb47659`); it was unwired because importing `@arcgis/core` made the Vercel production build hang past 10 minutes |
