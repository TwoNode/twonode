# Phase: Architecture Rebuild Phase 4 — GBC (full migration)

**Status:** Spec written, all open questions resolved, execution starting. **Date:** 2026-08-28.

## Why

GBC is the third and final product to get Phase 1–3's proven pattern: `"use server"` action files become Prisma-only services behind typed `/api/v1/gbc/*` routes, plus a route/nav registry replacing hand-rolled access checks. GBC is comparable in size to REVA (11 real Prisma models vs. REVA's 3, but a similarly small 3-tier role system) and, like REVA, starts from a clean slate — no `gbc/` folder, no registry, no `/api/v1/gbc/*` routes yet.

This spec is built from a complete read of all 12 files under `app/(projects)/(GBC)/actions/` (~3,600 lines), the full `gbc.prisma` schema, every auth-guard file in the repo, and the existing page/component tree — not from the plan's earlier high-level intent. It corrects the plan's action-file count (11 assumed, 12 real, two of which the plan's service list didn't account for at all) and, more importantly, surfaces something the plan had no way to know about without reading the actual code.

### Critical finding, already fixed ahead of this spec

`app/(projects)/(GBC)/utils/auth.ts`'s `requireAdmin()`/`requireAuth()` — the guard 10 of the 12 action files call to gate every admin mutation — had their real Kinde/database check **entirely commented out** and unconditionally returned a hardcoded fake admin. Every ticket/sponsor/speaker/gallery/partner/upload/inquiry/settings mutation in the product was therefore callable by anyone who could reach the server action's reference directly, no session or role required at all (`proxy.ts` gates the restricted *pages* correctly via the real multi-platform session, but Next.js Server Actions are invokable without visiting the page that would normally block access). Fixed as an interim hotfix (commit `f1031de` on `rebuild/foundations`, 2026-08-28) using the same Kinde session + `GBCUser` lookup the already-built-but-unused `getCurrentGBCUser()`/`checkIsAdmin()` correctly implement — full writeup in `progress.md`. This spec's service migration will replace `requireAdmin()` entirely with typed `withAuth<GBCRole>` routes, same as every other product; the hotfix is the bridge until each service ships.

A follow-up sweep (same day) checked every auth-guard-shaped function across the whole repo (`surfAuth.ts`, `revaAuth.ts`, `gbcAuth.ts`, both `authActions.ts` files, `withAuth.ts`) — the GBC stub was isolated, not a wider pattern. It did surface one more dead-but-correct GBC auth implementation (`utils/gbcAuth.ts` — `verifyGBCAdminAccess`/`getAuthenticatedGBCUserFromCookie`/etc., zero importers anywhere) noted below for cleanup, and one unrelated finding out of this phase's scope: `surfboard-restricted/dashboard/certificates/page.tsx` (Phase 2, already marked complete) is a live, nav-registered admin page that only renders hardcoded mock data instead of real batch data — flagged to you, not touched here.

## Source inventory

### The real action-file surface is 12 files, not 11

| File | Lines | Fate |
|---|---|---|
| `ticket-actions.ts` | 1,284 (+ ~35 for the new `getGBCTicketAvailability` split, already added) | → `ticketService.ts` |
| `settings-actions.ts` | 619 | → `settingsService.ts` — **the plan's service list omitted this file entirely** |
| `upload-actions.ts` | 326 | → folded into `cmsService.ts` (all 4 upload kinds are for sponsor/partner/speaker/gallery entities `cmsService` already owns) |
| `admin-actions.ts` | 283 | → `adminUserService.ts` — **also omitted from the plan's list**; this is the *live* admin-management implementation (see below) |
| `contact-actions.ts` | 240 | → `contactService.ts` (inquiry functions only — see dead-code note) |
| `sponsor-actions.ts` | 235 | → `cmsService.ts` (sponsors + the live partner functions embedded in this file) |
| `gallery-actions.ts` | 182 | → `cmsService.ts` |
| `speaker-actions.ts` | 162 | → `cmsService.ts` |
| `user-actions.ts` | 109 | **dead — not migrated** |
| `partners-actions.ts` | 83 | **dead — not migrated** |
| `qr-verification.ts` | 67 | → `qrCheckinService.ts` |
| `certificate-actions.ts` | 59 | → `certificateService.ts` |

