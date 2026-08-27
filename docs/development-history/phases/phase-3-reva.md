# Phase: Architecture Rebuild Phase 3 — REVA (full migration)

**Status:** Spec written, all open questions resolved, execution starting. **Date:** 2026-08-27.

## Why

REVA is the second product to get Phase 1/2's proven pattern: `"use server"` action files become Prisma-only services behind typed `/api/v1/reva/*` routes, plus a route/nav registry replacing REVA's own hand-rolled, hook-based access checks. REVA is meaningfully smaller than Surfboard (3 Prisma models vs. 20+, 3 roles vs. 11) but starts from a cleaner slate in one sense and a messier one in another: there's no existing `reva/` folder, no pilot registry, and no `/api/v1/reva/*` routes yet — this phase builds the pattern from scratch rather than extending Phase 1's pilot the way Phase 2 did.

This spec is built from a complete read of `revaActions.ts`, `revaActions2.ts`, and `reva-restricted/actions/adminDbActions.ts` (every exported function catalogued), not from the plan's earlier high-level intent — and it corrects two things the plan assumed that turned out not to match the real code.

## Source inventory — corrections to the plan's assumptions

**`revaActions2.ts` is NOT dead code — it backs a live, production-critical path.** (Correcting an initial research pass that missed this — worth recording the correction itself, since it's exactly the kind of claim that needs verifying before anyone acts on it.) It carries no `"use server"` directive and has no *component/page* importing it, but the shared multi-product Paystack webhook handler — **`app/api/webhooks/paystack/route.ts`, not `app/api/reva/webhooks/paystack/route.ts`** — imports it wholesale (`import * as reva from ".../revaActions2"`) and calls five of its functions on every successful REVA charge: `updatePropertyTransactionStatus`, `updateOneTimeTransactionStatus`, `authGetTransactionData`, `getTransactionData`, `notifyPaymentReceived`. This is the real confirmation path for REVA payments — not a dead file.

The good news: all 5 of those specific functions are confirmed byte-identical to their `revaActions.ts` counterparts (per the fuller diff below), and none of them touch the broken `getAuthenticatedRevaUser` stub that makes a few *other*, genuinely-unused functions in this file unsafe (`authPaymentSuccessful`, `getUserProperties` — those two have no call sites anywhere, webhook included). So there's no behavior to reconcile for the live path — it's the same logic, just currently imported from the wrong place. **Migration implication**: once `propertyRequestService.ts`/`paymentService.ts`/`notificationService.ts` exist, `app/api/webhooks/paystack/route.ts`'s REVA branch gets repointed to import from them instead of `revaActions2.ts` — this is a required step in this phase's sequencing, not an optional cleanup. Only *after* that repoint can `revaActions2.ts` be deleted (its remaining functions — `authPaymentSuccessful`, `getUserProperties`, the two Paystack-config duplicates, the broken stub itself — are then genuinely unreferenced).

**The guest tracking page already exists — the plan's "no client view page" claim was wrong.** `app/(projects)/reva/onetimerequest/page.tsx` is a real, working status page: reference+email lookup (no login), a Submitted → In Progress → Completed tracker, payment/report-approval badges, and a download-report affordance once approved. It's linked from the approval email, the post-payment landing page, and both the user-side and admin-side request lists. The actual (smaller) gap: `checkPaymentSuccess`'s payment-confirmation email doesn't include this page's link — only the *approval* email does. A guest who pays but whose report isn't approved yet has no emailed way back to the tracker if they lose the tab. Worth fixing as a small addition during this phase, not a new page build.

**The `OneTimeUserProperty` notification gap is real, and the mechanism is now precisely understood.** `approveOneTimeDueDiligenceReport` (`adminDbActions.ts`) has its entire notification-trigger block commented out — not because it crashes, but because whoever wrote it correctly avoided calling `notifyReportReady(property, property.user.id)` (the pattern the sibling `approveDueDiligenceReport` uses for regular `Property` rows) since `OneTimeUserProperty` has no `user` relation at all, only a plain `email` field. The guest still gets an email today (`sendMail({to: property.email, ...})` fires independently), just no `Notification` DB row and no `notifySystemAlert` admin-side echo. **Needs a decision**: build a `OneTimeUserProperty`-safe notification path (keyed on `email`, not `user.id`) during this phase, or leave the email-only behavior as intentional and just remove the dead commented-out code?

**REVA's real action-file surface is 9 files, not 2.** `revaActions.ts` (1,488 lines) and `adminDbActions.ts` (47KB, the admin-side counterpart) are the two substantial ones and this phase's real migration targets. The other 7 (`authActions.ts`, `awsActions.ts`, `otherActions.ts`, `paystackActions.ts`, `profileActions.ts` on the user side; `otherActions.ts` on the admin side) are thin utility wrappers — S3 upload, Paystack init/verify delegation, cookie helpers — and stay as `"use server"` files, called from the new services via dynamic import exactly like Phase 2 kept `notificationActions.ts`/`awsActions.ts` as-is for Surfboard. **`profileActions.ts`'s `updateUserProfile`/`updateUserPassword` are TODO stubs with no real logic** — needs a decision: implement for real in this phase, or explicitly scope out and leave as stubs?

**No MDA-equivalent nav-filtering gap exists for REVA.** Checked deliberately, since Phase 2 found this bug in Surfboard's MDA panel. REVA's `revaAdminPanelLayout.tsx` already conditionally renders its two SUPERADMIN-only items (Superadmin, Notifications) correctly; everything else is appropriately shown to both `ADMIN` and `SUPERADMIN` per `canAccessRevaAdminPanel`. No fix needed here — but a smaller, real redundancy was found instead: **`hooks/useRevaAdminAccess.ts` redeclares its own local `canAccessRevaUserPanel`** instead of importing the one from `permissions.ts` — currently behaviorally identical, a second copy of the same logic that could silently diverge if one is ever edited without the other. Fixed as part of the registry work below (same category of bug the analytics-service dedup caught in Phase 2).

**Two parallel guest/authenticated route trees exist and need reconciling, not just registering.** `reva/verifypayment` + `reva/viewdetails` (guest, top-level) sit alongside `reva/dashboard/verifypayment` + `reva/dashboard/viewdetails` (authenticated) — near-duplicate pages for the logged-out vs. logged-in cases. The registry work should register both, but whether they should eventually collapse into one route with conditional rendering is a design question for you, not assumed here.

## Roles

Much simpler than Surfboard: `Role` enum (`prisma/schema/reva.prisma`) is `USER | ADMIN | SUPERADMIN`, reused via `permissions.ts`'s `REVA_ROLES` object — no MDA-style sub-roles. `canAccessRevaUserPanel` allows all 3 roles (admins can reach the regular user panel too, same asymmetry Surfboard had); `canAccessRevaAdminPanel` allows `ADMIN`/`SUPERADMIN`; `canAccessRevaSuperAdminPanel` is `SUPERADMIN`-only.

## Service extraction

### From `revaActions.ts` → 3 services (`reva/services/`)

**`propertyRequestService.ts`** — CRUD for both `Property` (authenticated) and `OneTimeUserProperty` (guest), kept together since they're the same conceptual entity split across two tables:
- `saveToOneTimeProperty`, `saveToPropertyTable`, `updateOneTimeTransactionStatus`, `updatePropertyTransactionStatus`, `getUserPropertyById`, `getUserProperties` (+ private `getAllUserProperties`), `getTransactionData`, `authGetTransactionData`, `getOneTimeRequestByReference`, `downloadOneTimeRequestReport`

**`paymentService.ts`** — Paystack-integrated submission and verification, depends on `propertyRequestService.ts` for the underlying create/update calls:
- `saveFormDataAndInitiatePaystack`, `checkPaymentSuccess`, `authSaveFormDataAndInitiatePaystack`, `authPaymentSuccessful`

**`notificationService.ts`** — the generic `Notification` CRUD + trigger functions (not in the plan's original 3-service list, but real, substantial, cross-cutting functionality that needs its own home rather than being crammed into the two above):
- `createNotification`, `getUserNotifications`, `getAdminNotifications`, `getSuperAdminNotifications`, `markNotificationAsRead`, `dismissNotification`, `getUnreadNotificationCount`, `notifyNewPropertyRequest`, `notifyPaymentReceived`, `notifyReportReady`, `notifySystemAlert`
- **Not migrated**: `testNotificationAccessControl`, `testNotificationCreation` — dev-only integration-test functions, zero route call sites, same treatment as Surfboard's `deleteAllBatches` (not exposed over HTTP; delete in Phase 5 if no longer needed for manual testing).

### From `reva-restricted/actions/adminDbActions.ts` → 2 services (new scope beyond the plan's original naming, discovered by reading the file)

**`reportService.ts`** (matches the plan's original name) — admin review/approval of due-diligence reports:
- `getAllRequestsWithUserByAdmin`, `getRequestByReferenceByAdmin`, `getOneTimeRequestByReferenceByAdmin`, `uploadDueDiligenceReport`, `uploadDirectLinkReport`, `approveDueDiligenceReport`, `approveOneTimeDueDiligenceReport` (gets its notification path fixed here, per the open question above, once you've answered it)

**`adminUserService.ts`** (new — this is real admin user-management functionality the original 3-service plan didn't account for, since it wasn't visible until `adminDbActions.ts` was actually read):
- `createAdminUser`, `getAllAdminUsers`, `getAllUsers`, `makeUserAdmin`, `removeAdminPrivileges`, `deactivateUser`, `reactivateUser`, `deleteUser`
- `verifyRevaAdminPermissions`/`verifyRevaSuperAdminPermissions` fold into `withAuth`'s role check at the route layer, same as every other product — not migrated as standalone functions.
- `sendEmailToAllAdmins`/`sendEmailToAllSuperAdmins`/`sendMail` (email helpers currently living in `adminDbActions.ts`) — check for overlap with the existing `utils/email.ts` (`sendEmailToAdmin`) before deciding whether these become internal helpers inside the two services above or get promoted to a shared `reva/utils/email.ts`. Not a blocking decision, just don't duplicate an email-sending utility that already exists.

**`profileService.ts`** (new — resolved from an open question, not in the plan's original scope): `getProfile`/`updateProfile` against `RevaUser` (`firstName`/`lastName`/`email`), replacing `profileActions.ts`'s dead stubs and the disabled UI in `UserProfile.tsx`. Password change needs no new function — it calls the existing `/api/v1/auth/change-password` route (already supports `Platform.REVA`), so this service is profile-fields-only.

**Not migrated, stays a server action**: `otherActions.ts` (both the user-side cookie helper and the admin-side `getSecureHtml`), `authActions.ts`, `awsActions.ts`, `paystackActions.ts` — thin utility layers, same reasoning as Surfboard's untouched 17. `profileActions.ts` itself gets its two functions replaced by real implementations in `profileService.ts` (see above) rather than staying a stub file.

## API route inventory

Same shape as every product so far: `withAuth<RevaRole>(handler, {platform: Platform.REVA, roles: [...]})`, `validateBody` + Zod, `ApiResult<T>` responses. Guest-facing `OneTimeUserProperty` routes have no session — they authenticate the caller via the existing reference+email shared-secret pair (matching the source's own `getOneTimeRequestByReference(reference, email)` pattern exactly, not inventing a new guest-auth mechanism).

### Representative schemas

```ts
// POST /api/v1/reva/properties — saveToPropertyTable (authenticated) — multipart, so validated
// after file upload rather than via a single JSON validateBody call, same pattern
// Surfboard's plan-creation route used for its file arrays.
const createPropertySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  address: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  lga: z.string().min(1),
  parcelId: z.string().optional(),
  totalCost: z.number().positive(),
  documentsUrls: z.array(z.string().url()),
  siteImages: z.array(z.string().url()),
  comments: z.string().optional(),
});

// POST /api/v1/reva/one-time-properties — saveToOneTimeProperty (public/guest)
const createOneTimePropertySchema = createPropertySchema.extend({
  requester: z.string().optional(),
  email: z.string().email(),
  userPhoneNumber: z.string().optional(),
}).omit({ /* title/description not part of the guest form per the source */ });

// GET /api/v1/reva/one-time-properties/lookup?reference=&email= — getOneTimeRequestByReference
// public; reference+email pair IS the auth, matching the source exactly

// POST /api/v1/reva/payments/one-time/verify — checkPaymentSuccess
const verifyOneTimePaymentSchema = z.object({ reference: z.string().min(1) });

// POST /api/v1/reva/payments/verify — authPaymentSuccessful (authenticated)
const verifyPaymentSchema = z.object({ reference: z.string().min(1) });

// POST /api/v1/reva/admin/reports/:reference/approve — approveDueDiligenceReport /
// approveOneTimeDueDiligenceReport (one shared route, :isOneTime resolved server-side
// by checking which table the reference belongs to, mirroring the source's own
// two-function split rather than forcing a single ambiguous model)
const approveReportSchema = z.object({ isApproved: z.boolean(), comment: z.string().optional() });

// POST /api/v1/reva/admin/users — createAdminUser
const createAdminUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "SUPERADMIN"]),
});
```

### Full route table

| Route | Method | Service fn | Roles | Notes |
|---|---|---|---|---|
| `/properties` | GET | `getUserProperties` | USER, ADMIN, SUPERADMIN | own properties |
| `/properties` | POST | `saveToPropertyTable` (via `authSaveFormDataAndInitiatePaystack` for the full submit+pay flow) | USER, ADMIN, SUPERADMIN | multipart |
| `/properties/:id` | GET | `getUserPropertyById`-equivalent for `Property` (source doesn't have one — see open question) | USER, ADMIN, SUPERADMIN | owner |
| `/properties/:id/status` | PATCH | `updatePropertyTransactionStatus` | USER, ADMIN, SUPERADMIN | owner |
| `/properties/transactions/:reference` | GET | `authGetTransactionData` | USER, ADMIN, SUPERADMIN | owner |
| `/one-time-properties` | POST | `saveFormDataAndInitiatePaystack` | *public* | multipart, guest submit + Paystack init |
| `/one-time-properties/:id` | GET | `getUserPropertyById` | *public* | id-based, no email check in source — flag if this should also require email match for consistency with the reference+email pattern used elsewhere |
| `/one-time-properties/:id/status` | PATCH | `updateOneTimeTransactionStatus` | *public* | matches source (no auth check today) |
| `/one-time-properties/lookup` | GET | `getOneTimeRequestByReference` | *public* | `?reference=&email=` — the real guest auth pattern |
| `/one-time-properties/lookup/report` | GET | `downloadOneTimeRequestReport` | *public* | `?reference=&email=`, gated on `report.isApproved` |
| `/one-time-properties/transactions/:reference` | GET | `getTransactionData` | *public* | |
| `/payments/one-time/initiate` | POST | (part of `saveFormDataAndInitiatePaystack`) | *public* | |
| `/payments/one-time/verify` | POST | `checkPaymentSuccess` | *public* | body: `{reference}` |
| `/payments/verify` | POST | `authPaymentSuccessful` | USER, ADMIN, SUPERADMIN | body: `{reference}` |
| `/notifications` | GET | `getUserNotifications`/`getAdminNotifications`/`getSuperAdminNotifications` | any authenticated | one route, role from session picks which — not a caller-supplied param like the source's current (unverified) `role` argument |
| `/notifications` | POST | `createNotification` | ADMIN, SUPERADMIN | |
| `/notifications/:id/read` | POST | `markNotificationAsRead` | any authenticated | |
| `/notifications/:id/dismiss` | POST | `dismissNotification` | any authenticated | |
| `/notifications/unread-count` | GET | `getUnreadNotificationCount` | any authenticated | |
| `/admin/requests` | GET | `getAllRequestsWithUserByAdmin` | ADMIN, SUPERADMIN | |
| `/admin/requests/:reference` | GET | `getRequestByReferenceByAdmin` / `getOneTimeRequestByReferenceByAdmin` | ADMIN, SUPERADMIN | one route, resolves which table server-side |
| `/admin/requests/:reference/report` | POST | `uploadDueDiligenceReport` / `uploadDirectLinkReport` | ADMIN, SUPERADMIN | multipart or `{directLink}` body, mirrors source's 2 upload paths |
| `/admin/requests/:reference/approve` | POST | `approveDueDiligenceReport` / `approveOneTimeDueDiligenceReport` | ADMIN, SUPERADMIN | body: `{isApproved, comment?}` |
| `/admin/users` | GET | `getAllUsers` / `getAllAdminUsers` | ADMIN, SUPERADMIN / SUPERADMIN | `?scope=all\|admins` |
| `/admin/users` | POST | `createAdminUser` | SUPERADMIN | |
| `/admin/users/:id/role` | PATCH | `makeUserAdmin` / `removeAdminPrivileges` | SUPERADMIN | body: `{action: "promote"\|"demote"}` |
| `/admin/users/:id/status` | PATCH | `deactivateUser` / `reactivateUser` | SUPERADMIN | body: `{active: boolean}` |
| `/admin/users/:id` | DELETE | `deleteUser` | SUPERADMIN | |
| `/profile` | GET | `getProfile` | USER, ADMIN, SUPERADMIN | own profile |
| `/profile` | PATCH | `updateProfile` | USER, ADMIN, SUPERADMIN | body: `{firstName?, lastName?, email?}` — password change goes through the existing `/api/v1/auth/change-password` instead, not a route in this table |

## Route/nav registry

New file, `reva/access/routes.ts` — greenfield, same shape as `surfboard/access/routes.ts` (`RevaRouteEntry {path, label, icon, roles, group}`, `RevaRouteGroup = "admin" | "user"`, `canAccessRoute`/`getNavItemsForRole`). No MDA-equivalent group needed.

Replaces the current pattern: nav items hand-written inline inside `revaAdminPanelLayout.tsx`/`revaUserPanelLayout.tsx`, and access checks split across `permissions.ts`'s `canAccessReva*` functions plus `hooks/useRevaAdminAccess.ts`/`useRevaUserAccess.ts` (client-side redirect hooks) — the latter's redundant local `canAccessRevaUserPanel` redeclaration gets deleted in favor of importing from the registry, closing the small drift-risk found above.

Entries needed (from the full page inventory): admin group covers `reva-restricted/dashboard/{,alluserrequests,review,payment-verification,spatial-record,notifications,settings,superadmin}`; user group covers `reva/dashboard/{,allrequests,newrequest,notifications,settings,verifypayment,viewdetails,viewmap}` plus the top-level guest-facing `reva/{verifypayment,viewdetails,onetimerequest,requestform}` (marked accordingly — these don't require a role at all, but still benefit from being in one registry for the folder-move-era layout components to read from).

## Folder move

Broader than the plan originally named, since the cataloging pass found more scattered files than expected:

`components/reva/shared/*` (5 components + `index.ts`), `components/layouts/reva{Admin,User}PanelLayout.tsx`, `hooks/useReva{Admin,User}Access.ts`, `utils/revaAuth.ts`, `components/headers/Reva{Admin,User}DashboardHeader.tsx`, `components/admin-panel/RevaLoading.tsx`, `components/pageNotFound/RevaPageNotFound.tsx`, `styles/reva-colors.css` → `reva/{components,layouts,hooks,utils}`.

**Color-file fork resolved**: root `reva-colors.ts` (221 lines, 17 importers) and `lib/reva-colors.ts` (216 lines, 2 importers) differ by exactly one 5-line block (`sidebar.itemBorderLeft`, present only in the root file — and confirmed genuinely used elsewhere, via `components/sidebars/menu.tsx:63`). Root is canonical — more complete, far more widely used. Becomes `reva/colors.ts`; the 2 files importing `lib/reva-colors.ts` (`RevaLoading.tsx`, `components/ui/loading-spinner.tsx`) get repointed — confirmed safe by reading both: neither renders a sidebar or references `.sidebar` at all, they only use `REVA_COLORS`/`REVA_GRADIENTS` for spinner styling, so the fork's one real difference never applied to them anyway.

**Also found, now resolved**: `reva-restricted/dashboard/spatial-record/` has both `SpatialRecordMap.tsx` (35 lines, a real implementation — extracts and executes script tags from injected HTML) and `SpatialRecordMap.jsx` (6 lines, a bare stub). Next.js's module resolution prefers `.tsx` in a TypeScript project when both exist with the same basename, and `page.tsx`'s own `import SpatialRecordMap from "./SpatialRecordMap"` confirms the `.tsx` file is what's actually live. The `.jsx` stub is dead; delete it during the folder move.

## Decisions (resolved 2026-08-27)

1. **`OneTimeUserProperty` notification gap** — **build the email-keyed path.** `notificationService.ts` extends `notifyReportReady`/`notifySystemAlert` to accept an email-keyed guest identity alongside the existing `user.id`-keyed one, so admins get the same system-alert echo for one-time-request approvals that they already get for regular `Property` ones. Replaces the dead commented-out block in `approveOneTimeDueDiligenceReport` with a real implementation instead of just deleting it.

2. **`profileActions.ts` stubs — real functions needed, not scope-out, per a closer look at the actual call site.** Read `UserProfile.tsx` (the REVA settings page) directly: the `updateUserProfile`/`updateUserPassword` calls are themselves commented out in the component, and so is the entire Edit/Save button UI and the whole password-change tab — meaning today's REVA settings page is silently **read-only**, with half-finished scaffolding for editing that was disabled at both the UI and action layer rather than completed. This needs fixing for real:
   - **Profile fields** (`firstName`/`lastName`/`email`): new `reva/services/profileService.ts` with `getProfile`/`updateProfile` against `RevaUser`, mirroring Surfboard's own working `app/(projects)/(surfboard)/actions/profile.ts` pattern (confirmed by reading it) — simpler than Surfboard's version since `RevaUser` has no KYC/company fields to edit, just the 3 above.
   - **Password change**: **no new function needed at all.** `/api/v1/auth/change-password` (built in Phase 1) already fully supports `Platform.REVA` — confirmed by reading `lib/auth/userLookup.ts`, which already branches on `Platform.REVA` for lookup/update. The REVA settings page's Security tab just needs re-enabling to call this existing shared endpoint (`{platform: "reva", currentPassword, newPassword}`), not a REVA-specific password function.
   - Added as its own service in the plan below (`profileService.ts`), not folded into an existing one — it's a distinct concern (account settings, not property/payment data).

3. ~~`revaActions2.ts`~~ — done. `app/api/webhooks/paystack/route.ts`'s REVA branch (`handleReva`) repointed onto `propertyRequestService.ts`/`notificationService.ts` and rewritten more defensively (metadata parsing, a missing/already-Paid record returning cleanly, a new idempotency check, amount reconciliation matching Surfboard's `onCertificatePaymentSuccess`) rather than a 1:1 import swap, since this file dispatches Surfboard/REVA/GBC events from one entry point. `revaActions2.ts` deleted. Also fixed along the way (pre-existing, not REVA-specific, affects every platform's diagnostic webhook email): `escapeHtml` threw on `JSON.stringify(undefined)` for a field new/removed between events, silently dropping the diff table from the notification email. 8 new tests; verified live with a real HMAC-signed request against local Postgres.

4. **Two parallel guest/authenticated route trees** — **register both as-is** in the registry (no collapse). Additionally: rename `viewdetails` → `details` in both trees as part of the folder-move step (a naming cleanup alongside the registry work, same mechanics as Phase 2's `surf-restricted` → `surfboard-restricted` rename — physical folder rename + a permanent redirect from the old path, not a silent break).

5. **`/one-time-properties/:id` route** — **add the email-match check**, closing the inconsistency with every other guest-data route in this product.

6. **Email-helper consolidation** — resolved: confirmed genuine duplication, not just overlap. `adminDbActions.ts`'s `sendMail` is functionally identical (same Zoho transport, same options shape) to `utils/email.ts`'s existing `sendMail` — a real duplicate, not a variant. Plan: `reportService.ts`/`adminUserService.ts` call `utils/email.ts`'s `sendMail` directly; `sendEmailToAllAdmins`/`sendEmailToAllSuperAdmins` (genuinely new bulk-recipient behavior, not duplicated in `utils/email.ts`) move into `utils/email.ts` as siblings to `sendMail`, so there's one email utility file instead of two.

7. ~~`SpatialRecordMap.tsx` vs `.jsx`~~ — resolved above, `.tsx` is live, `.jsx` is a dead stub.

## Sequencing

Same discipline as Phase 2 — plumbing before consumers, live-verified at each step, not just `tsc`/`build`:
1. ~~Answer the open questions above~~ — done, see Decisions section.
2. `propertyRequestService.ts` (foundational — `paymentService.ts` depends on it).
3. `paymentService.ts`.
4. **Repoint `app/api/webhooks/paystack/route.ts`'s REVA branch** from `revaActions2.ts` to the new `propertyRequestService.ts`/`paymentService.ts`/`notificationService.ts` — required before `revaActions2.ts` can be deleted, and worth doing right after `paymentService.ts` lands rather than at the end, so this real dependency doesn't get forgotten. Live-verify this specific change carefully (a real payment webhook, shared across products) before moving on.
5. `notificationService.ts` (independent of 2-4 otherwise, but needed for step 4 above and for the email-keyed guest-notification path from Decision 1).
6. `reportService.ts` (depends on `propertyRequestService.ts` for the underlying data, and on `notificationService.ts`'s email-keyed path for `approveOneTimeDueDiligenceReport`).
7. `adminUserService.ts` (independent of everything above).
8. `profileService.ts` (independent of everything above — real `getProfile`/`updateProfile`, plus re-enabling `UserProfile.tsx`'s disabled edit UI and Security tab, the latter wired to the existing `/api/v1/auth/change-password` route).
9. `reva/access/routes.ts` registry, replacing the inline nav lists and the redundant `useRevaAdminAccess.ts` role check.
10. Folder move (color-file fork resolution included — confirmed safe, see above; includes the `viewdetails` → `details` rename across both route trees, with a permanent redirect for the old path, same mechanics as Phase 2's naming standardization).
11. `revaActions2.ts` deletion — only after step 4 confirms zero remaining references (webhook repointed, `authPaymentSuccessful`/`getUserProperties` confirmed to have no other call sites either).
12. Live verification pass: full guest flow (submit → pay → track via `onetimerequest` → admin approves → guest sees approved status, now with a real notification), full authenticated flow (submit → pay → admin review → report delivered), admin user-management actions, profile edit + password change through the settings page, the repointed webhook with a real test charge, plus this report's own completion update.
