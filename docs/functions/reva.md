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
| `reva/apiClient.ts` | Typed client wrapper around `/api/v1/reva/*` routes |
| `reva/colors.ts`    | REVA brand color palette                            |