### Three duplicate/dead code paths, resolved by checking real importers (not guessed)

Mirrors the same discipline Phase 2 used for `codActions.ts`'s dead create/update generations and Phase 3 used for `revaActions2.ts`'s true liveness — grep for every consumer before deciding, not assume from function names.

1. **`user-actions.ts` (4 functions: `getGBCUsers`, `getGBCUserById`, `updateGBCUserRole`, `deleteGBCUser`) — zero importers anywhere in the app.** The live `/gbc/restricted/users` page exclusively imports from `admin-actions.ts`. Not migrated.
2. **`contact-actions.ts`'s tacked-on `getGBCUsers`/`updateGBCUserRole` (a "USER MANAGEMENT" section stapled onto an inquiries file) — also dead.** Its real consumers (`InquiriesTable.tsx`, `ContactForm.tsx`, `gbc/restricted/inquiries/page.tsx`) only touch the inquiry functions. Not migrated; `contactService.ts` gets only the inquiry surface.
3. **`partners-actions.ts` (`getPartners`, `createGBCPartner`, `deleteGBCPartner`) — fully dead.** The one real consumer, `gbc/sponsors/page.tsx`, imports partner functions from `sponsor-actions.ts`'s own byte-for-byte duplicate copy instead (confirmed by reading the actual import line: `import { getPartners, getSponsors } from "../../actions/sponsor-actions"`). `cmsService.ts`'s partner functions come from `sponsor-actions.ts`.

`admin-actions.ts` is not just the live one but the better-designed one: `updateAdminRole`/`deleteAdmin`/`toggleAdminStatus` all guard against self-demotion/self-deletion/self-deactivation, protections `user-actions.ts`'s dead equivalents never had. It does need one fix during migration: `getAllAdmins` hardcodes a personal-email exclusion (`NOT: { email: { in: ["rojitech9@gmail.com"] } }`) — becomes a `DEV_EMAIL` env-var check, matching `reva/services/adminUserService.ts`'s existing pattern.

### Two smaller dead-code notes

- **`generateTicketNumber()`** (`utils/index.ts`) — hardcodes the `"GBC2"` prefix and is never called anywhere; real ticket numbers come from `GBCTicket.ticketNumber`'s Prisma `@default(dbgenerated(...))`, which hardcodes the *same* `'GBC2_'` prefix at the DB level. This is the literal thing the edition-metadata work (below) fixes — moving generation from a hardcoded SQL default to `${activeEdition.ticketPrefix}_...` computed in `ticketService.ts`.
- **`utils/gbcAuth.ts`** (`getAuthenticatedGBCUser`, `getAuthenticatedGBCUserFromCookie`, `verifyGBCAdminAccess`, `verifyGBCUserAccess`, `getUserFromGBCDB`) and `utils/auth.ts`'s `getCurrentGBCUser`/`checkIsAdmin`/`checkIsSuperAdmin` — all correctly implemented, all zero importers. Both get deleted once every route this phase touches moves onto `withAuth<GBCRole>`, which supersedes all of them.

### Public vs. admin ticket-stats split (already done, part of the hotfix)

`getGBCTicketStats()` (revenue + full payment-status breakdown) is now `requireAdmin()`-gated; the two public pages that need capacity-only numbers (`gbc/page.tsx`, `gbc/tickets/page.tsx`) call the new `getGBCTicketAvailability()` instead. `ticketService.ts` keeps this split — `getTicketAvailability()` public, `getTicketStats()` admin-only.

## Resolved decisions (2026-08-28)

Four asked directly, three more resolved by investigation.

**Asked:**
1. **Auth-fix timing** → interim hotfix now, not folded into the phased migration. Shipped same day (`f1031de`), see above.
2. **My Ticket / checkout screens** — the plan's "accepted from the design-overview artifacts, review still needed" turned out to have no artifacts to review; designed fresh as an original UI/UX pass (see below), not ported from anything.
3. **Disabled public-user login (`/gbc/login`, already renamed to `_page.tsx` so it 404s)** → repurposed as My Ticket's entry point rather than left dead. Since `GBCTicket` has no relation to `GBCUser`, a real login was never the right flow for ticket-holders — reusing this path avoids orphaned dead code and gives My Ticket a natural, discoverable URL.
4. **`getGBCTicketStats()`'s missing auth gate** → treated as an oversight, not a design choice; gated like everything else, with the availability/stats split above closing the resulting public-page gap.

