# 0018. Signing in with Google never keeps a password set on an unverified account

- **Status:** Accepted
- **Date:** 2026-10-19
- **Decided by:** roji-tech (chose to remove the password and email the person); drafted by an AI pair
- **Related:** PR #497, issue I-031, [`docs/auth/technical.md` §1.8](../auth/technical.md), [Kinde and Google research](../mobile/kinde-google-sign-in-research-2026-10-19.md)
- **Enforced by:** `lib/auth/__tests__/oauthEmailVerification.test.ts`

## Context

The `reva` and `surfboard` Kinde callbacks link a Google sign-in to an existing account **by email**, then mark it verified. An old account that was never email-verified and has a password was made by someone who was never shown to own the address (124 of 126 Surfboard users were unverified when checked). If the real owner later signs in with Google, the account is linked and marked verified, while the first person still knows the password and keeps access. New registrations verify the email first, which limits this to old accounts.

## Decision

When a Kinde sign-in is linked to an account that is **not** email-verified and **has a password**, the app removes the stored password hash, revokes every refresh token, then marks the email verified (`OAUTH`) and emails the person (what happened, that they are signed in, how to set a password again through "Forgot password"). Verified accounts and accounts with no password are untouched. `verifyEmailViaOAuth` (`lib/auth/oauthEmailVerification.ts`) does this; both self-service callbacks use it. The future mobile Kinde exchange must use the same helper.

## Alternatives considered and rejected

- **Do nothing.** Leaves the takeover path open.
- **Refuse to link.** Locks out real people who simply chose Google later.
- **Keep the password but require an emailed code before linking.** Stronger for people who want to keep a password, but longer sign-in and more work; possible later.
- **Email the owner only, keep the password.** Does not stop the first person.

## Consequences & Downsides

- A real owner who registered with email and password, never verified, and tries Google for the first time with the same address also loses the password. They are signed in through Google, are emailed, and can set a password again with "Forgot password".
- Assumes the identity provider only returns provider-verified addresses. The mobile Kinde application should be limited to Google and Apple connections so that holds.
- A failure to send the email is logged and never blocks sign-in.
- The effect shrinks as email-verification enforcement is rolled out, because fewer accounts qualify.

**Binds:** `lib/auth/oauthEmailVerification.ts`, `app/api/auth/success/reva/route.ts`, `app/api/auth/success/surfboard/route.ts`, `lib/auth/userLookup.ts` (`clearPasswordHash`), `utils/email.ts` (`sendPasswordRemovedNotice`).
