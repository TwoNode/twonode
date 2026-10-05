import { describe, expect, it, vi } from "vitest";
import {
  getRevaPriceForLocation,
  resolveRevaPrice,
} from "@/reva/services/pricingService";

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
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, 50000, ikeja())
    ).resolves.toEqual({ lga: "IKEJA", price: 50000 });
  });

  it("refuses a different price (tampering or a stale form) with 409", async () => {
    await expect(
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, 1, ikeja())
    ).rejects.toMatchObject({ status: 409, code: "PRICE_MISMATCH" });
  });

  it("charges the server's price when the browser sent none", async () => {
    await expect(
      resolveRevaPrice({ lat: 6.6018, lng: 3.3515 }, NaN, ikeja())
    ).resolves.toMatchObject({ price: 50000 });
  });

  it("needs a location", async () => {
    await expect(resolveRevaPrice(null, 50000, ikeja())).rejects.toMatchObject({
      status: 400,
    });
  });
});
