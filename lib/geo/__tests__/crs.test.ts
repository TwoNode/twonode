import proj4 from "proj4";
import { describe, expect, it } from "vitest";
import {
  lonLatToUtm,
  NIGERIA_UTM_31,
  NIGERIA_UTM_32,
  shiftLonLatByMetres,
  utmToLonLat,
} from "@/lib/geo/crs";

/**
 * Golden values were computed with the three inline definitions this module replaced
 * (proj4 2.20.2, `+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs`).
 * If proj4 or a definition changes, plans drawn on the map would move: these must not.
 */
const CASES_31: [number, number, number, number][] = [
  [537000, 715000, 3.3338272044132817, 6.469526149052774],
  [540123.456, 720456.789, 3.3621102461574255, 6.5188685671127695],
  [500000, 0, 2.999208966682679, 0.0011033280791517928],
  [690000, 1000000, 4.727772755788487, 9.04356146165064],
  [300000, 500000, 1.196583839901438, 4.522405407456991],
];

describe("utmToLonLat (zone 31, the default)", () => {
  it.each(CASES_31)("%d E %d N -> %d, %d", (e, n, lon, lat) => {
    const [gotLon, gotLat] = utmToLonLat(e, n);
    expect(gotLon).toBeCloseTo(lon, 9);
    expect(gotLat).toBeCloseTo(lat, 9);
  });

  it("gives exactly what the old inline proj4 call gave", () => {
    const def =
      "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs";
    const legacy = proj4(def, "EPSG:4326");
    for (const [e, n] of CASES_31) {
      expect(utmToLonLat(e, n)).toEqual(legacy.forward([e, n]));
    }
  });

  it("names the zone by its EPSG code", () => {
    expect(utmToLonLat(537000, 715000, NIGERIA_UTM_31)).toEqual(
      utmToLonLat(537000, 715000)
    );
  });
});

describe("lonLatToUtm", () => {
  it.each([
    [3.35, 6.6, 538778.255150322, 729424.6805045055],
    [3.5, 6.45, 555376.5774145299, 712856.4739988892],
    [8.5, 9.0, 1105508.443306528, 999289.8149774435],
  ])("%d, %d -> %d E %d N", (lon, lat, e, n) => {
    const [gotE, gotN] = lonLatToUtm(lon, lat);
    expect(gotE).toBeCloseTo(e, 6);
    expect(gotN).toBeCloseTo(n, 6);
  });

  it("is the inverse of utmToLonLat to well under a millimetre", () => {
    for (const [e, n] of CASES_31) {
      const [lon, lat] = utmToLonLat(e, n);
      const [e2, n2] = lonLatToUtm(lon, lat);
      expect(Math.abs(e2 - e)).toBeLessThan(0.0005);
      expect(Math.abs(n2 - n)).toBeLessThan(0.0005);
    }
  });
});

describe("zone 32 (the Mid Belt)", () => {
  it.each([
    [500000, 0, 8.9993041383624, 0.0011033295898662475],
    [550000, 1000000, 9.454250040712763, 9.047364203717622],
    [300000, 1200000, 7.169733673583164, 10.851116610084489],
  ])("%d E %d N -> %d, %d", (e, n, lon, lat) => {
    const [gotLon, gotLat] = utmToLonLat(e, n, NIGERIA_UTM_32);
    expect(gotLon).toBeCloseTo(lon, 9);
    expect(gotLat).toBeCloseTo(lat, 9);
  });

  it("puts the central meridian of each zone at 3 degrees and 9 degrees east", () => {
    // Easting 500,000 on the equator is the central meridian (a few arc-seconds off from the datum shift).
    expect(utmToLonLat(500000, 0, NIGERIA_UTM_31)[0]).toBeCloseTo(3, 2);
    expect(utmToLonLat(500000, 0, NIGERIA_UTM_32)[0]).toBeCloseTo(9, 2);
  });

  it("round-trips", () => {
    const [lon, lat] = utmToLonLat(550000, 1000000, NIGERIA_UTM_32);
    const [e, n] = lonLatToUtm(lon, lat, NIGERIA_UTM_32);
    expect(e).toBeCloseTo(550000, 3);
    expect(n).toBeCloseTo(1000000, 3);
  });
});

describe("shiftLonLatByMetres", () => {
  it("moves a position by the given metres east and north", () => {
    const [lon, lat] = [3.35, 6.6];
    const [lon2, lat2] = shiftLonLatByMetres(lon, lat, 2.9015, -7.0508);
    const [e1, n1] = lonLatToUtm(lon, lat);
    const [e2, n2] = lonLatToUtm(lon2, lat2);
    expect(e2 - e1).toBeCloseTo(2.9015, 3);
    expect(n2 - n1).toBeCloseTo(-7.0508, 3);
  });

  it("moves nothing for a zero shift", () => {
    // proj4's inverse is iterative: a round trip lands within about a third of a millimetre (3e-9 degrees).
    const [lon, lat] = shiftLonLatByMetres(3.35, 6.6, 0, 0);
    expect(lon).toBeCloseTo(3.35, 7);
    expect(lat).toBeCloseTo(6.6, 7);
  });
});
