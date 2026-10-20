# Twonodes — Full Route Inventory

**Purpose:** one place that lists every route in the app — pages and API routes, across all three products plus the shared corporate site, which is served at the root.

**Last updated:** 2026-10-19.

**How this file is maintained:** the two tables below (API routes and pages) are **generated from the filesystem** by [`scripts/docs/generate-route-inventory.mjs`](../../scripts/docs/generate-route-inventory.mjs). Do not edit between the `BEGIN GENERATED` / `END GENERATED` markers by hand — run

```bash
npm run docs:routes            # rewrite the generated blocks
npm run docs:routes -- --check # exit 1 if the file is stale (usable in CI)
```

Everything outside the markers (this preamble, the notes sections, the maintenance note) is hand-written. Until 2026-10-04 this whole file was hand-maintained, last refreshed mid-rebuild on 2026-08-27; by then ~170 routes had been added (GBC admin, REVA admin/OTP downloads, Surfboard notifications/comments/viewer attachments/subscription, the whole email-verification/registration family) and none were listed. Generating the table is the fix for that class of drift.

## Reading the Auth column

- `USER`, `ADMIN`, … — the `roles: [...]` passed to `withAuth(...)` (`lib/api/withAuth.ts`). When a route exports several methods with different guards they're shown per method (`GET: …; POST: …`).
- `any signed-in` — `withAuth` with no `roles` list: any valid session on that platform.
- `(unverified OK)` — the route opts out of the email-verification gate (`allowUnverified: true`); see [`docs/auth/technical.md` §1.8](../auth/technical.md).
- `public` — no session check in the route file. These are the login/registration/verification endpoints, public marketing/content reads, and webhooks.
- `public (CSRF-checked)` — public, but the route validates Origin/Host (`lib/auth/csrf.ts`).
- `Paystack signature` / `cron secret` — authenticated by the caller's secret rather than a user session.
- `session (see source)` — the route resolves a session itself instead of using `withAuth`; read the file.

