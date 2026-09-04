# REVA — User Stories

Companion to [`user-flow.md`](./user-flow.md) — that document is the walkthrough; this one is the backlog-style breakdown by persona, useful for scoping new work or checking coverage. Each story notes its current status against the live product; "planned/gap" stories are real, confirmed gaps, not aspirational filler.

## Personas

- **Guest** — no account, wants exactly one report.
- **Registered User** — has a REVA account, may request more than once.
- **Admin** — reviews and fulfills requests.
- **Super Admin** — everything Admin can do, plus user management.

---

## Epic: Requesting a Report

**US-1 — Registered user submits a request**
> As a registered user, I want to submit a property's address, coordinates, and supporting documents, so that REVA can produce a due-diligence report on it.
- ✅ Shipped. `POST /api/v1/reva/properties`. Creates a `Property` row, `status: Processing`, `paymentStatus: Unpaid`.

**US-2 — Guest submits a request without registering**
> As a one-time visitor, I want to request a report by filling a public form with my email and phone number, so that I don't have to create and remember an account for a single report.
- ✅ Shipped. `POST /api/v1/reva/one-time-properties`, public route. `email` becomes the guest's identity for every later lookup.
- ⚠️ Known gap: `/reva/requestform` can 500 (client-side `window` reference evaluated during SSR) — pre-existing, not yet fixed.

**US-3 — Pay for a request**
> As either kind of requester, I want to pay online immediately after submitting, so that my request moves into the review queue without a separate manual step.
- ✅ Shipped. Paystack checkout; `paymentStatus → Paid` on success via the shared `app/api/webhooks/paystack/route.ts` REVA branch, or the immediate `checkPaymentSuccess`/`authPaymentSuccessful` verify call.

**US-4 — Retry a failed/abandoned payment**
> As a requester whose payment didn't go through, I want to retry paying for the same request, so that I don't have to resubmit the whole form.
- ✅ Shipped — an unpaid request stays visible and payable from its own detail/tracking page.

---

## Epic: Tracking a Request

**US-5 — Registered user tracks their own requests**
> As a registered user, I want a dashboard showing all my requests with their status, payment state, and report availability at a glance, so that I know what needs my attention.
- ✅ Shipped. Dashboard hero + stat cards (Total / Processing / Completed / Reports Ready) + searchable/filterable list.

**US-6 — Guest tracks a request without an account**
> As a guest, I want to check my request's status using just my reference number and email, so that I don't need a password to see where things stand.
- ✅ Shipped. `/reva/onetimerequest`, reference+email lookup (the pair *is* the authentication for this route).

**US-7 — Guest gets emailed a way back to their tracker after paying**
> As a guest who just paid, I want the payment confirmation email to include a link to my tracking page, so that if I lose the tab I can still find my request before the report is even ready.
- ❌ **Gap, confirmed, not yet fixed.** Only the *later* report-approval email includes the tracker link today — the payment-confirmation email doesn't.

**US-8 — Download an approved report**
> As either kind of requester, I want to download my report as soon as it's approved, so that I can act on it without waiting on anyone.
- ✅ Shipped, from both the signed-in details page and the guest tracking page.

---

## Epic: Staying Informed

**US-9 — In-app notifications**
> As a registered user, I want in-app notifications when my payment is received or my report is ready, so that I don't have to keep refreshing my dashboard.
- ✅ Shipped. `reva/services/notificationService.ts`, unread-count bell in the nav, 30s auto-refresh.

**US-10 — Guests get the same "report ready" signal admins can see**
> As an admin, when a guest's (not just a registered user's) report is approved, I want a normal in-app system-alert echo, so that the admin-side activity feed doesn't have a silent blind spot for guest requests.
- ✅ Shipped (2026-08 rebuild) — previously this path existed only as an email with no `Notification` row and no admin-side echo; now email-keyed guest identities get the same treatment as `user.id`-keyed ones.

---

## Epic: Account & Settings

**US-11 — Edit my profile**
> As a registered user, I want to update my first name, last name, and email, so that my account details stay current.
- ✅ Shipped (2026-08 rebuild). `GET`/`PATCH /api/v1/reva/profile`. Previously this was a fully disabled, read-only settings page — the Edit button and the underlying save function were both stubs.

**US-12 — Change my password**
> As a registered user, I want to change my password from my settings page, so that I can rotate my credentials without contacting support.
- ✅ Shipped (2026-08 rebuild), via the shared `/api/v1/auth/change-password` route (no REVA-specific password function needed). Previously the entire Security tab was disabled client-side.

---

## Epic: Admin Review

**US-13 — See every pending request in one place**
> As an admin, I want one list showing both registered-user and guest requests together, so that I don't have to check two separate systems.
- ✅ Shipped. `/reva-restricted/dashboard/alluserrequests`, backed by `getAllRequestsWithUserByAdmin`.

**US-14 — Upload a due-diligence report**
> As an admin, I want to attach a finished report to a request — either a structured multi-section form or a direct external link — so that the requester can access it once approved.
- ✅ Shipped, both upload paths.

**US-15 — Approve or disapprove a report**
> As an admin, I want to approve or disapprove an uploaded report, so that only reviewed, correct reports ever reach a requester.
- ✅ Shipped for both `Property` and `OneTimeUserProperty` rows — one shared route resolves which table server-side.

**US-16 — Manually re-verify a payment**
> As an admin, I want to force a fresh Paystack verification on a request, so that I can fix a discrepancy if a webhook was ever missed.
- ✅ Shipped, bulk or single. `/reva-restricted/dashboard/payment-verification`.

**US-17 — View a request's location on a map**
> As an admin, I want to see the property's coordinates plotted on a map alongside the request, so that I can sanity-check the location before approving a report about it.
- ✅ Shipped. `/reva-restricted/dashboard/spatial-record`.

---

## Epic: Super Admin — User Management

**US-18 — Create an admin account**
> As a super admin, I want to create new admin accounts directly, so that new reviewers can start working without a public sign-up.
- ✅ Shipped. `POST /api/v1/reva/admin/users`, `SUPERADMIN`-only.

**US-19 — Promote or demote a user's role**
> As a super admin, I want to promote a user to admin, or demote an admin back to a regular user, so that I can adjust who has review access as the team changes.
- ✅ Shipped. `PATCH /api/v1/reva/admin/users/:id/role`.

**US-20 — Deactivate/reactivate or delete an account**
> As a super admin, I want to suspend or permanently remove an account, so that I can respond to an offboarding or a compromised account.
- ✅ Shipped. `PATCH /api/v1/reva/admin/users/:id/status`, `DELETE /api/v1/reva/admin/users/:id`.

**US-21 — A plain admin can reach the notifications feed, not just super admins**
> As an admin (not just a super admin), I want to see the admin notification feed directly, so that I'm not blocked from a page I already had backend access to.
- ✅ Shipped (2026-08 rebuild) — closes a real mismatch found while building the route registry: the page was already reachable by a plain `ADMIN`, only the sidebar *link* had incorrectly been gated to `SUPERADMIN`-only.

---

## Backlog (open questions, not yet decided — see phase-3-reva.md's "Decisions" section for full context)

- Whether the two parallel guest/authenticated route trees (`reva/verifypayment` + `reva/viewdetails` vs. `reva/dashboard/verifypayment` + `reva/dashboard/details`) should eventually collapse into one route with conditional rendering, instead of staying as separate near-duplicate pages.
