import { computeGeometryDetails } from "@/app/(projects)/(surfboard)/utils/dbUtils";

// A plan's boundary as stored, and the outline the mobile app's map draws from
// it (TASK-0015 1E.1). `SurfboardPlan.geometry` is GeoJSON in WGS84 (longitude,
// latitude) in a JSONB column; a few rows hold the same GeoJSON as JSON text,
// which `computeGeometryDetails` has always accepted, so this does too.

export type Position = [number, number];
export type Outline =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

type Boundary = { type: "Polygon" | "MultiPolygon"; coordinates: unknown[] };

/** Rows hold GeoJSON, sometimes as JSON text, once in a while as text of text. */
const MAX_TEXT_LAYERS = 3;

/** A coordinate is kept to 1e-7 of a degree: about a centimetre, far below what a phone can draw. */
const DECIMALS = 1e7;

/** A ring with more positions than this is thinned (a survey plot has a handful; a layout a few dozen). */
export const MAX_RING_POSITIONS = 120;

/** How far a thinned ring may stray from the stored one. At the highest zoom a phone pixel is about 15 cm. */
export const THIN_TOLERANCE_METRES = 0.25;

const METRES_PER_DEGREE = 111_320;

/** The stored boundary as a Polygon or MultiPolygon, or null when it is anything else. */
export function parseBoundary(value: unknown): Boundary | null {
  let parsed = value;
  for (let i = 0; i < MAX_TEXT_LAYERS && typeof parsed === "string"; i += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { type, coordinates } = parsed as {
    type?: unknown;
    coordinates?: unknown;
  };
  if (
    (type !== "Polygon" && type !== "MultiPolygon") ||
    !Array.isArray(coordinates)
  ) {
    return null;
  }
  return { type, coordinates };
}

/** [longitude, latitude] and anything after (an altitude): the first two are finite numbers. */
function isPosition(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

const hasItems = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length > 0;

/** Every level is a list with something in it and every leaf is a position. Says nothing about whether it is a sensible shape. */
function isWellFormed(boundary: Boundary): boolean {
  const polygon = (rings: unknown) =>
    hasItems(rings) &&
    rings.every((ring) => hasItems(ring) && ring.every(isPosition));
  return boundary.type === "Polygon"
    ? polygon(boundary.coordinates)
    : hasItems(boundary.coordinates) && boundary.coordinates.every(polygon);
}

/**
 * Area (square metres, two decimals) and centre of the stored boundary; nulls
 * when it cannot be worked out. A boundary that is not even made of positions
 * is turned away here, because the library would log an error for each one.
 */
export function boundaryFacts(geometry: unknown): {
  areaSqM: number | null;
  centroid: { lat: number; lng: number } | null;
} {
  const boundary = parseBoundary(geometry);
  if (!boundary || !isWellFormed(boundary)) {
    return { areaSqM: null, centroid: null };
  }
  try {
    const { areaSqM, centroid } = computeGeometryDetails(boundary as never);
    const [lng, lat] = centroid;
    if (
      !Number.isFinite(areaSqM) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return { areaSqM: null, centroid: null };
    }
    return {
      areaSqM: Math.round(areaSqM * 100) / 100,
      centroid: { lat, lng },
    };
  } catch {
    return { areaSqM: null, centroid: null };
  }
}

const round = (degrees: number) => Math.round(degrees * DECIMALS) / DECIMALS;

/** One position as [longitude, latitude] at map precision, or null if it cannot be a place on Earth. */
function cleanPosition(position: unknown): Position | null {
  if (!isPosition(position)) return null;
  const [lng, lat] = position;
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  return [round(lng), round(lat)];
}

/**
 * The positions of a closed ring that are kept when it is thinned to within
 * `tolerance`. Distances are worked out on a flat plane where a degree of
 * longitude is squeezed by the cosine of the latitude, which is exact enough
 * across one plot.
 */
function keptIndices(ring: Position[], metres: number): number[] {
  const open = ring.slice(0, -1); // the last position repeats the first
  const count = open.length;
  const squeeze = Math.cos((open[0][1] * Math.PI) / 180);
  const tolerance = metres / METRES_PER_DEGREE;
  const x = (i: number) => open[i % count][0] * squeeze;
  const y = (i: number) => open[i % count][1];

  /** Distance of position `i` from the straight piece between positions `a` and `b`. */
  const away = (i: number, a: number, b: number) => {
    const dx = x(b) - x(a);
    const dy = y(b) - y(a);
    const length2 = dx * dx + dy * dy;
    const along =
      length2 === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((x(i) - x(a)) * dx + (y(i) - y(a)) * dy) / length2)
          );
    return Math.hypot(x(i) - (x(a) + along * dx), y(i) - (y(a) + along * dy));
  };

  // A ring has no ends to draw a line between: split it at the position
  // farthest from the first and thin the two halves as open lines.
  let far = 1;
  for (let i = 2; i < count; i += 1) {
    if (
      Math.hypot(x(i) - x(0), y(i) - y(0)) >
      Math.hypot(x(far) - x(0), y(far) - y(0))
    ) {
      far = i;
    }
  }
  const keep = new Array<boolean>(count).fill(false);
  keep[0] = true;
  keep[far] = true;
  const pending: [number, number][] = [
    [0, far],
    [far, count],
  ];
  while (pending.length > 0) {
    const [a, b] = pending.pop()!;
    let worst = -1;
    let worstAway = tolerance;
    for (let i = a + 1; i < b; i += 1) {
      const d = away(i, a, b);
      if (d > worstAway) {
        worst = i;
        worstAway = d;
      }
    }
    if (worst >= 0) {
      keep[worst] = true;
      pending.push([a, worst], [worst, b]);
    }
  }
  return keep.flatMap((kept, i) => (kept ? [i] : []));
}

