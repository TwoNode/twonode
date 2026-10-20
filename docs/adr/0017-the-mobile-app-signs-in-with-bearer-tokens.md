# 0017. The mobile app signs in with bearer tokens from separate mobile routes

- **Status:** Accepted
- **Date:** 2026-10-19
- **Decided by:** roji-tech (decisions D1 to D15 in [TASK-0015](../tasks/0015-mobile-app-and-api.md)); drafted by an AI pair
- **Related:** PR #495, [TASK-0015](../tasks/0015-mobile-app-and-api.md), [`docs/auth/technical.md` §1.5a](../auth/technical.md), [mobile evaluation §3](../mobile/surfboard-mobile-app-evaluation.md), [Kinde and Google research](../mobile/kinde-google-sign-in-research-2026-10-19.md)
- **Enforced by:** tests in `lib/auth/__tests__/` (`bearerAndCsrf`, `mobileSession`, `mobileAuthRoutes`, `deviceSessions`). Review only for the rule that new mobile routes must not set cookies.

## Context

Every authenticated route reads the session from httpOnly cookies. A native app has no browser cookie jar and cannot read or attach httpOnly cookies, so every call from it would return 401. The CSRF check (`validateCSRF`) also rejects any mutating request without a matching `Origin` or `Referer`, which a native client does not send. And the refresh rotation's 30-second grace window gives a re-presented token an access token only, which strands a phone whose refresh response was lost (it never saw the new refresh token).

## Decision

1. **Separate mobile routes** under `/api/v1/auth/mobile/` (`login`, `refresh`, `logout`, `devices`) return the session in the response body (`Cache-Control: no-store`, no cookies). The browser routes are unchanged.
2. **`Authorization: Bearer` is read by `getServerSession`.** When the header is present it is the only credential considered; a bad token is a 401 and never falls back to cookies.
3. **`validateCSRF` lets a bearer request through.** A page on another site cannot attach a custom `Authorization` header without a CORS preflight, which these endpoints never grant. Cookie requests are checked exactly as before.
4. **One refresh-rotation implementation** (`rotateCore` in `lib/auth/session.ts`) serves both paths. For the app, a token re-presented within 30 seconds is **re-rotated** (the live successor is revoked and a fresh pair issued in the same family); beyond 30 seconds it is reuse and revokes the family, as on the web.
5. **Device-tagged sessions.** Each refresh-token family records `deviceId`, `deviceLabel`, `appVersion` and `lastUsedAt`, so a lost phone can be listed and signed out on its own.
6. **Who may hold an app session.** Surfboard only, and only role `USER` (surveyors). Staff and admin roles stay on the web; the role is re-read at every refresh. No accounts are created in the app. Social sign-in (Google on Android, Apple on iOS, through Kinde, with the server exchanging the code) will sign in existing accounts only; it is planned, not built.
7. **Rate limits are per email (20 per 15 minutes) and per device (5 per 5 minutes), never per IP**, because carrier NAT puts many phones behind one address.
8. **On the phone:** the refresh token and device id live in secure storage; the 15-minute access token lives in memory only. A session lasts 30 days from sign-in (rotation inherits the expiry).

## Alternatives considered and rejected

- **Wrap the website in a web view.** Cookies would work as they are, but it gives up native maps, camera and push, and Google blocks sign-in inside embedded web views.
- **Accept bearer tokens on the existing web login and refresh routes.** Couples two clients with different threat models: cookie CSRF rules, IP-keyed limits and per-device revocation all differ.
- **OAuth device flow or a full authorization server.** More machinery than this app needs; the JWT and rotation code already does the hard part.
- **Native Google sign-in that bypasses Kinde, or sending a Kinde SDK token to the server.** Considered for Google; see the research note. Kinde stays the identity provider and the server exchanges the code itself.

## Consequences & Downsides

- A second authentication surface to keep secure and in step with the web rules.
- Someone who knows an email can lock that account out of **mobile** sign-in for 15 minutes (the per-email limit is the real brake on guessing, because the device id is chosen by the client). Recorded as I-032.
- Access tokens are stateless: after sign-out or a device revoke, an issued access token works until it expires (up to 15 minutes), as on the web (I-034).
- The grace-window re-rotation is weaker than the web's access-only grace: a stolen old refresh token used inside those 30 seconds gets a session; the real app's next refresh then trips reuse detection and revokes the family (I-035).
- The CSRF exemption relies on browsers never sending a custom `Authorization` header cross-site without a preflight.
- Adds one migration (`20261019100000_refresh_token_device_sessions`, four nullable columns).

**Binds:** `lib/auth/session.ts`, `lib/auth/bearer.ts`, `lib/auth/csrf.ts`, `lib/auth/deviceSessions.ts`, `lib/auth/rateLimit.ts`, `app/api/v1/auth/mobile/**`, and the app's `src/lib/auth/session-manager.ts` (repo `TwoNode/twonode-mobile`).

## Update 2026-10-20: verification and password reset

The same rule held for the next three routes: where a website route could not serve a phone, the app gets its own twin under `/auth/mobile/` and the website's route is left alone. `mobile/verify-email` and `mobile/resend-verification` (no IP key, no cookie session, the app refreshes afterwards to learn it is verified) and `mobile/request-password-reset` (no CSRF check, keyed on email and device, one answer for every case). The reset link still opens the website's reset page; a deep link into the app is a separate decision (1H).