The auth column is a static reading of source, not an access-control test. The authoritative guard is always the route file (and, for pages, `proxy.ts` plus each product's `access/routes.ts` registry).

---

## API routes

<!-- BEGIN GENERATED: api-routes -->

#### Auth (shared) (23)

| Route                                        | Method(s) | Auth                                 |
| :------------------------------------------- | :-------- | :----------------------------------- |
| `/api/v1/auth/accept-invite`                 | POST      | public (CSRF-checked)                |
| `/api/v1/auth/change-password`               | POST      | session (see source)                 |
| `/api/v1/auth/invitations`                   | GET       | public — single-use invitation token |
| `/api/v1/auth/login`                         | POST      | public (CSRF-checked)                |
| `/api/v1/auth/logout`                        | POST      | session (see source)                 |
| `/api/v1/auth/me`                            | GET       | session (see source)                 |
| `/api/v1/auth/mobile/devices`                | GET       | any signed-in (unverified OK)        |
| `/api/v1/auth/mobile/devices/[familyId]`     | DELETE    | any signed-in (unverified OK)        |
| `/api/v1/auth/mobile/login`                  | POST      | public                               |
| `/api/v1/auth/mobile/logout`                 | POST      | public                               |
| `/api/v1/auth/mobile/refresh`                | POST      | public                               |
| `/api/v1/auth/mobile/request-password-reset` | POST      | public                               |
| `/api/v1/auth/mobile/resend-verification`    | POST      | USER (unverified OK)                 |
| `/api/v1/auth/mobile/verify-email`           | POST      | USER (unverified OK)                 |
| `/api/v1/auth/refresh`                       | POST      | public (CSRF-checked)                |
| `/api/v1/auth/register`                      | POST      | public (CSRF-checked)                |
| `/api/v1/auth/register/resend-otp`           | POST      | public (CSRF-checked)                |
| `/api/v1/auth/register/send-otp`             | POST      | public (CSRF-checked)                |
| `/api/v1/auth/request-password-reset`        | POST      | public (CSRF-checked)                |
| `/api/v1/auth/resend-verification`           | POST      | public (CSRF-checked)                |
| `/api/v1/auth/reset-password`                | POST      | public (CSRF-checked)                |
| `/api/v1/auth/verify-email`                  | POST      | session (see source)                 |
| `/api/v1/auth/verify-email-otp`              | POST      | session (see source)                 |

#### Surfboard (140)

| Route                                                                | Method(s)          | Auth                                                                                                        |
| :------------------------------------------------------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------- |
| `/api/v1/surfboard/admin/audit-logs`                                 | GET                | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/audit-logs/filters`                         | GET                | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/invitations`                                | GET, POST          | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/invitations/[id]`                           | DELETE             | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/invitations/[id]/resend`                    | POST               | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/kyc`                                        | GET, POST          | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/plans`                                      | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/plans/map`                                  | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/plans/stats`                                | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/qr/settings`                                | PATCH              | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/qr/stats`                                   | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/qr/withdrawals`                             | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/qr/withdrawals/[id]`                        | PATCH              | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/users`                                      | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/users/[id]/kyc`                             | PATCH              | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/users/[id]/promote`                         | POST               | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/users/[id]/role`                            | PATCH              | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/users/[id]/status`                          | PATCH              | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/admin/users/[id]/subscription`                    | PATCH, DELETE      | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/admin/users/stats`                                | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/ai/extract-survey-plan`                           | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/ai/recognize-person-count`                        | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/analytics`                                        | GET                | USER, ADMIN, SUPERADMIN                                                                                     |
| `/api/v1/surfboard/cod/batches`                                      | GET, POST          | GET: USER, ADMIN, SUPERADMIN; POST: USER                                                                    |
| `/api/v1/surfboard/cod/batches/[batchId]`                            | GET                | USER                                                                                                        |
| `/api/v1/surfboard/cod/batches/[batchId]/lasg-receipt`               | POST               | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/retry`              | POST               | USER                                                                                                        |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify`             | POST               | USER                                                                                                        |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify-lasg`        | POST               | USER, SUPERADMIN                                                                                            |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify-links`       | POST               | USER, SUPERADMIN                                                                                            |
| `/api/v1/surfboard/cod/batches/[batchId]/receipt-pdf`                | GET                | USER, ADMIN, SUPERADMIN, ACCOUNTS                                                                           |
| `/api/v1/surfboard/cod/batches/[batchId]/summary`                    | GET                | USER                                                                                                        |
| `/api/v1/surfboard/cod/batches/reset`                                | POST               | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/cod/batches/stats`                                | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/cod/batches/summary`                              | GET                | USER                                                                                                        |
| `/api/v1/surfboard/cod/fee-preview`                                  | POST               | USER                                                                                                        |
| `/api/v1/surfboard/cod/locks/[planId]`                               | GET, POST, DELETE  | any signed-in                                                                                               |
| `/api/v1/surfboard/cod/locks/batch/next`                             | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/cod/locks/batch/release`                          | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/cod/locks/next`                                   | POST               | MDA_ROLES, SUPERADMIN                                                                                       |
| `/api/v1/surfboard/cod/locks/release-all`                            | POST               | MDA_ROLES, SUPERADMIN                                                                                       |
| `/api/v1/surfboard/cod/payer-profile`                                | GET                | USER                                                                                                        |
| `/api/v1/surfboard/cod/zone`                                         | POST               | USER                                                                                                        |
| `/api/v1/surfboard/files/delete`                                     | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/files/upload`                                     | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/files/upload-multi`                               | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/files/upload-with-auth`                           | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/files/view`                                       | GET                | USER, ACCOUNTS, CHARTING, SURCON, RECORDS_I, INTAKE, RECORDS_II, ARCHIVE, ADMIN, SUPERADMIN, MDA_SUPERADMIN |
| `/api/v1/surfboard/mda/[role]/plans`                                 | GET                | CHARTING, SURCON, RECORDS_I, RECORDS_II, SUPERADMIN, MDA_SUPERADMIN                                         |
| `/api/v1/surfboard/mda/[role]/plans/[planId]/decision`               | POST               | CHARTING, SURCON, RECORDS_I, INTAKE, SUPERADMIN                                                             |
| `/api/v1/surfboard/mda/accounts/batches`                             | GET                | ACCOUNTS, SUPERADMIN, MDA_SUPERADMIN                                                                        |
| `/api/v1/surfboard/mda/accounts/batches/[batchId]/decision`          | POST               | ACCOUNTS, SUPERADMIN                                                                                        |
| `/api/v1/surfboard/mda/archive/batches`                              | GET                | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN                                                                         |
| `/api/v1/surfboard/mda/archive/plans/[planId]`                       | POST               | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN                                                                         |
| `/api/v1/surfboard/mda/intake/batches`                               | GET                | INTAKE, SUPERADMIN, MDA_SUPERADMIN                                                                          |
| `/api/v1/surfboard/mda/intake/batches/[batchId]/decision`            | POST               | INTAKE, SUPERADMIN                                                                                          |
| `/api/v1/surfboard/mda/pending-counts`                               | GET                | ADMIN, SUPERADMIN, ACCOUNTS, CHARTING, SURCON, RECORDS_I, INTAKE, RECORDS_II, ARCHIVE, MDA_SUPERADMIN       |
| `/api/v1/surfboard/mda/records-ii/batches`                           | GET                | RECORDS_II, SUPERADMIN, MDA_SUPERADMIN                                                                      |
| `/api/v1/surfboard/mda/records-ii/plans/[planId]/decision`           | POST               | RECORDS_II, SUPERADMIN                                                                                      |
| `/api/v1/surfboard/mda/remarks/charting`                             | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/mda/remarks/query-reasons`                        | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/mda/stage-stats`                                  | GET                | STAGE_ROLES, MDA_SUPERADMIN, SUPERADMIN                                                                     |
| `/api/v1/surfboard/notifications`                                    | GET, POST          | GET: any signed-in; POST: ADMIN, SUPERADMIN                                                                 |
| `/api/v1/surfboard/notifications/[id]`                               | PATCH, DELETE      | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/notifications/[id]/dismiss`                       | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/notifications/[id]/read`                          | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/notifications/active-announcement`                | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/notifications/stats`                              | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/notifications/unread-count`                       | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/plans`                                            | GET, POST          | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]`                                   | GET, PATCH, DELETE | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/attachments`                       | DELETE             | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/comments`                          | GET, POST          | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/comments/[commentId]`              | DELETE             | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/permanent`                         | DELETE             | USER, ADMIN, SUPERADMIN                                                                                     |
| `/api/v1/surfboard/plans/[planId]/person-count`                      | PATCH              | any signed-in                                                                                               |
| `/api/v1/surfboard/plans/[planId]/public`                            | GET                | public — QR-gated (`?token=`)                                                                               |
| `/api/v1/surfboard/plans/[planId]/public/certificate`                | GET                | public — QR-gated (`?token=`)                                                                               |
| `/api/v1/surfboard/plans/[planId]/public/full`                       | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/plans/[planId]/qr`                                | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/query`                             | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/plans/[planId]/record-copy`                       | PATCH              | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/record-copy/download`              | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/plans/[planId]/record-copy/verification`          | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/plans/[planId]/red-copy`                          | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/restore`                           | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/resubmit`                          | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/share`                             | POST, DELETE       | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/share-response`                    | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/share/invite`                      | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/status`                            | PATCH              | USER, ADMIN, SUPERADMIN                                                                                     |
| `/api/v1/surfboard/plans/[planId]/summary`                           | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/surveyor`                          | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/title`                             | PATCH              | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/plans/[planId]/viewer-attachments`                | GET, POST          | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/viewer-attachments/[attachmentId]` | DELETE             | USER                                                                                                        |
| `/api/v1/surfboard/plans/[planId]/viewer-attachments/presign`        | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/check-number`                               | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/counts`                                     | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/deleted`                                    | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/facilitators`                               | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/geo/boundaries`                             | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/physical-copy`                              | POST               | USER                                                                                                        |
| `/api/v1/surfboard/plans/queried`                                    | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/reference-numbers`                          | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/shared`                                     | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/shared-with-me`                             | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/stats`                                      | GET                | USER                                                                                                        |
| `/api/v1/surfboard/plans/summary`                                    | GET                | USER                                                                                                        |
| `/api/v1/surfboard/profile`                                          | GET, PATCH         | any signed-in                                                                                               |
| `/api/v1/surfboard/profile/summary`                                  | GET                | USER                                                                                                        |
| `/api/v1/surfboard/qr/access-state`                                  | GET                | public — anonymous QR-service payer                                                                         |
| `/api/v1/surfboard/qr/bank-details`                                  | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/qr/earnings-overview`                             | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/qr/earnings-this-month`                           | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/qr/payments`                                      | POST               | public — anonymous QR-service payer                                                                         |
| `/api/v1/surfboard/qr/payments/verify`                               | POST               | public — anonymous QR-service payer                                                                         |
| `/api/v1/surfboard/qr/settings`                                      | GET                | SUPERADMIN                                                                                                  |
| `/api/v1/surfboard/qr/wallet-summary`                                | GET                | USER                                                                                                        |
| `/api/v1/surfboard/qr/withdrawals`                                   | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/session`                                          | GET                | own session cookie (404 if none)                                                                            |
| `/api/v1/surfboard/settings`                                         | GET, PATCH         | GET: any signed-in; PATCH: ADMIN, SUPERADMIN                                                                |
| `/api/v1/surfboard/settings/account-update-inquiry`                  | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/settings/cod-submission`                          | GET                | public (read-only config)                                                                                   |
| `/api/v1/surfboard/settings/coordinate-shifts`                       | GET                | public (read-only config)                                                                                   |
| `/api/v1/surfboard/settings/history`                                 | GET                | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/settings/reset`                                   | POST               | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/settings/revert/[id]`                             | POST               | ADMIN, SUPERADMIN                                                                                           |
| `/api/v1/surfboard/subscription`                                     | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription-analytics`                           | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/clear`                               | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/disable`                             | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/initiate`                            | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/initiate-onetime`                    | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/summary`                             | GET                | USER                                                                                                        |
| `/api/v1/surfboard/subscription/user-and-active`                     | GET                | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/verify`                              | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/subscription/verify-onetime`                      | POST               | any signed-in                                                                                               |
| `/api/v1/surfboard/users/lookup`                                     | GET                | USER                                                                                                        |
| `/api/v1/surfboard/users/search`                                     | GET                | USER                                                                                                        |

