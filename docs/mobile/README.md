# Mobile Documentation

The Surfboard mobile app (Android and iOS) lives in its own repository, **`TwoNode/twonode-mobile`** (local copy: `/home/rojitech/Desktop/CODEC/REACT-NATIVE/twonode-mobile`). **Status 2026-10-19:** the app foundation is built (Expo SDK 58: email and password sign-in, session handling, a five-tab shell whose screens other than Profile are placeholders) and the backend side it needed, native bearer-token auth, is built and merged (PR #495, [ADR-0017](../adr/0017-the-mobile-app-signs-in-with-bearer-tokens.md)). Everything else follows the plan.

- [`../tasks/0015-mobile-app-and-api.md`](../tasks/0015-mobile-app-and-api.md) — **the live plan and task list:** decisions D1 to D15, phases 0 to 8, and the API changes this repo needs, with status.
- [`kinde-google-sign-in-research-2026-10-19.md`](./kinde-google-sign-in-research-2026-10-19.md) — Google sign-in on Android and Sign in with Apple on iOS through Kinde: options, the recommended server-side exchange, Apple guideline 4.8, and the spike to run.
- [`association-and-mobile-research-2026-10-18.md`](./association-and-mobile-research-2026-10-18.md) — research refresh (Expo SDK 58, store policy, toolchain).

- [`surfboard-mobile-app-evaluation.md`](./surfboard-mobile-app-evaluation.md) — **start here for the plan.** Evaluation (2026-10-04) of the Mobile App brief and the engineering plan built from it: what the backend already covers, the bearer-auth bridge the app needs (CSRF, lost-response refresh, CGNAT rate limits, the email-verification gate), plan corrections (EPSG zone, map-tile licensing, store policy, scope, timeline) and a phased recommendation. Research only when written (2026-10-04); see the update at the top of the document.
- [`roadmap.md`](./roadmap.md) — **future plan:** what the mobile app needs from the backend at each stage (Next.js now, NestJS later, Go much later) and the rules that keep the app independent of which backend answers. The backend side is in [`../backend/roadmap.md`](../backend/roadmap.md); every future plan is listed in [`../future-plans.md`](../future-plans.md).
- [`surfboard-mobile-feasibility.md`](./surfboard-mobile-feasibility.md) — technical feasibility analysis of the Surfboard Mobile App brief against the current backend: what's already there, the one real blocker at the time (native auth was cookie-only; closed 2026-10-19), and the options for closing it.

The Nigeria Digital Postcode API (a possible address-lookup integration for the app and the web) is researched separately in [`../integrations/nigeria-postcode-api.md`](../integrations/nigeria-postcode-api.md).

For the backend these findings are checked against, see [`../surfboard/`](../surfboard/) (product flows) and [`../auth/`](../auth/) (the auth system itself — `technical.md` §1 covers the native JWT+cookie session this document's auth-gap section is about).