**Resolved by investigation, not assumed:**

5. **Does `GBCContactInquiry` need an `edition` tag?** (left explicitly open in `implementation-plan.md`.) No. Checked `ContactForm.tsx`'s actual type options: General / Sponsorship / Media & Press / Speaking Opportunity — all four are naturally forward-looking or edition-agnostic ("interested in sponsoring GBC" doesn't presuppose which edition, especially for inquiries that arrive before the next edition is even announced). Tagging it would force every inquiry into an edition bucket it may not belong to. `GBCContactInquiry` stays untagged.
6. **`admin-actions.ts` vs. `user-actions.ts`/`contact-actions.ts`'s duplicate admin/user-management functions** — resolved above by import-tracing; `admin-actions.ts` is canonical.
7. **`sponsor-actions.ts` vs. `partners-actions.ts`'s duplicate partner functions** — resolved above; `sponsor-actions.ts`'s copy is canonical.

## Edition metadata (carried from `implementation-plan.md`, 2026-08-24, restated here as the execution reference)

GBC has run as 1.0, 2.0, and will keep running annually, but nothing in the schema reflects that. Confirmed by reading `gbc.prisma` directly: every model is flat and implicitly single-conference, `GBCTicket.ticketNumber`'s DB default hardcodes `'GBC2_'`, and `GBCSettings` is a singleton JSON blob the next edition would silently overwrite.

- **`GBCSettings.settings.editions`**: a new array, not a new table — extends the JSON blob that already holds event config today. Shape: `{ key: "2.0", name, theme, subTheme, venue, startDate, endDate, status: "UPCOMING" | "ACTIVE" | "PAST", ticketPrefix }[]`. Exactly one entry has `status: "ACTIVE"` at a time (enforced in `editionService.ts`, not the DB — this is JSON).
- **`edition: String` tag column** (not a FK — a categorical label, same reasoning REVA's `Property.reference` uniqueness is app-level not DB-level) added to `GBCTicket`, `GBCSponsor`, `GBCPartner`, `GBCSpeaker`, `GBCEventStats`. Existing rows backfill to `"2.0"` (their ticket numbers already say `GBC2_`, the natural anchor).
- **Ticket-number generation moves** from the Prisma `dbgenerated` SQL default to `ticketService.ts`, reading `ticketPrefix` off the active edition — closes the `generateTicketNumber()`/DB-default double-hardcode noted above in one motion.
- **`GBCContactInquiry` stays untagged** — resolved above.

### New pages this enables

- **Public "Past Editions" page** (`gbc/editions`) — lists `PAST`-status editions from `settings.editions`, each linking to a read-only recap: theme, a stats snapshot (attendee count, sponsor/speaker roster — **no revenue**, same public/admin split as ticket stats), gallery filtered to that year.
- **Admin event-switcher**, dual purpose, reading the same `settings.editions` list: selecting the `ACTIVE` edition gives today's full editable management view (tickets, check-in, sponsors — everything already scoped to the active edition implicitly since it's the only one being actively sold); selecting any `PAST` edition swaps every admin list/query to `WHERE edition = '<key>'` and disables mutations — a read-only overview with real numbers (tickets sold, revenue included since this is admin-only, checked-in count, sponsor/speaker roster as they were). Without this, staff have no way to answer "how did 2.0 perform" once 3.0 is live.

## My Ticket + checkout screens (original design — no source artifacts existed to port)

Since `GBCTicket` has no relation to `GBCUser` — buyers never get an account — this follows REVA's `onetimerequest` precedent: reference+email (here, **ticket number + email**, since a group/pair purchase shares one payment reference across several attendees, and "My Ticket" means *your* ticket specifically, not everyone's who paid alongside you) is the auth, not a login.

