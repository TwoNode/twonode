# Google sign-in for the Surfboard mobile app through Kinde: research (2026-10-19)

Status: **research only, nothing built.** For TASK-0015 item 1A.12 and 3.7 (decision D4: email and password, plus Google). Sources are Kinde, Apple, Google and Expo documentation read on 2026-10-19; where a page did not answer a question, this note says so and lists it as something a short spike must settle.

## 1. How Google sign-in works for web today

- Kinde is the identity provider. The web pages use the Kinde Next.js `LoginLink` with a `postLoginRedirectURL` (for example `/api/auth/success/surfboard`); there is no `connection_id`, so Kinde's hosted page offers its methods.
- One Kinde application is used for all products (`KINDE_CLIENT_ID`, `KINDE_CLIENT_SECRET`, `KINDE_ISSUER_URL`): a **back-end web** app with a secret.
- The callback (`app/api/auth/success/surfboard/route.ts`) reads the Kinde user, then: finds the account by `kindeId`; else finds it by **email and links it** (sets `kindeId`); else **creates** a new `USER`. It then stamps `emailVerified` with `emailVerifiedVia: "OAUTH"` and issues the cookie session.

## 2. What the documentation says

| Question                     | Answer                                                                                                                                                                                                                                                                                                                                                                         | Source                                         |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| Public (mobile) clients      | Kinde has a **Front-end and mobile** application type: Authorization Code with **PKCE**, no client secret. Endpoints: `/oauth2/auth`, `/oauth2/token`, `/oauth2/v2/user_profile`, `/oauth2/revoke`, `/.well-known/jwks`. Use `S256`.                                                                                                                                           | Kinde "using Kinde without an SDK"             |
| Refresh tokens               | Request the `offline` scope (Kinde's name, not `offline_access`); refresh with `grant_type=refresh_token`.                                                                                                                                                                                                                                                                     | same                                           |
| Token signing                | RS256, JWKS at `https://<domain>/.well-known/jwks`. Check `iss`, expiry, and `aud` where relevant. ID token `azp` is the **client id of the application the token was issued to**.                                                                                                                                                                                             | Kinde "verifying JSON web tokens", "ID tokens" |
| Kinde SDK for Expo           | `@kinde/expo`: requires **Expo SDK 53 or later**, Node 20+; wraps `expo-auth-session` and `expo-web-browser`; redirect is a **custom URL scheme** registered as an allowed callback and logout URL. The page does not say how tokens reach a backend, whether Expo Go works, or how `connectionId` is used. A community post reported errors with an early version on Expo 52. | Kinde Expo SDK page, search result             |
| Kinde React Native SDK       | Older package, browser-based login (not embedded), tokens in the keychain; its page says an updated Expo package is being tested.                                                                                                                                                                                                                                              | Kinde React Native page                        |
| Google in embedded web views | Google **blocks** OAuth in embedded WebViews (`disallowed_useragent`); the sign-in must use the system browser (Android Custom Tabs, iOS system browser session).                                                                                                                                                                                                              | Google developers blog (2021)                  |
| Google connection settings   | Production needs your own Google client id and secret in the Kinde connection.                                                                                                                                                                                                                                                                                                 | Kinde Google page                              |
| Sign in with Apple           | Apple guideline **4.8** (below).                                                                                                                                                                                                                                                                                                                                               | Apple App Review Guidelines                    |

**Not answered by any page read** (must be settled by a spike, section 6): whether the ID token or `user_profile` carries `email_verified`; whether a social connection can be enabled for one application only; the exact value of `aud` in tokens for a mobile application; how `connection_id` is used to jump straight to Google; whether a `nonce` is echoed.

## 3. Findings that change the plan

1. **Apple guideline 4.8.** An app that uses Google Sign-In to authenticate the user's primary account must also offer an equivalent login service that limits data to name and email, lets the user keep their email private, and does not track interactions for advertising. The exemptions (company's own sign-in only; education or enterprise apps requiring an existing account; and so on) do not fit once Google is offered. Practically, an iOS app with Google needs **Sign in with Apple** (or another service meeting the three conditions). Email and password alone is exempt; adding Google triggers the rule.
2. **Google needs the system browser**, so the sign-in opens a browser session and returns through a deep link (custom scheme such as `com.twonode.surfboard://oauth/callback`, from the D10 identifiers). Expo Go cannot do this; a development build is already planned.
3. **A new Kinde application is needed**, type Front-end and mobile, with its own client id. Reusing the web application's id is not possible (it has a secret and different redirect URLs), and the server must be able to tell which application issued a token (see 4).
4. **Account linking by email has a pre-hijack weakness today** (web and any copy of it). If an old native account (124 of 126 Surfboard users were unverified when checked) was created by someone who does not own the address and still has a password, the real owner's later Google sign-in links to that account and marks it verified, while the first person keeps the password. New registrations verify email first (OTP or link), which limits this to old accounts. A fix for both web and mobile: when an OAuth sign-in links to an account that was **not** email-verified and has a password, remove the password hash and revoke its sessions (the owner can set a new password by reset).
5. **Which accounts may sign in on mobile.** The Surfboard callback creates a brand-new `USER` for an unknown email. In the app that would be account creation, which Apple requires to come with in-app account deletion (guideline 5.1.1(v)), and the plan keeps registration on the web in v1. Also, the mobile password login added in PR #495 currently accepts any role. Recommendation: **mobile Google sign-in only for existing, active accounts; mobile sessions only for role `USER`** (staff roles stay on the web).

