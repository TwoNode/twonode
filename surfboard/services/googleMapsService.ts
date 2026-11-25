import { ApiError, NotFoundError } from "@/lib/api/errors";
import type { MapPoint } from "@/surfboard/utils/mapGoogleInput";

/**
 * The map's Google services for the mobile app (TASK-0014 G-D8 to G-D10 in the app repo): a route
 * between two places, place suggestions as someone types, one place's position, and the address
 * under a tap. The phone never holds a Google key: the app asks these functions (through
 * `surfboard/map/*`) and the server asks Google with `GOOGLE_MAPS_SERVER_API_KEY`.
 *
 * Nothing here logs, stores or caches a position, a search text or an address: only Google's own
 * status is logged when a call fails. A key that is unset, refused or over quota is a 503
 * `MAP_SERVICE_UNAVAILABLE` (our configuration, not the person's input) and the app falls back
 * (no preview, no suggestions, the coordinates for a tap).
 */

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const PLACES_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const TIMEOUT_MS = 8000;
/** The most suggestions one box shows. */
export const MAX_SUGGESTIONS = 5;
/** How far from where the map is looking suggestions are preferred, in metres (Google's maximum). */
const BIAS_RADIUS_M = 50_000;

export type MapRoute = {
  distanceMeters: number;
  durationSeconds: number;
  /** Google's encoded polyline (precision 5): the app draws it. */
  polyline: string;
};

export type PlaceSuggestion = {
  placeId: string;
  /** The name: "Mende Market". */
  text: string;
  /** The area under it: "Maryland, Lagos". Empty when Google gave none. */
  secondaryText: string;
  /** Google's kinds, such as `school` or `neighborhood`, for the icon. */
  types: string[];
};

export type PlaceDetails = {
  placeId: string;
  address: string;
  location: MapPoint;
};

export type ReverseGeocoded = {
  /** The short address under the point, or null when Google knows none there. */
  address: string | null;
  /** The nearest named place (a shop, a school, a landmark), or null. */
  name: string | null;
};

const unavailable = () =>
  new ApiError(
    503,
    "MAP_SERVICE_UNAVAILABLE",
    "The map's search and directions are not available right now."
  );

/**
 * The map's own switch (I-066): `GOOGLE_MAPS_MAP_API_KEY`, falling back to the server key so an
 * environment that only has `GOOGLE_MAPS_SERVER_API_KEY` (staging) keeps working. REVA's address
 * check reads `GOOGLE_MAPS_SERVER_API_KEY` alone, so production can switch the map on by setting
 * only the map key, without turning the REVA check on (or the reverse).
 */
function key(): string {
  const value =
    process.env.GOOGLE_MAPS_MAP_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!value) {
    console.warn(
      "[map-google] neither GOOGLE_MAPS_MAP_API_KEY nor GOOGLE_MAPS_SERVER_API_KEY is set"
    );
    throw unavailable();
  }
  return value;
}

/** Calls Google and returns the parsed body, or throws 503 (404 for a place Google does not know). */
async function ask(
  what: string,
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  notFoundIs404 = false
): Promise<any> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    console.error(`[map-google] ${what}: no answer`);
    throw unavailable();
  }
  if (res.status === 404 && notFoundIs404) throw new NotFoundError("Place");
  if (!res.ok) {
    // Google's status only (REQUEST_DENIED, API not enabled, over quota): never the request.
    const status = await res
      .json()
      .then((b: any) => String(b?.error?.status ?? res.status))
      .catch(() => String(res.status));
    console.error(`[map-google] ${what}: ${status}`);
    throw unavailable();
  }
  return res.json().catch(() => {
    console.error(`[map-google] ${what}: unreadable answer`);
    throw unavailable();
  });
}

const latLng = (p: MapPoint) => ({ latitude: p.lat, longitude: p.lng });

/** A driving route between two places, with its length and time (no live traffic: the cheapest price). */
export async function computeRoute(
  origin: MapPoint,
  destination: MapPoint,
  fetchImpl: typeof fetch = fetch
): Promise<MapRoute> {
  const body = await ask(
    "route",
    ROUTES_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key(),
        // Only what is used: a wider mask is billed at a dearer price.
        "x-goog-fieldmask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: latLng(origin) } },
        destination: { location: { latLng: latLng(destination) } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        polylineQuality: "HIGH_QUALITY",
        languageCode: "en-GB",
        units: "METRIC",
      }),
    },
    fetchImpl
  );
  const route = body?.routes?.[0];
  const polyline = route?.polyline?.encodedPolyline;
  const seconds = Number.parseFloat(String(route?.duration ?? ""));
  if (
    typeof polyline !== "string" ||
    !polyline ||
    !Number.isFinite(route?.distanceMeters) ||
    !Number.isFinite(seconds)
  ) {
    throw new NotFoundError("Route");
  }
  return {
    distanceMeters: Math.round(route.distanceMeters),
    durationSeconds: Math.round(seconds),
    polyline,
  };
}

