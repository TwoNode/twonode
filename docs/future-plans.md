# Future plans

Everything here is a **plan or a proposal, not built and not committed**, except where a row says it is in progress. This page is the one place that lists them, with what each depends on and a suggested order. Each document says what its own status is; if a plan is built, move it out of this list and into the docs for the feature.

## The list

| Plan                                                                                                        | Area         | Status                                                             | Read                                                                                                                                                                                  |
| :---------------------------------------------------------------------------------------------------------- | :----------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Backend roadmap**: Next.js now, NestJS later, Go much later                                               | Backend      | Plan, no dates, gated                                              | [`backend/roadmap.md`](./backend/roadmap.md)                                                                                                                                          |
| **Mobile app roadmap**: what the app needs from the backend at each stage                                   | Mobile       | Plan; stage 0 in progress                                          | [`mobile/roadmap.md`](./mobile/roadmap.md)                                                                                                                                            |
| **Surfboard Mobile App**: brief evaluation and engineering plan                                             | Mobile       | In progress: native auth built, app foundation in `twonode-mobile` | [`mobile/surfboard-mobile-app-evaluation.md`](./mobile/surfboard-mobile-app-evaluation.md)                                                                                            |
| **Mobile feasibility**: backend readiness for the app (cookie-only auth was the blocker, closed 2026-10-19) | Mobile       | Analysis; the auth blocker is closed                               | [`mobile/surfboard-mobile-feasibility.md`](./mobile/surfboard-mobile-feasibility.md)                                                                                                  |
| **Surfboard Association Subscription**: evaluation and recommended design                                   | Surfboard    | Proposal, paused; not implemented                                  | [`surfboard/association-subscription.md`](./surfboard/association-subscription.md)                                                                                                    |
| **Cloudflare R2 storage migration**: zero-egress storage, two-bucket design                                 | Storage      | Proposal, paused, nothing provisioned                              | [`adr/0016-storage-provider-evaluation-and-r2-migration.md`](./adr/0016-storage-provider-evaluation-and-r2-migration.md), [findings](./tasks/0014-r2-research-findings-2026-10-18.md) |
| **Nigeria Digital Postcode API** (NIPOST): address lookup integration                                       | Integrations | Research, nothing implemented                                      | [`integrations/nigeria-postcode-api.md`](./integrations/nigeria-postcode-api.md)                                                                                                      |

The mobile app's live plan and task list: [`tasks/0015-mobile-app-and-api.md`](./tasks/0015-mobile-app-and-api.md). Latest research: [`mobile/association-and-mobile-research-2026-10-18.md`](./mobile/association-and-mobile-research-2026-10-18.md), [`mobile/kinde-google-sign-in-research-2026-10-19.md`](./mobile/kinde-google-sign-in-research-2026-10-19.md), [`surfboard/surveyor-world-research-2026-10-19.md`](./surfboard/surveyor-world-research-2026-10-19.md).

## How they depend on each other

- The **mobile app** needs native-client auth first (stage 0 of the [mobile roadmap](./mobile/roadmap.md)). That work also unblocks any other API client.
- The **backend roadmap** starts moving only when a gate in it is hit (long-running jobs, connection limits, push or queues, a separately scaled API). Push notifications for the mobile app are the most likely first trigger.
- The **association subscription** is read by the mobile app (the "Sponsored by" line in Profile). It is a dependency, not part of the app build ([evaluation §4.7](./mobile/surfboard-mobile-app-evaluation.md)).
- The **postcode API** could feed the app's "Looking for?" search and enrich REVA requests. It does not replace a geocoder for address search.

## Suggested order

1. Native auth, an OpenAPI spec and the shared packages (stage 0 of both roadmaps). Native auth is **done** (2026-10-19, PR #495); the OpenAPI spec and shared packages are still to do.
2. The mobile app MVP on the Next.js API. **Started** (2026-10-19): the foundation is in the `twonode-mobile` repo.
3. Decisions on map tiles and a geocoder (licensing risk exists today on the web map).
4. NestJS, one area at a time, only when a gate is hit.
5. The association subscription and the postcode integration, when product priorities call for them.
6. Go, only on measured evidence.

## Open decisions that block the plans

- Map and geocoding providers. For the app's v1 the decision is self-hosted open vector tiles with no satellite layer, possibly a paid provider later (D3 in TASK-0015). The ArcGIS map was removed (the spatial page shows Coming Soon); the plan is MapLibre with the `nigeria_ward_admin_boundaries` table, and tile licensing still has to be settled before a map returns.
- R2: how to serve public GBC images (separate media domain, app route, or stay on S3) and whether the main domain's DNS may move.
- Whether the mobile app gets offline reads (the brief does not ask for them).
- Whether physical-copy submission needs an active subscription on mobile.
- Who owns database migrations once a second service writes data ([`backend/roadmap.md`](./backend/roadmap.md) §2.5).

## Related

- Decisions that shape these plans: [`adr/`](./adr/index.md) (for example the backend order, [0007](./adr/0007-backend-order-nextjs-nestjs-go.md), and the proposed certificate access design, [0008](./adr/0008-gbc-certificate-access.md)).
- The rebuild and history of the current system: [`development-history/`](./development-history/).
- The routes that exist today: [`development-history/route-inventory.md`](./development-history/route-inventory.md).
