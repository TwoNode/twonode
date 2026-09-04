# Authentication & Authorization System

Documentation for how login, sessions, and role-based access work across REVA, Surfboard, and GBC.

## Directory

- [**Non-Technical Overview**](./non-technical.md) — for stakeholders, admins, and anyone who wants the plain-language version: how users log in, what roles exist, what's secure about it.
- [**Technical Guide**](./technical.md) — the real implementation: the native email+password/JWT system that's the primary path today, the still-live Kinde OAuth system running alongside it, session cookies, middleware, and the permission model. Includes a currently-open bug (§9.3) worth reading before touching admin-dashboard nav code.
- [**Kinde Management API**](./kinde-management-api.md) — *retired.* Documents a Kinde-API-based admin user-management client that was deleted during the rebuild (its job is now done by `reva/services/adminUserService.ts` against the app's own database). Kept as a reference in case Kinde-API-based user management is needed again.

## Core Philosophy

1. **Two live auth systems, one converged session shape**: a native, hand-rolled email+password system is primary; Kinde OAuth (Google, etc.) still runs in parallel for its own login buttons and a few not-yet-migrated surfaces. A Kinde login also mints a native session, so most code only needs to check one thing.
2. **Platform Partitioning**: identity can be shared, but permissions are partitioned by platform — a user can hold different roles, or no role at all, on REVA vs. Surfboard vs. GBC.
3. **Encrypted/Signed Sessions**: both systems avoid expensive per-request database lookups by carrying signed or encrypted session state in cookies.
4. **Dynamic Redirection**: users land on the dashboard that matches their role and platform automatically.
