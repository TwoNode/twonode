# GBC — Functions (services, utils, access, workers)

Non-component logic files specific to the GBC platform, under `gbc/`.

## `gbc/services/` — business logic (DB access, orchestration)

| File | Description |
|---|---|
| `adminUserService.ts` | Admin user management (audited via `lib/audit.ts`). New admins are invited via `lib/auth/adminInvitations.ts`, not created here |
| `certificatePdfService.ts` | Spawns the certificate PDF worker and returns a buffer |
| `certificateService.ts` | Certificate issuance/verification logic |
| `cmsService.ts` | Content (site copy/settings) management |
| `contactService.ts` | Contact-form submission handling |
| `editionService.ts` | GBC edition (1.0, 2.0, …) CRUD. `getCurrentEdition()` is the edition the public site is about (ACTIVE, else most recent PAST) — use it, not a hard-coded "2.0", wherever a page needs to name the current edition (served publicly at `GET /api/v1/gbc/editions/current`) |
| `notificationService.ts` | Admin notification CRUD + read/dismiss state |
| `qrCheckinService.ts` | QR-code check-in verification |
| `receiptPdfService.ts` | Spawns the receipt PDF worker and returns a buffer |
| `settingsService.ts` | Settings, **one row per edition** (`gbc_settings.edition`, unique). `resolveSettingsEdition()` picks the edition when none is given: the ACTIVE one, else the most recent PAST, else the earliest UPCOMING (so the public site never goes blank while no edition is ACTIVE). Reads never write — an edition with nothing saved reads as defaults carrying its own name/theme/venue/date, and its first save creates the row. Also per-edition reset, previous and rollback. Ticket capacity and early-bird counts are per edition too (`ticketService.ts`) |
| `sponsorTierService.ts` | Sponsorship levels (Headline, Impact, …) as admin-managed rows: create (key derived once from the name, never changes on rename), update, reorder, delete (refused while sponsors are in the tier), all audited. `assertSponsorTierExists` is used when a sponsor is saved |
| `ticketService.ts` | Ticket purchase, lookup, and lifecycle logic. `getTicketStats(edition?)` and `getTickets({..., edition?})` default to the active edition when no edition is given (the admin dashboard's navbar edition switcher passes its `?edition=` selection through) |

## `gbc/utils/` — stateless helpers

| File | Description |
|---|---|
| `auth.ts` | GBC-specific auth helpers (session/role checks) |
| `aws-s3.ts` | S3 upload/download helpers |
| `editionCookie.ts` | `getEditionCookieValue()` — server-side (imports `next/headers`) read of the navbar `GBCEditionSwitcher`'s last selection (a cookie, not just the query param, since a sidebar `<Link>` doesn't carry query params across navigation). Every edition-filtered admin page falls back to this when its own `?edition=` is absent, normalized to `undefined` for the "all editions" sentinel so callers can fold it into their own `\|\| "all"` default without a stray literal "all" reaching a DB filter |
| `editionCookieConstants.ts` | Just the cookie name (`GBC_EDITION_COOKIE`), split out of `editionCookie.ts` so the Client Component switcher can import it without pulling `next/headers` into the client bundle — that combination is a real Next.js build failure (`next build`), not just a type-checker complaint |
| `email.ts` | Transactional email sending (tickets, certificates, verification) |
| `index.ts` | Barrel export |
| `paystack.ts` | Paystack payment helpers |
| `qr_code.ts` | QR code generation (tickets, certificate verification) |
| `settings.ts` | Settings read/parse helpers |
| `sms.ts` | SMS sending helpers |
| `sponsorTiers.ts` | Sponsor-tier helpers: `tierKeyFromName`, card sizes (FEATURED/STANDARD/COMPACT), `sortTiers`, `groupSponsorsByTier` (shared by the public page and the admin list) |
| `ticketListParams.ts` | `parseTicketListParams`/`toTicketFilters` — one URL-param parser shared by the Attendees page, Certificates page and the certificate recipients endpoint, so a URL means the same list everywhere. Takes an optional cookie-derived edition (see `editionCookie.ts`) as the fallback default when the URL has no explicit `?edition=` |
| `validations.ts` | Input validation helpers |

## `gbc/hooks/`

| File | Description |
|---|---|
| `useEditionFooterNote.ts` | The line under GBC's auth cards (login, verify-email, reset-password, accept-invite): the current edition's name from the database, generic conference name as a fallback |

## `gbc/access/`

| File | Description |
|---|---|
| `routes.ts` | Role → allowed-route map for the GBC admin panel |

## `gbc/pdf-worker/` — standalone Node PDF renderers

Plain `.cjs` scripts, spawned as child processes (never imported by app
code) so Turbopack/webpack never bundles `@react-pdf/renderer` alongside
them — see the file header comments for why.

| File | Description |
|---|---|
| `certificate.render.cjs` | Renders the certificate PDF (name, QR, bridge-photo background). `nameFontSize(name)` scales the attendee-name text down (34pt → 28pt → 22pt) as the name gets longer, so long names shrink to fit instead of risking overflow past the certificate frame |
| `receipt.render.cjs` | Renders the ticket payment receipt PDF |

## `gbc/types/`

| File | Description |
|---|---|
| `gallery.ts` | Gallery photo types |
| `speaker.ts` | Speaker types |
| `sponsor.ts` | Sponsor types |

## Top level

| File | Description |
|---|---|
| `gbc/apiClient.ts` | Typed client wrapper around `/api/v1/gbc/*` routes |
| `gbc/colors.ts` | GBC brand color palette (purple/gold) |
