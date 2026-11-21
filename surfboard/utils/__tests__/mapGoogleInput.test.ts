import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/api/errors";
import {
  parseAutocompleteQuery,
  parsePlaceDetailsRequest,
  parseReverseGeocodeQuery,
  routeBodySchema,
} from "@/surfboard/utils/mapGoogleInput";

const TOKEN = "0b1f6c2e-7a54-4f0e-9d21-3c5a8e7b6d10";
const q = (init: Record<string, string>) => new URLSearchParams(init);

describe("routeBodySchema", () => {
  const ok = {
    origin: { lat: 6.4474, lng: 3.4739 },
    destination: { lat: 6.5682, lng: 3.3768 },
  };

  it("takes two places in Nigeria", () => {
    expect(routeBodySchema.safeParse(ok).success).toBe(true);
  });

  it.each([
    ["a place in London", { ...ok, origin: { lat: 51.5, lng: -0.12 } }],
    ["a place in the sea", { ...ok, destination: { lat: 0, lng: 0 } }],
    ["a missing destination", { origin: ok.origin }],
    ["text for a number", { ...ok, origin: { lat: "6.4", lng: 3.4 } }],
    ["not a number", { ...ok, origin: { lat: Number.NaN, lng: 3.4 } }],
  ])("refuses %s", (_name, body) => {
    expect(routeBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("parseAutocompleteQuery", () => {
  it("reads the typed text (trimmed), the session and, when given, where the map is looking", () => {
    expect(
      parseAutocompleteQuery(
        q({ input: "  Mende ", sessionToken: TOKEN, near: "6.5,3.4" })
      )
    ).toEqual({
      input: "Mende",
      sessionToken: TOKEN,
      near: { lat: 6.5, lng: 3.4 },
    });
    expect(
      parseAutocompleteQuery(q({ input: "Mende", sessionToken: TOKEN }))
    ).toEqual({
      input: "Mende",
      sessionToken: TOKEN,
    });
  });

  it.each([
    ["under 3 characters", { input: "Me", sessionToken: TOKEN }],
    ["3 spaces", { input: "   ", sessionToken: TOKEN }],
    ["over 100 characters", { input: "x".repeat(101), sessionToken: TOKEN }],
    ["no session", { input: "Mende" }],
    [
      "a session that is not a token",
      { input: "Mende", sessionToken: "bad token!" },
    ],
    [
      "a place outside Nigeria",
      { input: "Mende", sessionToken: TOKEN, near: "51.5,-0.12" },
    ],
    [
      "a place that is not lat,lng",
      { input: "Mende", sessionToken: TOKEN, near: "Lagos" },
    ],
  ])("refuses %s with a 400", (_name, params) => {
    expect(() => parseAutocompleteQuery(q(params))).toThrow(ValidationError);
  });
});

describe("parsePlaceDetailsRequest", () => {
  it("reads a place id and the session", () => {
    expect(
      parsePlaceDetailsRequest(
        "ChIJq6qqqt2LOxARvZkbJk1dKUY",
        q({ sessionToken: TOKEN })
      )
    ).toEqual({
      placeId: "ChIJq6qqqt2LOxARvZkbJk1dKUY",
      sessionToken: TOKEN,
    });
  });

  it.each([
    ["an id with a slash (a path trick)", "places/../x", TOKEN],
    ["an id that is too short", "abc", TOKEN],
    ["no session", "ChIJq6qqqt2LOxARvZkbJk1dKUY", undefined],
  ])("refuses %s", (_name, id, token) => {
    expect(() =>
      parsePlaceDetailsRequest(id, token ? q({ sessionToken: token }) : q({}))
    ).toThrow(ValidationError);
  });
});

describe("parseReverseGeocodeQuery", () => {
  it("reads a point in Nigeria", () => {
    expect(
      parseReverseGeocodeQuery(q({ lat: "6.4474", lng: "3.4739" }))
    ).toEqual({
      lat: 6.4474,
      lng: 3.4739,
    });
  });

  it.each([
    ["nothing", {}],
    ["one coordinate", { lat: "6.4" }],
    ["a point abroad", { lat: "51.5", lng: "-0.12" }],
    ["text", { lat: "north", lng: "east" }],
  ])("refuses %s", (_name, params) => {
    expect(() => parseReverseGeocodeQuery(q(params))).toThrow(ValidationError);
  });
});
