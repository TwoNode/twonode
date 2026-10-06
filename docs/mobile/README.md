# Mobile Documentation

Findings and feasibility work for taking any of the three products (Surfboard, REVA, GBC) mobile, starting with the Surfboard Mobile App proposal.

- [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md) — **start here for the plan.** Evaluation (2026-10-04) of the Mobile App brief and the engineering plan built from it: what the backend already covers, the bearer-auth bridge the app needs (CSRF, lost-response refresh, CGNAT rate limits, the email-verification gate), plan corrections (EPSG zone, map-tile licensing, store policy, scope, timeline) and a phased recommendation. Research only — no mobile code exists.
- [`backend-roadmap.md`](./backend-roadmap.md) — **future plan** for which backend serves the mobile app and in what order: the Next.js API now, NestJS later, Go much later, with the gates, the strangler-style move between them, and the stage-0 work that keeps it cheap.
- [`surfboard-mobile-feasibility.md`](./surfboard-mobile-feasibility.md) — technical feasibility analysis of the Surfboard Mobile App brief against the current backend: what's already there, the one real blocker (native auth is cookie-only), and the options for closing it.

The Nigeria Digital Postcode API (a possible address-lookup integration for the app and the web) is researched separately in [`../integrations/nigeria-postcode-api.md`](../integrations/nigeria-postcode-api.md).

For the backend these findings are checked against, see [`../surfboard/`](../surfboard/) (product flows) and [`../auth/`](../auth/) (the auth system itself — `technical.md` §1 covers the native JWT+cookie session this document's auth-gap section is about).
