import { shiftLonLatByMetres } from "@/lib/geo/crs";
import type { Geometry, Position } from "geojson";

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
    const [lon2, lat2] = shiftLonLatByMetres(
      lon,
      lat,
      shift.eastingShift,
      shift.northingShift
    );
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
