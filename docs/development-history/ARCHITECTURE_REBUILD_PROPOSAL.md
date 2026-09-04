# Twonodes Architecture Rebuild — Proposal v1

Status: **Draft for review** — nothing in here is being built yet.
Scope: REVA, Surfboard, GBC (proplity stays a separate, independent app — nothing from it is merged in; only its auth *patterns* are being ported natively into twonodes).

---

## 1. Executive Summary

Twonodes has grown into three real products (REVA, Surfboard, GBC) sharing one Next.js app, one Prisma schema, and one Kinde auth integration. That sharing was cheap early on and is now the source of most of the mess: a 1,146-line schema mixing four unrelated domains, ~30 server-action files (some over 5,000 lines) that mix HTTP concerns, business logic, and side effects in one function, no API boundary at all (server actions are called directly from client components, untyped, unversioned, unrateable), and a session/auth model with no rotation, no revocation, and no CSRF protection.

This proposal replaces server actions with a **versioned REST API layer** (per your request), splits business logic out into a **service layer** underneath it, gives each product its **own schema file**, and adds a **native email+password auth system** (built in-house, following proplity's security patterns — not its code) that runs *alongside* Kinde rather than replacing it. Kinde narrows to social login (Google, etc.); the native system handles direct email+password; both converge on one app-issued session.

This is a foundational rebuild, done in an isolated git worktree, migrated product-by-product rather than as a big-bang cutover.

---

## 2. Why This Rebuild — Problem Inventory

Grounded in the full-codebase review and the recent Surfboard QA pass. Nothing below is speculative; each item was confirmed by reading the actual code.

### 2.1 No API boundary
Every mutation and most reads go through `"use server"` action files imported directly into client components — `codActions.ts` (~5,700 lines), `surfboardActions.ts` (~3,700 lines), `revaActions.ts` (1,488 lines) plus a **second, divergent** `revaActions2.ts` (1,326 lines) used only by the webhook handler, `ticket-actions.ts` (1,284 lines). Consequences:
- No consistent request validation, error shape, or auth check — each function re-implements its own guard.
- No rate limiting anywhere, including on payment-adjacent and auth-adjacent actions.
- No way to version a contract or expose it to anything other than this Next.js app.
- Business logic, Prisma calls, notification sends, and email sends are all interleaved in one function — nothing is unit-testable in isolation. (One partial exception: Surfboard has `utils/prismaErrorHandler.ts` with real test coverage in `__tests__/prismaErrorHandler.test.ts` — the one piece of the codebase that got this right. But it's Surfboard-only, used in just 7 of its ~30+ action files, and REVA/GBC have no equivalent at all. See §4.7.)
- The two REVA action files have **drifted**: `saveToOneTimeProperty`, `saveToPropertyTable`, `checkPaymentSuccess`, `authPaymentSuccessful` are defined twice with different implementations, depending on whether you're in the UI path or the webhook path.

### 2.2 Auth has no rotation, revocation, or CSRF story
`app/api/auth/success/{platform}/route.ts` mints one `USER_SESSION` cookie via `jose`'s `EncryptJWT` after Kinde redirects back, and that's it — no refresh rotation, no reuse detection, no CSRF validation on state-changing routes, no rate limiting on login-adjacent endpoints. If that cookie leaks, it's valid until it expires, full stop. This is the one piece of proplity worth porting *as a pattern*: bcrypt, short-lived access JWTs, rotating refresh tokens with theft detection (a replayed, already-rotated token revokes its whole token family), CSRF checks, and rate limiting.

### 2.3 Monolithic files mixing unrelated concerns
`codActions.ts` alone handles: optimistic locking (`acquirePlanLock`/`releasePlanLock`), FIFO queue gating, PostGIS zone-fee calculation (`$queryRaw` + `ST_Intersects`), Remita receipt parsing/verification, batch CRUD, and notification dispatch — in one file, in the same functions. This is *why* bugs like the TC-008/009 QR-earnings gap were possible: there was no seam to test the CoD-availability logic in isolation from the HTTP/notification code around it.

### 2.4 Dead code and drift
- `app/(projects)/(surfboard)/actions/certificateActions.ts` — fully unreferenced, TODO-riddled parallel implementation of CoD/OSSG submission.
- `app/(projects)/(surfboard)/adminActions/surfboardAdminActions.ts` — unimported anywhere; a second copy of plan create/update logic.
- `app/api/webhooks/paystack/route___.ts` — an orphaned old webhook handler (not routed, since Next.js only recognizes `route.ts`, but sitting there as a trap for the next person who greps).
- Empty, git-untracked route folders still referenced by docs as live: `api/reva/onetimerequest`, `api/reva/verify-payment`, `api/surfboard/{batches,update-record-copy,users}`, `api/twonodes/`, `api/user/`.
- `app/(noPopUp)/gbccertificate` and `app/(main)/gbc-frame` are a leftover ArcGIS/Survey123 course tool that happens to share the "GBC" initials with the actual GBC 2.0 conference product — genuinely confusing to anyone searching the codebase for "gbc".
- Root-level `reva-colors.ts`, `gbc-colors.ts`, `surfboard-colors.ts` exist alongside `lib/reva-colors.ts` (a near-duplicate, one token different), and imports are inconsistent about which one they pull from.
- `sequelize/` (empty model/config dirs) and the `mongoose` dependency are entirely unused — confirmed zero imports repo-wide.
- **A plaintext production Postgres credential is committed in `test.js`** (`postgresql://postgres:reva15p0stgres@revadb...rds.amazonaws.com/reva`). This is unrelated to the rebuild's timeline and should be rotated and purged immediately regardless of when the rest of this happens — flagging again here so it isn't lost.

### 2.5 One schema file, four domains
`prisma/schema.prisma` is 1,146 lines mixing REVA, Surfboard, GBC, and a couple of genuinely shared models (`Notification`, `WebhookEvent`) with no file-level boundary between them. Every product's migration touches the same file.

### 2.6 Admin/staff areas: three naming conventions, one fact kept in sync by hand three times
Every product has a staff-facing area, and every product spells it differently: `app/(projects)/reva-restricted` (hyphenated top-level route group), `app/(projects)/(surfboard)/surf-restricted` (same pattern, but Surfboard *also* has a second, separate staff tree at `surf-mda/dashboard/*` for its 8 MDA sub-roles), and `app/(projects)/(GBC)/gbc/restricted` (nested path, with a login route spelled `gbc/restricted-login` — a fourth variant of the same idea in the same product).

Surfboard's MDA tree is the sharpest example of the underlying problem: `surf-mda/dashboard/{accounts,archive,charting,intake,records-i,records-ii,surcon}` — eight near-identical page trees, each showing a role's queue, lock UI, and approve/query actions, hand-copied per role. Which roles can reach which routes is decided in **`proxy.ts`**, by string-matching the pathname per role (`pathname.includes("/accounts") && role !== "ACCOUNTS"`, repeated for each of the 8 roles) — a fact that has to independently agree with the folder structure *and* whatever's hand-typed into `surfboardMDAPanelLayout.tsx`'s nav array. Three places holding one fact, kept in sync by hand, is exactly the mechanism that produced TC-003 (missing nav buttons on the very first Surfboard QA pass) — there's no seam that would catch a route existing without a matching nav entry, or vice versa. The same hand-maintained-nav-array pattern repeats across all 7 layout files in `components/layouts/` (`revaAdminPanelLayout`, `revaUserPanelLayout`, `surfboardAdminPanelLayout`, `surfboardMDAPanelLayout`, `surfboardUserPanelLayout`, `gbcAdminPanelLayout`, `gbcUserPanelLayout`), not just Surfboard's.

### 2.7 Stale documentation
`MDs/surfboard.txt` and `COD_IMPLEMENTATION_PROGRESS.md` describe a Paystack-based two-fold CoD payment flow; the shipped code uses direct Remita receipt-link verification instead. `MDA_ADDONS.md` says plan-review locks last 30 minutes; the code says 6. These aren't alternate documented paths — they're just out of date, and will keep drifting unless docs live next to the code they describe.

---

## 3. Guiding Principles

1. **One way to do each thing.** One auth system's worth of session logic, one API convention, one place business logic lives per domain — not two files that can drift.
2. **HTTP concerns and business logic are separate.** Route handlers validate, authorize, and shape responses. Services hold the actual logic and are callable from a route handler, a webhook, or a test — the same function, not a re-implementation.
3. **Every product looks the same on disk.** Once you know where Surfboard's plan-approval logic lives, you know where REVA's property-approval logic lives.
4. **Migrate in slices that ship.** No big-bang cutover; each phase leaves the app fully working.
5. **The rebuild doesn't block feature work.** Bug fixes and small features keep landing on `main` throughout; the rebuild happens in a worktree and merges in reviewed slices.

---

## 4. Target Architecture

### 4.1 API Layer

Every server action becomes a versioned REST route under `app/api/v1/{product}/...`, following proplity's own conventions (which are genuinely solid and worth mirroring exactly, not reinventing):

```
app/api/v1/
  surfboard/
    plans/route.ts                 GET (list), POST (create)
    plans/[id]/route.ts            GET, PATCH, DELETE
    plans/[id]/lock/route.ts       POST (acquire), DELETE (release)
    plans/[id]/approve/route.ts    POST { role: "accounts" | "charting" | ... }
    cod-batches/route.ts
    cod-batches/[id]/route.ts
    qr/access-state/route.ts       GET ?planId=&token=
    qr/payments/route.ts           POST (initiate), route.ts/verify (verify)
    settings/qr-earnings/route.ts  GET, PATCH
  reva/
    properties/route.ts
    properties/[id]/route.ts
    ...
  gbc/
    tickets/route.ts
    tickets/[ticketNumber]/checkin/route.ts
    ...
  auth/
    login/route.ts
    register/route.ts
    refresh/route.ts
    logout/route.ts
    me/route.ts
```

Shared plumbing lives in `lib/api/` (directly modeled on proplity's `lib/api/*`):

```ts
// lib/api/withAuth.ts
export function withAuth(handler: Handler, opts?: { roles?: Role[]; platform: Platform }) {
  return async (req: NextRequest, routeCtx?: any) => {
    const session = await getServerSession(opts.platform);
    if (!session) return apiError(401, "Unauthenticated");
    if (opts?.roles && !opts.roles.includes(session.role)) {
      return apiError(403, "Forbidden");
    }
    return handler(req, { session }, routeCtx);
  };
}
```

```ts
// Example: app/api/v1/surfboard/qr/payments/verify/route.ts
export const POST = withAuth(async (req) => {
  const body = await validate(req, verifyPaymentSchema); // zod
  const result = await qrEarningsService.verifyPayment(body.reference, body.paystackRef);
  return apiResponse(result);
}, { platform: "surfboard" }); // public route — payer isn't a logged-in surveyor, see note below
```

Every response uses one envelope shape (`{ success, data }` or `{ success: false, error, details? }`), defined once in `lib/api/types.ts`, so a client never has to guess the shape per-endpoint. List endpoints get real pagination (`lib/api/pagination.ts`) instead of `take: 50` scattered through action files.

**Client side**, a typed API client replaces direct action imports:

```ts
// surfboard/apiClient.ts
export const surfboardApi = {
  plans: {
    list: (params) => apiFetch<PlanListResponse>("/api/v1/surfboard/plans", { params }),
    approve: (id, role) => apiFetch(`/api/v1/surfboard/plans/${id}/approve`, { method: "POST", body: { role } }),
  },
  qr: {
    verifyPayment: (reference, paystackRef) =>
      apiFetch("/api/v1/surfboard/qr/payments/verify", { method: "POST", body: { reference, paystackRef } }),
  },
};
```

Client components call `surfboardApi.plans.approve(id, "accounts")` instead of importing a server action — same DX, real HTTP boundary underneath, and now interceptable for loading states, retries, and error toasts in one place instead of per-component `try/catch`.

**Public/unauthenticated routes** (the QR-earnings paywall pages, the public survey-plan verification page) get their own routes without `withAuth`, but still go through validation and rate limiting — these are exactly the routes that most need it, since they're the ones exposed to arbitrary internet traffic today with none.

### 4.2 Auth: Kinde + Native, One Session Underneath

- **Kinde**: narrowed to social login only (Google, etc.). Its hosted UI, OAuth flow, and callback handling are untouched.
- **Native**: a new, in-house email+password system per the proplity pattern — bcrypt (cost 12), `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me`, `/change-password`. Not proplity's code — its own implementation, sized to twonodes' multi-product needs.
- **Convergence**: regardless of which path a user authenticates through, the app mints its own session — a short-lived (15min) access-token JWT plus a rotating refresh token (random bytes, only its SHA-256 hash stored, `familyId`/`revokedAt`/`replacedBy` for reuse detection exactly like proplity's `RefreshToken` model). `withAuth` only ever has to understand this one format. Kinde's own session cookie becomes an implementation detail of the login step, not something route handlers ever check.
- CSRF validation and rate limiting apply to every auth-adjacent route (`/login`, `/register`, `/refresh`) — currently absent entirely.

New/changed data shape (per platform's `User` table — `RevaUser`, `SurfboardUser`, `GBCUser`):

```prisma
model SurfboardUser {
  // ...existing fields...
  passwordHash   String?        // null if this account has never set a password (Kinde-only)
  authProviders  AuthProvider[] @default([KINDE])  // KINDE | PASSWORD — a user can have both
}

enum AuthProvider {
  KINDE
  PASSWORD
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  platform   Platform  // discriminator — see open question 6.1
  tokenHash  String    @unique
  familyId   String
  revokedAt  DateTime?
  replacedBy String?
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  @@index([familyId])
}
```

### 4.3 Data Layer: Split Schema, Domain-Owned

Prisma's multi-file schema support (stable, no preview flag needed on the `prisma ^6.7` this repo already runs — confirmed against proplity's own `prisma/schema/*.prisma` folder on Prisma `^7.9`) lets `schema.prisma` become:

```
prisma/schema/
  core.prisma       # Notification, WebhookEvent, RefreshToken — genuinely shared
  reva.prisma        # Property, OneTimeUserProperty, RevaUser
  surfboard.prisma    # SurfboardPlan, CertificateOfDepositBatch, QREarningsTransaction, ...
  gbc.prisma          # GBCUser, GBCTicket, GBCSponsor, ...
  gis.prisma          # nigeria_ward_admin_boundaries, Scale_of_fees, LASG_charting_interpretation
```
Zero runtime change — same generated client, same database. Pure organization. This is the lowest-risk, highest-clarity change in the whole proposal and can land early.

### 4.4 Service Layer

Between the route handler and Prisma sits a service module per domain, holding the actual business logic with no HTTP or Next.js imports. It lives in that product's own folder (§4.5), not a shared `lib/`:

```
surfboard/services/
  planLockService.ts       # acquirePlanLock, releasePlanLock, canWorkOnPlan
  codFeeService.ts          # getZoneFromGeometry, calculatePlanFeeByZone
  qrEarningsService.ts       # initiatePayment, verifyPayment, getAccessState
  batchApprovalService.ts    # the accounts/charting/surcon/recordsI/recordsII chain
```

This is what makes `codActions.ts`'s 5,700 lines tractable — each concern gets its own file and, critically, becomes unit-testable without spinning up a route or a browser. It's also what fixes the REVA `revaActions.ts` / `revaActions2.ts` drift: the webhook handler and the UI-triggered flow call the *same* `revaService.saveToPropertyTable(...)`, so there's structurally only one implementation to drift from.

### 4.5 Folder & Module Conventions — One Real Folder Per Product

Today a Surfboard change touches five unrelated top-level directories: `app/(projects)/(surfboard)/`, `components/layouts/surfboard*PanelLayout.tsx`, `components/surfboard/`, `hooks/useSurfUserProfile.ts`, `utils/surfAuth.ts`, plus a root-level `surfboard-colors.ts` — each shared with REVA's and GBC's equivalents interleaved in the same folders. That scatter is a direct contributor to §2.6's drift and to dead files like `surfboardAdminActions.ts` existing unnoticed.

**The one hard constraint**: Next.js requires `page.tsx`, `layout.tsx`, and `route.ts` files to physically live under `app/` — that can't be relocated. Everything else can. So the fix is: `app/` becomes a thin routing shell, and one real top-level folder per product — `surfboard/`, `reva/`, `gbc/` — holds everything else that's actually product-specific:

```
surfboard/
  components/          # QRPaywallModal, KycClient, MaplibreMap, ... (was components/surfboard/ + scattered)
  layouts/              # this product's DashboardShell config (was components/layouts/surfboard*PanelLayout.tsx)
  hooks/                 # useSurfUserProfile.ts
  services/               # planLockService, codFeeService, qrEarningsService, batchApprovalService (§4.4)
  access/                  # routes.ts — the role/nav registry (§4.8)
  utils/                    # surfAuth.ts, remita.ts, CoDFees.ts
  types/                     # surfboardTypes.ts
  colors.ts                  # design tokens (was root-level surfboard-colors.ts)
  apiClient.ts                # typed client (§4.1)

reva/        # identical shape: components/ layouts/ hooks/ services/ access/ utils/ types/ colors.ts apiClient.ts
gbc/          # identical shape

app/
  (projects)/(surfboard)/     # thin: each page.tsx imports and renders from surfboard/components|layouts
  api/v1/surfboard/            # thin: each route.ts validates + calls surfboard/services, wrapped in lib/api/*
  (projects)/reva/, reva-restricted/
  api/v1/reva/
  (projects)/(GBC)/gbc/, gbc-restricted/
  api/v1/gbc/

lib/                # ONLY infrastructure with no single product owner
  prisma.ts
  api/                 # withAuth, errors, validate, pagination — §4.1, §4.7
  auth/                 # session, jwt, cookies, csrf, rateLimit — §4.2
  storage.ts, email.ts, constants.ts

components/
  ui/                  # shadcn primitives only (button, dialog, popover, ...) — genuinely generic, stays shared
  admin-panel/          # DashboardShell + shared chrome (navbar, user-nav) — §4.8, consumed by all 3 products' registries
  Navbar/, headers/       # public marketing-site chrome (the twonodes.com root site, not any one product)

prisma/schema/surfboard.prisma, reva.prisma, gbc.prisma, core.prisma   # §4.3
```

A component, hook, or util only ever lives in a shared location (`lib/`, `components/ui/`, `components/admin-panel/`) if it has **no single product owner** — genuinely generic UI atoms, or infrastructure like the Prisma client singleton that every product uses identically. Anything with a product's name in its purpose lives in that product's folder, full stop. This alone would have prevented `surfboardAdminActions.ts` (a second, unimported copy of plan CRUD, sitting in a different folder than the real one) from existing unnoticed — there's exactly one place to add plan-update logic, and it's obvious from the folder you're already in.

### 4.6 Testing

Adopt `vitest` (matching proplity) for the service layer at minimum, extending the one place this repo already got it right (`prismaErrorHandler.test.ts`) to everywhere else. The service-layer split makes this straightforward — a service function takes plain inputs, returns plain outputs, no request/response objects to mock.

### 4.7 Unified Error Handling

Right now error handling is three different maturity levels depending on which product you're in: Surfboard has `prismaErrorHandler.ts` (a genuinely thorough ~30-code Prisma error-message table, tested, but shaped to return a *string* for the old `{success:false, error}` server-action convention, and only wired into 7 of Surfboard's own files). REVA and GBC have nothing — bare `catch (error) { return {success:false, error: "Something went wrong"} }` scattered per function, sometimes leaking the raw error, sometimes not.

Proplity's own `lib/api/errors.ts` is a cleaner shape for an actual API layer — `handleApiError(err)` returns a real `NextResponse` with the right status code — but its Prisma-code coverage is thin (3 codes; everything else falls to a generic 500). The plan is a synthesis: proplity's route-response *shape*, twonodes' more thorough Prisma-code *coverage*, made available to every product instead of just Surfboard.

```ts
// lib/api/errors.ts — one implementation, all products

// Base class for anything a service intentionally throws with a known
// HTTP mapping. Route handlers only ever need to catch this one type.
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export class ValidationError extends ApiError { constructor(details: unknown) {
  super(400, "VALIDATION_ERROR", "Invalid request"); this.details = details; } details: unknown; }
export class UnauthenticatedError extends ApiError { constructor() { super(401, "UNAUTHENTICATED", "Not signed in"); } }
export class ForbiddenError extends ApiError { constructor() { super(403, "FORBIDDEN", "Not allowed"); } }
export class NotFoundError extends ApiError { constructor(entity: string) { super(404, "NOT_FOUND", `${entity} not found`); } }
export class ConflictError extends ApiError { constructor(message: string) { super(409, "CONFLICT", message); } }
export class RateLimitError extends ApiError { constructor() { super(429, "RATE_LIMITED", "Too many requests"); } }

// Route-level wrapper — one place every route's error path funnels through.
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code, details: (err as any).details }, { status: err.status });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json({ success: false, error: PRISMA_ERROR_MESSAGES[err.code] ?? "Database error", code: err.code }, { status: prismaStatusFor(err.code) });
  }
  console.error(err); // structured logging — see open question 6.6
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}
```

Two kinds of errors flow through this:
- **Technical errors** (validation, auth, not-found, Prisma conflicts) — the classes above, thrown from anywhere (route handler or service).
- **Domain errors** — product-specific failure reasons that aren't generic HTTP concepts: `PlanLockedError` (Surfboard, someone else is reviewing this plan), `InsufficientBalanceError` (Surfboard wallet withdrawal), `ApprovalChainIncompleteError` (Surfboard CoD). These extend `ApiError` too (so the same route-level `handleApiError` catches them), but are defined next to the service that throws them (`surfboard/services/errors.ts`), not centralized into one unrelated file — same "every product looks the same on disk" principle as everything else here.

Route handlers get one line: `catch (err) { return handleApiError(err); }` — or this lives inside `withAuth`/a thin `withErrorHandling` wrapper so individual routes don't even write the try/catch.

**Client side**, the typed API client (§4.1) parses the `{success:false, error, code}` envelope once and throws a matching client-side error, so a component does one `catch` instead of re-deriving `res.error || "fallback"` per call site — this is the same pattern QRPaywallModal, KycClient, and every other component we touched this session currently hand-roll individually.

### 4.8 Admin / Restricted / MDA Dashboards

The fix for §2.6 is the same idea applied to *access control and navigation*: one declarative registry per product instead of the same fact (which roles see which routes, with what label/icon) hand-typed in three places — plus, per your call, one consistent naming convention for the staff-facing route group across all three products instead of three different spellings.

**Standardized naming** — every product's staff area becomes `{product}-restricted`, matching the pattern REVA already uses correctly (2 of 3 products were already close to this; GBC and Surfboard's `surf-` abbreviation are the outliers):

| Product | Public app (unchanged) | Staff app (today) | Staff app (standardized) |
|---|---|---|---|
| REVA | `/reva` | `/reva-restricted` | `/reva-restricted` *(no change)* |
| Surfboard | `/surfboard` | `/surf-restricted` | `/surfboard-restricted` |
| Surfboard MDA | — | `/surf-mda` | `/surfboard-mda` |
| GBC | `/gbc` | `/gbc/restricted` (nested) + `/gbc/restricted-login` | `/gbc-restricted` (flattened to a top-level group, sibling to `/gbc`, matching the other two) |

This is a live-URL change, so it needs a rollout mechanic, not just a file rename: add redirects for the old paths in `next.config.mjs` (`redirects()`, old → new, 308 permanent) for some transition window, and update each platform's Kinde application config (post-login/post-logout redirect URIs currently point at the old paths). Do this as part of that product's migration phase (§5) rather than a separate pass, since the route files are moving anyway.

```ts
// surfboard/access/routes.ts — one file, one source of truth
export const surfboardRoutes = [
  { path: "/surfboard-restricted/dashboard", roles: ["ADMIN", "SUPERADMIN"], nav: { label: "Home", icon: Home } },
  { path: "/surfboard-restricted/dashboard/settings", roles: ["ADMIN", "SUPERADMIN"], nav: { label: "Settings", icon: Settings } },
  { path: "/surfboard-restricted/dashboard/qr-earnings", roles: ["ADMIN", "SUPERADMIN"], nav: { label: "QR Earnings", icon: QrCode } },
  { path: "/surfboard-mda/dashboard/:role", roles: ["ACCOUNTS","CHARTING","SURCON","RECORDS_I","RECORDS_II","INTAKE","ARCHIVE","MDA_SUPERADMIN"], nav: { label: "Review Queue", icon: ClipboardCheck } },
  // ...
] satisfies RouteEntry[];
```

This one registry feeds three consumers that today are three independent, hand-synced implementations:
1. **`proxy.ts`** looks up the matched entry for the current pathname and checks `session.role` against `entry.roles`, replacing the current per-role `pathname.includes(...)` chain.
2. **The nav/sidebar** renders `entry.nav` for every route the current role has access to — a route with no nav entry just doesn't render, and there's no way to add a page without it showing up (or a conscious `nav: null` for pages that are intentionally not in the sidebar).
3. **The MDA dashboards collapse from 8 route trees to 1.** `surfboard-mda/dashboard/:role` becomes a single parametrized route reading the signed-in user's role from session, backed by the `batchApprovalService` (§4.4) already responsible for "what's my queue / can I lock this / can I approve this" logic. One implementation instead of eight copies of the same review-queue-with-lock-and-approve UI.

**Layouts** collapse similarly: the 7 `*PanelLayout.tsx` files become one `DashboardShell` component (`components/admin-panel/`, §4.5) parametrized by `{product, role}`, sourcing its nav from each product's registry above and its branding from that product's color tokens (`surfboard/colors.ts` etc., §4.5).

This section is explicitly scoped to *structure, naming, and access control* — the actual approval-workflow business logic each MDA role's dashboard drives (locking, fee calc, OSSG lodging) is already covered by the service-layer split in §4.4 and doesn't change again here.

---

## 5. Migration Plan

Everything below happens in an isolated worktree/branch; `main` keeps shipping fixes and small features throughout.

**Phase 0 — Housekeeping** (low-risk, mostly deletion, can land fast even ahead of the rest)
Rotate the leaked DB credential; remove `test.js`, `sequelize/`, the `mongoose` dependency, `certificateActions.ts`, `surfboardAdminActions.ts`, `route___.ts`, the empty API-route folders. Root-level color-file forks (`reva-colors.ts` vs `lib/reva-colors.ts`, etc.) get resolved into each product's folder (`surfboard/colors.ts` etc., §4.5) once that product's phase creates the folder — no separate interim home needed.

**Phase 1 — Foundations**
Split `schema.prisma` into domain files. Build `lib/api/*` (withAuth, validate, errors — §4.7, pagination). Build the native auth system + the Kinde/native session convergence. Build the route/access registry pattern (§4.8) and the shared `DashboardShell`. Ship one pilot API-layer migration end-to-end — the QR Earnings module (small, self-contained, and the module we just spent this session deeply debugging, so its behavior is well understood and easy to verify against).

**Phase 2 — Surfboard**
Migrate the rest of Surfboard into `surfboard/` (§4.5): plan CRUD, the MDA approval chain, CoD batches, subscriptions. This is the largest product and the one most in need of the service-layer split (`codActions.ts`). Collapse the 8 `surf-mda/dashboard/{role}` trees into the single registry-driven route from §4.8, and rename `surf-restricted`→`surfboard-restricted`, `surf-mda`→`surfboard-mda` with redirects + updated Kinde URIs — all the same body of work as the service-layer migration, not separate efforts.

**Phase 3 — REVA**
Migrate property requests, payment verification, admin report upload/approval into `reva/` (§4.5). Resolve the `revaActions.ts`/`revaActions2.ts` drift as part of this — there's only one service afterward. `reva-restricted` keeps its name (already standardized).

**Phase 4 — GBC**
Migrate ticketing, check-in, CMS actions (gallery/sponsors/speakers/partners) into `gbc/` (§4.5). Flatten `gbc/restricted` → top-level `gbc-restricted` (redirects + updated Kinde URIs), fixing the `restricted-login` naming variant in the same move.

**Phase 5 — Retirement**
Delete the old `"use server"` action files once every caller has moved to the API client. Update any remaining direct-import references.

Each phase ends with the affected product fully working end-to-end before the next phase starts.

---

## 6. Open Decisions Needing Your Sign-off

**6.1 — Refresh tokens: one shared table or one per product?**
Given a user can already be simultaneously logged into REVA, Surfboard, and GBC (the existing multi-platform `USER_SESSION` cookie supports this today), I'd default to **one shared `RefreshToken` table with a `platform` column** rather than three separate tables — keeps revocation/rotation logic in one place. Flagging in case you'd rather keep products fully data-isolated even at the session-table level.

**6.2 — Do existing Kinde-authenticated users get anything different?**
Default assumption: no visible change. They keep logging in via Kinde exactly as today; the only difference is that after the Kinde callback, the app now issues its own rotating session instead of the single static `USER_SESSION` cookie. The new email+password option is additive, not a forced migration.

**6.3 — Can a user link both login methods to one account?**
Given the `authProviders` array in §4.2, the door's open for someone to have both a Google-linked login and a password set on the same account. Do you want that (an "add a password" option in account settings for Kinde-originated accounts), or should the two paths always create/own separate accounts even if the email matches?

**6.4 — API versioning granularity**
Proposal defaults to one `v1` for the whole app (`/api/v1/{product}/...`), not a separate version per product. Simpler until there's a reason to version REVA independently of Surfboard; flag if you want per-product versioning from day one.

**6.5 — Where does the "Phase 0" housekeeping land? — Resolved: never `main` directly**
`main` stays reserved — nothing in this rebuild, including Phase 0, commits or pushes to it directly. Phase 0 gets its own short-lived branch (`rebuild/housekeeping`), merged via review before Phase 1 starts, keeping the "lands fast, low-risk" spirit intact without touching `main` directly. This applies beyond just the rebuild — see the standing workflow note it's now filed under.

**6.6 — Error observability: what it is and what to pick**
Right now, when something breaks in production — a Paystack webhook throws, a Prisma query fails, a Remita receipt fails to parse — the only record of it is `console.error`, which on Vercel means it exists in that deployment's function logs for a limited retention window and nowhere else. Nobody gets notified; there's no way to search "show me every failure in the last 7 days," group identical errors together, see which user/request triggered one, or get an alert the moment a webhook handler starts failing. An error-observability tool closes that gap: it captures every thrown error (automatically, via the wrapper in §4.7 or a global handler), gives you a dashboard of them grouped by type/frequency, keeps stack traces + request context (which route, which user, which platform) attached to each one, and can alert (email/Slack) when a new error type appears or an existing one spikes. This matters more once server actions become API routes and webhooks, not less — right now a silently-failing webhook (like the GBC Paystack-events-not-processed gap noted in the earlier codebase review) is invisible until a customer complains; with this, it's a dashboard entry the moment it happens.

Options, roughly cheapest-to-richest:
- **Do nothing new** — keep `console.error`, rely on Vercel's function logs. Free, but exactly today's blind spot.
- **Structured logging only** — every error logged as JSON with consistent fields (route, platform, userId, requestId) instead of a raw string, searchable in Vercel's log drain/whatever ships them. No dashboard, no alerting, but a real step up from today's ad hoc `console.error(err)` calls for close to zero setup cost.
- **Sentry** (or a similar APM: Axiom, Highlight, Better Stack) — the standard choice for this in the Next.js ecosystem, has a generous free tier, and is a ~15-minute install (`@sentry/nextjs` wraps `next.config.mjs` and auto-instruments route handlers). Gets you grouping, alerting, stack traces with source maps, and a searchable dashboard, per-platform if you tag events with which product they came from.

My default recommendation would be Sentry, wired in at §4.7's `handleApiError` (one line: `Sentry.captureException(err)` before the generic-500 fallback) — but this is a real cost/tooling decision (a new paid-tier dependency once you outgrow the free tier), not something to default into silently. Confirm which of the three you want, or say if you'd rather revisit this after the rebuild's done.

**6.7 — Admin route naming: decided**
Per your call, resolved into §4.8's standardized naming table rather than left as an open question — `{product}-restricted` across all three, `surfboard-mda` for the government-role tier. No further decision needed here; §4.8 has the concrete before/after and the rollout mechanics (redirects + Kinde URI updates).

---

## 7. Risks & Mitigations

- **Scope creep across a ~30-action-file, 3-product surface.** Mitigated by strict phase boundaries — each phase is a mergeable, fully-working slice, not a partial cutover.
- **Behavioral drift during migration** (a service subtly does something different than the action it replaced). Mitigated by: pilot on the QR Earnings module first (small, just debugged, easy to diff behavior against), and by writing service-layer tests *before* deleting the old action, not after.
- **Auth migration is the highest-blast-radius piece** — a bug here locks users out of everything. Mitigated by keeping Kinde's own flow completely untouched (only what happens *after* its callback changes), and by rolling the native session-issuance out behind the existing per-platform routes one platform at a time rather than globally.

---

## 8. Explicitly Out of Scope

- Anything from proplity's actual codebase (models, routes, UI) — it stays fully separate.
- A visual/brand redesign — this proposal is architecture only. UI/UX design conversations happen separately once you're ready for them.
- Replacing Prisma, Paystack, Remita, or the map stack (ArcGIS/Leaflet/MapLibre) — none of that is implicated by anything above.
