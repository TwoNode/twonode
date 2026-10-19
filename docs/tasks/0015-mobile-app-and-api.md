# TASK-0015: Surfboard mobile app (`twonode-mobile`) and the API work it needs

- **Status:** In progress (2026-10-19): native auth built and merged (PR #495); app foundation built in `TwoNode/twonode-mobile` (private, `main`, CI green); everything else open
- **Priority:** High
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** API work: feature branches off `origin/dev` in this repo. App: new project `/home/rojitech/Desktop/CODEC/REACT-NATIVE/twonode-mobile`
- **Created:** 2026-10-19
- **Related:** [mobile evaluation](../mobile/surfboard-mobile-app-evaluation.md), [mobile roadmap](../mobile/roadmap.md), [backend feasibility](../mobile/surfboard-mobile-feasibility.md), [research refresh](../mobile/association-and-mobile-research-2026-10-18.md), [auth docs](../auth/technical.md)

> **How to tick:** change `[ ]` to `[x]` and add the date and PR. Sizes are S (days), M (a week or two), L (several weeks). They are relative sizes, not dates.

---

## 1. Objective

Ship a native companion app for Surfboard surveyors (Android and iOS) that lets them **access, monitor and act** while away from the desk: Plans, Records (batches), Stats, Home (map and search), Profile. Creating records, CAD/PDF upload, geometry verification, record-copy batch preparation and payment, and admin work stay on the web. The app talks to the existing `/api/v1/*` contract and must not care which backend answers it ([roadmap rule](../mobile/roadmap.md)).

**Product scope in one line per tab (from the brief):**

| Tab                  | What it does                                                                                                                                                                                  |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**             | Map of the surveyor's own plans, one search box (plan number, pillar number, title, facilitator, locality, LGA, coordinate, address), current location, record details sheet, navigate to it. |
| **Plans**            | All, Shared, Queried. Badge when any plan is queried; a queried plan explains which stage queried it, why, and the history.                                                                   |
| **Records** (centre) | Batch cards with per-status counts, batch and record status, search, "Physical Copies Submitted" action (disabled when nothing is ready), history once every plan is lodged.                  |
| **Stats**            | Total, lodged, queried; by facilitator and by LGA/LCDA/ward; active batches; wallet and earnings; tap a figure to open the records; date filter on `surveyPlanDate`.                          |
| **Profile**          | Account and firm, wallet, subscription status (no purchase on iOS), settings, signed-in devices, support, sign out.                                                                           |

---

## 2. Decisions that gate the work

- [x] **D1. Order of work.** Decided 2026-10-19: Phase 1A (mobile auth, in this repo) and Phase 0 (accounts) run in parallel; the app scaffold starts when the mobile auth routes are on `dev`. **The association feature is paused until further notice.**
- [x] **D2. Store accounts.** Decided 2026-10-19: yes, ready to enrol as an organisation on both stores. Longest lead time in the plan, so enrol first (task 0.1).
- [x] **D3. Maps.** Decided 2026-10-19: **self-hosted open vector tiles, no satellite layer for now**; maybe switch to a paid hosted provider later. Consequences: the public OpenStreetMap tile servers and the unofficial Google tiles must not be used; plan a tile-hosting task (Nigeria extract as vector tiles or PMTiles on our storage or a CDN, with OpenStreetMap attribution), and a geocoder that is allowed for this use (self-hosted or a provider whose terms permit it). Address search may therefore be limited at launch.
- [x] **D4. Sign-in methods in v1.** Decided 2026-10-19: **email and password and Google**. Adds work: Google sign-in through the system browser with PKCE and a deep link back (task 3.7 is now required for v1), a Kinde mobile flow to research, and bearer session issuance after a Kinde callback. The Google-only count in `out/db/surveyor-state-and-surcon-count.sql` still helps size it.
- [x] **D5. "Ready for physical submission".** Decided 2026-10-19: keep today's server rule (`redCopyStatus = SUBMITTED`, `physicalCopySubmitted = false`, not deleted), in one shared server function used by web and app.
- [x] **D6. Subscription gating of the physical-copy action on mobile.** Decided 2026-10-19: same as web today (`USER` role only, no subscription check). The app still handles `SUBSCRIPTION_REQUIRED` if the server adds a gate later.
- [x] **D7. Support channel** shown in the app. Decided 2026-10-19: WhatsApp number, support email and a web support page, all three. _(Waiting on: roji-tech to supply the number, the address and the support page URL.)_
- [x] **D8. Languages and accessibility target.** Decided 2026-10-19: English only, standard accessibility (dynamic text size, screen-reader labels, 44 point tap targets, readable contrast).
- [x] **D9. Minimum OS versions.** Decided 2026-10-19: Expo SDK 58 defaults, phones only (tablets just scale up).
- [x] **D10. App name and identifiers.** Decided 2026-10-19: display name **Surfboard**, iOS bundle id and Android package `com.twonode.surfboard`. Check the name is free on both stores before the first submission. _(Icon and brand assets still to be supplied.)_
- [x] **D11. Google developer identity verification.** Decided 2026-10-19: **deferred**; handle it later. Risk: if it becomes mandatory for Nigeria before launch it could delay the first release, so re-check Google's own pages when Phase 7 starts.
- [x] **D12. Apple guideline 4.8.** Decided 2026-10-19 (read as): **iOS offers email and password plus Sign in with Apple; Android offers email and password plus Google.** Google is not offered on iOS, so guideline 4.8 is not triggered there and Sign in with Apple is a choice, not a requirement. Costs: Apple connection in Kinde and Apple Developer configuration. Apple's "Hide My Email" gives a relay address that will not match any existing account, so Apple (like Google) only signs in to existing accounts; a new item adds "connect Apple/Google" from Profile while signed in (task 3.9).
- [x] **D13. No account creation on mobile in v1.** Decided 2026-10-19: yes, for **both** Google and Apple. Social sign-in only signs in to existing active accounts; new accounts are created on the web (which also avoids Apple's in-app account deletion rule, 5.1.1(v), that applies once an app can create accounts).
- [x] **D14. Mobile sessions for role `USER` only.** Decided 2026-10-19 and built in PR #495 (login and refresh refuse other roles with 403 `ACCOUNT_TYPE_NOT_SUPPORTED`).
- [ ] **D15. Kinde dashboard work.** Create a Front-end and mobile application, callback `com.twonode.surfboard://oauth/callback`, enable Google (and Apple, for the iOS build) for it, so the spike can run. _(Waiting on: roji-tech to create it)_

---

## 3. Phase 0: Accounts and foundations (no code, can start now)

- [ ] 0.1 Create the Apple Developer Program enrolment (organisation) and the Google Play Console organisation account (D2). Size S, calendar time is the cost.
- [ ] 0.2 Create an Expo account and an EAS project; connect it to GitHub for builds.
- [ ] 0.3 Install the toolchain on the dev machine: `eas-cli`, Android Studio and an emulator, a physical Android device with USB debugging (`adb` is already present). iOS builds run in EAS cloud (this machine is Linux); a physical iPhone is needed for testing.
- [ ] 0.4 Write the privacy policy and the data-safety answers: what is collected (account, SURCON number, plan locations, device token, crash data), why, retention, deletion. Review with counsel against the Nigeria Data Protection Act 2023 and the 2025 GAID.
- [ ] 0.5 Decide the support contact (D7) and a public support URL; stores require one.
- [ ] 0.6 Prepare store listing material: screenshots plan, description, keywords, category, age rating answers, demo account for reviewers (a real Surfboard test account that never expires; reviewers cannot register).
- [x] 0.7 Create `twonode-mobile` repository on GitHub (private) with the same branch discipline as this repo (`dev`, `main`, PRs, no direct pushes to release branches). **Done 2026-10-19:** private repo `TwoNode/twonode-mobile` created and pushed; `main` with pull requests (no `dev` branch yet), CI on every PR (typecheck, lint, tests).

---

## 4. Phase 1: API changes in this repo (`twonodes`), additive, web untouched

Every item ships through the normal flow: branch off `origin/dev`, PR to `dev`, then `main`, then `prod`, with tests and `docs/functions/*.md` updated in the same change. None changes web behaviour.

### 1A. Native auth (the one hard blocker) · Size L

Today: access token is a 15-minute JWT in an httpOnly cookie, the refresh token is a cookie scoped to `/api/v1/auth/refresh`, and `withAuth` reads only cookies. There is no `Authorization: Bearer` path, so every authenticated call from a native client returns 401. CSRF (`lib/auth/csrf.ts`) also rejects any mutating request without a matching `Origin` or `Referer`.

- [x] 1A.1 `POST /api/v1/auth/mobile/login`: email, password, `platform: "surfboard"`, device label and id; returns `{accessToken, refreshToken, expiresIn, user}` in the body. Reuse `issueSession` internals and the same bcrypt check; no cookies set. **Done 2026-10-19** (PR #495, branch `feat/mobile-auth-bearer`): `POST /api/v1/auth/mobile/login`, body session, `Cache-Control: no-store`, no cookies.
- [x] 1A.2 `POST /api/v1/auth/mobile/refresh`: takes the refresh token in the body, rotates it. **Re-rotate inside the 30-second grace window** (revoke the live successor and return a fresh pair in the same family) so a lost response does not log the user out (`rotateRefreshToken` today returns only an access token there, and treats a later re-presentation as reuse and revokes the family). **Done 2026-10-19:** rotation shared with the web (`rotateCore`); grace-window re-rotation; 409 `REFRESH_CONFLICT` on a race.
- [x] 1A.3 `POST /api/v1/auth/mobile/logout`: revokes that device's token family. **Done 2026-10-19:** revokes the device's family; always 200.
- [x] 1A.4 Bearer branch in `getServerSession` (`lib/auth/session.ts`) and therefore in `withAuth`: if `Authorization: Bearer` is present, verify it exactly as the cookie token (signature, expiry, `platform` claim). Cookie path unchanged. **Done 2026-10-19:** bearer is the only credential when present; a bad bearer never falls back to cookies.
- [x] 1A.5 **Bearer-aware CSRF:** a request that authenticates through `Authorization: Bearer` skips the Origin/Referer check. Cookie-authenticated requests must still be checked. Tests for both directions (a browser cannot add a custom `Authorization` header cross-site without a preflight, which these routes do not grant). **Done 2026-10-19:** bearer requests skip Origin/Referer; cookie requests still checked (verified in a browser against a cross-origin attacker page).
- [x] 1A.6 **Device sessions:** add a device label, device id and last-used time to `RefreshToken` (new migration; it has none today). `GET /api/v1/auth/mobile/devices` and `DELETE …/devices/{id}` so a lost phone can be revoked individually; surface in Profile. **Done 2026-10-19:** `RefreshToken` device columns (migration `20261019100000`), `GET` and `DELETE /api/v1/auth/mobile/devices`.
- [x] 1A.7 **Mobile-safe rate limits:** login is keyed `ip:email` and registration sends `register-send:<ip>`. Carrier NAT puts many subscribers behind one IP. Key mobile limits on email plus device id, never IP alone. **Done 2026-10-19:** per-email (20 per 15 min) and per-device (5 per 5 min) limits, no IP. Known trade-off: someone who knows an email can lock mobile sign-in for that account for 15 minutes.
- [ ] 1A.8 **Email verification:** when a platform enforces verification, `withAuth` throws `EMAIL_VERIFICATION_REQUIRED` (403). Mobile login must return it in a form the app can act on; add the OTP verify and resend calls (`verify-email-otp`, `resend-verification` already exist; confirm they accept bearer) so the app can show a code screen. The LINK method needs a deep link back into the app (see 1H).
- [ ] 1A.9 Password reset: `request-password-reset` and `reset-password` already exist; confirm they work without cookies and that the reset email can deep link into the app (1H).
- [ ] 1A.10 (mostly done 2026-10-19: 4 new test files, 185 auth tests, 1125 in the full suite; live HTTP and browser checks run against a throwaway database; still to add: bearer on a wider sample of `withAuth` routes) Tests: login, refresh rotation including the lost-response case, reuse detection still revoking, revoke-one-device, bearer on a sample of `withAuth` routes, CSRF matrix. Update `docs/auth/technical.md` and `docs/functions/`.
- [ ] 1A.12 **Google (Kinde) sign-in for mobile (D4)** (research done 2026-10-19: [kinde-google-sign-in-research](../mobile/kinde-google-sign-in-research-2026-10-19.md); recommended: our own PKCE flow, the server exchanges the code with a new Kinde Front-end and mobile application; steps: spike, `POST /api/v1/auth/mobile/kinde`, account rules, pre-hijack fix on web and mobile; waiting on decisions D12 to D14 and on the Kinde application): a mobile-safe exchange that ends with the same access and refresh token pair as 1A.1, scoped to `platform: surfboard`, with account linking to the existing email account and the email-verified rule (`emailVerifiedVia: OAUTH`). Research Kinde's mobile and PKCE support first.
- [ ] 1A.13 `GET /api/v1/auth/me` should also return `firstName` and `lastName`: after a restored session the app has only the email (the login response carries the name, `/me` does not). Found 2026-10-19 while building the app.
- [ ] 1A.11 Security review of the new surface: token lifetime, refresh-token storage expectations, brute-force and enumeration behaviour, audit log entries for mobile logins (`writeAudit`).

### 1B. Version gate and client identification · Size S

- [ ] 1B.1 Require `X-App-Version` and `X-App-Platform` on mobile routes; a server-side minimum version returns `426`-style `APP_UPDATE_REQUIRED` with a store link.
- [ ] 1B.2 Config for minimum and recommended versions (settings table or env), changeable without a deploy.
- [ ] 1B.3 Log version and platform on mobile auth events for support.

### 1C. API contract and typing · Size M

- [ ] 1C.1 Produce an OpenAPI spec for the routes the app uses (start with the surface in 1D to 1G; generate from the existing Zod schemas where possible). Today there is none.
- [ ] 1C.2 Publish it at a versioned path and check it in CI so it cannot drift.
- [ ] 1C.3 Generate the app's API client and types from it (done on the app side, Phase 2).
- [ ] 1C.4 Standardise error envelopes and codes the app depends on (`SUBSCRIPTION_REQUIRED`, `EMAIL_VERIFICATION_REQUIRED`, `APP_UPDATE_REQUIRED`, validation errors with field messages) and document them.
- [ ] 1C.5 Contract tests for the mobile surface so a web change cannot break the app silently.

### 1D. Plans and search · Size M

- [ ] 1D.1 **Locality and LGA search** on `GET /api/v1/surfboard/plans` (`lga`, `ward`, `lcda`, `locality` exist on the model but are not in the search OR-list).
- [ ] 1D.2 A **shared `displayStatus`** for plan and batch rows (for example "Ready for Physical Submission", "Surcon, Account Approved", "Queried", "Lodged"), computed once from `redCopyStatus`, `physicalCopySubmitted` and the six stage statuses, used by web and mobile (D5).
- [ ] 1D.3 **Queried plan detail:** `GET plans/queried` already returns per-stage status and comment; confirm whether past queries (history) are stored. If not, decide whether to start recording them.
- [ ] 1D.4 Plan detail response trimmed for mobile (field selection or a mobile view) so list screens do not download full geometry.
- [ ] 1D.5 Pagination and sort consistency on the list endpoints used by the app; stable cursors if ordering can change under the user.

### 1E. Map data · Size M

- [ ] 1E.1 `GET plans/map`: the caller's own plans as `{id, planNumber, status, centroid, simplifiedGeometry}`. Plan geometry is raw GeoJSON in a JSONB column with no spatial index, which is fine for a surveyor's own hundreds of plans but not for region-wide queries.
- [ ] 1E.2 Verify the stored geometry coordinate system (assumed WGS84 from the web map; spot-check before building the map). Decide UTM zone handling for plans east of 6° E (zone 32).
- [ ] 1E.3 Only if the product later needs it: a viewport or "near me" endpoint with a spatial index. Not in v1.
- [ ] 1E.4 Extract the shared coordinate util (`lib/geo/`, EPSG:26331 and 26332 via `proj4`, already a dependency) with tests for the brief's formats (UTM, decimal, DMS). The web has two projection paths today (proj4 and ArcGIS `projectOperator`); consolidate rather than add a third.
- [ ] 1E.5 Geocoder integration behind a server endpoint (D3: open data, no paid provider at first); pick a geocoder whose terms allow this use, and never ship a provider key in the app.
- [ ] 1E.6 **Tile hosting (D3):** produce Nigeria vector tiles from OpenStreetMap data (for example OpenMapTiles or Protomaps PMTiles), host them on our storage or CDN, serve a style file, and show OpenStreetMap attribution. No satellite layer in v1.

### 1F. Records (batches), stats, wallet · Size S to M

- [ ] 1F.1 Confirm `GET cod/batches?scope=active|history&search=` and `GET cod/batches/{id}` return everything the cards need (per-status counts, per-plan status); add a count summary if the app would otherwise have to fetch every plan.
- [ ] 1F.2 `POST plans/physical-copy`: already idempotent (`physicalCopySubmitted:false` filter). Return the per-plan result so the app can show server-confirmed outcome and safely retry a queued tap.
- [ ] 1F.3 Stats: confirm `analytics?section=…&dateFrom&dateTo` filters on `surveyPlanDate`; add the by-facilitator and by-LGA/LCDA/ward breakdowns the brief lists if missing; tap-through filters on the plans list.
- [ ] 1F.4 Wallet and earnings: `qr/earnings-overview`, `earnings-this-month`, `withdrawals`, `bank-details` already exist; confirm shapes and add a summary endpoint if the Profile screen would need several calls.
- [ ] 1F.5 Subscription status: `subscription/user-and-active`; add a mobile-friendly summary (plan, valid until, status, later "Subscribed by").

### 1G. Files · Size S

- [ ] 1G.1 The file gateway (`files/view`) returns a presigned URL with checks on ownership and role; confirm it works with bearer auth and that the app can open PDFs and images with it (short expiry, refetched on demand).
- [ ] 1G.2 Content-Disposition and content-type handling so downloads and in-app viewers behave on both platforms.
- [ ] 1G.3 If a later phase lets the app photograph documents, a presigned upload route that accepts bearer auth and enforces size and type limits. Not in v1 (uploads stay on the web).

### 1H. Deep links and email links · Size S

- [ ] 1H.1 Decide the app link scheme and universal/app links domain; host `apple-app-site-association` and `assetlinks.json` on the site.
- [ ] 1H.2 Make the verification, password-reset and invitation emails open the app when installed and the web otherwise.

### 1I. Push notifications · Size M to L (Phase 6; not part of the MVP)

- [ ] 1I.1 `DeviceToken` table (user, platform, token, app version, last seen) and routes to register, refresh and remove a token on login and logout.
- [ ] 1I.2 Sender service using Expo's push service (or FCM and APNs directly); delivery receipts and invalid-token clean-up.
- [ ] 1I.3 Event hooks where state changes are written: plan queried, plan lodged, batch moved, subscription expiring, payout updates. Respect per-user notification preferences.
- [ ] 1I.4 Quiet hours and de-duplication; fan-out through a queue if volume grows (this is also the usual first trigger for the NestJS stage in the [backend roadmap](../backend/roadmap.md)).
- [ ] 1I.5 Preferences API and Profile screen.

### 1J. Observability and operations · Size S

- [ ] 1J.1 Tag mobile requests in logs (app version, platform, device id hash) and dashboards for auth failures and refresh problems.
- [ ] 1J.2 Alerts for spikes in 401, 403 and 426 responses after a release.
- [ ] 1J.3 Runbook: how to revoke a device, force an upgrade, disable mobile login in an emergency (feature flag).

---

## 5. Phase 2: Project setup (`twonode-mobile`)

- [x] 2.1 Create the project with the **current Expo SDK (58)**, TypeScript strict, Expo Router, the New Architecture (required), and a **development build** (MapLibre cannot run in Expo Go). **Done 2026-10-19:** Expo SDK 58 (React Native 0.88, React 19.3), TypeScript strict, Expo Router with native tabs, New Architecture, phones only, web support removed. A development build is only needed once MapLibre is added (Phase 5).
- [ ] 2.2 Environments: development, staging and production configs; API base URL configurable per build, never hard-coded; staging build points at the `main` Vercel deployment. _(2026-10-19: base URL config done: `EXPO_PUBLIC_API_BASE_URL`, https enforced outside development, local fallback on port 3211; per-environment EAS profiles wait for 2.4.)_
- [ ] 2.3 Tooling: ESLint, Prettier, TypeScript checks, unit tests (Jest and React Native Testing Library), end-to-end tests (Maestro or Detox), pre-commit checks, CI on every PR. _(2026-10-19: done so far: ESLint and Prettier, `tsc`, Jest and React Native Testing Library (70 tests), GitHub Actions CI. Still open: end-to-end tests and pre-commit checks.)_
- [ ] 2.4 EAS build profiles (development, preview, production), signing credentials, internal distribution (Android APK link and iOS TestFlight).
- [ ] 2.5 Generated API client from the OpenAPI spec (1C); fall back to a thin typed wrapper for any route not yet in the spec. _(2026-10-19: the thin typed wrapper exists: `src/lib/api/`; no OpenAPI client yet.)_
- [ ] 2.6 Data layer: TanStack Query for fetching, caching and retries; a single request wrapper that adds the bearer token, `X-App-Version` and `X-App-Platform`, and handles `401`, `EMAIL_VERIFICATION_REQUIRED`, `SUBSCRIPTION_REQUIRED` and `APP_UPDATE_REQUIRED` in one place. _(2026-10-19: the request wrapper is done (bearer, `X-App-Version`, `X-App-Platform`, one refresh-and-retry on 401); TanStack Query is not added yet.)_
- [x] 2.7 **Single-flight token refresh:** concurrent requests on app resume share one refresh; write the new refresh token to secure storage **before** using the new access token. **Done 2026-10-19:** `SessionManager` shares one refresh between concurrent callers and writes the new refresh token before using the new access token; tested.
- [x] 2.8 Secure storage (`expo-secure-store`, Keychain and Keystore) for the refresh token; nothing sensitive in plain storage or logs. **Done 2026-10-19:** refresh token and device id in `expo-secure-store` (unlocked only, this device only); the access token is in memory only; tested.
- [ ] 2.9 Design system: brand colours and type matching the web, light and dark themes, spacing scale, base components (button, input, card, list row, status chip, badge, empty state, skeleton, toast, bottom sheet).
- [ ] 2.10 Navigation: five tabs with Records in the centre, auth stack, modal routes for details, deep link handling. _(2026-10-19: five tabs with Records in the centre and the signed-in and signed-out stacks are done; modal routes and deep link handling are not.)_
- [ ] 2.11 Crash and error reporting (for example Sentry) with user id hashed and no personal data in breadcrumbs; basic product analytics only if the privacy policy covers it.
- [ ] 2.12 Shared geo util: port or import the coordinate parsing and conversion with the same tests as the API repo (1E.4).
- [ ] 2.13 Accessibility baseline: dynamic type, screen reader labels, tap targets of at least 44 points, colour contrast.
- [ ] 2.14 Decide how code is shared with the web (copy, a generated package, or only the generated client); the web repo is a single Next.js app, not a workspace.

---

## 6. Phase 3: Auth and Profile shell · Size M

- [ ] 3.1 Sign in screen (email and password), error states, rate-limit message, password reset flow. _(2026-10-19: email and password sign-in screen with error and notice messages is done; the password reset flow is not.)_
- [ ] 3.2 Email-verification screen (6-digit OTP entry, resend with cooldown) when the API returns `EMAIL_VERIFICATION_REQUIRED`.
- [ ] 3.3 Session restore at launch, silent refresh, forced sign-out on reuse, update-required screen on `APP_UPDATE_REQUIRED`. _(2026-10-19: session restore at launch, silent refresh and sign-out when the server ends the session are done; the update-required screen waits for the version gate.)_
- [ ] 3.4 Sign out (revokes the device on the server), and signed-in devices list with remove. _(2026-10-19: sign out, which revokes the device, is done; the signed-in devices list is not.)_
- [ ] 3.5 Profile: account and firm details (read), subscription status card (plan, valid until, status) with **no purchase or "pay on web" call to action on iOS**, support entry, app version, legal links. _(2026-10-19: a basic Profile screen (email, version, sign out, verification notice) exists; the subscription card, wallet and support are not.)_
- [ ] 3.6 Registration stays on the web in v1; if account deletion is ever required in-app (Apple 5.1.1(v) applies once the app offers account creation), plan it then.
- [ ] 3.7 **Google sign-in (required for v1, D4):** system browser with PKCE and a deep link back into the app; research the Kinde mobile flow first; API side needs bearer session issuance after a Kinde callback (new item 1A.12).
- [ ] 3.8 **Sign in with Apple (iOS only, D12):** Apple connection in Kinde, the same server exchange as Google (existing accounts only), button on iOS only; Google button on Android only.
- [ ] 3.9 **Connect a sign-in method from Profile (D12, D13):** while signed in, link Google (Android) or Apple (iOS) to the current account, so someone whose Apple "Hide My Email" address does not match their account can still use it. Server: link by the signed-in account, not by email.
- [ ] 3.10 Biometric unlock as an opt-in screen lock (Phase 6).

---

## 7. Phase 4: Plans and Records · Size M to L

- [ ] 4.1 **Plans tab:** All, Shared and Queried segments; search box; filters (status, plan type, dates); pull to refresh; infinite scroll; empty and error states.
- [ ] 4.2 **Queried badge** on the tab when any plan is queried; queried detail shows stage, comment, date and history.
- [ ] 4.3 **Plan detail:** status chips from `displayStatus`, key fields, shared-with, open files (PDF and image viewer through the gateway), open on map.
- [ ] 4.4 **Records tab:** active and history scopes, batch cards with per-status counts, search, batch detail with per-plan statuses.
- [ ] 4.5 **Physical Copies Submitted** action: button disabled when nothing is ready; tapping auto-selects ready records; confirmation sheet; queued retry when offline; shows the server-confirmed result.
- [ ] 4.6 Batch moves to history once every plan is lodged (server rule already exists; verify the app matches).
- [ ] 4.7 Handle subscription-gated actions (`SUBSCRIPTION_REQUIRED`) with a clear message and no purchase button on iOS.
- [ ] 4.8 Tests: list and detail rendering from fixtures, the action's idempotent retry, status chip mapping.

---

## 8. Phase 5: Stats and Home · Size M to L

- [ ] 5.1 **Stats tab:** totals (total, lodged, queried), by facilitator, by LGA/LCDA/ward, active batches, wallet and earnings; date filter on `surveyPlanDate`; tap a figure to open the filtered records.
- [ ] 5.2 Charts that stay readable on small screens and in dark mode; skeletons while loading.
- [ ] 5.3 **Home map** (MapLibre native): the caller's own plans from `plans/map`, clustering, status colours, select a record to open a details sheet, current location, follow-me.
- [ ] 5.4 **Omnibar:** one box that classifies input (plan number, pillar number, title, facilitator, locality or LGA, coordinate, address) and **shows how it was interpreted** ("UTM zone 31N → 6.447, 3.473") before acting; includes UTM, decimal degrees and DMS with the brief's examples under test.
- [ ] 5.5 Address search through the server geocoder endpoint (1E.5).
- [ ] 5.6 **Navigate:** open the selected record in the user's maps app (deep link) and, if chosen, in-app routing.
- [ ] 5.7 Self-hosted vector basemap and its style (1E.6), OpenStreetMap attribution, no satellite layer in v1 (D3).
- [ ] 5.8 Performance: map with several hundred plans stays smooth on a mid-range Android phone.

---

## 9. Phase 6: Push, biometrics and polish · Size M

- [ ] 6.1 Push registration on login, removal on logout, handling of invalid tokens (1I).
- [ ] 6.2 Notification types, deep links from a notification to the right plan or batch, in-app notification list (existing `notifications/*` routes), unread badge, preferences screen.
- [ ] 6.3 Biometric unlock (Face ID, fingerprint) with a fallback to password; lock after a configurable time in the background.
- [ ] 6.4 Persisted read-through cache of lists and the last opened plans for flaky connections (not a sync engine; offline writes are out of scope).
- [ ] 6.5 Empty, error and slow-network states reviewed across the app; haptics and animation only where they help.
- [ ] 6.6 In-app update prompts and release notes.

---

## 10. Phase 7: Quality, security and release · Size M

- [ ] 7.1 Test matrix: low-end and mid-range Android, current and older iOS, small and large screens, dark mode, large text, slow and offline networks.
- [ ] 7.2 End-to-end tests for sign-in, plans, records action, stats filter, map search.
- [ ] 7.3 Security review: token storage, logging (no tokens, plan locations or personal data in logs), certificate behaviour, jailbreak and root stance (decide, do not over-promise), dependency audit, API abuse cases from the app.
- [ ] 7.4 Privacy review against the final policy; data-safety and privacy label answers.
- [ ] 7.5 Internal beta (TestFlight and Play internal track) with real surveyors; collect feedback.
- [ ] 7.6 Store submissions: iOS review (demo account, no purchase CTA, privacy details); Google Play (organisation account avoids the 14-day closed test required of new personal accounts; check current Play requirements at submission).
- [ ] 7.7 Phased rollout (a percentage of Android users first), monitor crash-free rate and API error rates, rollback plan (minimum-version gate and a server feature flag).
- [ ] 7.8 Release process: version numbers, changelog, signing key custody, who can submit, over-the-air update policy (EAS Update for JS-only fixes).
- [ ] 7.9 Support readiness: FAQ, how to report a problem from the app, escalation to the team.

---

## 11. Phase 8: After launch (separate decisions)

- [ ] 8.1 "Subscribed by" line on the Profile subscription card once the [association feature](../surfboard/association-subscription.md) exists.
- [ ] 8.2 Optional: photograph and upload documents from the device (needs 1G.3).
- [ ] 8.3 Optional: MDA reviewer screens (the API is reusable; separate scope).
- [ ] 8.4 Optional: viewport and "near me" map queries (spatial index), and offline map areas only with a tile source whose licence allows it.
- [ ] 8.5 Move routes to NestJS or Go behind the same URL when a gate in the [backend roadmap](../backend/roadmap.md) is hit; the app needs no release for that.
- [ ] 8.6 Tablet layout, additional languages, widgets.

---

## 12. Dependencies and order

```
Phase 0 (accounts)  ───────────────────────────────────────────────► Phase 7 (store submission)
Phase 1A (auth) ─► Phase 1B/1C ─► Phase 2 (setup) ─► Phase 3 (auth UI) ─► Phase 4 (Plans, Records)
Phase 1D, 1E, 1F ─────────────────────────────────────► Phases 4 and 5
Phase 1H (links) ─► Phase 3.2 / password reset
Phase 1I (push) ─► Phase 6
D3 (maps decision) ─► 1E.5 ─► Phase 5
```

Critical path: store accounts (Phase 0, calendar time), mobile auth (1A), and the maps decision (D3).

## 13. Risks to watch

- Refresh-token loss on flaky networks (handled by 1A.2 and 2.7; test it on purpose).
- Map tile and geocoder licensing (D3); do not reuse the web map's tile sources.
- App-store review: no purchase calls to action on iOS, a working demo account, and a privacy policy.
- Store account lead times (D2, D11).
- Scope creep: the brief's exclusion list is its main strength; offline sync, uploads and admin screens stay out of v1.
- Email-verification enforcement turning on later without the app handling it (1A.8 and 3.2 cover it).

## 14. Verification log

Written 2026-10-19 from the mobile evaluation, roadmap and feasibility documents (dated 2026-10-04 and refreshed 2026-10-18) and checked against the code: `lib/auth/session.ts`, `lib/auth/csrf.ts`, `lib/api/withAuth.ts`, `app/api/v1/auth/login/route.ts`, the `RefreshToken` model (no device label), the `files/view` route and the list of `app/api/v1/surfboard/*` routes. Nothing has been built or run.
