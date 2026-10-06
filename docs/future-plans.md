# Future plans

Everything here is a **plan or a proposal, not built and not committed.** This page is the one place that lists them, with what each depends on and a suggested order. Each document says what its own status is; if a plan is built, move it out of this list and into the docs for the feature.

## The list

| Plan                                                                                    | Area         | Status                                               | Read                                                                                       |
| :-------------------------------------------------------------------------------------- | :----------- | :--------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **Backend roadmap**: Next.js now, NestJS later, Go much later                           | Backend      | Plan, no dates, gated                                | [`backend/roadmap.md`](./backend/roadmap.md)                                               |
| **Mobile app roadmap**: what the app needs from the backend at each stage               | Mobile       | Plan, no dates                                       | [`mobile/roadmap.md`](./mobile/roadmap.md)                                                 |
| **Surfboard Mobile App**: brief evaluation and engineering plan                         | Mobile       | Proposal, no mobile code exists                      | [`mobile/surfboard-mobile-app-evaluation.md`](./mobile/surfboard-mobile-app-evaluation.md) |
| **Mobile feasibility**: backend readiness for the app (cookie-only auth is the blocker) | Mobile       | Analysis                                             | [`mobile/surfboard-mobile-feasibility.md`](./mobile/surfboard-mobile-feasibility.md)       |
| **Surfboard Association Subscription**: evaluation and recommended design               | Surfboard    | Proposal, the association feature is not implemented | [`surfboard/association-subscription.md`](./surfboard/association-subscription.md)         |
| **Nigeria Digital Postcode API** (NIPOST): address lookup integration                   | Integrations | Research, nothing implemented                        | [`integrations/nigeria-postcode-api.md`](./integrations/nigeria-postcode-api.md)           |

## How they depend on each other

- The **mobile app** needs native-client auth first (stage 0 of the [mobile roadmap](./mobile/roadmap.md)). That work also unblocks any other API client.
- The **backend roadmap** starts moving only when a gate in it is hit (long-running jobs, connection limits, push or queues, a separately scaled API). Push notifications for the mobile app are the most likely first trigger.
- The **association subscription** is read by the mobile app (the "Sponsored by" line in Profile). It is a dependency, not part of the app build ([evaluation §4.7](./mobile/surfboard-mobile-app-evaluation.md)).
- The **postcode API** could feed the app's "Looking for?" search and enrich REVA requests. It does not replace a geocoder for address search.

## Suggested order

1. Native auth, an OpenAPI spec and the shared packages (stage 0 of both roadmaps). Cheap, additive, and everything else needs them.
2. The mobile app MVP on the Next.js API.
3. Decisions on map tiles and a geocoder (licensing risk exists today on the web map).
4. NestJS, one area at a time, only when a gate is hit.
5. The association subscription and the postcode integration, when product priorities call for them.
6. Go, only on measured evidence.

## Open decisions that block the plans

- Map and geocoding providers, and the tile licensing risk on the current web map.
- Whether the mobile app gets offline reads (the brief does not ask for them).
- Whether physical-copy submission needs an active subscription on mobile.
- Who owns database migrations once a second service writes data ([`backend/roadmap.md`](./backend/roadmap.md) §2.5).

## Related

- The rebuild and history of the current system: [`development-history/`](./development-history/).
- The routes that exist today: [`development-history/route-inventory.md`](./development-history/route-inventory.md).
