import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
  route: vi.fn(),
  autocomplete: vi.fn(),
  details: vi.fn(),
  reverse: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => false,
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/surfboard/services/googleMapsService", () => ({
  computeRoute: mocks.route,
  autocompletePlaces: mocks.autocomplete,
  getPlaceDetails: mocks.details,
  reverseGeocode: mocks.reverse,
}));

const { POST: routeRoute } =
  await import("@/app/api/v1/surfboard/map/route/route");
const { GET: autocompleteRoute } =
  await import("@/app/api/v1/surfboard/map/places/autocomplete/route");
const { GET: detailsRoute } =
  await import("@/app/api/v1/surfboard/map/places/[placeId]/route");
const { GET: reverseRoute } =
  await import("@/app/api/v1/surfboard/map/reverse-geocode/route");
const limits = await import("@/surfboard/utils/mapGoogleLimits");

/**
 * Every call to Google is billed to us, so each of these routes counts the call against the account's
 * daily allowance BEFORE it asks Google, refuses (429) when the allowance is spent, and a request that
 * is refused as invalid costs neither an allowance nor a Google call.
 */
const TOKEN = "0b1f6c2e-7a54-4f0e-9d21-3c5a8e7b6d10";
const as = (sub: string) => ({
  sub,
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});
const headers = {
  authorization: "Bearer test-token",
  "content-type": "application/json",
};
const get = (path: string) =>
  new NextRequest(`http://localhost/api/v1/surfboard/map/${path}`, { headers });
const post = (path: string, body: unknown) =>
  new NextRequest(`http://localhost/api/v1/surfboard/map/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
const placeCtx = {
  params: Promise.resolve({ placeId: "ChIJq6qqqt2LOxARvZkbJk1dKUY" }),
};

const CASES = [
  {
    name: "route",
    key: "map-route:",
    max: limits.MAP_ROUTE_LIMIT,
    service: mocks.route,
    reply: { distanceMeters: 1, durationSeconds: 1, polyline: "x" },
    call: () =>
      routeRoute(
        post("route", {
          origin: { lat: 6.4, lng: 3.4 },
          destination: { lat: 6.5, lng: 3.5 },
        })
      ),
    invalid: () => routeRoute(post("route", { origin: { lat: 51, lng: 0 } })),
  },
  {
    name: "autocomplete",
    key: "map-autocomplete:",
    max: limits.MAP_AUTOCOMPLETE_LIMIT,
    service: mocks.autocomplete,
    reply: [],
    call: () =>
      autocompleteRoute(
        get(`places/autocomplete?input=Mende&sessionToken=${TOKEN}`)
      ),
    invalid: () => autocompleteRoute(get("places/autocomplete?input=Me")),
  },
  {
    name: "place details",
    key: "map-place:",
    max: limits.MAP_PLACE_DETAILS_LIMIT,
    service: mocks.details,
    reply: { placeId: "x", address: "", location: { lat: 6.5, lng: 3.4 } },
    call: () => detailsRoute(get(`places/x?sessionToken=${TOKEN}`), placeCtx),
    invalid: () => detailsRoute(get("places/x"), placeCtx),
  },
  {
    name: "reverse geocode",
    key: "map-reverse:",
    max: limits.MAP_REVERSE_GEOCODE_LIMIT,
    service: mocks.reverse,
    reply: { address: null, name: null },
    call: () => reverseRoute(get("reverse-geocode?lat=6.4&lng=3.4")),
    invalid: () => reverseRoute(get("reverse-geocode?lat=north")),
  },
] as const;

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.session.mockResolvedValue(as("user-1"));
  mocks.limit.mockResolvedValue(true);
});

describe.each(CASES)(
  "map $name",
  ({ key, max, service, reply, call, invalid }) => {
    it("counts the call against the account's day before it asks Google, then answers", async () => {
      service.mockResolvedValue(reply);
      const res = await call();
      expect(res.status).toBe(200);
      expect(mocks.limit).toHaveBeenCalledWith(`${key}user-1`, "user-1", {
        windowMs: limits.MAP_LIMIT_WINDOW_MS,
        max,
      });
      expect(mocks.limit.mock.invocationCallOrder[0]).toBeLessThan(
        service.mock.invocationCallOrder[0]
      );
    });

    it("is a 429 RATE_LIMITED, and Google is not asked, once the allowance is spent", async () => {
      mocks.limit.mockResolvedValue(false);
      const res = await call();
      expect(res.status).toBe(429);
      expect((await res.json()).code).toBe("RATE_LIMITED");
      expect(service).not.toHaveBeenCalled();
    });

    it("refuses an invalid request with a 400 before the allowance or Google is touched", async () => {
      const res = await invalid();
      expect(res.status).toBe(400);
      expect(mocks.limit).not.toHaveBeenCalled();
      expect(service).not.toHaveBeenCalled();
    });

    it("passes on a Google failure as a 503 the app can fall back from", async () => {
      const { ApiError } = await import("@/lib/api/errors");
      service.mockRejectedValue(
        new ApiError(503, "MAP_SERVICE_UNAVAILABLE", "off")
      );
      const res = await call();
      expect(res.status).toBe(503);
      expect((await res.json()).code).toBe("MAP_SERVICE_UNAVAILABLE");
    });
  }
);

describe("a different role", () => {
  it("is not let in (the map's Google calls are for surveyors)", async () => {
    mocks.session.mockResolvedValue({ ...as("admin-1"), role: "ADMIN" });
    const res = await CASES[3].call();
    expect(res.status).toBe(403);
    expect(mocks.reverse).not.toHaveBeenCalled();
  });
});
