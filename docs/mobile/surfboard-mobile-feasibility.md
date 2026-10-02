# Surfboard Mobile App — Technical Feasibility Analysis

## Context

The user shared a product brief ("Surfboard Mobile App Brief") proposing a native mobile companion app for Surfboard — survey plan submission and tracking, Certificate of Deposit (CoD) batch processing, physical record-copy submission, and a surveyor-facing profile/stats area — and asked for a technical feasibility read against the existing codebase. This document captures that analysis, re-verified against the `dev` branch.

## Bottom line

**The backend is close to mobile-ready already.** Nearly everything the brief describes as a feature already exists as a working REST API and Prisma model on the web platform — a mobile client would largely be a new frontend consuming APIs that already exist, not new backend work. **The one real gap is authentication**: the native session system is httpOnly-cookie-only, with no bearer-token path a native mobile client can use. Closing that gap is the prerequisite piece of new backend work; everything else is additive.

## What's already there

Surfboard's Prisma schema (`prisma/schema/surfboard.prisma`) and its ~120 routes under `app/api/v1/surfboard/*` already cover the brief's feature areas:

| Brief area                                           | Backed by                                                                                                                                                                                                                                                                        |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans (create, list, detail, status, query/resubmit) | `SurfboardPlan` model; `plans/route.ts`, `plans/[planId]/*` (status, query, resubmit, restore, attachments, surveyor, title), `plans/check-number`, `plans/deleted`, `plans/reference-numbers`                                                                                   |
| Queried plans                                        | `plans/queried/route.ts`                                                                                                                                                                                                                                                         |
| Map / geo view                                       | `SurfboardPlan`'s geometry fields; `plans/geo/boundaries`, `admin/plans/map`                                                                                                                                                                                                     |
| CoD batches & batch processing                       | `CertificateOfDepositBatch` model; `cod/batches/route.ts`, `cod/batches/[batchId]/*` (payment verify/retry, LASG receipt, receipt PDF), `cod/fee-preview`, `cod/zone`, `cod/locks/*` (per-plan and per-batch locking so two surveyors can't process the same batch concurrently) |
| Physical record-copy submission                      | `plans/physical-copy/route.ts`, `plans/[planId]/record-copy/*` (upload, verification, download), `plans/[planId]/red-copy`                                                                                                                                                       |
| Stats                                                | `cod/batches/stats`, `admin/plans/stats`, `mda/stage-stats`, `subscription-analytics`, `qr/earnings-overview`                                                                                                                                                                    |
| Surveyor profile & wallet                            | `SurveyorWallet`, `QREarningsTransaction`, `WithdrawalRequest` models; `profile/route.ts`, `qr/earnings-overview`, `qr/withdrawals`, `qr/bank-details`                                                                                                                           |
| Notifications                                        | `SurfboardNotification` model; `notifications/route.ts`, `notifications/[id]/read`, `/dismiss`, `unread-count`                                                                                                                                                                   |
| File uploads                                         | `files/upload/route.ts`, `upload-multi`, `upload-with-auth` — already S3-backed, already used by the web client for plan attachments and record copies. A mobile client uploading a photo from a device camera is the same flow.                                                 |

This is a wide, mature API surface — the MDA (government reviewer) side of the workflow alone spans `mda/intake/*`, `mda/accounts/*`, `mda/records-ii/*`, `mda/archive/*` with per-stage decision endpoints, all of which a mobile client could reuse as-is if a future phase wants MDA reviewers on mobile too.

## The one real gap: authentication

Verified in `lib/auth/jwt.ts`, `lib/auth/cookies.ts`, `lib/auth/session.ts`, and `lib/api/withAuth.ts` (the wrapper every one of the ~120 routes above is built on):

- Access tokens are short-lived (15 min) JWTs, refreshed via a rotating refresh-token pair with reuse detection (`rotateRefreshToken` in `lib/auth/session.ts`).
- Both tokens are set as `httpOnly`, `sameSite: "lax"` cookies (`lib/auth/cookies.ts`) — never returned in a response body.
- `withAuth()` (`lib/api/withAuth.ts`), the single auth wrapper used by every Surfboard API route, calls `getServerSession(platform)`, which reads the session **only** from those cookies. There is no `Authorization: Bearer <token>` code path anywhere in the auth stack.

This is fine for a browser client (the cookie is sent automatically) but doesn't work for a native mobile app: a native HTTP client has no shared cookie jar with a browser, and httpOnly cookies specifically can't be read or attached by app code even if you tried to manage them yourself. Practically, every one of the API calls in the table above would return 401 from a native app today.

### Options to close it

1. **Add a bearer-token variant of the existing flow (recommended).** The JWT/refresh infrastructure already does the hard part (signing, rotation, reuse detection); it just needs a mobile-facing variant that returns the access+refresh tokens in the response body instead of (or alongside) setting cookies, and a corresponding `Authorization` header check added to `withAuth()`/`getServerSession()`. The mobile app stores the refresh token in the OS secure keystore (iOS Keychain / Android Keystore) and attaches the access token per-request. This reuses ~all existing session logic and keeps the web path untouched.
2. **Webview-wrapped app.** Fastest to ship, but it's the current web app in a native shell — cookies work as-is, but you lose most of what makes a "mobile app" worth building (native camera/file picker integration, push notifications, offline behavior, a real native map). Reasonable only as a stop-gap.
3. **Full OAuth2/device-flow.** More ceremony than this app needs today given there's no third-party identity provider involved on the native path (Kinde is a separate, parallel system — see `docs/auth/technical.md` §2) — option 1 gets the same security properties with far less new surface.

Option 1 is the natural fit: it's additive (new route(s) + a header-check branch in one shared function), doesn't touch the existing web cookie flow, and reuses code that's already been through rotation/reuse-detection hardening.

## Other considerations (not blockers, just scoping notes)

- **Maps.** The web app's map views use `maplibre-gl`, a web/WebGL library — a native app needs its own map SDK (e.g. MapLibre Native, Mapbox, or `react-native-maps`). This is client-side work only; the geo data itself (`plans/geo/boundaries`) is already exposed as plain JSON/GeoJSON-shaped data, not tied to the web map library.
- **Push notifications.** `SurfboardNotification` exists as an in-app/polled model (`notifications/*` routes) but there's no APNs/FCM integration today. A mobile app wanting native push notifications (e.g. "your batch was approved") needs that added — a moderate, well-scoped piece of new backend work, independent of the auth gap.
- **Offline behavior.** Nothing in the current API is designed for offline-first sync (conflict resolution, queued writes). If the brief's field-use cases (submitting a plan or record copy with unreliable connectivity) need real offline support rather than "retry when back online," that's new design work, not just a mobile client.

## Recommended next steps

1. Confirm which auth approach to build (recommend option 1 above), then land the bearer-token auth variant as its own small, reviewable change — it's the one piece every other mobile feature depends on.
2. Pick a mobile framework (React Native would let the team reuse TypeScript types/DTOs shared with the Next.js API; a fully native Swift/Kotlin build would not).
3. Treat push notifications and offline behavior as separate, later-phase decisions rather than blockers to starting — the core plan/batch/record-copy flows can ship without either.

## What was checked

Verified against the `dev` branch (2026-09-23): `prisma/schema/surfboard.prisma`, the full `app/api/v1/surfboard/**/route.ts` listing, `lib/auth/jwt.ts`, `lib/auth/cookies.ts`, `lib/auth/session.ts`, `lib/api/withAuth.ts`. For the auth system's full current picture (including the parallel Kinde OAuth path, which this document doesn't propose touching), see [`../auth/technical.md`](../auth/technical.md).
