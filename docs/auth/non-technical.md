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

| Platform                                                                            | Signup Type      | How it Works                                                                                                              |
| :---------------------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **REVA (user side)**                                                                | **Self-service** | Register with email/password, or sign in with Google — either way, the account exists instantly.                          |
| **Surfboard (user side)**                                                           | **Self-service** | Same as above — ready to submit plans right away.                                                                         |
| **GBC (public side)**                                                               | **Self-service** | Same as above — ready to manage tickets.                                                                                  |
| **Surfboard-MDA**                                                                   | **Admin-only**   | A staff member's account must be created by an administrator first; there is no public registration form for this portal. |
| **Restricted/Admin Panels** (Surfboard-restricted, REVA-restricted, GBC-restricted) | **Admin-only**   | Dedicated admin accounts must be pre-configured by an existing administrator.                                             |

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

## 7. A Known Rough Edge (as of 2026-09-04)

Admin and MDA staff accounts that sign in with **email & password** currently see an **empty navigation menu** on their dashboard sidebar (the page itself still loads correctly). This happens because the sidebar's menu-building logic was wired to the older Google-sign-in session only. Anyone hitting this today should sign in with **"Continue with Google"** instead until it's fixed. The technical detail is in [`technical.md` §9.3](./technical.md#93-a-known-gap-dashboardshells-sidebar-nav-only-sees-kinde-sourced-roles).

---

For technical specifics, see the [**Technical Guide**](./technical.md).