- **Entry point**: `/gbc/login` — the disabled route itself (`_page.tsx` → `page.tsx`, its content replaced) per decision #3 above, not the homepage. A clean two-field lookup form (ticket number, email), styled as a proper standalone page, not a login form wearing a different label. Errors on mismatch say "we couldn't find that ticket" (matches REVA's `getUserPropertyById`'s resolved not-a-distinct-forbidden pattern — doesn't confirm/deny which field was wrong, so it can't be used to probe valid ticket numbers).
- **Ticket view**: event name/date/venue/theme (from the active edition), the attendee's own name/ticket type/QR code, a check-in status badge, and — once past editions exist — which edition this ticket belongs to.
- **Checkout flow**: the existing purchase form (`gbc/tickets`) stays the entry point for buying; "My Ticket" is purely the *after-purchase* lookup, reached via the confirmation email's link and this new entry point, not a redesign of the purchase flow itself (that flow works today and isn't part of what's broken or missing).

`ticketService.ts` gets one new function for this: `lookupMyTicket(ticketNumber, email)` — public, throws `NotFoundError` on any mismatch (never "wrong email" specifically, per the anti-probing reasoning above).

## Service extraction plan

8 services, not the plan's 6 — `settingsService.ts` and `adminUserService.ts` are new-found scope, same category of correction Phase 3 made for REVA's `reportService.ts`/`adminUserService.ts` split.

### `ticketService.ts` (from `ticket-actions.ts`)
`createTicket`, `createGroupTicket`, `createPairTicket` (the last two share a new `validateAttendees(data, count)` helper — the source had ~150 lines of byte-for-byte duplicated per-attendee validation between the 5-attendee and 2-attendee versions, differing only in the count), `verifyPayment`, `lookupMyTicket` (new), `getTicketAvailability` (public, already split), `getTicketByNumber` (public — also backs the certificate page), `getTicketStats` (admin), `getTickets`/`getTicketById`/`exportTickets`/`deleteTicket`/`generateTicketQRCode` (admin), `checkInTicket` (admin). Ticket-number generation moves here per the edition work above.

### `qrCheckinService.ts` (from `qr-verification.ts`)
`verifyQRCodeHash` — unchanged logic (HMAC-SHA256, already correct), just relocated and route-gated (admin — this is the server-side half of the QR scanner, not a public endpoint).

