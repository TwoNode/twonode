# Mobile Documentation

Findings and feasibility work for taking any of the three products (Surfboard, REVA, GBC) mobile, starting with the Surfboard Mobile App proposal.

- [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md) — **start here for the plan.** Evaluation (2026-10-04) of the Mobile App brief and the engineering plan built from it: what the backend already covers, the bearer-auth bridge the app needs (CSRF, lost-response refresh, CGNAT rate limits, the email-verification gate), plan corrections (EPSG zone, map-tile licensing, store policy, scope, timeline) and a phased recommendation. Research only — no mobile code exists.
- [`roadmap.md`](./roadmap.md) — **future plan:** what the mobile app needs from the backend at each stage (Next.js now, NestJS later, Go much later) and the rules that keep the app independent of which backend answers. The backend side is in [`../backend/roadmap.md`](../backend/roadmap.md); every future plan is listed in [`../future-plans.md`](../future-plans.md).
- [`surfboard-mobile-feasibility.md`](./surfboard-mobile-feasibility.md) — technical feasibility analysis of the Surfboard Mobile App brief against the current backend: what's already there, the one real blocker (native auth is cookie-only), and the options for closing it.

The Nigeria Digital Postcode API (a possible address-lookup integration for the app and the web) is researched separately in [`../integrations/nigeria-postcode-api.md`](../integrations/nigeria-postcode-api.md).

For the backend these findings are checked against, see [`../surfboard/`](../surfboard/) (product flows) and [`../auth/`](../auth/) (the auth system itself — `technical.md` §1 covers the native JWT+cookie session this document's auth-gap section is about).
