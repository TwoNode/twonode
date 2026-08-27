# Twonodes — Full Route Inventory

**Purpose:** one place that lists every route in the app — pages and API routes, across all three products plus shared/marketing — kept current as the rebuild progresses. This is a living document: every phase that adds, renames, or retires a route updates its entry here in the same commit/session that makes the change, the same discipline `docs/development-history/progress.md` already follows for phase checklists.

**Last Updated:** 2026-08-27 (generated from a full `find app -name "page.tsx" -o -name "route.ts"` pass against `rebuild/foundations`, cross-referenced with the Phase 1/2 specs for planned renames; updated as Phase 2's execution landed 54 new `/api/v1/surfboard/*` routes, the MDA route/nav registry + `proxy.ts` migration, and the naming standardization; updated again once Phase 3's spec corrected the REVA row and the guest-tracking-page status below).

**Status column key:** `live` = exists today, unchanged. `renaming (Phase N)` = exists today, will move per that phase's spec. `planned (Phase N)` = doesn't exist yet, scoped into that phase. `legacy` = old pre-`/api/v1` pattern, superseded but still in use until its consumers migrate.

---

## API routes

### `/api/v1/*` — native architecture (Phase 1+, the pattern all future API work follows)

| Route | Method(s) | Product | Auth | Status |
|---|---|---|---|---|
| `/api/v1/auth/register` | POST | shared | public | live |
| `/api/v1/auth/login` | POST | shared | public (CSRF-checked) | live |
| `/api/v1/auth/refresh` | POST | shared | refresh cookie | live |
| `/api/v1/auth/logout` | POST | shared | session | live |
| `/api/v1/auth/me` | GET | shared | session | live |
| `/api/v1/auth/change-password` | POST | shared | session | live |
| `/api/v1/surfboard/qr/access-state` | GET | Surfboard | public | live |
| `/api/v1/surfboard/qr/payments` | POST | Surfboard | public | live |
| `/api/v1/surfboard/qr/payments/verify` | POST | Surfboard | public | live |
| `/api/v1/surfboard/qr/earnings-overview` | GET | Surfboard | session | live |
| `/api/v1/surfboard/qr/bank-details` | POST | Surfboard | session + CSRF | live |
| `/api/v1/surfboard/qr/withdrawals` | POST | Surfboard | session + CSRF | live |
| `/api/v1/surfboard/qr/settings` | GET | Surfboard | SUPERADMIN | live |
| `/api/v1/surfboard/admin/kyc` | GET, POST | Surfboard | SUPERADMIN | live |
| `/api/v1/surfboard/cod/fee-preview` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/cod/zone` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/cod/locks/[planId]` | GET, POST, DELETE | Surfboard | MDA roles (session role must match requested role, or MDA_SUPERADMIN/SUPERADMIN) | live |
| `/api/v1/surfboard/cod/locks/next` | POST | Surfboard | MDA roles | live |
| `/api/v1/surfboard/cod/locks/release-all` | POST | Surfboard | MDA roles | live |
| `/api/v1/surfboard/cod/locks/batch/next` | POST | Surfboard | ACCOUNTS, INTAKE, RECORDS_II, MDA_SUPERADMIN, SUPERADMIN | live |
| `/api/v1/surfboard/cod/locks/batch/release` | POST | Surfboard | same as above | live |
| `/api/v1/surfboard/cod/batches` | GET, POST | Surfboard | USER (own) / ADMIN, SUPERADMIN (all, via `?status=`) | live |
| `/api/v1/surfboard/cod/batches/[batchId]` | GET | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify-links` | POST | Surfboard | USER (owner), SUPERADMIN | live |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/verify-lasg` | POST | Surfboard | USER (owner), SUPERADMIN | live |
| `/api/v1/surfboard/cod/batches/[batchId]/payment/retry` | POST | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/cod/batches/[batchId]/lasg-receipt` | POST | Surfboard | ADMIN, SUPERADMIN | live |
| `/api/v1/surfboard/cod/payer-profile` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/mda/accounts/batches` | GET | Surfboard | ACCOUNTS, SUPERADMIN, MDA_SUPERADMIN | live |
| `/api/v1/surfboard/mda/accounts/batches/[batchId]/decision` | POST | Surfboard | ACCOUNTS, SUPERADMIN | live |
| `/api/v1/surfboard/mda/[role]/plans` | GET | Surfboard | charting/surcon/records-i/records-ii roles, SUPERADMIN, MDA_SUPERADMIN | live — `:role` selects both required session role and which queue/history pair runs |
| `/api/v1/surfboard/mda/[role]/plans/[planId]/decision` | POST | Surfboard | charting/surcon/records-i/intake roles, SUPERADMIN | live — session role must match `:role` (SUPERADMIN excepted) |
| `/api/v1/surfboard/mda/records-ii/plans/[planId]/decision` | POST | Surfboard | RECORDS_II, SUPERADMIN | live — kept separate (OSSG transmission + LODGED status side effects) |
| `/api/v1/surfboard/mda/intake/batches` | GET | Surfboard | INTAKE, SUPERADMIN, MDA_SUPERADMIN | live |
| `/api/v1/surfboard/mda/intake/batches/[batchId]/decision` | POST | Surfboard | INTAKE, SUPERADMIN | live |
| `/api/v1/surfboard/mda/archive/batches` | GET | Surfboard | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN | live |
| `/api/v1/surfboard/mda/archive/plans/[planId]` | POST | Surfboard | ARCHIVE, SUPERADMIN, MDA_SUPERADMIN | live |
| `/api/v1/surfboard/mda/pending-counts` | GET | Surfboard | ADMIN, SUPERADMIN, all 7 MDA stage roles, MDA_SUPERADMIN | live |
| `/api/v1/surfboard/plans/queried` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/[planId]/resubmit` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/plans/physical-copy` | POST | Surfboard | USER | live — bulk, `{planIds[]}` |
| `/api/v1/surfboard/plans` | GET, POST | Surfboard | USER | live |
| `/api/v1/surfboard/plans/[planId]` | GET, PATCH, DELETE | Surfboard | USER (owner/shared-with) | live |
| `/api/v1/surfboard/plans/[planId]/restore` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/plans/[planId]/permanent` | DELETE | Surfboard | USER, ADMIN, SUPERADMIN | live |
| `/api/v1/surfboard/plans/[planId]/status` | PATCH | Surfboard | USER, ADMIN, SUPERADMIN | live |
| `/api/v1/surfboard/plans/[planId]/surveyor` | GET | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/plans/[planId]/public` | GET | Surfboard | public | live — QR-gated, redacts unless PAID_ACTIVE/FREE |
| `/api/v1/surfboard/plans/[planId]/public/full` | GET | Surfboard | public | live — ungated, increments QR scan count |
| `/api/v1/surfboard/plans/[planId]/qr` | GET | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/plans/[planId]/red-copy` | POST | Surfboard | USER (owner) | live — multipart |
| `/api/v1/surfboard/plans/[planId]/record-copy` | PATCH | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/plans/[planId]/person-count` | PATCH | Surfboard | any non-USER role | live |
| `/api/v1/surfboard/plans/[planId]/query` | POST | Surfboard | any non-USER role | live |
| `/api/v1/surfboard/plans/[planId]/attachments` | DELETE | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/plans/[planId]/share` | POST, DELETE | Surfboard | USER (owner) | live |
| `/api/v1/surfboard/plans/shared` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/shared-with-me` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/deleted` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/check-number` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/facilitators` | GET | Surfboard | USER | live — `?withPlanNumbers=true` selects variant |
| `/api/v1/surfboard/plans/reference-numbers` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/plans/geo/boundaries` | POST | Surfboard | USER | live |
| `/api/v1/surfboard/users/search` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/users/lookup` | GET | Surfboard | USER | live |
| `/api/v1/surfboard/analytics` | GET | Surfboard | USER, ADMIN, SUPERADMIN | live — `?section=stats\|dimension\|lodgement-trend\|time-trend` |
| `/api/v1/surfboard/mda/stage-stats` | GET | Surfboard | 7 MDA stage roles, MDA_SUPERADMIN, SUPERADMIN | live — own stage only, except MDA_SUPERADMIN/SUPERADMIN (all 7 combined) |
| `/api/v1/reva/{properties,one-time-properties,payments,notifications}/*` (14 routes) | GET/POST/PATCH | REVA | varies | live |
| `/api/v1/reva/admin/requests`, `/admin/requests/[reference]`, `/admin/requests/[reference]/report`, `/admin/requests/[reference]/approve` | GET/POST | REVA | ADMIN, SUPERADMIN | live |
| `/api/v1/reva/admin/users`, `/admin/users/[id]`, `/admin/users/[id]/role`, `/admin/users/[id]/status` | GET/POST/PATCH/DELETE | REVA | ADMIN and/or SUPERADMIN, varies per route (see Phase 3 spec's route table) | live |
| `/api/v1/reva/profile` | GET/PATCH | REVA | USER, ADMIN, SUPERADMIN | live |
| `/api/v1/gbc/*` | — | GBC | varies | planned (Phase 4, not yet spec'd) |

### Legacy / pre-`/api/v1`

| Route | Method(s) | Product | Status |
|---|---|---|---|
| `/api/auth/[kindeAuth]` | GET | shared | live — Kinde's own catch-all handler |
| `/api/auth/homepage` | GET | shared | legacy |
| `/api/auth/login_redirect` | GET | shared | legacy |
| `/api/auth/logout_redirect` | GET | shared | legacy |
| `/api/auth/success/reva` | GET | REVA | live — Kinde callback, dual-writes native session (Phase 1) |
| `/api/auth/success/reva-restricted` | GET | REVA | live — same dual-write |
| `/api/auth/success/surfboard` | GET | Surfboard | live — same dual-write |
| `/api/auth/success/surf-restricted` | GET | Surfboard | live — **deliberately kept unrenamed**: this is a Kinde-registered redirect URI (external dashboard config); only its internal destination-redirect paths were updated to `/surfboard-restricted/*` |
| `/api/auth/success/surf-mda` | GET | Surfboard | live — same reasoning, destination paths updated to `/surfboard-mda/*`, callback URL itself unchanged |
| `/api/auth/success/gbc-restricted` | GET | GBC | live — same dual-write |
| `/api/auth/success/scram` | GET | SCRAM | live — same dual-write; note SCRAM has **no pages built yet**, only this callback exists (platform stub) |
| `/api/reva/users` | GET/POST? | REVA | legacy — candidate for Phase 3's service extraction |
| `/api/reva/webhooks/paystack` | POST | REVA | legacy — candidate for Phase 3 |
| `/api/webhooks/paystack` | POST | shared (Surfboard/GBC) | legacy — GBC events logged but not processed here yet, confirmed gap, closes in Phase 4 |
| `/api/webhooks/redcopy` | POST | Surfboard | legacy — external Red Copy API's callback target |

---

## Pages — Marketing / shared (`app/(main)`, `app/(noPopUp)`, `app/(projects)/redirect`)

| Route | Product | Status |
|---|---|---|
| `/about-us`, `/contact`, `/events`, `/featurednews`, `/gallery`, `/present`, `/services`, `/login`, `/signup` | twonodes marketing site | live |
| `/gbc-frame` | *(name collision only)* | live — confirmed unrelated ArcGIS/Survey123 tool, zero code overlap with the real GBC product, per Phase 4 spec |
| `/gbccertificate` | *(name collision only)* | live — same tool as above |
| `/grid/{calculate,generate,route,search,verify}` | surveying utility tools | live |
| `/redirect` | shared | live |

## Pages — REVA

| Route | Status |
|---|---|
| `/reva`, `/reva/contact`, `/reva/newsletter`, `/reva/onetimerequest`, `/reva/requestform`, `/reva/verifypayment`, `/reva/viewdetails` | live |
| `/reva/(auth)/login`, `/reva/(auth)/error-login` | live |
| `/reva/dashboard`, `/dashboard/{allrequests,newrequest,notifications,settings,verifypayment,viewdetails,viewmap}` | live |
| `/reva-restricted`, `/reva-restricted/(auth)/login` | live |
| `/reva-restricted/dashboard`, `/dashboard/{alluserrequests,payment-verification,review,settings,spatial-record,superadmin,viewdetails}` | live |
| `/reva-restricted/dashboard/notifications`, `/notifications/{create,manage}` | live |
| `/reva/onetimerequest` | live — the guest tracking/report-download page; an earlier plan note assumed this didn't exist, corrected during Phase 3's spec-writing |

## Pages — Surfboard

| Route | Status |
|---|---|
| `/surfboard`, `/surfboard/badge`, `/surfboard/(auth)/{login,error-login}` | live |
| `/surfboard/dashboard`, `/dashboard/{map,newplan,notifications,plans,queried-plans,settings,shared,spcode-verification,subscription,viewmap}` | live |
| `/surfboard/dashboard/plan`, `/plan/edit` | live |
| `/surfboard/dashboard/payment/callback`, `/dashboard/subscription/callback` | live |
| `/surfboard/dashboard/qr-earnings` | live |
| `/surfboardplan/[id]` | live — public plan page, QR-gated |
| `/surfboard-restricted/*` (15 admin dashboard routes, full list in Phase 2 spec) | live — renamed from `/surf-restricted/*`; old prefix 308-redirects |
| `/surfboard-mda/*` (10 MDA dashboard routes) | live — renamed from `/surf-mda/*`; old prefix 308-redirects |

## Pages — GBC

| Route | Status |
|---|---|
| `/gbc`, `/gbc/about`, `/gbc/contact`, `/gbc/gallery`, `/gbc/speakers`, `/gbc/sponsors`, `/gbc/tickets`, `/gbc/tickets/success`, `/gbc/certificate/[ticketNumber]` | live |
| `/gbc/restricted-login` | renaming (Phase 4) → naming variant gets folded into the flatten below |
| `/gbc/restricted`, `/restricted/{attendees,certificates,check-in,gallery,inquiries,settings,speakers,sponsors,tickets,users}` | renaming (Phase 4) → flattens to `/gbc-restricted/*` |
| `/gbc/error-login` | live |
| *(planned, Phase 4)* `/gbc/my-ticket` (or similar — reference+email lookup, REVA-one-time-request pattern) | planned (Phase 4) |
| *(planned, Phase 4)* public "Past Editions" page | planned (Phase 4) |
| *(planned, Phase 4)* ticket purchase/checkout flow | planned (Phase 4) |

---

## Maintenance note

This file is generated/updated by hand alongside each phase's spec and completion report — not by a script. When a phase renames, adds, or retires routes: update the relevant table's `Status` column (and add new rows for genuinely new routes) in the same session that ships the change, mirroring how `docs/development-history/progress.md`'s checkboxes get updated. Phase 3 (REVA) and Phase 4 (GBC) don't have their own route-by-route API spec yet (only Phase 1 and Phase 2 do) — their `/api/v1/*` rows above are placeholders until those specs are written.