#### REVA (35)

| Route                                                       | Method(s)  | Auth                                                  |
| :---------------------------------------------------------- | :--------- | :---------------------------------------------------- |
| `/api/v1/reva/admin/audit-logs`                             | GET        | SUPERADMIN                                            |
| `/api/v1/reva/admin/audit-logs/filters`                     | GET        | SUPERADMIN                                            |
| `/api/v1/reva/admin/invitations`                            | GET, POST  | SUPERADMIN                                            |
| `/api/v1/reva/admin/invitations/[id]`                       | DELETE     | SUPERADMIN                                            |
| `/api/v1/reva/admin/invitations/[id]/resend`                | POST       | SUPERADMIN                                            |
| `/api/v1/reva/admin/requests`                               | GET        | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/admin/requests/[reference]`                   | GET        | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/admin/requests/[reference]/approve`           | POST       | SUPERADMIN                                            |
| `/api/v1/reva/admin/requests/[reference]/report`            | POST       | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/admin/requests/[reference]/verify-payment`    | POST       | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/admin/users`                                  | GET        | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/admin/users/[id]`                             | DELETE     | SUPERADMIN                                            |
| `/api/v1/reva/admin/users/[id]/role`                        | PATCH      | SUPERADMIN                                            |
| `/api/v1/reva/admin/users/[id]/status`                      | PATCH      | SUPERADMIN                                            |
| `/api/v1/reva/files/view`                                   | GET        | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/notifications`                                | GET, POST  | GET: USER, ADMIN, SUPERADMIN; POST: ADMIN, SUPERADMIN |
| `/api/v1/reva/notifications/[id]/dismiss`                   | POST       | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/notifications/[id]/read`                      | POST       | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/notifications/unread-count`                   | GET        | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/one-time-properties`                          | POST       | public — guest one-time-request flow                  |
| `/api/v1/reva/one-time-properties/[id]`                     | GET        | public — guest one-time-request flow                  |
| `/api/v1/reva/one-time-properties/download-otp/request`     | POST       | public (CSRF-checked)                                 |
| `/api/v1/reva/one-time-properties/download-otp/verify`      | POST       | public (CSRF-checked)                                 |
| `/api/v1/reva/one-time-properties/lookup`                   | GET        | public — guest one-time-request flow                  |
| `/api/v1/reva/one-time-properties/status`                   | PATCH      | public — guest one-time-request flow                  |
| `/api/v1/reva/one-time-properties/transactions/[reference]` | GET        | public — guest one-time-request flow                  |
| `/api/v1/reva/payments/one-time/verify`                     | POST       | public — guest one-time-request flow                  |
| `/api/v1/reva/payments/verify`                              | POST       | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/profile`                                      | GET, PATCH | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/properties`                                   | GET, POST  | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/properties/[reference]/download-otp/request`  | POST       | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/properties/[reference]/download-otp/verify`   | POST       | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/properties/[reference]/status`                | PATCH      | ADMIN, SUPERADMIN                                     |
| `/api/v1/reva/properties/transactions/[reference]`          | GET        | USER, ADMIN, SUPERADMIN                               |
| `/api/v1/reva/session`                                      | GET        | own session cookie (404 if none)                      |

