// utils/geometry.ts

/**
 * Installation:
 * ```bash
 * npm install @turf/area @turf/centroid @turf/helpers
 * ```
 */

import { Feature, Polygon, MultiPolygon } from "geojson";
import area from "@turf/area";
import centroid from "@turf/centroid";

/**
 * Input geometry type: WKT string, GeoJSON Polygon/MultiPolygon feature, or direct geometry
 */
export type GeometryInput =
  | string
  | Feature<Polygon | MultiPolygon>
  | Polygon
  | MultiPolygon;

/**
 * Resulting geometry details
 */
export interface GeometryDetails {
  /** Area in square meters */
  areaSqM: number;
  /** Centroid as [longitude, latitude] */
  centroid: [number, number];
}

/**
 * Normalize input to a GeoJSON Geometry (Polygon or MultiPolygon)
 */
function normalizeToGeometry(input: GeometryInput): Polygon | MultiPolygon {
  // If it's already a geometry, return as is
  if (
    input &&
    typeof input === "object" &&
    "type" in input &&
    "coordinates" in input
  ) {
    if (input.type === "Polygon" || input.type === "MultiPolygon") {
      return input as Polygon | MultiPolygon;
    }
  }

  // If it's a string, try to parse it as JSON
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return normalizeToGeometry(parsed);
    } catch (e) {
      throw new Error("Failed to parse input as JSON");
    }
  }

  throw new Error(
    "Unsupported input format: must be a GeoJSON Polygon or MultiPolygon"
  );
}

/**
 * Compute area and centroid for a given geometry.
 * @param input - WKT string, GeoJSON Geometry, or GeoJSON Feature
 * @returns GeometryDetails
 * @throws Error if input is not a valid geometry
 */
export function computeGeometryDetails(input: GeometryInput): GeometryDetails {
  console.log("\n\n\n computeGeometryDetails input", input);
  try {
    // Normalize the input to a GeoJSON Geometry
    const geometry = normalizeToGeometry(input);

    // Validate the geometry type
    if (
      !["Polygon", "MultiPolygon"].includes(geometry.type) ||
      !geometry.coordinates
    ) {
      throw new Error(
        `Invalid geometry: must be a valid GeoJSON Polygon or MultiPolygon. Got type: ${
          geometry?.type || "unknown"
        }`
      );
    }

    // Calculate area in square meters
    const areaSqM = area(geometry);

    // Calculate centroid point
    const center = centroid(geometry as any);
    const [lon, lat] = center.geometry.coordinates;

    console.log("\nAREASQM COMPUTED", areaSqM);
    console.log("\nCENTROID COMPUTED", center.geometry.coordinates);

    return {
      areaSqM,
      centroid: [lon, lat] as [number, number],
    };
  } catch (error: any) {
    console.error("Error in computeGeometryDetails:", error);
    throw new Error(
      `Failed to compute geometry details: ${error?.message || error}`
    );
  }
}

/* Example Usage:
import { computeGeometryDetails } from "../utils/dbUtils";

const wkt = "POLYGON((-80 35, -80 36, -79 36, -79 35, -80 35))";
const { areaSqM, centroid } = computeGeometryDetails(wkt);
console.log(areaSqM, centroid);
*/
