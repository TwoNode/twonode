# Shared — Functions (hooks, lib, utils, types)

Logic used across two or more platforms, under the top-level `hooks/`,
`lib/`, `utils/`, and `types/` folders.

## `hooks/`

| File | Description |
|---|---|
| `useTheme.tsx` | Light/dark theme state + toggle |
| `use-toast.ts` | Toast notification hook |
| `use-mobile.tsx` | Responsive breakpoint (mobile) detection |
| `use-store.ts` | Generic Zustand-style store selector hook |
| `useNativeAuthRefresh.ts` | Refreshes the native (email/password) auth session, per platform |
| `use-sidebar.ts` | Sidebar open/collapsed state store |

## `lib/api/` — API route plumbing

| File | Description |
|---|---|
| `errors.ts` | Typed API error classes (`ValidationError`, etc.) |
| `pagination.ts` | Pagination query-param parsing helpers |
| `types.ts` | `ApiResult<T>` and other shared API types |
| `validate.ts` | Request body/schema validation helpers |
| `withAuth.ts` | Auth wrapper for route handlers — session check, role gating, error handling |

## `lib/auth/` — authentication

| File | Description |
|---|---|
| `authApiClient.ts` | Client wrapper for native-auth endpoints (login/register/refresh) |
| `cookies.ts` | Auth cookie read/write helpers |
| `csrf.ts` | CSRF token generation/validation |
| `emailVerification.ts` | Email verification token generation/validation |
| `jwt.ts` | JWT sign/verify helpers |
| `rateLimit.ts` | Request rate limiting |
| `session.ts` | Session read/create/destroy logic |
| `userLookup.ts` | Cross-platform user lookup by id/email |

## `lib/` — other

| File | Description |
|---|---|
| `constants.ts` | App-wide constants |
| `menu-list.ts` | Legacy/shared menu definitions |
| `observability/logger.ts` | Structured logger |
| `prisma.ts` | Prisma client singleton |
| `storage.ts` | File storage helpers (abstracts S3) |
| `utils.ts` | `cn()` class-name merge helper and other generic utilities |

## `utils/`

| File | Description |
|---|---|
| `removeIDFromParcel.ts` | Strips internal IDs from parcel/geometry data before returning to the client |
| `addBaseUrl.ts` | Prefixes a relative path with the site's base URL |
| `email.ts` | Shared transactional email sending (per-product branding) |
| `formatters.ts` | Date/number/currency formatting helpers |
| `notify.tsx` | Toast/notification trigger helper |
| `paystackConfig.ts` | Shared Paystack configuration |
| `responsiveness.ts` | Responsive layout helpers |
| `loadScript.js` | Dynamically loads an external `<script>` |
| `platform.ts` | `Platform` enum and per-platform role types |
| `encryptedCookies.ts` | Encrypted cookie read/write helpers |

## `types/`

| File | Description |
|---|---|
| `PaystackWebhookType.ts` | Paystack webhook payload types |
| `UserData.ts` | Shared user data shape |
| `UserSchemaTypes.ts` | Shared user schema types |
