# Mobile Documentation

Findings and feasibility work for taking any of the three products (Surfboard, REVA, GBC) mobile, starting with the Surfboard Mobile App proposal.

- [`surfboard-mobile-feasibility.md`](./surfboard-mobile-feasibility.md) — technical feasibility analysis of the Surfboard Mobile App brief against the current backend: what's already there, the one real blocker (native auth is cookie-only), and the options for closing it.

For the backend these findings are checked against, see [`../surfboard/`](../surfboard/) (product flows) and [`../auth/`](../auth/) (the auth system itself — `technical.md` §1 covers the native JWT+cookie session this document's auth-gap section is about).