### `cmsService.ts` (from `gallery-actions.ts` + `sponsor-actions.ts` + `speaker-actions.ts` + `upload-actions.ts`, minus dead `partners-actions.ts`)
Public reads: `getGalleryItems(year?)`, `getSponsors()`, `getPartners()`, `getSpeakers()`. Admin reads: `getAllGalleryItems()`, `getAllSponsors()`, `getAllSpeakers()` (no admin-all variant for partners exists in the source — not invented here either; partner management works off the same public-visible list). Mutations: full CRUD for gallery/sponsors/speakers, create+delete only for partners (matches the source — there's no `updateGBCPartner` today). Uploads: `uploadSponsorLogo`/`uploadPartnerLogo`/`uploadSpeakerPhoto`/`uploadGalleryMedia`, `deleteFile`/`deleteFiles`, `getUploadLimits`.

### `contactService.ts` (from `contact-actions.ts`, inquiry functions only)
`submitContactForm` (public), `getInquiries`/`updateInquiryStatus`/`deleteInquiry`/`replyToInquiry` (admin).

### `certificateService.ts` (from `certificate-actions.ts`)
`sendBulkCertificates` (admin). The public certificate page (`gbc/certificate/[ticketNumber]`) uses `ticketService.getTicketByNumber`, not this service.

### `settingsService.ts` (from `settings-actions.ts` — new-found scope)
`getSettings()` (public — event details are meant to be shown on the public site, matches the source having no auth check on the read path). Write side consolidated: the source's `updateGBCSettingsSection`/`updateGBCSetting`/`updateMultipleGBCSettings`/`bulkUpdateSettings` are four wrappers around the same path-navigation logic duplicated three different ways — collapses to one `updateSettings(patch: DeepPartial<GBCSettingsData>)` doing a real deep-merge, plus the low-level `replaceSettings(full)` the merge writer calls internally (mirrors `updateAllGBCSettings`). `resetToDefaults()`/`getPreviousSettings()`/`rollback()` stay distinct (real, different operations) — reset and rollback require SUPERADMIN, matching the source.

### `adminUserService.ts` (from `admin-actions.ts` — new-found scope, canonical over the two dead duplicates)
`getAllAdmins` (ADMIN/SUPERADMIN), `addAdmin`/`updateAdminRole`/`deleteAdmin`/`toggleAdminStatus` (SUPERADMIN, self-protection guards preserved), `DEV_EMAIL` env swap for the hardcoded personal-email exclusion.

### `editionService.ts` (new)
`getEditions()`, `getActiveEdition()`, `getEditionPublicRecap(key)` (no revenue — backs the Past Editions page), `getEditionAdminStats(key)` (admin, revenue included — backs the event-switcher's read-only view), `createEdition` / `activateEdition` / `archiveEdition` (SUPERADMIN, enforces exactly one `ACTIVE` entry).

## API route table

| Route | Method | Service fn | Roles | Notes |
|---|---|---|---|---|
| `/tickets` | POST | `createTicket` | *public* | multipart |
| `/tickets/group` | POST | `createGroupTicket` | *public* | 5 attendees |
| `/tickets/pair` | POST | `createPairTicket` | *public* | 2 attendees |
| `/tickets/availability` | GET | `getTicketAvailability` | *public* | capacity only, no revenue |
| `/tickets/lookup` | GET | `lookupMyTicket` | *public* | `?ticketNumber=&email=` |
| `/tickets/:ticketNumber` | GET | `getTicketByNumber` | *public* | also backs the certificate page |
| `/payments/verify` | POST | `verifyPayment` | *public* | body: `{reference, sendEmail?}` |
| `/admin/tickets` | GET | `getTickets` | ADMIN, SUPERADMIN | `?status=&search=&limit=` |
| `/admin/tickets/:id` | GET, DELETE | `getTicketById`/`deleteTicket` | ADMIN, SUPERADMIN | |
| `/admin/tickets/:id/qr-code` | POST | `generateTicketQRCode` | ADMIN, SUPERADMIN | |
| `/admin/tickets/check-in` | POST | `checkInTicket` | ADMIN, SUPERADMIN | body: `{ticketNumber}` |
| `/admin/tickets/export` | GET | `exportTickets` | ADMIN, SUPERADMIN | |
| `/admin/tickets/stats` | GET | `getTicketStats` | ADMIN, SUPERADMIN | revenue + full breakdown |
| `/admin/qr/verify` | POST | `verifyQRCodeHash` | ADMIN, SUPERADMIN | body: `{qrDataString, maxAgeHours?}` |
| `/gallery` | GET | `getGalleryItems` | *public* | `?year=` |
| `/sponsors` | GET | `getSponsors` | *public* | |
| `/partners` | GET | `getPartners` | *public* | |
| `/speakers` | GET | `getSpeakers` | *public* | |
| `/admin/gallery` | GET, POST | `getAllGalleryItems`/create | ADMIN, SUPERADMIN | |
| `/admin/gallery/:id` | PATCH, DELETE | update/delete | ADMIN, SUPERADMIN | |
| `/admin/sponsors` | GET, POST | `getAllSponsors`/create | ADMIN, SUPERADMIN | |
| `/admin/sponsors/:id` | PATCH, DELETE | update/delete | ADMIN, SUPERADMIN | |
| `/admin/partners` | POST | create | ADMIN, SUPERADMIN | no admin-list/update routes — matches the source |
| `/admin/partners/:id` | DELETE | delete | ADMIN, SUPERADMIN | |
| `/admin/speakers` | GET, POST | `getAllSpeakers`/create | ADMIN, SUPERADMIN | |
| `/admin/speakers/:id` | PATCH, DELETE | update/delete | ADMIN, SUPERADMIN | |
| `/admin/uploads/:kind` | POST | `upload*` | ADMIN, SUPERADMIN | `:kind` ∈ sponsor-logo\|partner-logo\|speaker-photo\|gallery-media, multipart |
| `/admin/uploads` | DELETE | `deleteFile`/`deleteFiles` | ADMIN, SUPERADMIN | body: `{key}` or `{keys[]}` |
| `/admin/uploads/limits` | GET | `getUploadLimits` | ADMIN, SUPERADMIN | |
| `/contact` | POST | `submitContactForm` | *public* | |
| `/admin/inquiries` | GET | `getInquiries` | ADMIN, SUPERADMIN | `?status=&type=` |
| `/admin/inquiries/:id/status` | PATCH | `updateInquiryStatus` | ADMIN, SUPERADMIN | |
| `/admin/inquiries/:id/reply` | POST | `replyToInquiry` | ADMIN, SUPERADMIN | |
| `/admin/inquiries/:id` | DELETE | `deleteInquiry` | ADMIN, SUPERADMIN | |
| `/admin/certificates/send` | POST | `sendBulkCertificates` | ADMIN, SUPERADMIN | body: `{ticketNumbers[], emailBody}` |
| `/settings` | GET | `getSettings` | *public* | |
| `/admin/settings` | PATCH | `updateSettings` | ADMIN, SUPERADMIN | deep-merge patch |
| `/admin/settings/reset` | POST | `resetToDefaults` | SUPERADMIN | |
| `/admin/settings/previous` | GET | `getPreviousSettings` | ADMIN, SUPERADMIN | |
| `/admin/settings/rollback` | POST | `rollback` | SUPERADMIN | |
| `/admin/users` | GET, POST | `getAllAdmins`/`addAdmin` | ADMIN+SUPERADMIN (GET) / SUPERADMIN (POST) | |
| `/admin/users/:id/role` | PATCH | `updateAdminRole` | SUPERADMIN | |
| `/admin/users/:id/status` | PATCH | `toggleAdminStatus` | SUPERADMIN | body: `{isActive}` |
| `/admin/users/:id` | DELETE | `deleteAdmin` | SUPERADMIN | |
| `/editions` | GET | `getEditions` | *public* | |
| `/editions/:key/recap` | GET | `getEditionPublicRecap` | *public* | no revenue |
| `/admin/editions` | POST | `createEdition` | SUPERADMIN | |
| `/admin/editions/:key/stats` | GET | `getEditionAdminStats` | ADMIN, SUPERADMIN | revenue included |
| `/admin/editions/:key/activate` | PATCH | `activateEdition` | SUPERADMIN | |
| `/admin/editions/:key/archive` | PATCH | `archiveEdition` | SUPERADMIN | |

All paths are relative to `/api/v1/gbc`. ~46 routes total.

## Webhook (close the gap)

The shared Paystack webhook (`app/api/webhooks/paystack/route.ts`) currently logs GBC events and does nothing else — `verifyGBCPayment` only ever runs from `gbc/tickets/success/page.tsx`'s server-side render when Paystack's `callback_url` redirect actually reaches the user's browser. If that redirect never happens (closed tab, network failure mid-redirect, abandoned after paying), the ticket sits at `PENDING` forever with no fallback — the same class of gap REVA's webhook repoint closed, just with no safety net at all today rather than a stale one.

`handleGBC` gets built the same way `handleReva` was rewritten in Phase 3: `normalizeMetadata()` for consistent parsing, an idempotency check (skip if every ticket for the reference is already `COMPLETED` — `ticketService.verifyPayment` itself is naturally idempotent on the QR/email side but not on the Paystack-re-verify/DB-write side, so this avoids a redundant external API call on every Paystack retry), then calls `ticketService.verifyPayment(reference)` — the same function the success page already calls, so there's exactly one code path that turns a Paystack success into ticket state, not two to keep in sync.

## Route/nav registry

New file, `gbc/access/routes.ts` — same shape as `surfboard/access/routes.ts`/`reva/access/routes.ts` (`GBCRouteEntry {path, label, icon, roles, group, showInNav?}`, `GBCRouteGroup = "admin" | "guest"` — no separate "user" group the way REVA has one, since GBC ticket-holders never get an account; the public site itself *is* the "user" experience). `canAccessRoute`/`getNavItemsForRole` back `proxy.ts`'s GBC branch (replacing the direct `canAccessGBCAdminPanel`/`canAccessGBCSuperAdminPanel` calls) and `gbcAdminPanelLayout.tsx`'s sidebar. `/gbc/restricted/superadmin` gets the same treatment as REVA's and Surfboard's equivalent dead `proxy.ts` branches — no real page exists at that path, kept as a direct role check, not a registry entry.

Entries: admin group covers `gbc/restricted/{,gallery,speakers,sponsors,tickets,inquiries,certificates,settings,attendees,check-in,users,editions}`; guest group covers the repurposed My Ticket entry point (`/gbc/login`) plus `gbc/{,about,contact,gallery,speakers,sponsors,tickets,editions}` and the certificate page — all public, `roles: []`, registered for documentation/future-use consistency with REVA's guest group even though `proxy.ts`'s matcher doesn't currently gate any of them (none are under `/gbc/restricted`).

## Naming standardization

`gbc/restricted` → `gbc-restricted` — but unlike Phase 2/3's equivalent renames, there's nothing to leave alone here: checked `app/api/auth/success/` directly and the Kinde callback route is **already** `gbc-restricted` (hyphenated), while the *page* routes are still the old `gbc/restricted` (nested, no hyphen) — the callback was set up ahead of the page-route convention catching up to it, not behind it. So this step is simpler than Surfboard's or REVA's: physical page-folder rename, every internal reference updated, `next.config.mjs` gets permanent redirects for the old prefix — no Kinde dashboard action needed at all, since the registered redirect URI already matches the target name.

## Folder move

`app/(projects)/(GBC)/{components,types,utils}/`, `components/layouts/gbc{Admin,User}PanelLayout.tsx`, `hooks/useGBC{Admin,User}Access.ts`, root `gbc-colors.ts` → `gbc/{components,layouts,hooks,utils,colors.ts}`. `utils/gbcAuth.ts` and `utils/auth.ts`'s dead `getCurrentGBCUser`/`checkIsAdmin`/`checkIsSuperAdmin` get deleted in this step, not moved (superseded by `withAuth<GBCRole>` by the time this step runs).

**Explicitly not touched**: `app/(noPopUp)/gbccertificate` and `app/(main)/gbc-frame` — confirmed unrelated (leftover ArcGIS/Survey123 tooling sharing the "GBC" initials only, zero code overlap), per `implementation-plan.md`'s existing note. Left exactly where they are.

## Sequencing

Same discipline as Phases 2 and 3 — plumbing before consumers, live-verified at each step, not just `tsc`/`build`:

1. ~~Interim security hotfix~~ — done (`f1031de`), see above.
2. ~~Full repo auth sweep~~ — done, see above.
3. `ticketService.ts` (foundational — the webhook and `lookupMyTicket`/My Ticket UI depend on it; the attendee-validation dedup happens here).
4. `qrCheckinService.ts` (small, independent, needed for the check-in page).
5. `cmsService.ts` (gallery/sponsors/partners/speakers/uploads — independent of ticketing).
6. `contactService.ts`, `certificateService.ts` (small, independent).
7. `settingsService.ts` — needed before `editionService.ts`, since editions live inside `GBCSettings.settings`.
8. **Edition metadata migration**: `edition` columns added to `GBCTicket`/`GBCSponsor`/`GBCPartner`/`GBCSpeaker`/`GBCEventStats`, backfilled to `"2.0"`; `settings.editions` seeded with the 2.0 entry (`status: "ACTIVE"`, `ticketPrefix: "GBC2"`); ticket-number generation moves into `ticketService.ts`. Live-verify a real ticket purchase gets the right prefix before moving on.
9. `editionService.ts` + the Past Editions public page + the admin event-switcher.
10. `adminUserService.ts`.
11. **Repoint `app/api/webhooks/paystack/route.ts`'s GBC branch** onto `ticketService.verifyPayment` — required dependency on step 3, worth doing right after the services it needs exist rather than at the end, so it isn't forgotten (same lesson Phase 3's REVA webhook step reinforced). Live-verify with a real signed request before moving on.
12. My Ticket entry point + lookup screens (repurposing the disabled login route).
13. `gbc/access/routes.ts` registry, replacing the inline nav list and `proxy.ts`'s direct `canAccessGBC*Panel` calls.
14. Naming standardization (`gbc/restricted` → `gbc-restricted`).
15. Folder move (dead auth files deleted in this step, not moved).
16. Live verification pass: full guest ticket-purchase flow (submit → pay → webhook confirms → My Ticket lookup works), full admin flow (check-in via QR scan, sponsor/speaker/gallery CRUD, settings update), the edition switcher against two seeded editions, admin user-management actions, plus this report's own completion update.
