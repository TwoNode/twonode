import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autocompletePlaces,
  computeRoute,
  getPlaceDetails,
  MAX_SUGGESTIONS,
  reverseGeocode,
  shortAddress,
} from "@/surfboard/services/googleMapsService";

/**
 * The map's Google services, against a stand-in for Google. What matters: the right Google call is
 * made with the cheapest fields, the key travels in a header (or the geocoder's query) and is never
 * logged, and a Google failure is a 503 the app can fall back from, not a crash or a leak.
 */
const KEY = "AIzaTestKeyNotReal0000000000000000000";
const LEKKI = { lat: 6.4474, lng: 3.4739 };
const IKEJA = { lat: 6.6018, lng: 3.3515 };

type Call = { url: string; init: RequestInit };
function google(reply: unknown, status = 200) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(reply), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}
const header = (call: Call, name: string) =>
  (call.init.headers as Record<string, string>)[name];

let logged: string;
beforeEach(() => {
  process.env.GOOGLE_MAPS_SERVER_API_KEY = KEY;
  logged = "";
  const record = (...args: unknown[]) => {
    logged += args.map(String).join(" ");
  };
  vi.spyOn(console, "error").mockImplementation(record);
  vi.spyOn(console, "warn").mockImplementation(record);
});
afterEach(() => {
  delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
  vi.restoreAllMocks();
});