/** "Maryland, Lagos, Nigeria" reads better as "Maryland, Lagos": every result is in Nigeria already. */
function withoutCountry(text: string): string {
  return text.replace(/,?\s*Nigeria\s*$/i, "").trim();
}

/** Suggestions for what is being typed, in Nigeria, nearest to where the map is looking first. */
export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  near?: MapPoint,
  fetchImpl: typeof fetch = fetch
): Promise<PlaceSuggestion[]> {
  const body = await ask(
    "autocomplete",
    `${PLACES_URL}:autocomplete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key(),
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ["ng"],
        regionCode: "NG",
        languageCode: "en",
        ...(near
          ? {
              locationBias: {
                circle: { center: latLng(near), radius: BIAS_RADIUS_M },
              },
            }
          : {}),
      }),
    },
    fetchImpl
  );
  const suggestions: PlaceSuggestion[] = [];
  for (const entry of body?.suggestions ?? []) {
    const p = entry?.placePrediction;
    if (typeof p?.placeId !== "string") continue;
    const text = p.structuredFormat?.mainText?.text ?? p.text?.text;
    if (typeof text !== "string" || !text) continue;
    suggestions.push({
      placeId: p.placeId,
      text: withoutCountry(text),
      secondaryText: withoutCountry(
        p.structuredFormat?.secondaryText?.text ?? ""
      ),
      types: Array.isArray(p.types)
        ? p.types.filter((t: unknown): t is string => typeof t === "string")
        : [],
    });
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  return suggestions;
}

/**
 * One place's position and address, which ends the search's session. Only the two cheapest fields
 * are asked for (the name comes from the suggestion: `displayName` is a dearer field).
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<PlaceDetails> {
  const body = await ask(
    "place details",
    `${PLACES_URL}/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      headers: {
        "x-goog-api-key": key(),
        "x-goog-fieldmask": "location,formattedAddress",
      },
    },
    fetchImpl,
    true
  );
  const la = body?.location?.latitude;
  const ln = body?.location?.longitude;
  if (!Number.isFinite(la) || !Number.isFinite(ln))
    throw new NotFoundError("Place");
  return {
    placeId,
    address: shortAddress(String(body?.formattedAddress ?? "")),
    location: { lat: la, lng: ln },
  };
}

/** Google's `formatted_address` without its plus code, postal code and country: "Okunola Aina St, Mende, Lagos". */
export function shortAddress(formatted: string): string {
  return withoutCountry(formatted)
    .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}[,\s]*/, "")
    .replace(/\s+\d{6}(?=,|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*|,\s*$/g, "")
    .trim();
}

/** Only a real place has a name worth showing: a building's own result is just its number ("68"). */
const NAMED_KINDS = ["point_of_interest", "establishment"];

/** The address, and the nearest named place, under a point. Zero results is an answer, not a failure. */
export async function reverseGeocode(
  at: MapPoint,
  fetchImpl: typeof fetch = fetch
): Promise<ReverseGeocoded> {
  const params = new URLSearchParams({
    latlng: `${at.lat},${at.lng}`,
    language: "en",
    region: "ng",
    key: key(),
  });
  // Google's reverse geocoder answers 200 with `status` in the body, so it is read here.
  let body: any;
  try {
    const res = await fetchImpl(`${GEOCODE_URL}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    body = await res.json();
  } catch {
    console.error("[map-google] reverse geocode: no answer");
    throw unavailable();
  }
  if (body?.status === "ZERO_RESULTS") return { address: null, name: null };
  if (body?.status !== "OK" || !Array.isArray(body.results)) {
    console.error("[map-google] reverse geocode:", body?.status);
    throw unavailable();
  }
  const results: any[] = body.results;
  const address = results.find(
    (r) =>
      typeof r?.formatted_address === "string" &&
      !r.types?.includes("plus_code")
  )?.formatted_address;
  const named = results.find((r) =>
    (r?.types ?? []).some((t: string) => NAMED_KINDS.includes(t))
  );
  const component = (named?.address_components ?? []).find((c: any) =>
    (c?.types ?? []).some((t: string) => NAMED_KINDS.includes(t))
  );
  // Google's geocoder has no place-name field: a name exists only when a component is the place itself.
  const name = component?.long_name;
  return {
    address: address ? shortAddress(address) || null : null,
    name: typeof name === "string" && name ? name : null,
  };
}
