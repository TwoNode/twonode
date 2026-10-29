import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boundaryFacts,
  MAX_RING_POSITIONS,
  outlineOf,
  parseBoundary,
  THIN_TOLERANCE_METRES,
  type Position,
} from "@/surfboard/utils/planGeometry";

// About 33 m by 33 m near Lagos, so roughly 1,100 square metres.
const SQUARE = {
  type: "Polygon",
  coordinates: [
    [
      [3.4, 6.5],
      [3.4003, 6.5],
      [3.4003, 6.5003],
      [3.4, 6.5003],
      [3.4, 6.5],
    ],
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseBoundary", () => {
  it("accepts a Polygon or MultiPolygon object", () => {
    expect(parseBoundary(SQUARE)).toEqual(SQUARE);
    const multi = { type: "MultiPolygon", coordinates: [SQUARE.coordinates] };
    expect(parseBoundary(multi)).toEqual(multi);
  });

  it("reads GeoJSON kept as JSON text, even text of text", () => {
    expect(parseBoundary(JSON.stringify(SQUARE))).toEqual(SQUARE);
    expect(parseBoundary(JSON.stringify(JSON.stringify(SQUARE)))).toEqual(
      SQUARE
    );
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["an array", [[3.4, 6.5]]],
    ["an empty object", {}],
    ["a point", { type: "Point", coordinates: [3.4, 6.5] }],
    ["a feature", { type: "Feature", geometry: SQUARE, properties: {} }],
    ["a polygon with no coordinates", { type: "Polygon" }],
    [
      "a polygon whose coordinates are text",
      { type: "Polygon", coordinates: "x" },
    ],
    ["text that is not JSON", "POLYGON((3.4 6.5, 3.5 6.5, 3.5 6.6, 3.4 6.5))"],
    ["text of a point", JSON.stringify({ type: "Point", coordinates: [1, 2] })],
    [
      "text wrapped more than three times",
      JSON.stringify(JSON.stringify(JSON.stringify(JSON.stringify(SQUARE)))),
    ],
  ])("is not a boundary: %s", (_name, value) => {
    expect(parseBoundary(value)).toBeNull();
  });
});

describe("boundaryFacts", () => {
  it("works out the area in square metres and the centre of the stored boundary", () => {
    const { areaSqM, centroid } = boundaryFacts(SQUARE);
    expect(areaSqM).toBeGreaterThan(1090);
    expect(areaSqM).toBeLessThan(1120);
    // Two decimals, the way the plan detail has always said it.
    expect(areaSqM).toBe(Math.round(areaSqM! * 100) / 100);
    expect(centroid!.lng).toBeCloseTo(3.40015, 8);
    expect(centroid!.lat).toBeCloseTo(6.50015, 8);
  });

  it("reads a boundary kept as JSON text the same way", () => {
    expect(boundaryFacts(JSON.stringify(SQUARE))).toEqual(
      boundaryFacts(SQUARE)
    );
  });

  it("answers nulls, without a word in the log, for anything that is not a boundary", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const value of [
      null,
      "nope",
      { type: "Point", coordinates: [3.4, 6.5] },
      { type: "Polygon", coordinates: [] },
      { type: "Polygon", coordinates: [["a", "b"]] },
    ]) {
      expect(boundaryFacts(value)).toEqual({ areaSqM: null, centroid: null });
    }
    expect(log).not.toHaveBeenCalled();
  });
});

/** Local metres east and north of a point, flat across one plot. */
function metres([lng, lat]: Position, origin: Position): [number, number] {
  const northing = (lat - origin[1]) * 111_320;
  const easting =
    (lng - origin[0]) * 111_320 * Math.cos((origin[1] * Math.PI) / 180);
  return [easting, northing];
}

/** A ring of `count` distinct positions on a circle, closed. */
function circle(
  count: number,
  radiusMetres: number,
  centre: Position = [3.4, 6.5]
) {
  const ring: Position[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count;
    ring.push([
      centre[0] +
        (radiusMetres * Math.cos(angle)) /
          (111_320 * Math.cos((centre[1] * Math.PI) / 180)),
      centre[1] + (radiusMetres * Math.sin(angle)) / 111_320,
    ]);
  }
  ring.push(ring[0]);
  return ring;
}