## 4. Options

|                                    | A. Kinde SDK on the device, token sent to us                                    | **B. Our own PKCE flow, server exchanges the code (recommended)**                                                                                                        | C. Native Google sign-in, bypass Kinde                                                                  |
| :--------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| Device does                        | `@kinde/expo` login; app sends the ID token to `POST /auth/mobile/kinde`        | `expo-auth-session` and `expo-web-browser` open `/oauth2/auth` with a PKCE challenge; app receives the **code** and sends `{code, codeVerifier, redirectUri}` to our API | Google Credential Manager or `@react-native-google-signin`; app sends Google's ID token                 |
| Server does                        | Verifies the Kinde JWT (JWKS, `iss`, `azp`), resolves the user, issues our pair | Calls Kinde's token endpoint itself (public client, no secret; the verifier proves possession), verifies the ID token, resolves the user, issues our pair                | Verifies Google's ID token against Google's keys, resolves by email                                     |
| Kinde stays the identity directory | Yes                                                                             | Yes (`sub` becomes `kindeId`, as on the web)                                                                                                                             | **No**: `kindeId` is required and unique, so a placeholder would be needed and Kinde's user list drifts |
| Trust placed in the app            | Token is client-supplied; must check `azp`                                      | Server gets tokens straight from Kinde; the app never holds Kinde tokens                                                                                                 | Token is client-supplied                                                                                |
| Risks                              | SDK maturity on current Expo; extra dependency                                  | Slightly more code to write and test                                                                                                                                     | Skips Kinde; two Google client ids (Android, iOS) to manage; Apple 4.8 still applies                    |
| Best UX                            | Good                                                                            | Good (system browser)                                                                                                                                                    | Best on Android (no browser)                                                                            |

**Recommendation: B.** It keeps one identity provider for web and app, and the server fetches tokens directly from Kinde so it never trusts a token an app hands it. Fall back to A if the spike shows Kinde's token endpoint will not serve the exchange for a public client from our server. Skip C unless Kinde proves unworkable.

## 5. What option B needs

**On our server (TASK-0015 1A.12):**