#### GBC (77)

| Route                                                | Method(s)     | Auth                                 |
| :--------------------------------------------------- | :------------ | :----------------------------------- |
| `/api/v1/gbc/admin/audit-logs`                       | GET           | SUPERADMIN                           |
| `/api/v1/gbc/admin/audit-logs/filters`               | GET           | SUPERADMIN                           |
| `/api/v1/gbc/admin/certificates/recipients`          | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/certificates/send`                | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/editions`                         | POST          | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]`                   | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/activate`          | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/archive`           | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/delete`            | DELETE        | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/permanent`         | DELETE        | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/restore`           | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/editions/[key]/stats`             | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/editions/recycle-bin`             | GET           | SUPERADMIN                           |
| `/api/v1/gbc/admin/gallery`                          | GET, POST     | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/gallery/[id]`                     | PATCH, DELETE | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/inquiries`                        | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/inquiries/[id]`                   | DELETE        | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/inquiries/[id]/reply`             | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/inquiries/[id]/status`            | PATCH         | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/invitations`                      | GET, POST     | SUPERADMIN                           |
| `/api/v1/gbc/admin/invitations/[id]`                 | DELETE        | SUPERADMIN                           |
| `/api/v1/gbc/admin/invitations/[id]/resend`          | POST          | SUPERADMIN                           |
| `/api/v1/gbc/admin/partners`                         | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/partners/[id]`                    | DELETE        | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/qr/verify`                        | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/settings`                         | PATCH         | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/settings/previous`                | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/settings/reset`                   | POST          | SUPERADMIN                           |
| `/api/v1/gbc/admin/settings/rollback`                | POST          | SUPERADMIN                           |
| `/api/v1/gbc/admin/speakers`                         | GET, POST     | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/speakers/[id]`                    | PATCH, DELETE | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/sponsor-tiers`                    | GET, POST     | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/sponsor-tiers/[key]`              | PATCH, DELETE | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/sponsor-tiers/order`              | PUT           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/sponsors`                         | GET, POST     | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/sponsors/[id]`                    | PATCH, DELETE | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets`                          | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets/[id]`                     | GET, DELETE   | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets/[id]/qr-code`             | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets/check-in`                 | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets/export`                   | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/tickets/stats`                    | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/uploads`                          | DELETE        | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/uploads/[kind]`                   | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/uploads/limits`                   | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/users`                            | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/admin/users/[id]`                       | DELETE        | SUPERADMIN                           |
| `/api/v1/gbc/admin/users/[id]/role`                  | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/users/[id]/status`                | PATCH         | SUPERADMIN                           |
| `/api/v1/gbc/admin/users/stats`                      | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/certificates/download`                  | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/certificates/request-code`              | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/certificates/verify-code`               | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/contact`                                | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/editions`                               | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/editions/[key]/recap`                   | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/editions/current`                       | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/gallery`                                | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/notifications`                          | GET, POST     | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/notifications/[id]`                     | DELETE        | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/notifications/[id]/dismiss`             | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/notifications/[id]/read`                | POST          | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/notifications/unread-count`             | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/partners`                               | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/payments/verify`                        | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/session`                                | GET           | own session cookie (404 if none)     |
| `/api/v1/gbc/settings`                               | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/speakers`                               | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/sponsors`                               | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets`                                | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/[ticketNumber]`                 | GET           | ADMIN, SUPERADMIN                    |
| `/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf` | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/[ticketNumber]/receipt-pdf`     | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/availability`                   | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/group`                          | POST          | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/lookup`                         | GET           | public — ticket buyer / site visitor |
| `/api/v1/gbc/tickets/pair`                           | POST          | public — ticket buyer / site visitor |

#### Webhooks (3)

| Route                         | Method(s) | Auth                                    |
| :---------------------------- | :-------- | :-------------------------------------- |
| `/api/reva/webhooks/paystack` | GET, POST | Paystack signature                      |
| `/api/webhooks/paystack`      | POST      | Paystack signature                      |
| `/api/webhooks/redcopy`       | POST      | external Red Copy callback (see source) |

#### Cron (1)

| Route                                     | Method(s) | Auth        |
| :---------------------------------------- | :-------- | :---------- |
| `/api/cron/subscription-expiry-reminders` | GET       | cron secret |

#### Kinde callbacks (legacy) (11)

| Route                               | Method(s) | Auth                                                                       |
| :---------------------------------- | :-------- | :------------------------------------------------------------------------- |
| `/api/auth/[kindeAuth]`             | GET       | public (Kinde/redirect helper)                                             |
| `/api/auth/homepage`                | GET       | public (Kinde/redirect helper)                                             |
| `/api/auth/login_redirect`          | GET       | GET: own session cookie (404 if none); GET: public (Kinde/redirect helper) |
| `/api/auth/logout_redirect`         | GET       | own session cookie (404 if none)                                           |
| `/api/auth/success/gbc-restricted`  | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/reva`            | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/reva-restricted` | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/scram`           | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/surf-mda`        | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/surf-restricted` | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |
| `/api/auth/success/surfboard`       | GET       | Kinde OAuth callback (state/cookie from Kinde)                             |

