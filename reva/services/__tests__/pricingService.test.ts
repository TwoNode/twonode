import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertAddressMatchesPrice,
  getRevaPriceForLocation,
  resolveRevaPrice,
} from "@/reva/services/pricingService";

// The address check turns on when GOOGLE_MAPS_SERVER_API_KEY is set, which a
// developer's own .env may do. Tests start from "unset" and opt in per test.
let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
  else process.env.GOOGLE_MAPS_SERVER_API_KEY = savedKey;
});

const arcgis = (features: unknown[], ok = true) =>
  vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ features }),
  })) as unknown as typeof fetch;

const ikeja = () => arcgis([{ attributes: { LGA: "Ikeja", Price: 50000 } }]);

describe("getRevaPriceForLocation", () => {
  it("returns the LGA and price the layer reports for the point (lng,lat order)", async () => {
    const f = ikeja();
    await expect(getRevaPriceForLocation(6.6018, 3.3515, f)).resolves.toEqual({
      lga: "IKEJA",
      price: 50000,
    });
    const url = String((f as any).mock.calls[0][0]);
    expect(url).toContain("geometry=3.3515%2C6.6018");
    expect(url).toContain("outFields=LGA%2CPrice");
  });

  it("rejects missing, non-numeric and out-of-range coordinates without calling ArcGIS", async () => {
    const f = ikeja();
    for (const [lat, lng] of [
      [undefined, 3],
      ["6.6", "3.3"],
      [NaN, 3],
      [91, 3],
      [6, 181],
    ]) {
      await expect(getRevaPriceForLocation(lat, lng, f)).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects a point outside every priced LGA, or a layer row with no usable price", async () => {
    await expect(
      getRevaPriceForLocation(0, 0, arcgis([]))
    ).rejects.toMatchObject({ status: 400 });
    for (const Price of [0, -5, null, "n/a"]) {
      await expect(
        getRevaPriceForLocation(
          6.6,
          3.3,
          arcgis([{ attributes: { LGA: "X", Price } }])
        )
      ).rejects.toMatchObject({ status: 400 });
    }
  });

  it("fails closed (503) when ArcGIS is down or errors, never falling back to a price", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      getRevaPriceForLocation(6.6, 3.3, arcgis([], false))
    ).rejects.toMatchObject({ status: 503, code: "PRICE_UNAVAILABLE" });
    const boom = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    await expect(getRevaPriceForLocation(6.6, 3.3, boom)).rejects.toMatchObject(
      {
        status: 503,
      }
    );
  });
});

