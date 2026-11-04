import proj4 from "proj4";

/**
 * The coordinate systems Nigerian survey plans are written in, registered with
 * proj4 once, here (TASK-0015 1E.4). Before this the same definition string was
 * pasted into three files (geometryShift.ts, MaplibreMap.tsx,
 * MaplibreMultiPlans.tsx); any new code needing UTM metres to longitude and
 * latitude should use these functions instead of calling proj4 directly.
 *
 * Minna datum, Clarke 1880 (RGF), with the three-parameter shift to WGS84 used
 * everywhere in this codebase. Zone 31 (3 to 9 degrees east) is the Lagos
 * "Nigeria West Belt"; zone 32 (9 to 15 degrees east) is the "Mid Belt".
 *
 * NOT covered: the ArcGIS projection path in
 * app/(projects)/(surfboard)/utils/surfboardUtils.ts (convertCoordinates), which
 * the CSV preview uses; its results feed stored plan coordinates, so it is
 * replaced only after a measured comparison with these functions.
 */
export const NIGERIA_UTM_31 = "EPSG:26331" as const;
export const NIGERIA_UTM_32 = "EPSG:26332" as const;
export const WGS84 = "EPSG:4326" as const;

export type NigeriaUtm = typeof NIGERIA_UTM_31 | typeof NIGERIA_UTM_32;

const MINNA_TO_WGS84 = "+ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0";

proj4.defs(
  NIGERIA_UTM_31,
  `+proj=utm +zone=31 ${MINNA_TO_WGS84} +units=m +no_defs`
);
proj4.defs(
  NIGERIA_UTM_32,
  `+proj=utm +zone=32 ${MINNA_TO_WGS84} +units=m +no_defs`
);

/** UTM metres (easting, northing) to WGS84 `[longitude, latitude]` in degrees. */
export function utmToLonLat(
  easting: number,
  northing: number,
  crs: NigeriaUtm = NIGERIA_UTM_31
): [number, number] {
  const [lon, lat] = proj4(crs, WGS84, [easting, northing]);
  return [lon, lat];
}

/** WGS84 `(longitude, latitude)` in degrees to UTM metres `[easting, northing]`. */
export function lonLatToUtm(
  lon: number,
  lat: number,
  crs: NigeriaUtm = NIGERIA_UTM_31
): [number, number] {
  const [easting, northing] = proj4(WGS84, crs, [lon, lat]);
  return [easting, northing];
}

/**
 * Moves a WGS84 position by a number of metres east and north, measured in
 * zone 31 metres (how the state "coordinate shifts" are defined), and returns
 * the new `[longitude, latitude]`.
 */
export function shiftLonLatByMetres(
  lon: number,
  lat: number,
  eastingShift: number,
  northingShift: number
): [number, number] {
  const [e, n] = lonLatToUtm(lon, lat);
  return utmToLonLat(e + eastingShift, n + northingShift);
}
