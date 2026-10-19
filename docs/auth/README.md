# Authentication & Authorization System

Documentation for how login, sessions, and role-based access work across REVA, Surfboard, and GBC.

## Directory

- [**Non-Technical Overview**](./non-technical.md) — for stakeholders, admins, and anyone who wants the plain-language version: how users log in, what roles exist, what's secure about it.
- [**Technical Guide**](./technical.md) — the real implementation: the native email+password/JWT system that's the primary path today, the still-live Kinde OAuth system running alongside it, session cookies, middleware, and the permission model. Covers OTP/link-first registration (§1.7), email-verification enforcement (§1.8, including known gaps), admin invitations (§1.2) and the dual-system architecture (§9).
- **Mobile app sessions** — [§1.5a of the Technical Guide](./technical.md): bearer-token sign-in for the Surfboard app (`/api/v1/auth/mobile/*`), device sessions, and the CSRF and refresh rules that go with it. Decision record: [ADR-0017](../adr/0017-the-mobile-app-signs-in-with-bearer-tokens.md). Linking a Google sign-in to an unverified password account: [ADR-0018](../adr/0018-google-sign-in-never-keeps-a-password-on-an-unverified-account.md).
- [**Kinde Management API**](./kinde-management-api.md) — _retired._ Documents a Kinde-API-based admin user-management client that was deleted during the rebuild (its job is now done by `reva/services/adminUserService.ts` against the app's own database). Kept as a reference in case Kinde-API-based user management is needed again.

## Core Philosophy

1. **Two live auth systems, one converged session shape**: a native, hand-rolled email+password system is primary; Kinde OAuth (Google, etc.) still runs in parallel for its own login buttons and a few not-yet-migrated surfaces. A Kinde login also mints a native session, so most code only needs to check one thing.
2. **Platform Partitioning**: identity can be shared, but permissions are partitioned by platform — a user can hold different roles, or no role at all, on REVA vs. Surfboard vs. GBC.
3. **Encrypted/Signed Sessions**: both systems avoid expensive per-request database lookups by carrying signed or encrypted session state in cookies.
4. **Dynamic Redirection**: users land on the dashboard that matches their role and platform automatically.
5. **Native apps use bearer tokens, browsers use cookies**: the Surfboard mobile app has its own routes that return the session in the response body (no cookies); everything downstream reads one session shape. Only surveyor (`USER`) accounts may sign in on a phone.
6. **Verified identities**: self-service accounts are created only after the email is confirmed (OTP or link); enforcing confirmation on _existing_ accounts is a per-platform superadmin setting, off by default, with a grace period. Google sign-ins count as verified.
