# GBC — Components

Components specific to the GBC platform: the shared `gbc/components/` library
plus files colocated directly with GBC pages under `app/(projects)/(GBC)/`.

## `gbc/components/` — shared library

### Admin (`gbc/components/admin/`)

| File | Description |
|---|---|
| `InviteAdminModal.tsx` | Modal to invite a new admin user by email (they set their password via the emailed link) |
| `AddGalleryButton.tsx` | Button + form to add a gallery photo |
| `AddSpeakerButton.tsx` | Button + form to add a speaker |
| `AddSponsorButton.tsx` | Button + form to add a sponsor |
| `AdminFilter.tsx` | Generic filter bar used across admin list pages |
| `AdminMobileNav.tsx` | Mobile navigation for the admin panel |
| `AdminSidebar.tsx` | Admin panel sidebar navigation (hides superadmin-only entries such as Audit Logs unless `useGBCRole()` is SUPERADMIN) |
| `useGBCRole.ts` | Hook returning the signed-in admin's role (null until loaded) — keeps dead links out of the UI; the proxy still enforces access |
| `AdminUsersList.tsx` | List of admin user accounts |
| `ConfirmToggleModal.tsx` | Confirmation modal for toggling a boolean setting/state |
| `DashboardOverview.tsx` | Admin dashboard home — overview widgets |
| `DeleteAdminModal.tsx` | Confirmation modal to delete an admin account |
| `EditGalleryModal.tsx` | Modal to edit a gallery photo's metadata |
| `EditSpeakerModal.tsx` | Modal to edit a speaker's details |
| `EditSponsorModal.tsx` | Modal to edit a sponsor's details |
| `EventConfigForm.tsx` | Event/edition configuration form |
| `ExportButton.tsx` | Export-to-CSV/Excel button |
| `GalleryFilters.tsx` | Filter bar for the gallery management page |
| `GalleryGrid.tsx` | Grid layout for gallery photo management |
| `GallerySettings.tsx` | Gallery-wide settings panel |
| `GBCAdminSearch.tsx` | Global search bar for the admin dashboard (pages + tickets) |
| `GBCUserMenu.tsx` | Avatar trigger with dropdown for settings, profile, and sign out |
| `InquiriesFilters.tsx` | Filter bar for the inquiries inbox |
| `InquiriesTable.tsx` | Table of contact-form inquiries |
| `ManualCheckIn.tsx` | Manual (non-QR) attendee check-in form |
| `NotificationSettings.tsx` | Admin notification preferences |
| `QRImageUpload.tsx` | Upload/preview a QR code image |
| `QRScanner.tsx` | Camera-based QR scanner for check-in |
| `RecentTickets.tsx` | Recent ticket purchases widget |
| `SocialLinksSettings.tsx` | Manage social media links shown on the site |
| `SpeakersList.tsx` | List of speakers (admin) |
| `SpeakersManager.tsx` | Speakers CRUD manager |
| `SponsorsList.tsx` | List of sponsors (admin) |
| `SponsorsManager.tsx` | Sponsors CRUD manager |
| `StatsCard.tsx` | Admin stat tile |
| `SystemSettings.tsx` | Platform-wide system settings |
| `TicketCards.tsx` | Ticket summary cards |
| `TicketPricingDisplay.tsx` | Displays ticket pricing tiers |
| `TicketsTable.tsx` | Table of all ticket purchases |

### Certificates (`gbc/components/certificates/`)

| File | Description |
|---|---|
| `types.ts` | Shared TypeScript types for the certificate feature |

### Navbar (`gbc/components/Navbar/`)

| File | Description |
|---|---|
| `index.tsx` | Public-site navbar |
| `navbarItems.tsx` | Navbar link/item definitions |
| `navbar-mobile.tsx` | Mobile navbar/menu |
| `sidebar-button.tsx` | Hamburger/sidebar toggle button |

### Public site

| File | Description |
|---|---|
| `ContactForm.tsx` | Public contact form |
| `HomeGallery.tsx` | Homepage gallery preview section |
| `HomeSpeakers.tsx` | Homepage speakers preview section |
| `HomeSponsors.tsx` | Homepage sponsors preview section |
| `TicketPurchaseForm.tsx` | Ticket purchase/checkout form |

## Colocated with pages (`app/(projects)/(GBC)/`)

| File | Description |
|---|---|
| `gbc/certificate/[ticketNumber]/CertificateClient.tsx` | Client component rendering the public certificate view/download |
| `gbc/login/MyTicketView.tsx` | Shows the attendee's ticket after lookup/login |
| `gbc/login/TicketLookupForm.tsx` | Form to look up a ticket by reference/email |
| `gbc-restricted/(admin)/certificates/CertificatesClient.tsx` | Admin certificates page client component |
| `gbc-restricted/(admin)/editions/EditionsClient.tsx` | Admin editions management page client component |
| `GBC_ROUTES.ts` | Centralized GBC route path constants |
