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
| `ticketService.ts` | Ticket purchase, lookup, and lifecycle logic |

## `gbc/utils/` — stateless helpers

| File | Description |
|---|---|
| `auth.ts` | GBC-specific auth helpers (session/role checks) |
| `aws-s3.ts` | S3 upload/download helpers |
| `email.ts` | Transactional email sending (tickets, certificates, verification) |
| `index.ts` | Barrel export |
| `paystack.ts` | Paystack payment helpers |
| `qr_code.ts` | QR code generation (tickets, certificate verification) |
| `settings.ts` | Settings read/parse helpers |
| `sms.ts` | SMS sending helpers |
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
| `certificate.render.cjs` | Renders the certificate PDF (name, QR, bridge-photo background) |
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
