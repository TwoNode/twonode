# I-066 re-measured: REVA's address-vs-pin check, on staging (2026-11-26)

**Result in one paragraph.** The rule built for I-066 (PR #587, options A and D, on `dev` and on staging since PR #590) behaves as designed against the real Google geocoder and the real ArcGIS price layer. Of 36 cases, **staging and a local run of the same code agree on all 36**. **No cheat got through:** all 8 attempts to pay the cheap price for a dearer property were refused (1 as 422 "does not match" because Google gave an exact answer in a dearer LGA, 7 as 400 "give a fuller address"). **Every honest address that names a street, an estate or a neighbourhood passed** (17 of 24 honest cases). The 6 honest cases that were refused name only a town or LGA ("Ikeja, Lagos", "Ikorodu, Lagos", "Surulere, Lagos", "Badagry, Lagos", "Epe, Lagos") or are a vague plot ("Plot 5 Block C, Ikorodu, Lagos"); they get the friendly 400 "Please give a fuller address…", not a 422 accusation. One honest area name ("Lekki Phase 1, Lagos") returned Google `ZERO_RESULTS`, so the payer is told "We could not find this address". Open: the maintainer's word (B2) before the production key is set.

**How it was measured (read-only, nothing created).**
- *Locally:* `out/live/reva-address-recheck.ts` (git-ignored) runs the real `assertAddressMatchesPrice` from `origin/dev` against Google's Geocoding API (the server key saved on 2026-11-19, read from a git-ignored file and never printed; the staging probes below used the key staging itself holds) and the public ArcGIS LGA price layer. No database, no Vercel.
- *On staging:* the same 36 cases were POSTed to the deployed `POST /api/v1/reva/one-time-properties` (public) through the Vercel protection bypass, with a correct `totalCost` and **no `email` field**. A request refused by the rule shows as 400 or 422; a request that gets past the rule is stopped one step later by the database layer (`email` is required: `PRISMA_VALIDATION_ERROR`) **before anything is inserted or Paystack is called**, so no record was made. The deployed code and key therefore behave as the local run does.
- Cost: about 75 geocoding calls (a few cents).

**Prices seen** (ArcGIS layer): Ikorodu, Badagry and Epe ₦30,000; Ikeja, Eti-Osa, Surulere, Lagos Mainland, Mushin, Kosofe and Apapa ₦50,000; a Google guess for "Plot 5 Block C, Ikorodu, Lagos" landed in Ifako-Ijaiye, ₦40,000, which is why that vague address is refused.

## The 36 cases

"Staging" is what the deployed route did (PASS = got past the rule, stopped later by the missing email).

| # | Kind | Pin (price) | Address typed (level) | Google's answer (quality, types) → LGA and price of its point | Rule (local) | Staging |
| - | ---- | ----------- | --------------------- | ------------------------------------------------------------- | ------------ | ------- |
| 1 | honest | Ikeja (₦50,000) | 12 Allen Avenue, Ikeja, Lagos (full) | OK ROOFTOP street_address+subpremise → IKEJA N50000 | **PASS** | PASS |
| 2 | honest | Ikeja (₦50,000) | Allen Avenue, Ikeja, Lagos (street) | OK GEOMETRIC_CENTER route → IKEJA N50000 | **PASS** | PASS |
| 3 | honest | Ikeja (₦50,000) | Ikeja, Lagos (area) | OK APPROXIMATE locality+political → IKEJA N50000 | **400 fuller address** | 400 fuller address |
| 4 | honest | Lekki (₦50,000) | 12 Admiralty Way, Lekki Phase 1, Lagos (full) | OK ROOFTOP street_address+subpremise → ETI-OSA N50000 | **PASS** | PASS |
| 5 | honest | Lekki (₦50,000) | Admiralty Way, Lekki, Lagos (street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **PASS** | PASS |
| 6 | honest | Lekki (₦50,000) | Lekki Phase 1, Lagos (area) | ZERO_RESULTS -  → - | **400 not found** | 400 not found |
| 7 | honest | Ikorodu (₦30,000) | Plot 5 Block C, Ikorodu, Lagos (vague plot) | OK RANGE_INTERPOLATED partial street_address → IFAKO-IJAIYE N40000 | **400 fuller address** | 400 fuller address |
| 8 | honest | Ikorodu (₦30,000) | Sagamu Road, Ikorodu, Lagos (street) | OK GEOMETRIC_CENTER route → IKORODU N30000 | **PASS** | PASS |
| 9 | honest | Ikorodu (₦30,000) | Ikorodu, Lagos (area) | OK APPROXIMATE locality+political → IKORODU N30000 | **400 fuller address** | 400 fuller address |
| 10 | honest | Surulere (₦50,000) | Adeniran Ogunsanya Street, Surulere, Lagos (street) | OK GEOMETRIC_CENTER route → SURULERE N50000 | **PASS** | PASS |
| 11 | honest | Surulere (₦50,000) | Surulere, Lagos (area) | OK APPROXIMATE administrative_area_level_2+political → SURULERE N50000 | **400 fuller address** | 400 fuller address |
| 12 | honest | Yaba (₦50,000) | Herbert Macaulay Way, Yaba, Lagos (street) | OK GEOMETRIC_CENTER route → LAGOS MAINLAND N50000 | **PASS** | PASS |
| 13 | honest | Yaba (₦50,000) | Yaba, Lagos (area) | OK APPROXIMATE neighborhood+political → LAGOS MAINLAND N50000 | **PASS** | PASS |
| 14 | honest | Victoria Island (₦50,000) | Adetokunbo Ademola Street, Victoria Island, Lagos (street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **PASS** | PASS |
| 15 | honest | Victoria Island (₦50,000) | Victoria Island, Lagos (area) | OK APPROXIMATE establishment+natural_feature → ETI-OSA N50000 | **PASS** | PASS |
| 16 | honest | Ajah (₦50,000) | Lekki-Epe Expressway, Ajah, Lagos (street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **PASS** | PASS |
| 17 | honest | Ajah (₦50,000) | Ajah, Lagos (area) | OK APPROXIMATE neighborhood+political → ETI-OSA N50000 | **PASS** | PASS |
| 18 | honest | Ikoyi (₦50,000) | Awolowo Road, Ikoyi, Lagos (street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **PASS** | PASS |
| 19 | honest | Ikoyi (₦50,000) | Ikoyi, Lagos (area) | OK APPROXIMATE neighborhood+political → ETI-OSA N50000 | **PASS** | PASS |
| 20 | honest | Badagry (₦30,000) | Badagry, Lagos (area) | OK APPROXIMATE locality+political → BADAGRY N30000 | **400 fuller address** | 400 fuller address |
| 21 | honest | Epe (₦30,000) | Epe, Lagos (area) | OK APPROXIMATE locality+political → EPE N30000 | **400 fuller address** | 400 fuller address |
| 22 | honest | Mushin (₦50,000) | Idi-Oro, Mushin, Lagos (street) | OK ROOFTOP establishment+point_of_interest → MUSHIN N50000 | **PASS** | PASS |
| 23 | honest | Magodo (₦50,000) | Magodo Phase 2, Lagos (estate) | OK APPROXIMATE neighborhood+political → KOSOFE N50000 | **PASS** | PASS |
| 24 | honest | Apapa (₦50,000) | Creek Road, Apapa, Lagos (street) | OK GEOMETRIC_CENTER route → APAPA N50000 | **PASS** | PASS |
| 25 | cheat or too vague | Ikorodu (₦30,000) | 12 Admiralty Way, Lekki Phase 1, Lagos (cheat, full) | OK ROOFTOP street_address+subpremise → ETI-OSA N50000 | **422 mismatch** | 422 mismatch |
| 26 | cheat or too vague | Ikorodu (₦30,000) | Awolowo Road, Ikoyi, Lagos (cheat, street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **400 fuller address** | 400 fuller address |
| 27 | cheat or too vague | Epe (₦30,000) | Adetokunbo Ademola Street, Victoria Island, Lagos (cheat, street) | OK GEOMETRIC_CENTER route → ETI-OSA N50000 | **400 fuller address** | 400 fuller address |
| 28 | cheat or too vague | Badagry (₦30,000) | Allen Avenue, Ikeja, Lagos (cheat, street) | OK GEOMETRIC_CENTER route → IKEJA N50000 | **400 fuller address** | 400 fuller address |
| 29 | cheat or too vague | Ikorodu (₦30,000) | Lekki, Lagos (cheat, vague area) | OK APPROXIMATE locality+political → ETI-OSA N50000 | **400 fuller address** | 400 fuller address |
| 30 | cheat or too vague | Ikorodu (₦30,000) | Victoria Island, Lagos (cheat, vague area) | OK APPROXIMATE establishment+natural_feature → ETI-OSA N50000 | **400 fuller address** | 400 fuller address |
| 31 | cheat or too vague | Ikeja (₦50,000) | Lagos (bare city) | OK APPROXIMATE locality+political → IKEJA N50000 | **400 fuller address** | 400 fuller address |
| 32 | cheat or too vague | Lekki (₦50,000) | Lagos State (bare state) | OK APPROXIMATE administrative_area_level_1+political → LAGOON N50000 | **400 fuller address** | 400 fuller address |
| 33 | junk | Ikeja (₦50,000) | zzzqqq nowhere street 99999 (nonsense) | OK APPROXIMATE partial country+political → outside (400) | **400 fuller address** | 400 fuller address |
| 34 | junk | Ikeja (₦50,000) | asdf (nonsense) | OK APPROXIMATE partial country+political → outside (400) | **400 fuller address** | 400 fuller address |
| 35 | junk | Ikeja (₦50,000) | Nigeria (country) | OK APPROXIMATE country+political → outside (400) | **400 fuller address** | 400 fuller address |
| 36 | junk | Ikeja (₦50,000) | Wuse 2, Abuja (outside the priced LGAs) | OK APPROXIMATE partial neighborhood+political → outside (400) | **400 fuller address** | 400 fuller address |

## What it means

- **The cheat is stopped, with a different message depending on how sure Google was.** An exact answer in a dearer LGA is a 422; a guess is "give a fuller address" (the payer is not accused). Either way the cheap price is not granted.
- **A bare "Lagos", "Lagos State", "Nigeria" and nonsense are all 400 "give a fuller address"** (never "does not match"), as I-066 asked. Nonsense says "fuller address" rather than "we could not find this address" because Google resolves nonsense to the country; that is fine for the payer.
- **Same-price area names can pass** (for example "Ikoyi, Lagos" for an Eti-Osa pin). No revenue is lost (the price is the same), but the address field then proves little. This is accepted.
- **Honest town-level names are asked for more.** This is the cost of the fix: "Ikorodu, Lagos" is refused until the payer adds a street or estate. The message says what to add.
- **Not covered:** addresses outside Lagos (only the Lagos LGA layer prices them), addresses with typos, and Pidgin or Yoruba place names. About 75 live calls is a sample, not a proof.

## Follow-ups (not done)

- Decide whether "We could not find this address" should also suggest adding a street when Google returns `ZERO_RESULTS` for a short place name ("Lekki Phase 1, Lagos").
- **B2 (the maintainer's word):** set the production key. Set `GOOGLE_MAPS_MAP_API_KEY` for the app's map; REVA's check reads `GOOGLE_MAPS_SERVER_API_KEY` alone, and setting it on production switches this rule on for real payers.
