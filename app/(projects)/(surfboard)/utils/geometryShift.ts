import proj4 from "proj4";
import type { Geometry, Position } from "geojson";

proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

type Shifts = Record<string, { eastingShift: number; northingShift: number }>;

/**
 * The map correction for a plan that has no pillars to shift: its stored
 * outline (GeoJSON, lon/lat) is moved by the same metres the pillars would
 * be. Display only, like applyVisualizationShift — the stored geometry is
 * never changed. A state with no configured correction returns the geometry
 * as it is.
 */
export function shiftGeometryForDisplay<T extends Geometry>(
  geometry: T,
  state: string | null | undefined,
  shifts: Shifts | null | undefined
): T {
  const shift = state ? shifts?.[state.toLowerCase()] : undefined;
  if (!shift || (shift.eastingShift === 0 && shift.northingShift === 0)) {
    return geometry;
  }

  const move = ([lon, lat, ...rest]: Position): Position => {
    const [e, n] = proj4("EPSG:4326", "EPSG:26331", [lon, lat]);
    const [lon2, lat2] = proj4("EPSG:26331", "EPSG:4326", [
      e + shift.eastingShift,
      n + shift.northingShift,
    ]);
    return [lon2, lat2, ...rest];
  };
  const walk = (c: any): any =>
    typeof c[0] === "number" ? move(c as Position) : c.map(walk);

  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries.map((g) =>
        shiftGeometryForDisplay(g, state, shifts)
      ),
    } as T;
  }
  return { ...geometry, coordinates: walk((geometry as any).coordinates) } as T;
}
