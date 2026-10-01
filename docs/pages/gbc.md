# GBC — Pages

All routes under `app/(projects)/(GBC)/`. GBC (Geospatial Builders Course) has a
public marketing/ticketing site (`/gbc/*`) and a separate admin panel
(`/gbc-restricted/*`).

## Public site (`/gbc`)

| Route | File | Description |
|---|---|---|
| `/gbc` | `gbc/page.tsx` | Homepage — hero, "What is GBC?", past editions, etc. |
| `/gbc/about` | `gbc/about/page.tsx` | About page |
| `/gbc/contact` | `gbc/contact/page.tsx` | Contact form |
| `/gbc/gallery` | `gbc/gallery/page.tsx` | Photo gallery |
| `/gbc/speakers` | `gbc/speakers/page.tsx` | Speakers listing |
| `/gbc/sponsors` | `gbc/sponsors/page.tsx` | Sponsors listing: one section per tier in the order set in the admin (card size and badge follow the tier's size); rendered per request |
| `/gbc/editions` | `gbc/editions/page.tsx` | List of all GBC editions (1.0, 2.0, …) |
| `/gbc/editions/[key]` | `gbc/editions/[key]/page.tsx` | Single edition detail page |
| `/gbc/tickets` | `gbc/tickets/page.tsx` | Ticket purchase/checkout |
| `/gbc/tickets/success` | `gbc/tickets/success/page.tsx` | Post-purchase success/confirmation page |
| `/gbc/certificate/[ticketNumber]` | `gbc/certificate/[ticketNumber]/page.tsx` | Public certificate view/download (server-generated PDF, QR-verifiable) |
| `/gbc/login` | `gbc/login/page.tsx` | Attendee/user login |
| `/gbc/error-login` | `gbc/error-login/page.tsx` | Login error page |

## Admin panel (`/gbc-restricted`)

| Route | File | Description |
|---|---|---|
| `/gbc-restricted` | `gbc-restricted/(admin)/page.tsx` | Admin dashboard home/overview |
| `/gbc-restricted/audit-logs` | `gbc-restricted/(admin)/audit-logs/page.tsx` | Audit log viewer — who did what, superadmin only (shared `AuditLogViewer`) |
| `/gbc-restricted/attendees` | `gbc-restricted/(admin)/attendees/page.tsx` | Attendee management |
| `/gbc-restricted/certificates` | `gbc-restricted/(admin)/certificates/page.tsx` | Certificate management/bulk issuance |
| `/gbc-restricted/check-in` | `gbc-restricted/(admin)/check-in/page.tsx` | Event day check-in tool |
| `/gbc-restricted/editions` | `gbc-restricted/(admin)/editions/page.tsx` | Manage editions |
| `/gbc-restricted/gallery` | `gbc-restricted/(admin)/gallery/page.tsx` | Manage gallery photos |
| `/gbc-restricted/inquiries` | `gbc-restricted/(admin)/inquiries/page.tsx` | Contact-form inquiries inbox |
| `/gbc-restricted/notifications` | `gbc-restricted/(admin)/notifications/page.tsx` | Admin notifications list |
| `/gbc-restricted/profile` | `gbc-restricted/(admin)/profile/page.tsx` | Admin user profile view |
| `/gbc-restricted/settings` | `gbc-restricted/(admin)/settings/page.tsx` | Event/platform settings, one set per edition (edition picker at the top; `?edition=`) |
| `/gbc-restricted/speakers` | `gbc-restricted/(admin)/speakers/page.tsx` | Manage speakers |
| `/gbc-restricted/sponsors` | `gbc-restricted/(admin)/sponsors/page.tsx` | Manage sponsors and sponsor tiers |
| `/gbc-restricted/tickets` | `gbc-restricted/(admin)/tickets/page.tsx` | Ticket management |
| `/gbc-restricted/users` | `gbc-restricted/(admin)/users/page.tsx` | Admin/user account management |
| `/gbc-restricted/login` | `gbc-restricted/login/page.tsx` | Admin login |
| `/gbc-restricted/accept-invite` | `gbc-restricted/accept-invite/page.tsx` | Accept an admin invitation — set a password from the emailed single-use link |
| `/gbc-restricted/reset-password` | `gbc-restricted/reset-password/page.tsx` | Admin password reset |
| `/gbc-restricted/verify-email` | `gbc-restricted/verify-email/page.tsx` | Admin email verification |

## Related pages outside the `(GBC)` group

These live under the shared `(main)`/`(noPopUp)` route groups but are GBC-specific:

| Route | File | Description |
|---|---|---|
| `/gbc-frame` | `(main)/gbc-frame/page.tsx` | Iframe-embeddable GBC page (for embedding on external sites) |
| `/gbccertificate` | `(noPopUp)/gbccertificate/page.tsx` | Standalone certificate print/frame view, no popup chrome |
