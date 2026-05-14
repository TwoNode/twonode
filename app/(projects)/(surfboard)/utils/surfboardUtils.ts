import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import Point from "@arcgis/core/geometry/Point";
import { PlanId, SubscriptionPlan } from "./paystackSubscription";
import { PillarData } from "../types/surfboardTypes";

const MS_PER_DAY = 86_400_000;

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}
export function daysInclusive(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}
export function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

export function getQuarterIndex(d: Date): 1 | 2 | 3 | 4 {
  const m = d.getMonth(); // 0-based
  if (m <= 2) return 1;
  if (m <= 5) return 2;
  if (m <= 8) return 3;
  return 4;
}
export function startOfQuarter(d: Date): Date {
  const q = getQuarterIndex(d);
  const startMonth = (q - 1) * 3; // 0,3,6,9
  return new Date(d.getFullYear(), startMonth, 1);
}
export function endOfQuarter(d: Date): Date {
  const q = getQuarterIndex(d);
  const endMonth = q * 3; // 3,6,9,12 (but Date will roll back to last day)
  return new Date(d.getFullYear(), endMonth, 0);
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}
export function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 12, 0);
}

export interface Period {
  periodStart: Date; // inclusive
  periodEnd: Date; // inclusive
  chargeDate: Date; // when we attempt to charge (the day after periodEnd)
}

export function getPeriodFor(plan: PlanId, ref: Date): Period {
  if (plan === "monthly") {
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
  }
  if (plan === "quarterly") {
    const start = startOfQuarter(ref);
    const end = endOfQuarter(ref);
    return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
  }
  // yearly
  const start = startOfYear(ref);
  const end = endOfYear(ref);
  return { periodStart: start, periodEnd: end, chargeDate: addDays(end, 1) };
}

export function proratedAmount(
  plan: SubscriptionPlan,
  usageStart: Date,
  period: Period
): number {
  const usedStart = clampDate(usageStart, period.periodStart, period.periodEnd);
  const usedDays = daysInclusive(usedStart, period.periodEnd);
  const totalDays = daysInclusive(period.periodStart, period.periodEnd);
  // Round to nearest naira
  return Math.round((plan.price * usedDays) / totalDays);
}

// -----------------------------------------------------------------------------
// EXISTING mapping utilities
// -----------------------------------------------------------------------------

export async function ensureProjectionLoaded(): Promise<void> {
  // If already loaded, return immediately
  if (projectOperator.isLoaded()) {
    return;
  }

  // If loading is in progress, return the existing promise
  if (projectionLoadPromise) {
    return projectionLoadPromise;
  }

  // Start loading the projection module
  projectionLoadPromise = projectOperator.load().catch((error) => {
    console.error("Failed to load projection module:", error);
    throw new Error(
      "Failed to initialize map projection system. Please try refreshing the page."
    );
  });

  return projectionLoadPromise;
}

// Create a promise that resolves when projection is loaded
let projectionLoadPromise: Promise<void> | null = null;