describe("resolveRevaPrice", () => {
  it("accepts the price the browser displayed and returns the server's", async () => {
    await expect(
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, 50000, undefined, ikeja())
    ).resolves.toEqual({ lga: "IKEJA", price: 50000 });
  });

  it("refuses a different price (tampering or a stale form) with 409", async () => {
    await expect(
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, 1, undefined, ikeja())
    ).rejects.toMatchObject({ status: 409, code: "PRICE_MISMATCH" });
  });

  it("charges the server's price when the browser sent none", async () => {
    await expect(
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, NaN, undefined, ikeja())
    ).resolves.toMatchObject({ price: 50000 });
  });

  it("needs a location", async () => {
    await expect(
      resolveRevaPrice(null, 50000, undefined, ikeja())
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("assertAddressMatchesPrice", () => {
  const pin = { lga: "IKEJA", price: 50000 };
  const lekki = () => ({ lga: "ETI-OSA", price: 30000 });

  /** One fetch that answers the geocoder and the ArcGIS layer by URL. */
  const world = (geocode: unknown, layerPrice: number | null, ok = true) =>
    vi.fn(async (url: unknown) => {
      if (String(url).includes("maps.googleapis.com")) {
        return { ok, status: ok ? 200 : 500, json: async () => geocode };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features:
            layerPrice === null
              ? []
              : [{ attributes: { LGA: "X", Price: layerPrice } }],
        }),
      };
    }) as unknown as typeof fetch;
  const found = {
    status: "OK",
    results: [{ geometry: { location: { lat: 6.6, lng: 3.35 } } }],
  };

  const withKey = async (fn: () => Promise<void>) => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = "test-key";
    try {
      await fn();
    } finally {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    }
  };

  it("is NOT switched on by the map's own key (I-066): only GOOGLE_MAPS_SERVER_API_KEY runs it", async () => {
    process.env.GOOGLE_MAPS_MAP_API_KEY = "map-only-key";
    try {
      const f = world(found, 30000);
      await expect(
        assertAddressMatchesPrice("1 Rd", pin, f)
      ).resolves.toBeUndefined();
      expect(f).not.toHaveBeenCalled();
    } finally {
      delete process.env.GOOGLE_MAPS_MAP_API_KEY;
    }
  });

  it("skips the check, without calling out, when no server key is configured", async () => {
    const f = world(found, 50000);
    await expect(
      assertAddressMatchesPrice("1 Rd", pin, f)
    ).resolves.toBeUndefined();
    expect(f).not.toHaveBeenCalled();
  });

  it("passes when the address geocodes to a location with the pin's price", async () => {
    await withKey(async () => {
      const f = world(found, 50000);
      await expect(
        assertAddressMatchesPrice("1 Rd", pin, f)
      ).resolves.toBeUndefined();
      const url = String((f as any).mock.calls[0][0]);
      expect(url).toContain("components=country%3ANG");
      expect(url).toContain("key=test-key");
    });
  });

  it("refuses with 422 when the address is in a differently priced LGA than the pin", async () => {
    await withKey(async () => {
      await expect(
        assertAddressMatchesPrice("1 Rd", pin, world(found, 30000))
      ).rejects.toMatchObject({
        status: 422,
        code: "ADDRESS_LOCATION_MISMATCH",
      });
    });
  });

  it("refuses with 422 when the address geocodes outside the priced LGAs", async () => {
    await withKey(async () => {
      await expect(
        assertAddressMatchesPrice("1 Rd", pin, world(found, null))
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  it("refuses an address the geocoder cannot find (400) and an empty one (400)", async () => {
    await withKey(async () => {
      await expect(
        assertAddressMatchesPrice(
          "zzz",
          pin,
          world({ status: "ZERO_RESULTS", results: [] }, 50000)
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        assertAddressMatchesPrice("  ", pin, world(found, 50000))
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("how exact the geocoder's answer is (I-066)", () => {
    const answer = (
      types: string[],
      extra: { partial_match?: boolean; location_type?: string } = {}
    ) => ({
      status: "OK",
      results: [
        {
          types,
          partial_match: extra.partial_match,
          geometry: {
            location: { lat: 6.6, lng: 3.35 },
            location_type: extra.location_type ?? "ROOFTOP",
          },
        },
      ],
    });
    const fuller = { status: 400, message: expect.any(String) };

    it("refuses a city-only address (a bare 'Lagos') with 400 even when its price matches the pin", async () => {
      await withKey(async () => {
        const f = world(answer(["locality", "political"]), 50000);
        await expect(
          assertAddressMatchesPrice("Lagos", pin, f)
        ).rejects.toMatchObject({ status: 400 });
        // the price layer is not even asked: there is nothing to compare
        expect(
          (f as any).mock.calls.some((c: unknown[]) =>
            String(c[0]).includes("arcgis")
          )
        ).toBe(false);
      });
    });

    it.each([
      ["a state", ["administrative_area_level_1", "political"]],
      ["a local government", ["administrative_area_level_2", "political"]],
      ["the country (what nonsense falls back to)", ["country", "political"]],
    ])("refuses an answer that is only %s", async (_n, types) => {
      await withKey(async () => {
        await expect(
          assertAddressMatchesPrice(
            "asdf qwer",
            pin,
            world(
              answer(types, {
                partial_match: true,
                location_type: "APPROXIMATE",
              }),
              50000
            )
          )
        ).rejects.toMatchObject({ status: 400 });
      });
    });

    it("accepts a district or a landmark that matches the pin's price (finer than a city)", async () => {
      await withKey(async () => {
        for (const types of [
          ["sublocality_level_1", "sublocality", "political"],
          ["neighborhood", "political"],
          ["point_of_interest", "establishment"],
          ["locality", "political", "sublocality"],
        ]) {
          await expect(
            assertAddressMatchesPrice(
              "Lekki Phase 1",
              pin,
              world(answer(types), 50000)
            )
          ).resolves.toBeUndefined();
        }
      });
    });

    it("asks for a fuller address (400, not 422) when Google only guessed and the price differs", async () => {
      await withKey(async () => {
        for (const guess of [
          answer(["route"], {
            partial_match: true,
            location_type: "RANGE_INTERPOLATED",
          }),
          answer(["street_address"], { location_type: "APPROXIMATE" }),
          answer(["route"], { location_type: "GEOMETRIC_CENTER" }),
        ]) {
          await expect(
            assertAddressMatchesPrice(
              "Plot 5 Block C, Ikorodu, Lagos",
              pin,
              world(guess, 30000)
            )
          ).rejects.toMatchObject(fuller);
        }
      });
    });

    it("still says 'does not match' (422) when Google found the exact place and its price differs: the real cheat", async () => {
      await withKey(async () => {
        await expect(
          assertAddressMatchesPrice(
            "12 Adeola Odeku St, Victoria Island",
            pin,
            world(
              answer(["street_address"], { location_type: "ROOFTOP" }),
              30000
            )
          )
        ).rejects.toMatchObject({
          status: 422,
          code: "ADDRESS_LOCATION_MISMATCH",
        });
      });
    });

    it("lets a vague address through when its guess happens to be in the pin's price (nothing to lose)", async () => {
      await withKey(async () => {
        await expect(
          assertAddressMatchesPrice(
            "Plot 5 Block C, Ikorodu, Lagos",
            pin,
            world(
              answer(["route"], {
                partial_match: true,
                location_type: "RANGE_INTERPOLATED",
              }),
              50000
            )
          )
        ).resolves.toBeUndefined();
      });
    });

    it("treats a result with no type information as precise (the old behaviour)", async () => {
      await withKey(async () => {
        await expect(
          assertAddressMatchesPrice("1 Rd", pin, world(found, 30000))
        ).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  it("fails closed (503) when the geocoder errors, is denied, or is unreachable", async () => {
    await withKey(async () => {
      for (const f of [
        world({ status: "REQUEST_DENIED", results: [] }, 50000),
        world(found, 50000, false),
        vi.fn(async () => {
          throw new Error("network");
        }) as unknown as typeof fetch,
      ]) {
        await expect(
          assertAddressMatchesPrice("1 Rd", pin, f)
        ).rejects.toMatchObject({
          status: 503,
          code: "ADDRESS_LOOKUP_UNAVAILABLE",
        });
      }
    });
  });

  it("is enforced by resolveRevaPrice, and a posted-price mismatch still wins first", async () => {
    await withKey(async () => {
      const f = world(found, 30000);
      // the pin lookup and the address lookup share this fetch: ArcGIS says 30000 for both here,
      // so use a fetch where the pin is 50000 and the address 30000
      let layerCalls = 0;
      const g = vi.fn(async (url: unknown) => {
        if (String(url).includes("maps.googleapis.com")) {
          return { ok: true, status: 200, json: async () => found };
        }
        layerCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            features: [
              {
                attributes: {
                  LGA: "X",
                  Price: layerCalls === 1 ? 50000 : 30000,
                },
              },
            ],
          }),
        };
      }) as unknown as typeof fetch;
      await expect(
        resolveRevaPrice({ lat: 6.6, lng: 3.35 }, 50000, "1 Rd", g)
      ).rejects.toMatchObject({ code: "ADDRESS_LOCATION_MISMATCH" });
      await expect(
        resolveRevaPrice({ lat: 6.6, lng: 3.35 }, 1, "1 Rd", f)
      ).rejects.toMatchObject({ code: "PRICE_MISMATCH" });
    });
  });
});
