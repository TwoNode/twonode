import { describe, expect, it } from "vitest";
import proj4 from "proj4";
import { shiftGeometryForDisplay } from "@/app/(projects)/(surfboard)/utils/geometryShift";

const shifts = { lagos: { eastingShift: 2.9015, northingShift: -7.0508 } };
const ring = [
  [3.35, 6.6],
  [3.351, 6.6],
  [3.351, 6.601],
  [3.35, 6.6],
];
const polygon = { type: "Polygon" as const, coordinates: [ring] };

const metresBetween = (a: number[], b: number[]) => {
  const [e1, n1] = proj4("EPSG:4326", "EPSG:26331", a);
  const [e2, n2] = proj4("EPSG:4326", "EPSG:26331", b);
  return { dE: e2 - e1, dN: n2 - n1 };
};

describe("shiftGeometryForDisplay", () => {
  it("moves every vertex by the state's metres", () => {
    const out = shiftGeometryForDisplay(polygon, "Lagos", shifts);
    out.coordinates[0].forEach((pt, i) => {
      const { dE, dN } = metresBetween(ring[i], pt);
      expect(dE).toBeCloseTo(2.9015, 2);
      expect(dN).toBeCloseTo(-7.0508, 2);
    });
  });

  it("leaves the stored geometry object untouched", () => {
    const before = JSON.stringify(polygon);
    shiftGeometryForDisplay(polygon, "Lagos", shifts);
    expect(JSON.stringify(polygon)).toBe(before);
  });

  it("handles MultiPolygon and keeps its shape", () => {
    const multi = {
      type: "MultiPolygon" as const,
      coordinates: [[ring], [ring]],
    };
    const out = shiftGeometryForDisplay(multi, "lagos", shifts);
    expect(out.type).toBe("MultiPolygon");
    expect(out.coordinates).toHaveLength(2);
    expect(out.coordinates[1][0]).toHaveLength(4);
    expect(out.coordinates[1][0][0]).not.toEqual(ring[0]);
  });

  it("returns the geometry as is for a state with no correction, no state, or a zero shift", () => {
    expect(shiftGeometryForDisplay(polygon, "Ogun", shifts)).toBe(polygon);
    expect(shiftGeometryForDisplay(polygon, null, shifts)).toBe(polygon);
    expect(shiftGeometryForDisplay(polygon, undefined, shifts)).toBe(polygon);
    expect(shiftGeometryForDisplay(polygon, "Lagos", {})).toBe(polygon);
    expect(
      shiftGeometryForDisplay(polygon, "Lagos", {
        lagos: { eastingShift: 0, northingShift: 0 },
      })
    ).toBe(polygon);
  });
});