function distanceToRing(point: [number, number], ring: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i + 1 < ring.length; i += 1) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t =
      length2 === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / length2)
          );
    best = Math.min(
      best,
      Math.hypot(point[0] - (ax + t * dx), point[1] - (ay + t * dy))
    );
  }
  return best;
}

function shoelace(ring: [number, number][]) {
  let sum = 0;
  for (let i = 0; i + 1 < ring.length; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum) / 2;
}

describe("outlineOf: what is kept", () => {
  it("is the stored polygon, as [longitude, latitude] at a centimetre, with no altitude", () => {
    const outline = outlineOf({
      type: "Polygon",
      coordinates: [
        [
          [3.4000000412, 6.5000000377, 12.5],
          [3.4003, 6.5, 12.5],
          [3.4003, 6.5003, 12.5],
          [3.4, 6.5003, 12.5],
          [3.4000000412, 6.5000000377, 12.5],
        ],
      ],
    });
    expect(outline).toEqual(SQUARE);
  });

  it("rounds to 1e-7 of a degree", () => {
    const outline = outlineOf({
      type: "Polygon",
      coordinates: [
        [
          [3.4735123456, 6.4470366789],
          [3.4736123456, 6.4470366789],
          [3.4736123456, 6.4471366789],
          [3.4735123456, 6.4470366789],
        ],
      ],
    });
    expect(outline).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [3.4735123, 6.4470367],
          [3.4736123, 6.4470367],
          [3.4736123, 6.4471367],
          [3.4735123, 6.4470367],
        ],
      ],
    });
  });

  it("closes a ring that was left open and drops repeated neighbours", () => {
    const outline = outlineOf({
      type: "Polygon",
      coordinates: [
        [
          [3.4, 6.5],
          [3.4, 6.5],
          [3.4003, 6.5],
          [3.4003, 6.5003],
          [3.4003, 6.5003],
          [3.4, 6.5003],
        ],
      ],
    });
    expect(outline).toEqual(SQUARE);
  });

  it("keeps a hole, and leaves out a hole that cannot be drawn", () => {
    const hole = [
      [3.40005, 6.50005],
      [3.40015, 6.50005],
      [3.40015, 6.50015],
      [3.40005, 6.50005],
    ];
    const withHole = outlineOf({
      type: "Polygon",
      coordinates: [...SQUARE.coordinates, hole],
    });
    expect(withHole).toEqual({
      type: "Polygon",
      coordinates: [...SQUARE.coordinates, hole],
    });

    const brokenHole = outlineOf({
      type: "Polygon",
      coordinates: [
        ...SQUARE.coordinates,
        [
          [3.40005, 6.50005],
          [3.40015, 6.50005],
        ],
      ],
    });
    expect(brokenHole).toEqual(SQUARE);
  });

  it("keeps the type: a Polygon stays one, and so does a MultiPolygon with a single polygon", () => {
    expect(outlineOf(SQUARE)!.type).toBe("Polygon");
    const one = outlineOf({
      type: "MultiPolygon",
      coordinates: [SQUARE.coordinates],
    });
    expect(one).toEqual({
      type: "MultiPolygon",
      coordinates: [SQUARE.coordinates],
    });
  });

  it("reads a boundary kept as JSON text", () => {
    expect(outlineOf(JSON.stringify(SQUARE))).toEqual(SQUARE);
  });
});