- `POST /api/v1/auth/mobile/kinde` with `{platform, code, codeVerifier, redirectUri, deviceId, deviceLabel, appVersion}`.
- A small module that exchanges the code at `<issuer>/oauth2/token` (`grant_type=authorization_code`, the mobile `client_id`, the verifier, the redirect URI), then verifies the returned ID token with `jose` (`createRemoteJWKSet` on the Kinde JWKS, `RS256`, `iss`, `exp`, **`azp` equal to the mobile client id**).
- Resolve the account: by `kindeId`, else by verified email (existing accounts only), applying the pre-hijack fix above. Require an active `USER`. Do not create accounts.
- Issue the session with `issueMobileSession` (already built), mark `emailVerifiedVia: "OAUTH"` as the web callbacks do.
- One new env var for the mobile client id (for example `KINDE_MOBILE_CLIENT_ID`); the issuer URL already exists.
- Rate limit per IP-independent keys as in PR #495; audit every sign-in.
- Optionally extract the "find, link or create" logic shared with the web callback so the pre-hijack fix lands in both.

**On the Kinde dashboard (roji-tech):**

- Create an application of type **Front-end and mobile**.
- Allowed callback URLs: `com.twonode.surfboard://oauth/callback` (and a development scheme for debug builds). Allowed logout URL likewise.
- Enable the **Google** connection for it (with your own Google client id and secret in Kinde for production); if possible disable password and every other connection for this application so every sign-in is a social sign-in with a provider-verified email.
- If Sign in with Apple is chosen, add the **Apple** connection (needs an Apple Developer account, a Services ID and key).
- Read back the client id and, from the Google connection, its connection id (to open Google directly).

**On the app (TASK-0015 3.7):** `expo-auth-session` with PKCE (`S256`), scope `openid profile email offline`, `expo-web-browser` (iOS: consider an ephemeral session so the next sign-in can pick another account), `prompt=login`, a random `state` checked on return, then the call to our endpoint. Kinde tokens are discarded; only our pair is stored in secure storage.

## 6. Spike (needs the Kinde application above)

1. With the new application, run an authorization request in a desktop browser with a PKCE challenge, the Google connection and the custom scheme (the redirect will not open anywhere; copy the `code` from the address bar).
2. Exchange the code with `curl` (public client, verifier) and decode the ID token header and claims **without printing the tokens into logs or chat**: confirm `iss`, `aud`, `azp`, `sub`, `email`, presence or absence of `email_verified`, any identity-provider claim, and whether a refresh token is returned with `offline`.
3. Call `/oauth2/v2/user_profile` with the access token and compare fields.
4. Confirm the Google connection can be limited to this application and that other methods can be turned off for it.
5. Record the findings here and tick 1A.12's first step.

## 7. Decisions needed from you

1. **Apple 4.8:** add **Sign in with Apple** (more work: Apple connection in Kinde, Apple developer configuration, a button on iOS) **or** ship Google on Android only and email and password on iOS, **or** drop Google from v1 (reverses D4).
2. **No account creation on mobile in v1** (existing accounts only for Google)? Recommended yes.
3. **Mobile sessions for role `USER` only?** Recommended yes (I would change PR #495's login to enforce it).
4. **Kinde dashboard work:** can you create the Front-end and mobile application and enable Google for it, so the spike can run? Do not paste the client secret anywhere; the mobile application has none.

Sources: [Kinde, using Kinde without an SDK](https://docs.kinde.com/developer-tools/about/using-kinde-without-an-sdk/) · [Kinde Expo SDK](https://docs.kinde.com/developer-tools/sdks/native/expo/) · [Kinde React Native SDK](https://docs.kinde.com/developer-tools/sdks/native/react-native-sdk/) · [Kinde, verifying JSON web tokens](https://docs.kinde.com/build/tokens/verifying-json-web-tokens/) · [Kinde, ID tokens](https://docs.kinde.com/build/tokens/about-id-tokens/) · [Kinde, Google social sign in](https://docs.kinde.com/authenticate/social-sign-in/google) · [Apple App Review Guidelines, 4.8](https://developer.apple.com/app-store/review/guidelines/) · [Google, embedded WebView policy](https://developers.googleblog.com/en/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/) · [Expo AuthSession](https://docs.expo.dev/versions/v58.0.0/sdk/auth-session.md).
