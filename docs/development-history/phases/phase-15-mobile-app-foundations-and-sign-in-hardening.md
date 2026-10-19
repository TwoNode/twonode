# Phase 15: Mobile App Foundations and Sign-in Hardening (October 18–19, 2026)

**Status:** In progress (foundations complete; the app screens and the Google and Apple sign-in are open). **Date:** 2026-10-19. **Branch/PRs:** #488 to #490 (build fix and promotion), #494 to #497 (docs, mobile auth, Kinde research, pre-hijack fix), docs sweep; app repo `TwoNode/twonode-mobile` (PR #1 and the initial commits).

## Why

1. Dev's deploy had been failing type checking because of a one-off script, which blocked promotions.
2. The Surfboard mobile app needed a backend it could sign in to: every route read the session from httpOnly cookies, which a native app cannot use.
3. Researching Google sign-in for the app exposed a takeover path in the existing web Google sign-in (linking by email to an old unverified account that has a password).
4. The association subscription was paused so the mobile app could go first.

## Scope

- [x] **Build fix and promotion:** excluded `scripts/generate-storage-summary-pdf.tsx` from `tsconfig.json` (#488); dev to main to prod (#489, #490).
- [x] **Research and plans:** Cloudflare R2 findings and corrections (one public bucket would expose everything; custom domains need a Cloudflare zone; paused); association and mobile research refresh (Expo SDK 58, store policy); the surveyor-world research note; Kinde and Google sign-in research.
- [x] **TASK-0015:** the mobile app's phases and task list with decisions D1 to D15.
- [x] **Native auth ([ADR-0017](../../adr/0017-the-mobile-app-signs-in-with-bearer-tokens.md), PR #495):** `/api/v1/auth/mobile/{login,refresh,logout,devices}`, bearer in `getServerSession`, bearer-aware CSRF, one shared refresh-rotation core with grace-window re-rotation for the app, device-tagged refresh tokens (migration `20261019100000_refresh_token_device_sessions`), per-email and per-device rate limits, `USER` role only.
- [x] **Pre-hijack fix ([ADR-0018](../../adr/0018-google-sign-in-never-keeps-a-password-on-an-unverified-account.md), PR #497):** a Google sign-in linked to an unverified account with a password removes the password, revokes sessions and emails the person.
- [x] **App foundation (`TwoNode/twonode-mobile`):** Expo SDK 58 project (`com.twonode.surfboard`), email and password sign-in, secure token store, single-flight session manager, authenticated API client, five-tab shell, scope document, CI.
- [x] **Docs sweep:** handoff, task files, future plans, mobile and auth docs, issues register (I-031 to I-036), ADR index, route inventory regenerated.
- [ ] Open: Kinde Front-end and mobile application (D15) and the Google and Apple exchange (1A.12), email-verification and reset-link handling for the app, the Plans, Records, Stats and Home screens, push, store accounts and submission. See TASK-0015.

## Verification

- `twonodes`: 191 auth tests and the full suite (120 files, 1137 tests) passing; `tsc` clean. Mobile auth was also exercised live against a throwaway PostGIS database (login, failures, bearer access, forged tokens, rotation, lost-response re-rotation, reuse after 31 seconds, logout, cross-user revoke, rate limits) and in a real browser with an attacker page on another origin (cross-origin cookie and bearer requests blocked; cross-site form POST got 403).
- `twonode-mobile`: 70 Jest tests (session manager, API client, token store, config, sign-in screen), `tsc`, `expo lint` and `expo-doctor` clean; the app bundles for Android and iOS; GitHub Actions CI green on Node 24. Not yet run on a device or emulator.

## Found along the way

- Google sign-in linked by email to unverified password accounts (I-031, fixed).
- Per-email mobile rate limit allows a 15-minute lockout of a known email (I-032, accepted).
- Apple guideline 4.8 and the Hide My Email relay address shape the Apple sign-in design (existing accounts only, connect from Profile).
- The route inventory and the handoff had drifted (I-036, fixed).