describe("outlineOf: what cannot be drawn", () => {
  const ring = (...positions: unknown[]) => ({
    type: "Polygon",
    coordinates: [positions],
  });

  it.each([
    ["nothing", null],
    ["a point", { type: "Point", coordinates: [3.4, 6.5] }],
    ["text that is not JSON", "garbage"],
    ["a polygon with no rings", { type: "Polygon", coordinates: [] }],
    ["a ring of two positions", ring([3.4, 6.5], [3.5, 6.5])],
    [
      "a ring that collapses to a line",
      ring([3.4, 6.5], [3.5, 6.5], [3.4, 6.5]),
    ],
    [
      "a ring of one repeated place",
      ring([3.4, 6.5], [3.4, 6.5], [3.4, 6.5], [3.4, 6.5]),
    ],
    [
      "a position of text",
      ring([3.4, 6.5], ["3.5", "6.5"], [3.5, 6.6], [3.4, 6.5]),
    ],
    [
      "a position with one number",
      ring([3.4, 6.5], [3.5], [3.5, 6.6], [3.4, 6.5]),
    ],
    [
      "a latitude past the pole",
      ring([3.4, 6.5], [3.5, 91], [3.5, 6.6], [3.4, 6.5]),
    ],
    [
      "a longitude past the date line",
      ring([3.4, 6.5], [181, 6.5], [3.5, 6.6], [3.4, 6.5]),
    ],
    [
      "a position that is not a number",
      ring([3.4, 6.5], [null, null], [3.5, 6.6], [3.4, 6.5]),
    ],
    ["a ring that is not a list", { type: "Polygon", coordinates: ["x"] }],
  ])("is nothing for %s", (_name, geometry) => {
    expect(outlineOf(geometry)).toBeNull();
  });

  it("leaves out only the polygons of a MultiPolygon that cannot be drawn", () => {
    const outline = outlineOf({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [3.4, 6.5],
            [3.5, 6.5],
          ],
        ],
        SQUARE.coordinates,
        [],
      ],
    });
    expect(outline).toEqual({
      type: "MultiPolygon",
      coordinates: [SQUARE.coordinates],
    });
  });

  it("is nothing when no polygon of a MultiPolygon can be drawn", () => {
    expect(
      outlineOf({ type: "MultiPolygon", coordinates: [[[[3.4, 6.5]]], []] })
    ).toBeNull();
  });
});

describe("outlineOf: a long ring", () => {
  it("is left alone up to the limit", () => {
    const ring = circle(MAX_RING_POSITIONS - 1, 3000);
    expect(ring).toHaveLength(MAX_RING_POSITIONS);
    const outline = outlineOf({ type: "Polygon", coordinates: [ring] });
    expect(outline!.coordinates[0]).toHaveLength(MAX_RING_POSITIONS);
  });

  it("is thinned beyond it, within a quarter of a metre of the stored ring", () => {
    const stored = circle(500, 40);
    const outline = outlineOf({ type: "Polygon", coordinates: [stored] });
    const thinned = (outline as { coordinates: Position[][] }).coordinates[0];

    expect(thinned.length).toBeLessThan(stored.length / 4);
    expect(thinned.length).toBeGreaterThanOrEqual(4);
    // Still a ring that starts and ends at the stored first position.
    expect(thinned[0]).toEqual(thinned[thinned.length - 1]);
    expect(thinned[0][0]).toBeCloseTo(stored[0][0], 6);
    expect(thinned[0][1]).toBeCloseTo(stored[0][1], 6);

    const origin = stored[0];
    const flatThin = thinned.map((p) => metres(p, origin));
    // Every stored position is within the tolerance of the thinned ring (plus a centimetre of rounding).
    for (const p of stored) {
      expect(distanceToRing(metres(p, origin), flatThin)).toBeLessThanOrEqual(
        THIN_TOLERANCE_METRES + 0.02
      );
    }
    // And the plot is the same size to within a fraction of a percent.
    const before = shoelace(stored.map((p) => metres(p, origin)));
    const after = shoelace(flatThin);
    expect(Math.abs(after - before) / before).toBeLessThan(0.01);
  });

  it("keeps every position when each one is needed to stay within the tolerance", () => {
    // A 2 km circle of 150 positions: each corner is metres off the line between its neighbours.
    const stored = circle(150, 2000);
    const outline = outlineOf({ type: "Polygon", coordinates: [stored] });
    expect(outline!.coordinates[0]).toHaveLength(stored.length);
  });

  it("thins a long hole the same way, and a long polygon of a MultiPolygon", () => {
    const outer = circle(300, 200);
    const hole = circle(300, 40);
    const polygon = outlineOf({ type: "Polygon", coordinates: [outer, hole] })!
      .coordinates as Position[][];
    expect(polygon).toHaveLength(2);
    expect(polygon[0].length).toBeLessThan(120);
    expect(polygon[1].length).toBeLessThan(120);

    const multi = outlineOf({
      type: "MultiPolygon",
      coordinates: [[circle(300, 40)], SQUARE.coordinates],
    })!.coordinates as Position[][][];
    expect(multi[0][0].length).toBeLessThan(120);
    expect(multi[1][0]).toHaveLength(5);
  });
});
