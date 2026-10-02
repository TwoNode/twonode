# REVA — User Flow

REVA ("Real Estate Due Diligence") sells one thing: a structured due-diligence report on a piece of property — ownership verification, encumbrance checks, and a written finding — requested online and paid for online. This document walks the full journey end to end, for both signed-in users and one-off guests, plus the admin side that fulfills the request.

Roles: `USER`, `ADMIN`, `SUPERADMIN` (see `../auth/technical.md` §5 — no MDA-style sub-roles, REVA is the simplest of the three products role-wise).

---

## 1. Getting In: Registration & Login

### Page: `/reva/login`

- **Sign in**: email + password, or **Continue with Google** (Kinde) — see `../auth/non-technical.md` for how the two relate.
- **Register**: self-service — anyone can create a REVA account; no invite needed for the regular user side.
- Landing after login: `/reva/dashboard`.

### Admin side: `/reva-restricted/login`

- **Admin-only, no public registration.** An account must already exist with `ADMIN` or `SUPERADMIN` on the `RevaUser` row before this login will succeed — a plain `USER` account, even a valid one, is rejected here.
- Landing after login: `/reva-restricted/dashboard`.

You don't have to register at all to request a report — see §3.

---

## 2. Signed-In Request Flow (`/reva/dashboard`)

### Page 1: Dashboard Home

- **Hero**: greeting, a short description of what the dashboard shows, and quick pill counts (total / completed / processing requests).
- **Stat cards**: Total Requests, Processing, Completed, Reports Ready (a request whose report has been uploaded and is downloadable) — each pulled from the signed-in user's own request history, nothing else.
- **Recent Requests**: the 3 most recently updated requests, with search/filter (by reference, address, or title; status; payment status; has-report) above them.
- **New Request** button → Page 2.

### Page 2: New Request (`/reva/dashboard/newrequest`)

- **Fields**: property address, coordinates (lat/lng, typically picked on a map), LGA, parcel ID (if known), supporting documents (upload), site images (upload), comments/notes for the reviewer.
- **Submit**: creates a `Property` row (`status: "Processing"`, `paymentStatus: "Unpaid"`), then moves straight into payment.

### Page 3: Payment

- Paystack checkout for the request's fee (`totalCost`).
- On success: `paymentStatus` → `"Paid"`, the user gets a confirmation notification, and admins are notified a paid request is ready to work.
- If payment fails or is abandoned, the request stays `Unpaid` and visible in the user's list — nothing blocks them from retrying payment on it later, from the request's detail page.

### Page 4: Tracking (`/reva/dashboard/details?reference=...`)

- Status badges: request status (Processing / Completed / Available), payment status (Paid / Unpaid), and — once an admin has acted — approval status.
- Once a report is uploaded and approved, a **Download Report** action appears here.

### Account pages

- **Settings** (`/reva/dashboard/settings`): edit first/last name and email (`GET`/`PATCH /api/v1/reva/profile`); change password via the same shared `/api/v1/auth/change-password` endpoint every product's settings page uses.
- **Notifications** (`/reva/dashboard/notifications`): payment confirmations, report-ready alerts, general system notices. A bell icon with a live unread count sits in the top nav everywhere in the dashboard.

---

## 3. Guest ("One-Time Request") Flow — No Account Needed

REVA's second front door: someone who wants exactly one report and doesn't want to create an account.

### Page 1: Public Request Form (`/reva/requestform`)

- Same core fields as the signed-in form (§2, Page 2), plus a name, email, and phone number in place of an account — the email is the guest's entire identity in the system from here on.
- Submits to `OneTimeUserProperty`, `status: "Processing"`, `paymentStatus: "Unpaid"`.
- **Known issue, pre-existing, not yet fixed** (confirmed via an A/B rebuild test, `docs/development-history/phases/phase-3-reva.md`): this page can 500 (`window is not defined`) due to a client-side library being evaluated during server-side rendering. Not caused by the 2026-08 rebuild — predates it.

### Page 2: Payment

- Same Paystack flow as §2 Page 3, public/no-session variant.

### Page 3: Guest Tracking Page (`/reva/onetimerequest`)

- **Lookup**: reference number + email (this pair _is_ the authentication — there's no password for a guest).
- Shows a Submitted → In Progress → Completed tracker, payment and report-approval badges, and a **Download Report** action once approved.
- Linked from: the report-approval email, and the post-payment landing page. **Gap, not yet fixed**: the payment-confirmation email (sent right after paying, before a report exists) doesn't include this page's link — only the _later_ approval email does. A guest who pays, then loses the tab before their report is ready, has no emailed way back in until approval.

---

## 4. Admin Review Flow (`/reva-restricted/dashboard`)

### Page 1: Admin Dashboard Home

- Hero + stat cards for the admin's own operational view (pending requests, etc.).
- Full request list — both `Property` (signed-in) and `OneTimeUserProperty` (guest) rows, in one place (`/reva-restricted/dashboard/alluserrequests`).

### Page 2: Request Review (`/reva-restricted/dashboard/details`)

- **Upload a report**, two ways: a structured multi-section form, or a direct link to an externally-hosted report.
- **Approve or disapprove**: `ADMIN`/`SUPERADMIN` can approve; approval:
  - Sets the report's `isApproved` flag.
  - Notifies the requester (email + in-app `Notification` — for both signed-in _and_ guest requesters; the guest path used to be a commented-out no-op and was fixed as part of the 2026-08 rebuild, see `./notification-system.md`).
  - Makes the report downloadable from the requester's tracking page (§2 Page 4 / §3 Page 3).

### Page 3: Payment Verification (`/reva-restricted/dashboard/payment-verification`)

- Manual re-check against Paystack for any request whose webhook confirmation might have been missed — bulk or single, see `../payment/payment-verification.md`.

### Page 4: Spatial Record (`/reva-restricted/dashboard/spatial-record`)

- Map-based view of a request's parcel/location for the reviewer, alongside the property's submitted coordinates.

### `SUPERADMIN`-only

- **User management** (`/reva-restricted/dashboard/superadmin`): create admin accounts, promote/demote `ADMIN` ↔ `USER`, deactivate/reactivate, delete.
- **Notifications** (`/reva-restricted/dashboard/notifications`): the admin-wide notification feed. A plain `ADMIN` can also reach this page directly (a real access/nav mismatch found and closed during the rebuild — the _page_ was already reachable by `ADMIN`, only the sidebar _link_ had been `SUPERADMIN`-only).

---

## 5. What Happens Behind the Scenes (at a glance)

| Step                  | Service                                   | Route                                            |
| :-------------------- | :---------------------------------------- | :----------------------------------------------- |
| Create/read a request | `reva/services/propertyRequestService.ts` | `/api/v1/reva/{properties,one-time-properties}*` |
| Pay / verify payment  | `reva/services/paymentService.ts`         | `/api/v1/reva/payments*`                         |
| Notify                | `reva/services/notificationService.ts`    | `/api/v1/reva/notifications*`                    |
| Admin review/approve  | `reva/services/reportService.ts`          | `/api/v1/reva/admin/requests*`                   |
| Admin user management | `reva/services/adminUserService.ts`       | `/api/v1/reva/admin/users*`                      |
| Profile settings      | `reva/services/profileService.ts`         | `/api/v1/reva/profile`                           |

Full route-by-route detail: `docs/development-history/phases/phase-3-reva.md`. Full current route inventory: `docs/development-history/route-inventory.md`.