/** A ring at map precision, closed, with no repeated neighbours, thinned if it is long; null if it is not a ring. */
function cleanRing(ring: unknown): Position[] | null {
  if (!Array.isArray(ring)) return null;
  const cleaned: Position[] = [];
  for (const raw of ring) {
    const position = cleanPosition(raw);
    // One bad position means the stored ring is not to be trusted at all.
    if (!position) return null;
    const last = cleaned[cleaned.length - 1];
    if (last && last[0] === position[0] && last[1] === position[1]) continue;
    cleaned.push(position);
  }
  if (cleaned.length === 0) return null;
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) cleaned.push(first);
  // Three corners and the closing position is the least a ring can be.
  if (cleaned.length < 4) return null;
  if (cleaned.length <= MAX_RING_POSITIONS) return cleaned;

  const kept = keptIndices(cleaned, THIN_TOLERANCE_METRES);
  // Thinning must never leave less than a triangle; if it would, keep the ring as it is.
  if (kept.length < 3) return cleaned;
  return [...kept.map((i) => cleaned[i]), cleaned[0]];
}

/** The outer ring, then any holes; null if the outer ring is unusable. A hole that is unusable is left out. */
function cleanPolygon(rings: unknown): Position[][] | null {
  if (!Array.isArray(rings) || rings.length === 0) return null;
  const [outer, ...holes] = rings.map(cleanRing);
  if (!outer) return null;
  return [outer, ...holes.filter((hole): hole is Position[] => hole !== null)];
}

/**
 * What the map draws for a plan: the stored Polygon or MultiPolygon with every
 * position as [longitude, latitude] at about a centimetre (no altitude), rings
 * closed, repeated positions gone, and a ring of more than
 * `MAX_RING_POSITIONS` thinned to within `THIN_TOLERANCE_METRES`. It is for
 * drawing only: area, centre and anything legal come from the stored boundary.
 * A polygon of a MultiPolygon that cannot be drawn is left out; null when none
 * can, or when the boundary is not a Polygon or MultiPolygon at all.
 */
export function outlineOf(geometry: unknown): Outline | null {
  const boundary = parseBoundary(geometry);
  if (!boundary) return null;
  if (boundary.type === "Polygon") {
    const polygon = cleanPolygon(boundary.coordinates);
    return polygon ? { type: "Polygon", coordinates: polygon } : null;
  }
  const polygons = boundary.coordinates
    .map(cleanPolygon)
    .filter((polygon): polygon is Position[][] => polygon !== null);
  return polygons.length > 0
    ? { type: "MultiPolygon", coordinates: polygons }
    : null;
}
