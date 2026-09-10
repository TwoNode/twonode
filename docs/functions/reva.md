# REVA — Functions (services, utils, access, hooks, layouts)

Non-component logic files specific to the REVA platform, under `reva/`.

## `reva/services/` — business logic (DB access, orchestration)

| File | Description |
|---|---|
| `adminUserService.ts` | Admin user account CRUD |
| `notificationService.ts` | Notification CRUD + read/dismiss state (user + admin) |
| `paymentService.ts` | Payment initiation/verification logic |
| `profileService.ts` | User profile CRUD |
| `propertyRequestService.ts` | Due-diligence request CRUD/lifecycle |
| `reportService.ts` | Report generation/lookup, including admin request lookups |

## `reva/utils/`

| File | Description |
|---|---|
| `revaAuth.ts` | REVA-specific auth helpers (session/role checks) |
| `secureHtml.ts` | HTML sanitization helper |

## `reva/access/`

| File | Description |
|---|---|
| `routes.ts` | Role → allowed-route map for the REVA admin panel |

## `reva/hooks/`

| File | Description |
|---|---|
| `useRevaAdminAccess.ts` | Admin access/role check hook |
| `useRevaUserAccess.ts` | User access/role check hook |

## `reva/layouts/`

| File | Description |
|---|---|
| `revaAdminPanelLayout.tsx` | Admin dashboard shell layout (sidebar + navbar composition) |
| `revaUserPanelLayout.tsx` | User dashboard shell layout |

## Top level

| File | Description |
|---|---|
| `reva/apiClient.ts` | Typed client wrapper around `/api/v1/reva/*` routes |
| `reva/colors.ts` | REVA brand color palette |
