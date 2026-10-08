# 0006. The REVA price is computed on the server, and the address is checked against the pin

- **Status:** Accepted
- **Date:** 2026-10-06
- **Related:** PRs #289 and #293, `reva/services/pricingService.ts`, [`../payment/subscription-payments-flow.md`](../payment/subscription-payments-flow.md)

## Context

REVA's price depends on the Lagos LGA of the pinned location (₦30,000 to ₦50,000). The browser used to read the price and post it as `totalCost`, which the server stored and charged, so the payer chose the price. Fixing that left a second gap: a payer could pin a cheaper LGA while naming the real property in the address.

## Decision

- The server looks the price up from the LGA layer itself, from the posted coordinates, and ignores the browser's value. A differing posted price gets 409 `PRICE_MISMATCH`. If the layer cannot be reached, the request fails closed (503). It never falls back to a client price.
- The server geocodes the posted address with the Google Geocoding API and requires it to fall in a location with the same price as the pin (422 `ADDRESS_LOCATION_MISMATCH`). This check only runs when `GOOGLE_MAPS_SERVER_API_KEY` is set. It must be an unrestricted server key, because Google rejects the referrer-restricted browser key from a server.

## Consequences

- The charged amount can no longer be chosen by the payer, except by pinning and naming locations within the same price tier.
- The address check is a comparison of prices, not of distance, so an address on an LGA boundary that geocodes into a differently priced neighbour is refused.
- If the key is set while its Google project has no billing, Google answers `REQUEST_DENIED` and every REVA payment fails with 503. Enable billing and test on staging first.
- Until the key is set, the check is skipped with a logged warning.