<!-- END GENERATED: api-routes -->

### Notes on specific API routes

- **Kinde callbacks** (`/api/auth/success/*`): still live, and each dual-writes a native session alongside the legacy Kinde cookie (see [`docs/auth/technical.md`](../auth/technical.md) §2, §9). `surf-restricted` and `surf-mda` are **deliberately unrenamed** — they are Kinde-registered redirect URIs (external dashboard config); only their internal destination paths moved to `/surfboard-restricted/*` and `/surfboard-mda/*`. Every one of these callbacks now also stamps `emailVerifiedVia = "OAUTH"` on first successful sign-in (an OAuth sign-in proves the address).
- **`/api/v1/auth/mobile/*`** (2026-10-19) is the Surfboard mobile app's session surface: `login`, `refresh`, `logout`, `devices` and `devices/{familyId}`. The session comes back in the body, no cookies are set, and the routes are authenticated by credentials or tokens in the request, not by ambient cookies (so they are not CSRF-checked); `devices` accepts a bearer token. Only role `USER`. See [ADR-0017](../adr/0017-the-mobile-app-signs-in-with-bearer-tokens.md) and [`docs/auth/technical.md` §1.5a](../auth/technical.md).
- **SCRAM** has no pages, only its Kinde callback (`/api/auth/success/scram`) — a platform stub.
- **`/api/webhooks/paystack`** is the single Paystack webhook for all three products; it picks the product from `metadata.platform` (falling back to event shape) and dedupes deliveries on the unique `WebhookEvent.signature`. See [`docs/payment/`](../payment/README.md), including the "known gaps" section on that ledger.
- **`/api/reva/webhooks/paystack`** is the older REVA-only webhook endpoint, kept for Paystack dashboards still pointed at it.
- **`/api/webhooks/redcopy`** is the external Red Copy API's callback target.
- **`/api/cron/subscription-expiry-reminders`** is triggered by `vercel.json`'s cron (`0 8 * * *`, daily 08:00 UTC) and sends expiry reminders (email + WhatsApp) for subscriptions about to lapse.
- **Removed since 2026-08-27:** `/api/reva/users` (legacy), `/api/v1/reva/one-time-properties/lookup/report`, `/api/v1/surfboard/plans/shared-awaiting-response`.