describe("computeRoute", () => {
  const answer = {
    routes: [
      {
        distanceMeters: 2314,
        duration: "421s",
        polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" },
      },
    ],
  };

  it("asks for a driving route with only the fields it uses, and reads the answer", async () => {
    const { calls, fetchImpl } = google(answer);
    const route = await computeRoute(LEKKI, IKEJA, fetchImpl);

    expect(route).toEqual({
      distanceMeters: 2314,
      durationSeconds: 421,
      polyline: "_p~iF~ps|U_ulLnnqC",
    });
    const [call] = calls;
    expect(call.url).toBe(
      "https://routes.googleapis.com/directions/v2:computeRoutes"
    );
    expect(header(call, "x-goog-api-key")).toBe(KEY);
    // A wider field mask is billed at a dearer price: pin it.
    expect(header(call, "x-goog-fieldmask")).toBe(
      "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
    );
    expect(call.url).not.toContain(KEY);
    const body = JSON.parse(call.init.body as string);
    expect(body).toMatchObject({
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      origin: { location: { latLng: { latitude: 6.4474, longitude: 3.4739 } } },
      destination: {
        location: { latLng: { latitude: 6.6018, longitude: 3.3515 } },
      },
    });
  });

  it("rounds a fractional duration", async () => {
    const { fetchImpl } = google({
      routes: [{ ...answer.routes[0], duration: "421.6s" }],
    });
    expect((await computeRoute(LEKKI, IKEJA, fetchImpl)).durationSeconds).toBe(
      422
    );
  });

  it("is a 404 when Google finds no route", async () => {
    const { fetchImpl } = google({});
    await expect(computeRoute(LEKKI, IKEJA, fetchImpl)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("autocompletePlaces", () => {
  const suggestion = (id: string, main: string, secondary: string) => ({
    placePrediction: {
      place: `places/${id}`,
      placeId: id,
      text: { text: `${main}, ${secondary}` },
      structuredFormat: {
        mainText: { text: main },
        secondaryText: { text: secondary },
      },
      types: ["neighborhood", "political"],
    },
  });

  it("looks only in Nigeria, near where the map is looking, in one session", async () => {
    const { calls, fetchImpl } = google({ suggestions: [] });
    await autocompletePlaces("Mende", "token-token-token-1", LEKKI, fetchImpl);

    const [call] = calls;
    expect(call.url).toBe(
      "https://places.googleapis.com/v1/places:autocomplete"
    );
    expect(header(call, "x-goog-api-key")).toBe(KEY);
    const body = JSON.parse(call.init.body as string);
    expect(body).toMatchObject({
      input: "Mende",
      sessionToken: "token-token-token-1",
      includedRegionCodes: ["ng"],
      locationBias: {
        circle: {
          center: { latitude: 6.4474, longitude: 3.4739 },
          radius: 50_000,
        },
      },
    });
  });

  it("does not bias the search when no place is given", async () => {
    const { calls, fetchImpl } = google({ suggestions: [] });
    await autocompletePlaces(
      "Mende",
      "token-token-token-1",
      undefined,
      fetchImpl
    );
    expect(JSON.parse(calls[0].init.body as string)).not.toHaveProperty(
      "locationBias"
    );
  });

  it("gives the name, the area without the country, and the kinds", async () => {
    const { fetchImpl } = google({
      suggestions: [
        suggestion("ChIJ-mende-0001", "Mende", "Maryland, Lagos, Nigeria"),
        // A query suggestion (a phrase, not a place) is left out.
        { queryPrediction: { text: { text: "mende market" } } },
      ],
    });
    const found = await autocompletePlaces(
      "Mende",
      "token-token-token-1",
      LEKKI,
      fetchImpl
    );
    expect(found).toEqual([
      {
        placeId: "ChIJ-mende-0001",
        text: "Mende",
        secondaryText: "Maryland, Lagos",
        types: ["neighborhood", "political"],
      },
    ]);
  });

  it(`never gives more than ${MAX_SUGGESTIONS} and skips an entry with no id or name`, async () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      suggestion(`ChIJ-place-${i}0001`, `Place ${i}`, "Lagos, Nigeria")
    );
    const { fetchImpl } = google({
      suggestions: [{ placePrediction: { text: { text: "no id" } } }, ...many],
    });
    const found = await autocompletePlaces(
      "Place",
      "token-token-token-1",
      undefined,
      fetchImpl
    );
    expect(found).toHaveLength(MAX_SUGGESTIONS);
    expect(found[0].placeId).toBe("ChIJ-place-00001");
  });

  it("is an empty list, not an error, when nothing matches", async () => {
    const { fetchImpl } = google({});
    expect(
      await autocompletePlaces(
        "zzzqq",
        "token-token-token-1",
        undefined,
        fetchImpl
      )
    ).toEqual([]);
  });
});

describe("getPlaceDetails", () => {
  it("asks only for the position and the address, in the search's session", async () => {
    const { calls, fetchImpl } = google({
      location: { latitude: 6.5682, longitude: 3.3768 },
      formattedAddress: "H9C9+FP2, Mende, Maryland, Lagos 100001, Nigeria",
    });
    const place = await getPlaceDetails(
      "ChIJ-mende-0001",
      "token token",
      fetchImpl
    );

    expect(place).toEqual({
      placeId: "ChIJ-mende-0001",
      address: "Mende, Maryland, Lagos",
      location: { lat: 6.5682, lng: 3.3768 },
    });
    const [call] = calls;
    expect(call.url).toBe(
      "https://places.googleapis.com/v1/places/ChIJ-mende-0001?sessionToken=token%20token"
    );
    // `displayName` is a dearer field: the name comes from the suggestion.
    expect(header(call, "x-goog-fieldmask")).toBe("location,formattedAddress");
    expect(header(call, "x-goog-api-key")).toBe(KEY);
  });

  it("is a 404 for a place Google does not know", async () => {
    const { fetchImpl } = google({ error: { status: "NOT_FOUND" } }, 404);
    await expect(
      getPlaceDetails("ChIJ-nothing-0001", "token-token-token-1", fetchImpl)
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("is a 404 when the answer carries no position", async () => {
    const { fetchImpl } = google({ formattedAddress: "Somewhere" });
    await expect(
      getPlaceDetails("ChIJ-mende-0001", "token-token-token-1", fetchImpl)
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("reverseGeocode", () => {
  const ok = {
    status: "OK",
    results: [
      {
        formatted_address:
          "Okunola Aina St, Mende, Lagos 105102, Lagos, Nigeria",
        types: ["route"],
        address_components: [
          { long_name: "Okunola Aina Street", types: ["route"] },
        ],
      },
      {
        formatted_address: "Mende Market, Maryland, Lagos, Nigeria",
        types: ["point_of_interest", "establishment"],
        address_components: [
          { long_name: "Mende Market", types: ["point_of_interest"] },
        ],
      },
    ],
  };

  it("gives the short address and the nearest named place", async () => {
    const { calls, fetchImpl } = google(ok);
    const found = await reverseGeocode(LEKKI, fetchImpl);

    expect(found).toEqual({
      address: "Okunola Aina St, Mende, Lagos, Lagos",
      name: "Mende Market",
    });
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/geocode/json"
    );
    expect(url.searchParams.get("latlng")).toBe("6.4474,3.4739");
    expect(url.searchParams.get("key")).toBe(KEY);
  });

  it("answers with nothing, not an error, where Google knows nothing", async () => {
    const { fetchImpl } = google({ status: "ZERO_RESULTS", results: [] });
    expect(await reverseGeocode(LEKKI, fetchImpl)).toEqual({
      address: null,
      name: null,
    });
  });

  it("never takes a building's number for a name (a premise result has no place name)", async () => {
    const { fetchImpl } = google({
      status: "OK",
      results: [
        {
          formatted_address: "68 Admiralty Wy, Lekki Phase I, Lagos, Nigeria",
          types: ["premise"],
          address_components: [{ long_name: "68", types: ["street_number"] }],
        },
      ],
    });
    const found = await reverseGeocode(LEKKI, fetchImpl);
    expect(found.name).toBeNull();
    expect(found.address).toBe("68 Admiralty Wy, Lekki Phase I, Lagos");
  });

  it("has no name for a place result whose components are only an address (never its first component)", async () => {
    const { fetchImpl } = google({
      status: "OK",
      results: [
        {
          formatted_address: "69 Admiralty Wy, Lekki, Lagos, Nigeria",
          types: ["establishment", "point_of_interest"],
          address_components: [{ long_name: "69", types: ["street_number"] }],
        },
      ],
    });
    expect((await reverseGeocode(LEKKI, fetchImpl)).name).toBeNull();
  });

  it("takes the place's own component for the name, not the first component", async () => {
    const { fetchImpl } = google({
      status: "OK",
      results: [
        {
          formatted_address: "5 Admiralty Wy, Lekki, Lagos, Nigeria",
          types: ["establishment", "point_of_interest"],
          address_components: [
            { long_name: "5", types: ["street_number"] },
            {
              long_name: "Eko Hotels",
              types: ["establishment", "point_of_interest"],
            },
          ],
        },
      ],
    });
    expect((await reverseGeocode(LEKKI, fetchImpl)).name).toBe("Eko Hotels");
  });

  it("has no name when the result lists no named place", async () => {
    const { fetchImpl } = google({ status: "OK", results: [ok.results[0]] });
    expect((await reverseGeocode(LEKKI, fetchImpl)).name).toBeNull();
  });

  it("skips a plus-code result for the address", async () => {
    const { fetchImpl } = google({
      status: "OK",
      results: [
        { formatted_address: "PQ3F+X8 Lagos", types: ["plus_code"] },
        {
          formatted_address: "Admiralty Way, Lekki, Lagos, Nigeria",
          types: ["route"],
        },
      ],
    });
    expect((await reverseGeocode(LEKKI, fetchImpl)).address).toBe(
      "Admiralty Way, Lekki, Lagos"
    );
  });
});

describe("shortAddress", () => {
  it.each([
    [
      "Okunola Aina St, Mende, Lagos 105102, Lagos, Nigeria",
      "Okunola Aina St, Mende, Lagos, Lagos",
    ],
    ["PQ3F+X8 Mende, Lagos, Nigeria", "Mende, Lagos"],
    ["PQ3F+X8, Mende, Lagos", "Mende, Lagos"],
    [
      "12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria",
      "12 Admiralty Way, Lekki Phase 1, Lagos",
    ],
    ["Lagos", "Lagos"],
  ])("%s -> %s", (given, wanted) => {
    expect(shortAddress(given)).toBe(wanted);
  });
});

describe("when Google cannot be used", () => {
  const calls: [string, (f: typeof fetch) => Promise<unknown>][] = [
    ["route", (f) => computeRoute(LEKKI, IKEJA, f)],
    [
      "autocomplete",
      (f) => autocompletePlaces("Mende", "token-token-token-1", undefined, f),
    ],
    [
      "place details",
      (f) => getPlaceDetails("ChIJ-mende-0001", "token-token-token-1", f),
    ],
    ["reverse geocode", (f) => reverseGeocode(LEKKI, f)],
  ];

  it.each(calls)(
    "%s: the map's own key alone is enough, and wins over the server key (I-066)",
    async (_name, run) => {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
      process.env.GOOGLE_MAPS_MAP_API_KEY = "map-only-key";
      try {
        const { calls: made, fetchImpl } = google({});
        await run(fetchImpl).catch(() => undefined);
        expect(made).toHaveLength(1);
        expect(JSON.stringify(made[0])).toContain("map-only-key");
        // and with both set, the map's own key is the one used
        process.env.GOOGLE_MAPS_SERVER_API_KEY = KEY;
        const second = google({});
        await run(second.fetchImpl).catch(() => undefined);
        expect(JSON.stringify(second.calls[0])).toContain("map-only-key");
        expect(JSON.stringify(second.calls[0])).not.toContain(KEY);
      } finally {
        delete process.env.GOOGLE_MAPS_MAP_API_KEY;
      }
    }
  );

  it.each(calls)(
    "%s: no key set is a 503 and Google is never asked",
    async (_name, run) => {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
      delete process.env.GOOGLE_MAPS_MAP_API_KEY;
      const { calls: made, fetchImpl } = google({});
      await expect(run(fetchImpl)).rejects.toMatchObject({
        status: 503,
        code: "MAP_SERVICE_UNAVAILABLE",
      });
      expect(made).toHaveLength(0);
    }
  );

  it.each(calls)(
    "%s: a refusal by Google is a 503, and the key and request are never logged",
    async (_name, run) => {
      const { fetchImpl } = google(
        {
          error: {
            status: "PERMISSION_DENIED",
            message: `API key ${KEY} not allowed for 6.4474,3.4739`,
          },
        },
        403
      );
      await expect(run(fetchImpl)).rejects.toMatchObject({
        status: 503,
        code: "MAP_SERVICE_UNAVAILABLE",
      });
      expect(logged).not.toContain(KEY);
      expect(logged).not.toContain("6.4474");
      expect(logged).not.toContain("Mende");
    }
  );

  it.each(calls)("%s: no answer at all is a 503", async (_name, run) => {
    const failing = (async () => {
      throw new Error(`network down for ${KEY}`);
    }) as unknown as typeof fetch;
    await expect(run(failing)).rejects.toMatchObject({ status: 503 });
    expect(logged).not.toContain(KEY);
  });

  it("reverse geocode: a REQUEST_DENIED status in a 200 body is a 503 too", async () => {
    const { fetchImpl } = google({
      status: "REQUEST_DENIED",
      error_message: `key ${KEY}`,
      results: [],
    });
    await expect(reverseGeocode(LEKKI, fetchImpl)).rejects.toMatchObject({
      status: 503,
    });
    expect(logged).not.toContain(KEY);
  });
});
