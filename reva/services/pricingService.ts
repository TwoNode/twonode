import { ApiError, ValidationError } from "@/lib/api/errors";

/**
 * REVA's price for a request is set per Lagos LGA, in the `Price` attribute of
 * a public ArcGIS layer. The browser used to read that layer itself and post
 * the result as `totalCost`, which the server then stored and charged, so the
 * payer chose the price. The server now makes the same lookup from the
 * request's coordinates and ignores what the browser claims.
 *
 * Same layer and query the request form uses, minus the geometry.
 */
const LGA_PRICE_LAYER =
  "https://services7.arcgis.com/TAQqukrwbbGDP0ax/arcgis/rest/services/LGA_4326/FeatureServer/0/query";

const LOOKUP_TIMEOUT_MS = 8000;

export type RevaPrice = { lga: string; price: number };

export async function getRevaPriceForLocation(
  lat: unknown,
  lng: unknown,
  fetchImpl: typeof fetch = fetch
): Promise<RevaPrice> {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new ValidationError({ location: "A valid map location is required" });
  }

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "LGA,Price",
    returnGeometry: "false",
    f: "json",
  });

  let body: any;
  try {
    const res = await fetchImpl(`${LGA_PRICE_LAYER}?${params}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ArcGIS answered ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.error("[reva-pricing] LGA price lookup failed", err);
    // Never fall back to a client-supplied price.
    throw new ApiError(
      503,
      "PRICE_UNAVAILABLE",
      "Could not determine the price for this location. Please try again."
    );
  }

  const attributes = body?.features?.[0]?.attributes;
  const price = Number(attributes?.Price);
  if (!attributes || !Number.isFinite(price) || price <= 0) {
    throw new ValidationError({
      location: "No priced Lagos LGA was found for this location",
    });
  }

  return { lga: String(attributes.LGA ?? "UNKNOWN").toUpperCase(), price };
}

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * How exact Google's answer for an address is (I-066, measured 2026-11-19 against the real
 * geocoder). Google never says "not found" for words inside Nigeria: it falls back to a district,
 * a city, a state or the country, and for a half-matched street it guesses a point.
 *
 * - `broad`: the answer is a place, not a property: only a country, state, local government or
 *   city, with nothing finer (no street, premise, district or landmark). A bare "Lagos", and
 *   nonsense that Google resolved to the country, land here. The address proves nothing about
 *   where the property is, so it is refused (400) whatever price it falls in.
 * - `imprecise`: Google matched only part of the address (`partial_match`) or gave the middle of
 *   an area (`APPROXIMATE`, `GEOMETRIC_CENTER`). Its guessed point may sit in a differently
 *   priced LGA than the real property, so a price difference is then not proof of a cheat: the
 *   payer is asked for a fuller address (400) instead of being told it "does not match" (422).
 *
 * A result that carries no type or location type (an older fixture, a changed response) counts
 * as precise and exact: the old behaviour.
 */
const BROAD_TYPES = new Set([
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "locality",
]);
const FINER_TYPES = [
  "street_address",
  "route",
  "premise",
  "subpremise",
  "neighborhood",
  "sublocality",
  "intersection",
  "establishment",
  "point_of_interest",
  "plus_code",
];

export const FULLER_ADDRESS_MESSAGE =
  "Please give a fuller address: the street or estate, the area and the town, not only the city.";

function describeGeocode(result: any): { broad: boolean; imprecise: boolean } {
  const types: string[] = Array.isArray(result?.types) ? result.types : [];
  const hasFiner = types.some((type) =>
    FINER_TYPES.some((finer) => type === finer || type.startsWith(`${finer}_`))
  );
  const broad = !hasFiner && types.some((type) => BROAD_TYPES.has(type));
  const kind = result?.geometry?.location_type;
  const imprecise =
    result?.partial_match === true ||
    kind === "APPROXIMATE" ||
    kind === "GEOMETRIC_CENTER";
  return { broad, imprecise };
}

/**
 * The browser posts both an address and map coordinates, and the price comes
 * from the coordinates. Nothing tied the two together, so a payer could drop
 * the pin in a cheaper LGA while naming the real property in the address. The
 * server therefore geocodes the address itself and requires it to fall in a
 * location with the same price as the pin.
 *
 * Needs `GOOGLE_MAPS_SERVER_API_KEY` (this check ONLY: the app's map routes have their own
 * `GOOGLE_MAPS_MAP_API_KEY`, I-066, so one can be on without the other): a key without an HTTP-referrer
 * restriction (the NEXT_PUBLIC browser key is referrer-restricted and Google
 * rejects it from a server). If it is unset the check is skipped with a
 * warning, so deploying this code cannot by itself block payments.
 */
export async function assertAddressMatchesPrice(
  address: unknown,
  pinPrice: RevaPrice,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    console.warn(
      "[reva-pricing] GOOGLE_MAPS_SERVER_API_KEY is not set; address was not verified against the map location"
    );
    return;
  }

  const text = typeof address === "string" ? address.trim() : "";
  if (!text) {
    throw new ValidationError({ address: "An address is required" });
  }

  let body: any;
  try {
    const params = new URLSearchParams({
      address: text,
      components: "country:NG",
      key,
    });
    const res = await fetchImpl(`${GEOCODE_URL}?${params}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Geocoder answered ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.error("[reva-pricing] address geocoding failed", err);
    throw new ApiError(
      503,
      "ADDRESS_LOOKUP_UNAVAILABLE",
      "Could not verify the address. Please try again."
    );
  }

  if (body?.status === "ZERO_RESULTS") {
    throw new ValidationError({
      address: "We could not find this address. Please check it and try again.",
    });
  }
  const point = body?.results?.[0]?.geometry?.location;
  if (body?.status !== "OK" || !point) {
    // REQUEST_DENIED, OVER_QUERY_LIMIT, ...: our configuration, not the payer's input.
    console.error(
      "[reva-pricing] geocoder status",
      body?.status,
      body?.error_message
    );
    throw new ApiError(
      503,
      "ADDRESS_LOOKUP_UNAVAILABLE",
      "Could not verify the address. Please try again."
    );
  }

  const { broad, imprecise } = describeGeocode(body.results[0]);
  if (broad) {
    throw new ValidationError({ address: FULLER_ADDRESS_MESSAGE });
  }

  let addressPrice: RevaPrice;
  try {
    addressPrice = await getRevaPriceForLocation(
      point.lat,
      point.lng,
      fetchImpl
    );
  } catch (err) {
    // Outside the priced Lagos LGAs (a ValidationError) is a mismatch; an
    // unreachable layer (503) stays a 503.
    if (err instanceof ApiError && err.status === 503) throw err;
    addressPrice = { lga: "UNKNOWN", price: NaN };
  }

  if (addressPrice.price !== pinPrice.price) {
    // Google only guessed (part of the address matched, or the middle of an area): the guess is not
    // evidence of a different price, so ask for more detail instead of accusing the payer.
    if (imprecise) {
      throw new ValidationError({ address: FULLER_ADDRESS_MESSAGE });
    }
    throw new ApiError(
      422,
      "ADDRESS_LOCATION_MISMATCH",
      "The address does not match the location pinned on the map. Please pin the property's location and use its address."
    );
  }
}

/**
 * The price to charge for a request at `location`, from the server's own
 * lookup. `postedTotalCost` is what the browser displayed to the payer; if it
 * disagrees with the server (a stale form, or tampering) the request is
 * refused instead of silently charging a different amount than was shown.
 */
export async function resolveRevaPrice(
  location: { lat?: unknown; lng?: unknown } | null | undefined,
  postedTotalCost: number,
  address?: unknown,
  fetchImpl?: typeof fetch
): Promise<RevaPrice> {
  const server = await getRevaPriceForLocation(
    location?.lat,
    location?.lng,
    fetchImpl
  );
  if (
    Number.isFinite(postedTotalCost) &&
    Math.abs(postedTotalCost - server.price) > 0.5
  ) {
    throw new ApiError(
      409,
      "PRICE_MISMATCH",
      "The price for this location is different from the one shown. Please refresh the page and try again."
    );
  }
  await assertAddressMatchesPrice(address, server, fetchImpl);
  return server;
}