---

## Pages

<!-- BEGIN GENERATED: pages -->

#### Marketing / shared (21)

`/` · `/about-us` · `/contact` · `/events` · `/featurednews` · `/gallery` · `/grid/calculate` · `/grid/generate` · `/grid/route` · `/grid/search` · `/grid/verify` · `/industries/[slug]` · `/insights` · `/insights/[slug]` · `/login` · `/our-story` · `/present` · `/previous-landing-page-contact` · `/redirect` · `/services` · `/signup`

#### Surfboard (56)

`/surfboard` · `/surfboard-mda/dashboard` · `/surfboard-mda/dashboard/accounts` · `/surfboard-mda/dashboard/archive` · `/surfboard-mda/dashboard/charting` · `/surfboard-mda/dashboard/intake` · `/surfboard-mda/dashboard/notifications` · `/surfboard-mda/dashboard/profile` · `/surfboard-mda/dashboard/records-i` · `/surfboard-mda/dashboard/records-ii` · `/surfboard-mda/dashboard/settings` · `/surfboard-mda/dashboard/surcon` · `/surfboard-mda/error-login` · `/surfboard-mda/login` · `/surfboard-restricted/dashboard` · `/surfboard-restricted/dashboard/admin-tools` · `/surfboard-restricted/dashboard/analytics` · `/surfboard-restricted/dashboard/audit-logs` · `/surfboard-restricted/dashboard/certificates` · `/surfboard-restricted/dashboard/cod` · `/surfboard-restricted/dashboard/cod/batches` · `/surfboard-restricted/dashboard/kyc` · `/surfboard-restricted/dashboard/map` · `/surfboard-restricted/dashboard/notifications` · `/surfboard-restricted/dashboard/qr-earnings` · `/surfboard-restricted/dashboard/qr-earnings/settings` · `/surfboard-restricted/dashboard/secure-plans` · `/surfboard-restricted/dashboard/settings` · `/surfboard-restricted/dashboard/superadmin` · `/surfboard-restricted/dashboard/surf-plans` · `/surfboard-restricted/dashboard/surf-plans/update/[id]` · `/surfboard-restricted/dashboard/user-management` · `/surfboard-restricted/error-login` · `/surfboard-restricted/login` · `/surfboard/accept-invite` · `/surfboard/badge` · `/surfboard/dashboard` · `/surfboard/dashboard/map` · `/surfboard/dashboard/newplan` · `/surfboard/dashboard/notifications` · `/surfboard/dashboard/payment/callback` · `/surfboard/dashboard/plan` · `/surfboard/dashboard/plan/edit` · `/surfboard/dashboard/plans` · `/surfboard/dashboard/qr-earnings` · `/surfboard/dashboard/queried-plans` · `/surfboard/dashboard/settings` · `/surfboard/dashboard/spcode-verification` · `/surfboard/dashboard/subscription` · `/surfboard/dashboard/subscription/callback` · `/surfboard/dashboard/viewmap` · `/surfboard/error-login` · `/surfboard/login` · `/surfboard/reset-password` · `/surfboard/verify-email` · `/surfboardplan/[id]`

