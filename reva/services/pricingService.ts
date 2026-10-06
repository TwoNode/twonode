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
 * The browser posts both an address and map coordinates, and the price comes
 * from the coordinates. Nothing tied the two together, so a payer could drop
 * the pin in a cheaper LGA while naming the real property in the address. The
 * server therefore geocodes the address itself and requires it to fall in a
 * location with the same price as the pin.
 *
 * Needs `GOOGLE_MAPS_SERVER_API_KEY`: a key without an HTTP-referrer
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
