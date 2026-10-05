# Nigeria Digital Postcode API (NIPOST) — integration research

> **Status: research. Nothing is implemented.** Researched 2026-10-04 from the public developer documentation at <https://docs.postcode.gov.ng/> (including its OpenAPI spec), press coverage of the national rollout, and a read of where Twonodes stores addresses and locations. Kept separate from the association/mobile evaluations on purpose — it is its own integration with its own timing and risks. Where the postcode API touches those plans it is cross-referenced at the end.

## 1. Bottom line

- The **National Digital Postcode System** gives every addressable building an **11-character alphanumeric code** (`FC 02 A09 DB 09`) tied to GIS coordinates. NIPOST leads it, with the Office of the Surveyor General, the National Population Commission and NASRDA ([Nairametrics, 20 Aug 2026](https://nairametrics.com/2026/08/20/nigerias-new-digital-postcode-arrives-october-1-what-changes-for-you/)). **It started rolling out on 1 October 2026** — three days before this research — with dense urban areas first and full coverage targeted for December 2026. Expect thin and uneven data for some months.
- The developer API is **early-stage**: OpenAPI `version: 0.1.0`; the widget packages for Web and React Native are "publication pending"; press in August described the developer portal as "still being finalised". Pricing, SLA, data-retention terms and sandbox behaviour are **not published** in the pages we could read.
- **Best fit: REVA** (property due diligence — it already stores free-text address, optional lat/lng, LGA and parcel ID per request). **Useful, optional: Surfboard** (enrich a plan with the postcode at its location; validate profile addresses). **Not a fix for the mobile app's "search by address"** — the free tiers autocomplete _postcodes_, they do not forward-geocode street addresses to coordinates (§3.3).
- **The proposed use** — tag each new survey plan with the postcode of its centroid, as an "aligned with the national addressing infrastructure" step — is technically easy and should cost no credits, but its product value is low today (parcels aren't buildings; coverage just started). Its value is the NIPOST relationship, provided claims stay accurate. Full assessment and ranked alternatives (incl. the more strategic parcel↔building-unit linkage) in §5.4–§5.5.
- Recommendation: do a **time-boxed spike** (account, test key, answers to the questions in §7) and, if the answers are acceptable, ship a small **server-side, feature-flagged REVA enrichment** first. Do not put the postcode on any critical path yet.

## 2. What the system is

| Fact               | Detail                                                                                                                                                                                                                                                   | Source                                                                      |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Structure          | Five segments: **state** (2 letters) · **LGA** (2 digits, 01–99, never 00) · **district** (3 alphanumeric) · **area** (2 letters) · **building unit** (2 digits). Example `EK-01-A03-FK-01` = unit 01, area FK, district A03, LGA 01 (Ado-Ekiti), Ekiti. | [Postcode format](https://docs.postcode.gov.ng/concepts/postcode-format.md) |
| Input tolerance    | Spaces, hyphens and case are interchangeable: `EK-01-A03-FK-01`, `EK 01 A03 FK 01`, `ek01a03fk01`.                                                                                                                                                       | same                                                                        |
| Purpose            | "A machine-readable location identifier meant to be used **alongside** conventional address information, not necessarily to replace it."                                                                                                                 | Nairametrics                                                                |
| Ownership / access | "Data ownership sits with the Federal Republic of Nigeria through NIPOST", with tiered (restricted/sensitive) access managed through MOUs.                                                                                                               | Nairametrics                                                                |
| Scope of a code    | A **building unit**, not a land parcel. Vacant land, farmland and large parcels have no building to code.                                                                                                                                                | inferred from the format and "addressable building" definition              |

## 3. The API

Base URL `https://api.postcode.gov.ng/v1` (widget endpoints live on `https://platform.postcode.gov.ng/v1`). Auth: `X-API-Key` header.

### 3.1 Endpoints

| Endpoint                                                                                                   | Purpose                                                                                                                                                                                                                              | Cost                                               |
| :--------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `GET /v1/search/autocomplete?q=`                                                                           | Segment-aware completion of a _partial postcode_ (it detects which segment you're typing). Returns `{segment, suggestions:[{code,label}]}`.                                                                                          | free                                               |
| `GET /v1/lookup?code=&level=`                                                                              | Graded lookup. L1 validity · L2 + administrative address + recent house address · L3 + building-use status · L4 + other building info · L5 + point geometry.                                                                         | L1 free; L2–L4 **credits**; L5 **restricted**      |
| `GET /v1/search/reverse?lat=&lng=&max_distance_m=`                                                         | Nearest _active_ unit to a coordinate. Default radius 25 m, **hard ceiling 250 m**. Returns `found`, `unit{postcode, distance_m, confidence: high\|medium\|low, …}`. State/LGA names and address only for keys with lookup level 2+. | needs `search` scope                               |
| `GET /v1/search/nearby?lat=&lng=&radius=`                                                                  | Units within a radius (default 300 m) with distances.                                                                                                                                                                                | needs `search` scope                               |
| `POST /v1/assembly/assemble`, `GET /v1/assembly/disassemble`                                               | Build/parse a canonical postcode from/into segments (dashed, display, compact).                                                                                                                                                      | free                                               |
| `POST /v1/widget/session` → `GET /v1/widget/{bookmarks,lookup,reverse,nearby}`, `POST /v1/widget/selected` | Embeddable picker (saved "bookmarks" + map discovery); identifies the end user by **NIN or email**; session token valid 900 s.                                                                                                       | sessions and widget lookups **metered in credits** |

### 3.2 Keys, limits, errors

- Key kinds: `nipost_test_…` / `nipost_live_…` (**secret**, server-side only) and `nipost_pk_test_…` / `nipost_pk_live_…` (**publishable**, ships in client code). Keys carry **scopes** (`search`, `lookup`, `widget`) and a **max lookup level**. Keys are created in the dashboard (Settings → API Keys); secrets are shown once; revocation is immediate.
- Rate limit: "**600 requests** per key" with `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers; publishable keys are limited **per key and per IP per key**. _The window (per minute? per hour?) is not stated on the pages read._
- Errors: `401` bad/missing/revoked key · `402` insufficient credits · `403` wrong scope/level or origin not allowed · `429` rate limited · `422` bad widget input.
- Widget keys have an **origin allowlist** for browsers. Native apps send no `Origin`, so the allowlist doesn't gate them — a publishable key embedded in a mobile binary can be extracted and reused ([Publishable keys](https://docs.postcode.gov.ng/widget/publishable-keys.md)). The docs state the exposure plainly: anyone with the key can open widget sessions and read a person's **bookmark labels and postcodes** given that person's NIN or email.
- SDKs: Web (`@nipost/postcode-widget`), React Native/Expo (`@nipost/postcode-widget-react-native`; needs an Expo **development build**, RN ≥ 0.74, iOS 15+, Android minSdk 24), Flutter, Android, iOS. The Web SDK cannot run server-side (SSR).

### 3.3 What it does _not_ do (important for our use cases)

- **No free-text address search or forward geocoding on L1–L4.** Autocomplete completes postcodes; lookup takes a postcode. Getting _coordinates from a postcode_ is point geometry — **L5, restricted** (the widget exposes geometry only to its own map, not to your code). So it can't replace a geocoder for the mobile brief's "search with address" ([mobile evaluation §4.4](../mobile/surfboard-mobile-app-evaluation.md)).
- **Reverse geocoding is local, not parcel-level**: ≤ 250 m, "nearest active unit", with a confidence grade. In areas not yet captured it simply returns `found: false`.

## 4. Documentation inconsistencies to resolve before building

These are contradictions inside the vendor's own docs; build against the API's _actual_ responses, and ask NIPOST.

1. **Length:** the docs call it a "12-character" code, but the segments (2+2+3+2+2) total **11**, and the press and the example (`FC 02 A09 DB 09`) are 11. Validate by segment lengths, not "12".
2. **Lookup levels:** the Authentication and Lookup-Levels pages describe **three** levels (max level 1–3); the API reference documents **five** (L4 other building info, L5 point geometry, restricted); the reverse-geocode page says "L2–L4 require credits". Treat L1–L3 as available to a normal key and L4/L5 as unconfirmed.
3. **Rate limit window** for the "600 requests per key" is unstated.
4. **Credit pricing, free-tier ceilings, SLA, uptime and data-retention/caching terms** are not on the pages we could read. The dashboard registration page returned no readable terms.
5. **Test-mode behaviour** (`nipost_test_…`): whether it returns fixture data or real data is not stated.
6. **Package availability:** the widget overview says Web and React Native are "publication pending"; the Web page says to build from the gateway repo until published.

## 5. Where it fits in Twonodes

What the code stores today (verified in `prisma/schema/*.prisma`):

| Product                                          | Existing location/address fields                                                                                                                        |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REVA** — `UserProperty`, `OneTimeUserProperty` | `address String` (free text), `lat/lng Float?`, `lga String`, `parcelId String?`                                                                        |
| **Surfboard** — `SurfboardPlan`                  | `state/lga/lcda/ward/locality String?` (derived from the plan geometry via admin boundaries) and the geometry itself; **no address, no postcode**       |
| **Surfboard** — `SurfboardUser`                  | `address`, `companyAddress`, `residenceState`, and **`postalCode`** — which nothing in the app reads or writes today (legacy-style numeric postal code) |
| **GBC**                                          | none — ticket buyers don't give an address                                                                                                              |
| Anywhere in the app                              | no `postcode`/`postal` handling in code                                                                                                                 |

### 5.1 REVA — strongest case (property due diligence)

REVA's whole job is "is this property what it claims to be". A building-unit postcode is a natural, official, canonical identifier to attach to a request.

- **Normalise and validate the address.** On the request form, let the user enter/pick a postcode (autocomplete is free) or drop a map pin; resolve `lat/lng → postcode` via reverse geocode (≤ 250 m, show the confidence), then show state/LGA/"recent house address" for the user to confirm against what they typed.
- **Fill `lga` and detect mismatches.** The existing `lga` is user-supplied; the L2 administrative address gives an authoritative state/LGA to compare (flag, don't block).
- **Evidence in the report.** Store the resolved postcode, the level used, confidence and `checkedAt` on the request; include "building use status" (L3, e.g. residential) in the due-diligence report — a genuinely useful data point for a buyer.
- **Admin search/dedupe** by postcode across requests (same building requested twice).
- Cost shape: one L2/L3 lookup **per request, at submission or report time**, cached on the row — not per page view.

### 5.2 Surfboard — optional enrichment, with limits

- **Plan enrichment:** reverse-geocode the plan centroid to attach a postcode and confidence as _metadata_ (search/filter by postcode; extra context in the MDA view). **Caveats:** a survey plan is a land parcel that may be vacant, large or rural; the nearest building may be 250 m+ away (`found: false`). Never use the postcode as the plan's identifier — keep `planNumber`/pillars authoritative.
- **Profile address validation:** replace the unused `SurfboardUser.postalCode` with a validated digital postcode field (or add one beside it) for `address`/`companyAddress`.
- **Residence evidence for the association feature:** the state segment of a user's postcode (e.g. `EK` → Ekiti) is a cheap consistency check against `residenceState` ([association evaluation §5.6](../surfboard/association-subscription.md)). Optional; don't make it a gate while coverage is partial.
- **Mobile omnibar:** postcode _autocomplete_ is free and fits "Looking for?" for users who know a code, but it does not give coordinates (§3.3). It does **not** replace the geocoder decision in the mobile evaluation.
- The Office of the Surveyor General is a named programme partner. That is a relationship worth using: ask whether survey-plan/cadastral linkage is on the roadmap before building a bespoke one.

### 5.3 GBC — no use case today.

### 5.4 The proposed use: tag each new survey plan with a postcode ("aligned with the national addressing infrastructure")

**The proposal** (from the team): when a plan is created from an uploaded CSV, send the plan's centroid (lng/lat) to the Postcode API and keep the returned postcode. Not a delivery priority; the value is alignment with the national addressing programme and a basis for engaging NIPOST.

**Technical verdict: easy, cheap and low-risk if done server-side and fail-open.**

- The CSV is parsed in the browser (pillars as Minna-UTM easting/northing) and the client posts `geometry` (GeoJSON, WGS84) plus `pillars` to `POST /api/v1/surfboard/plans`; the server stores them in `createSurfPlan` (`surfboard/services/planService.ts`). The server **already computes a centroid** (`computeGeometryDetails` → `@turf/centroid`, used when plans are read) but does not store it. Hook the enrichment into plan creation _after_ the row is written — via Next's `after()` (present in this Next version: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`) or a small retry cron — so the user's submit never waits on a third party.
- Per the docs, reverse geocoding needs only a **`search`-scope key** (free) for the postcode, `distance_m` and `confidence`; the state/LGA names are what need lookup level 2+ (credits). Tagging plans with just the postcode should therefore cost **no credits** (confirm in the spike).
- **Mind the axis order.** The API takes `lng` and `lat`; GeoJSON is `[lng, lat]`; people say "lat, long". Add a unit test with a known Lagos point (≈ 3.35 E, 6.53 N → `lng=3.35&lat=6.53`).
- A polygon centroid can fall **outside** a concave plot; if that matters use `@turf/point-on-feature`. For a ≤ 250 m search the difference is usually immaterial.

**Honest assessment of value.**

| Aspect                              | Assessment                                                                                                                                                                                                                                                                                                                                                                                                         |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product value to surveyors/MDAs     | **Low today.** A survey plan is a parcel; a postcode is a _building unit_. The nearest coded unit can be 100–250 m away or absent (vacant land, estates, rural plots), and coverage only began on 1 Oct 2026 — many lookups will return `found: false` for months.                                                                                                                                                 |
| Alignment / PR / relationship value | **Real, but conditional.** The programme names the Office of the Surveyor General as a partner and described the developer portal as "still being finalised" while taking expressions of interest from startups ([Nairametrics](https://nairametrics.com/2026/08/20/nigerias-new-digital-postcode-arrives-october-1-what-changes-for-you/)). Being an early, working integrator is a genuine conversation-starter. |
| Engineering cost                    | Small (one nullable column group, one server client, one `after()` call, a backfill job).                                                                                                                                                                                                                                                                                                                          |
| Risk                                | Mostly about **claims and clarity**, not code — see below.                                                                                                                                                                                                                                                                                                                                                         |

**Cautions.**

1. **Say only what is true.** "Aligned with the National Addressing Infrastructure" is defensible once plans genuinely carry codes from NIPOST's own API. "Official partner", "endorsed by", "integrated with NIPOST/Surveyor General" are claims about the _relationship_ — wait until NIPOST agrees in writing to be named, and don't go public before then. (Note the programme partner is the _Office of the Surveyor General_ — do not assume that is the Lagos State Surveyor General's office, Surfboard's actual MDA counterpart.)
2. **Label it for what it is.** Show "Nearest postcode: `EK-01-A03-FK-01` (≈ 40 m, high confidence)", never "the plan's postcode". Hide or grey out low-confidence/far results. Never use it as an identifier.
3. **Don't leak what isn't ours to share.** Plans can be private records. Send only a coordinate — no plan number, title, owner or surveyor — and round it (4 decimals ≈ 11 m is plenty for a 25–250 m search). Mention third-party location lookups in the privacy policy. A one-off **backfill of every existing plan** would send a large location dataset to a government API at once; do it deliberately, throttled to the rate limit (600 per key, window unconfirmed), and only after NIPOST has agreed to the terms.
4. **Store the outcome, including "not found".** Keep `status` (`FOUND | NOT_FOUND | ERROR`), `confidence`, `distance_m`, `checkedAt`. Re-check `NOT_FOUND` rows on a schedule while coverage grows toward the December target.
5. **Edits.** If a plan's geometry is edited (resubmission/withdrawal flows), clear and recompute.

### 5.5 Other ideas, ranked by value

| #   | Idea                                                                                               | Why it's worth considering                                                                                                                                                                                                                                           | Needs                                                                                                                                                                                                                                             |
| :-- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **REVA address/LGA validation and report enrichment** (§5.1)                                       | Real due-diligence value; REVA already stores address, lat/lng, LGA, parcel ID. Gives a buyer a building-use status and an official code.                                                                                                                            | free autocomplete + L2/L3 credits                                                                                                                                                                                                                 |
| 2   | **Show the nearest postcode on the public QR plan page and receipts**                              | The QR page is what buyers, lawyers and ministries see — the most visible, human-readable place for an "official location reference", and the best PR surface for the integration.                                                                                   | the §5.4 enrichment                                                                                                                                                                                                                               |
| 3   | **Integrity check on declared location**                                                           | `state/lga/lcda/ward` on a plan are client-supplied fields. Cross-checking the postcode's state/LGA segments against them gives MDA reviewers an automatic "location doesn't match" flag. Review aid, not a gate.                                                    | L2 names (or a documented state/LGA code table — ask NIPOST); coverage                                                                                                                                                                            |
| 4   | **Parcel ↔ building-unit linkage** — "which addressed buildings fall inside this surveyed parcel?" | This is the strategically interesting one: surveyors own the _parcel_ layer, NIPOST owns the _building-point_ layer. A point-in-polygon join makes Surfboard the cadastral complement to the postcode system and is directly useful to REVA, lawyers and ministries. | **L5 point geometry — restricted, MOU/data-sharing agreement.** The reverse/nearby endpoints give only nearest units (no geometry on a normal key). Speculative; this is the thing to raise in the conversation with NIPOST/the Surveyor General. |
| 5   | **"Search my plans by postcode"** in web and mobile                                                | Cheap once plans are tagged; uses the free autocomplete. Does _not_ solve address-to-map search (§3.3).                                                                                                                                                              | §5.4 enrichment                                                                                                                                                                                                                                   |
| 6   | **Profile address / association residence consistency**                                            | Replace the unused `SurfboardUser.postalCode`; compare the state segment with `residenceState`.                                                                                                                                                                      | coverage; optional, never a gate                                                                                                                                                                                                                  |
| 7   | **Co-marketing**                                                                                   | A short case study ("linking survey records to the national addressing infrastructure"), conference slots, a joint note — only after written agreement from NIPOST.                                                                                                  | relationship, not engineering                                                                                                                                                                                                                     |

**Sequencing I'd suggest:** (1) spike with a test key and send the §7 questions — treat that email as the start of the NIPOST relationship; (2) build the §5.4 enrichment behind a flag since it is cheap and demonstrates a working integration; (3) use what you learn to open the #4 conversation; (4) go public with "aligned" wording only after NIPOST has seen it and agreed.

## 6. Recommended design

**Server-side only for data calls.** Keep the secret key (`POSTCODE_API_KEY`, a `nipost_live_…`/`nipost_test_…` key) in server env; never send it to a browser or a mobile binary. Add a thin `lib/postcode/` client plus authenticated proxy routes (`/api/v1/postcode/autocomplete`, `/lookup`, `/reverse`) built with the project's `withAuth` and rate-limit helpers, so the browser and the mobile app call _our_ API. Reasons: credits are real money (`402`), the limit is per key, and a client-side secret would be extractable.

**Validation util** shared by web/mobile/server (also unit-tested against the doc's examples):

```ts
// Canonical compact form: 2 letters + 2 digits (01–99) + 3 alphanumerics + 2 letters + 2 digits (01–99) = 11 chars
const SEGMENTS =
  /^([A-Z]{2})(0[1-9]|[1-9]\d)([A-Z0-9]{3})([A-Z]{2})(0[1-9]|[1-9]\d)$/;
export function normalisePostcode(input: string) {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  const m = SEGMENTS.exec(compact);
  return m ? { compact, dashed: m.slice(1).join("-") } : null;
}
```

**Data model** (additive, nullable; REVA first):

```prisma
// on UserProperty / OneTimeUserProperty (and optionally SurfboardPlan, SurfboardUser)
postcode            String?   // compact canonical, e.g. "EK01A03FK01"
postcodeLevel       Int?      // lookup level actually used (1–3)
postcodeConfidence  String?   // "high"|"medium"|"low" when derived by reverse geocode
postcodeCheckedAt   DateTime?
```

**Behaviour rules**

- **Fail open.** The postcode is enrichment, not a dependency. `401/402/403/429`, timeouts and `found: false` must never block a REVA submission or a plan save; log, surface "couldn't verify", and let a background retry fill it in.
- **Cache derived results** on the row (never re-look-up on read); add a monitor/alert on `402` (credits exhausted) and on rate-limit headers.
- **Test keys in dev/staging, live key in prod only.** Don't spend credits in CI; stub the client in tests.
- **Don't collect NINs.** The widget identifies users by NIN _or email_; use email (the signed-in account's) and avoid ever handling or transmitting a NIN ourselves. A NIN is sensitive personal data under the Nigeria Data Protection Act 2023.
- **Prefer our own UI over the widget at first.** The free autocomplete + our own map picker gives the same result without a third-party widget, a publishable key shipped to clients, and bookmark/NIN exposure. Revisit the widget when its packages are published and the privacy model is clearer.
- **Privacy:** "recent house address" returned by L2 is personal data once tied to a requester. Store only what's needed, keep it out of logs, and check the retention/caching terms (§7) before persisting anything beyond the postcode itself.

## 7. Questions for NIPOST (send before committing engineering time)

1. Pricing: price per credit and per L2/L3 lookup; free-tier limits; volume tiers; invoicing in NGN.
2. Terms: may we **store and display** looked-up values (postcode, administrative names, house address, building use) in our database and in reports shown to third parties (REVA reports)? Any attribution requirement? Retention limits?
3. Coverage: what is captured today by state/LGA, and what is the schedule to the December 2026 target? Is there a coverage/"captured area" indicator in the API?
4. Levels: confirm which of L1–L5 exist, which a commercial key can obtain, and the **MOU** path for L5 point geometry (needed for postcode→coordinates).
5. Limits: the rate-limit window; burst allowance; behaviour at the limit.
6. SLA, status page, incident contact; versioning/deprecation policy for `v1` (spec says `0.1.0`).
7. Sandbox: do `nipost_test_…` keys return fixture or real data?
8. Reverse geocode: how "active" is defined; plans for **parcel/plot-level** linkage with the Office of the Surveyor General (relevant to Surfboard).
9. Widget: publication timeline for the Web and React Native packages; whether publishable keys can be restricted for mobile (bundle ID / attestation), given the allowlist doesn't apply to native clients.
10. Data-protection: NIPOST's controller/processor position for lookups made on behalf of our users (REVA requesters, surveyors), and what is logged on their side.

## 8. Phased plan (size, not dates)

| Phase                    | Scope                                                                                                                                                   | Size |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :--- |
| 0 — spike                | Register, obtain a test key, send §7 questions, exercise every endpoint, record real response shapes and the actual rate-limit window. Decide go/no-go. | S    |
| 1 — foundation           | `lib/postcode/` client, normaliser + tests, authenticated proxy routes, env/config, fail-open behaviour, credit/rate-limit monitoring.                  | S–M  |
| 2 — REVA                 | Postcode/map-pin on the request form, address/LGA cross-check, stored enrichment, report line item, admin search. Behind a feature flag.                | M    |
| 3 — Surfboard (optional) | Plan-centroid enrichment + filter; profile postcode; association residence consistency check.                                                           | S–M  |
| 4 — widget/mobile        | Only if §7 answers justify it: widget or in-app picker; postcode search in the mobile omnibar.                                                          | M    |

## 9. Cross-references

- [`../mobile/surfboard-mobile-app-evaluation.md`](../mobile/surfboard-mobile-app-evaluation.md) — address search/geocoding gap (§4.4); the postcode API only partly helps.
- [`../surfboard/association-subscription.md`](../surfboard/association-subscription.md) — `residenceState` data quality (§4.13, §5.6).
- [`../reva/`](../reva/) — current REVA request flow the enrichment would attach to.

## 10. Verification log and sources

**Done:** read the documentation index, Quickstart, Authentication, Lookup Levels, Postcode Format, Reverse Geocode, Location Search, Autocomplete, Graded Lookup, Widget overview/keys/session/Web/React Native pages and the full OpenAPI spec; read launch coverage in the press; inspected the Prisma schemas and code for address/location fields.

**Sources:** [Postcode API docs](https://docs.postcode.gov.ng/) · [docs index (llms.txt)](https://docs.postcode.gov.ng/llms.txt) · [Authentication](https://docs.postcode.gov.ng/authentication.md) · [Lookup levels](https://docs.postcode.gov.ng/concepts/lookup-levels.md) · [Postcode format](https://docs.postcode.gov.ng/concepts/postcode-format.md) · [Reverse geocode](https://docs.postcode.gov.ng/api-reference/reverse-geocode.md) · [Publishable keys](https://docs.postcode.gov.ng/widget/publishable-keys.md) · [OpenAPI spec](https://docs.postcode.gov.ng/api-reference/openapi.yaml) · [Nairametrics rollout article](https://nairametrics.com/2026/08/20/nigerias-new-digital-postcode-arrives-october-1-what-changes-for-you/).

**Could not verify:** pricing, terms of use, SLA, retention, sandbox data, actual coverage by area, real response latencies, and the rate-limit window (the dashboard registration page returned no readable content; the docs omit these). The 11-vs-12-character and L1–3-vs-L1–5 conflicts are in the vendor's own pages. The launch date and rollout plan come from press reporting, not NIPOST's own site.