#### REVA (34)

`/reva` · `/reva-restricted` · `/reva-restricted/dashboard` · `/reva-restricted/dashboard/alluserrequests` · `/reva-restricted/dashboard/audit-logs` · `/reva-restricted/dashboard/details` · `/reva-restricted/dashboard/notifications` · `/reva-restricted/dashboard/notifications/create` · `/reva-restricted/dashboard/notifications/manage` · `/reva-restricted/dashboard/payment-verification` · `/reva-restricted/dashboard/review` · `/reva-restricted/dashboard/settings` · `/reva-restricted/dashboard/spatial-record` · `/reva-restricted/dashboard/superadmin` · `/reva-restricted/login` · `/reva/accept-invite` · `/reva/contact` · `/reva/dashboard` · `/reva/dashboard/allrequests` · `/reva/dashboard/details` · `/reva/dashboard/newrequest` · `/reva/dashboard/notifications` · `/reva/dashboard/settings` · `/reva/dashboard/verifypayment` · `/reva/dashboard/viewmap` · `/reva/details` · `/reva/error-login` · `/reva/login` · `/reva/newsletter` · `/reva/onetimerequest` · `/reva/requestform` · `/reva/reset-password` · `/reva/verify-email` · `/reva/verifypayment`

#### GBC (35)

