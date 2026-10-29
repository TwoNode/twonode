# Authentication Overview (Non-Technical)

This document explains how the Twonodes login and security system works, for administrators, stakeholders, and anyone who wants the picture without the code.

## 1. Two Ways to Sign In

Every login page offers a choice:

- **Email & Password**: Create an account with an email and password directly on the platform. This is the primary, default way most users sign up and sign in today.
- **Continue with Google**: Sign in through **Kinde**, a professional identity provider (similar to signing in with Google elsewhere). We never see or store the Google password.

Both roads lead to the same account system — a user is a user regardless of which door they came through, and (as of the 2026-08 rebuild) logging in via Google also quietly sets up the same underlying session the email/password path uses, so the rest of the app doesn't need to care which one was used.

## 2. Common User Journey

1. **Login page**: The user lands on their platform's login page (e.g., Surfboard, REVA, GBC each have their own).
2. **Sign in or register**: They either enter email/password, or click "Continue with Google."
3. **Platform recognition**: The system checks which platform(s) this person belongs to and what role they hold there (e.g., are they a REVA Admin? A Surfboard surveyor?).
4. **Dashboard arrival**: They land on the dashboard that matches their role.

## 3. Roles and Permissions

A single person can hold different roles on different platforms:

| Platform      | Common Roles                                                                                                     | Description                                            |
| :------------ | :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **REVA**      | User, Admin, Super Admin                                                                                         | Property due-diligence report requests.                |
| **Surfboard** | User, Admin, plus 7 MDA stage roles (Accounts, Charting, SURCON, Records I/II, Intake, Archive), MDA Super Admin | Survey plan lodging and the government approval chain. |
| **GBC**       | User, Admin                                                                                                      | Event ticketing and registrations.                     |

## 4. Registration Types

| Platform                                                                            | Signup Type      | How it Works                                                                                                                                                                                        |
| :---------------------------------------------------------------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REVA (user side)**                                                                | **Self-service** | Register with email/password and confirm the address with a one-time code or link we email — the account is created only once that is confirmed. Or sign in with Google, which counts as confirmed. |
| **Surfboard (user side)**                                                           | **Self-service** | Same as above — ready to submit plans right away.                                                                                                                                                   |
| **GBC (public side)**                                                               | **Self-service** | Same as above — ready to manage tickets.                                                                                                                                                            |
| **Surfboard-MDA**                                                                   | **Invitation**   | A superadmin invites the staff member by email; they set their own password from the link. There is no public registration form for this portal.                                                    |
| **Restricted/Admin Panels** (Surfboard-restricted, REVA-restricted, GBC-restricted) | **Invitation**   | Same: a superadmin sends an invitation (valid for 7 days) and the person creates their account from the emailed link.                                                                               |

## 5. Multi-Platform Support (Use everything at once)

If someone belongs to more than one platform (say, both REVA and Surfboard), they don't need to log out of one to use the other:

- **Stay logged in everywhere**: REVA open in one tab, Surfboard in another, simultaneously.
- **One identity, several hats**: The login is the same person; which role applies just depends on which part of the site they're on.
- **Independent logout**: Logging out of one platform sends them back to _that_ platform's login page — the other platforms stay logged in until their own session naturally expires.

## 6. Security Features

- **Session timeouts**: Sessions expire after a period of inactivity, to protect an unattended device.
- **Encrypted/signed sessions**: Session data is never sent or stored in a way a third party could read or forge.
- **Rate limiting**: Repeated failed login attempts from the same source are throttled, to slow down password-guessing.
- **Partitioned access**: An admin on REVA cannot see GBC data just because they're an admin somewhere — each platform's admin privilege is granted separately.

## 7. Email Confirmation

Every account should prove it owns its email address. Each platform's superadmin controls this separately:

- **Off by default.** Nothing changes for anyone until a superadmin switches it on for a platform (Surfboard and GBC have a setting for this; REVA does not have a settings screen yet, so it stays off there).
- **Code or link.** The superadmin chooses whether people confirm with a six-digit code (valid 10 minutes) or an emailed link (valid 1 hour).
- **New accounts** created after enforcement starts must confirm before they can use the product. They land on a "confirm your email" screen with a Resend button.
- **Existing accounts** are not locked out at once. They keep working, see a banner counting down the days, and are blocked only when the grace period (30 days by default, adjustable) ends.
- **Google sign-in** counts as confirmed, and is marked as such so an administrator can tell it apart from our own confirmation.
- **An old account that was never confirmed and has a password:** the first time its owner signs in with Google using the same email, the old password is removed (we cannot tell who chose it) and the person is emailed. They stay signed in through Google and can choose a new password with "Forgot password".

## 8. Password Reset and Staff Invitations

- **Forgot password**: an emailed single-use link, valid for 1 hour. The page never reveals whether an email has an account. Using the link signs the person out everywhere else.
- **Staff invitations**: an invited person has no account until they follow the link and choose a password, so a mistyped address never leaves a live account behind. Following the link also confirms the email.

---

For technical specifics, see the [**Technical Guide**](./technical.md).

## 9. The Surfboard Mobile App

The Surfboard app for surveyors signs in with the same email and password as the website. A few points that differ from the website:

- **Only surveyor accounts** can sign in on a phone. Administrators and government (MDA) staff keep using the website.
- **No sign-up in the app.** Accounts are created on the website; the app only signs people in.
- **Signed in for up to 30 days**, then the person signs in again. A phone that loses its connection at the wrong moment does not lose the session.
- **Signed-in phones can be listed and signed out one by one**, so a lost phone can be cut off without affecting the others.
- **Throttling** is per email address and per phone (not per network), because many phones share one mobile-network address. A side effect is that someone who knows an email address can block sign-in to the app for that account for 15 minutes.
- **Google (Android) and Apple (iOS) sign-in** are planned, for existing accounts only.