export async function convertCoordinates(
  easting: number,
  northing: number,
  fromEPSG: number = 26331 // Minna / Nigeria West Belt
): Promise<{ lat: number; lng: number }> {
  try {
    await ensureProjectionLoaded();

    // Create point in source spatial reference
    const sourcePoint = new Point({
      x: easting,
      y: northing,
      spatialReference: new SpatialReference({ wkid: fromEPSG }),
    });

    // Project to WGS84 (EPSG:4326)
    const targetSR = new SpatialReference({ wkid: 4326 });
    const projectedPoint = projectOperator.execute(
      sourcePoint,
      targetSR
    ) as Point;

    return {
      lat: projectedPoint.y,
      lng: projectedPoint.x,
    };
  } catch (error) {
    console.error("Coordinate conversion failed:", error);
    throw new Error(
      `Failed to convert coordinates: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Enhanced CSV parsing with better error handling and flexible column name matching
export function parseCSVContent(csvContent: string): PillarData[] {
  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 3) {
      throw new Error("CSV file must have at least 3 rows");
    }

    // Parse header and normalize column names
    const header = lines[0].split(",").map(
      (h) =>
        h
          .trim()
          .split(/\s+/)
          .map((word) => word.trim())
          .join("") // Remove all spaces
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") // Remove any remaining special characters
    );

    // Define possible column name variations
    const pillarVariations = [
      "pillarnumber",
      "pillarno",
      "pillarnumbers",
      "pillarnos",
      "pillar",
    ];
    const eastingVariations = ["easting", "eastings", "x"];
    const northingVariations = ["northing", "northings", "y"];

    // Find column indices with flexible matching
    const findColumnIndex = (variations: string[]): number => {
      for (const variation of variations) {
        const index = header.findIndex((h) => h.includes(variation));
        if (index !== -1) return index;
      }
      return -1;
    };

    const pillarNumberIndex = findColumnIndex(pillarVariations);
    const eastingIndex = findColumnIndex(eastingVariations);
    const northingIndex = findColumnIndex(northingVariations);

    // Validate required columns
    const missingColumns = [];
    if (pillarNumberIndex === -1)
      missingColumns.push("Pillar Number (or variation)");
    if (eastingIndex === -1) missingColumns.push("Easting (or X)");
    if (northingIndex === -1) missingColumns.push("Northing (or Y)");

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Parse data rows
    const pillars: PillarData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(",").map((v) => v.trim());

      if (
        values.length <
        Math.max(pillarNumberIndex, eastingIndex, northingIndex) + 1
      ) {
        console.warn(`Skipping invalid line ${i + 1}: insufficient columns`);
        continue;
      }

      const pillarNumber = values[pillarNumberIndex];
      const easting = parseFloat(values[eastingIndex]);
      const northing = parseFloat(values[northingIndex]);

      // Validate data
      if (!pillarNumber || isNaN(easting) || isNaN(northing)) {
        console.warn(`Skipping invalid line ${i + 1}: invalid data`);
        continue;
      }

      pillars.push({
        pillarNumber,
        easting,
        northing,
        pointIndex: i - 1, // 0-based index
      });
    }

    if (pillars.length === 0) {
      throw new Error("No valid pillar data found in CSV");
    }

    return pillars;
  } catch (error) {
    throw new Error(
      `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Generate GeoJSON polygon from pillars with proper closure
export async function generatePolygonFromPillars(
  pillars: PillarData[]
): Promise<string> {
  if (pillars.length < 3) {
    throw new Error("Need at least 3 pillars to form a polygon");
  }

  try {
    // Convert all pillars to WGS84 coordinates
    const coordinatesPromises = pillars.map(async (pillar) => {
      const { lat, lng } = await convertCoordinates(
        pillar.easting,
        pillar.northing
      );
      return [lng, lat]; // GeoJSON format: [longitude, latitude]
    });

    const coordinates = await Promise.all(coordinatesPromises);

    // Close the polygon by repeating the first point
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push([...coordinates[0]]);
    }

    const polygon = {
      type: "Polygon",
      coordinates: [coordinates],
    };

    return JSON.stringify(polygon);
  } catch (error) {
    console.error("Failed to generate polygon:", error);
    throw new Error(
      `Failed to generate polygon: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generates a MultiPolygon GeoJSON string from groups of pillars (one group per parcel).
 */
export async function generateMultiPolygonFromPillarGroups(
  pillarGroups: PillarData[][]
): Promise<string> {
  if (pillarGroups.length === 0) {
    throw new Error("At least one pillar group is required");
  }

  try {
    const allCoordinates: [number, number][][][] = [];

    for (const group of pillarGroups) {
      if (group.length < 3) {
        console.warn("Skipping parcel with fewer than 3 pillars");
        continue;
      }

      // Convert each pillar to WGS84
      const coordinatesPromises = group.map(async (pillar) => {
        const { lat, lng } = await convertCoordinates(
          pillar.easting,
          pillar.northing
        );
        return [lng, lat] as [number, number];
      });

      const coordinates = await Promise.all(coordinatesPromises);

      // Close the ring
      if (
        coordinates.length > 0 &&
        (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1])
      ) {
        coordinates.push([...coordinates[0]]);
      }

      // GeoJSON MultiPolygon coordinates are [Polygon1, Polygon2, ...]
      // where each Polygon is [ExteriorRing, InteriorRing1, ...]
      allCoordinates.push([coordinates]);
    }

    if (allCoordinates.length === 0) {
      throw new Error("No valid polygons could be generated from the groups");
    }

    const multiPolygon = {
      type: "MultiPolygon",
      coordinates: allCoordinates,
    };

    return JSON.stringify(multiPolygon);
  } catch (error) {
    console.error("Failed to generate MultiPolygon:", error);
    throw new Error(
      `Failed to generate MultiPolygon: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Generate GeoJSON point for a pillar
export async function generatePointFromPillar(
  pillar: PillarData
): Promise<string> {
  try {
    const { lat, lng } = await convertCoordinates(
      pillar.easting,
      pillar.northing
    );

    const point = {
      type: "Point",
      coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
    };

    return JSON.stringify(point);
  } catch (error) {
    console.error("Failed to generate point:", error);
    throw new Error(
      `Failed to generate point: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Calculate polygon area (simplified - use proper GIS library in production)
function calculatePolygonArea(geometry: any): number {
  try {
    if (
      geometry.type !== "Polygon" ||
      !geometry.coordinates ||
      !geometry.coordinates[0]
    ) {
      throw new Error("Invalid polygon geometry");
    }

    const coordinates = geometry.coordinates[0];
    if (coordinates.length < 4) {
      throw new Error("Polygon must have at least 3 points");
    }

    // Simplified area calculation using shoelace formula
    // This is approximate - for accurate results, use a proper GIS library
    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      area += x1 * y2 - x2 * y1;
    }
    area = Math.abs(area) / 2;

    // Convert to square meters (very rough approximation)
    // In production, use proper coordinate system conversion
    return area * 10000000; // Rough conversion factor
  } catch (error) {
    console.warn("Could not calculate area:", error);
    return 0;
  }
}

export function getSurfboardFileUrl(key: string): string {
  const bucketName =
    process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;
  const region =
    process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

// -----------------------------------------------------------------------------
// OSSG Support Utilities
// -----------------------------------------------------------------------------

/**
 * Compresses an array of pillar numbers into a concise format for OSSG payloads.
 * e.g. ["P1", "P2", "P3"] -> "P1 - P3"
 */
export function compressPillarNumbers(pillars: string[]): string {
  if (!pillars || pillars.length === 0) return "";
  if (pillars.length <= 2) return pillars.join(", ");

  // A simple dummy compression: First and last pillar
  return `${pillars[0]} - ${pillars[pillars.length - 1]}`;
}