`/gbc` · `/gbc-frame` · `/gbc-restricted` · `/gbc-restricted/accept-invite` · `/gbc-restricted/attendees` · `/gbc-restricted/audit-logs` · `/gbc-restricted/certificates` · `/gbc-restricted/check-in` · `/gbc-restricted/editions` · `/gbc-restricted/gallery` · `/gbc-restricted/inquiries` · `/gbc-restricted/login` · `/gbc-restricted/notifications` · `/gbc-restricted/profile` · `/gbc-restricted/reset-password` · `/gbc-restricted/settings` · `/gbc-restricted/speakers` · `/gbc-restricted/sponsors` · `/gbc-restricted/tickets` · `/gbc-restricted/users` · `/gbc-restricted/verify-email` · `/gbc/about` · `/gbc/certificate/[ticketNumber]` · `/gbc/contact` · `/gbc/editions` · `/gbc/editions/[key]` · `/gbc/error-login` · `/gbc/gallery` · `/gbc/login` · `/gbc/speakers` · `/gbc/sponsors` · `/gbc/tickets` · `/gbc/tickets/success` · `/gbc/verify/[publicId]` · `/gbccertificate`

<!-- END GENERATED: pages -->

### Notes on specific pages

- **Route groups** such as `(projects)`, `(reva)`, `(auth)`, `(admin)` never appear in URLs; the lists above show real URLs.
- **`/gbc-restricted/*`** was flattened from `/gbc/restricted/*` (and `/gbc/restricted-login` → `/gbc-restricted/login`); the old prefixes 308-redirect. The admin pages sit in an `(admin)` group so the login page can escape the admin sidebar layout.
- **`/surfboard-restricted/*`** and **`/surfboard-mda/*`** were renamed from `/surf-restricted/*` and `/surf-mda/*`; old prefixes 308-redirect.
- **`/surfboard/dashboard/shared`** was retired — its content moved into the Plans page's "Shared" filters (Shared Access work, 2026-09-29).
- **`/reva/onetimerequest`** is the guest tracking/report-download page; `/gbc/login` is the guest "My Ticket" lookup (ticket number + email), not a Kinde login.
- **`/gbc-frame`** and **`/gbccertificate`** are name collisions only — an unrelated ArcGIS/Survey123 tool with zero code overlap with the GBC product.
- **`/surfboardplan/[id]`** is the public, QR-gated plan page.
- **Email-verification pages** — `/surfboard/verify-email`, `/reva/verify-email`, `/gbc-restricted/verify-email` — serve two jobs: the blocking OTP/link gate (`VerifyEmailGate`) and, with `?pid=&token=`, the LINK-method registration landing (`RegisterVerifyLinkCard`). See [`docs/auth/technical.md` §1.7–1.8](../auth/technical.md).
- **The corporate site** is served at the root from `app/(site)/` (it was `/v2` until 2026-10-15; the `/v2`, `/v3` and `/v4` prefixes no longer exist). It is data-driven and mounted under its own layout; see [`docs/pages/main-site.md`](../pages/main-site.md).

---

## Maintenance note

Add or move a route and the table updates itself: run `npm run docs:routes` and commit the result. The notes sections above are the only hand-written parts — update them when a route is **renamed, retired, or has behaviour a path can't convey** (a deliberately-unrenamed callback, a name collision, a redirect).

Per-phase route-by-route specs from the 2026-08/09 rebuild remain in [`phases/phase-{1,2,3,4}-*.md`](./phases/) as historical records of _why_ each route looks the way it does; this file is the current truth for _what exists_.
