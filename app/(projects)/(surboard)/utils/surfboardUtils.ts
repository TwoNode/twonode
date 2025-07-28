// Utility functions for surfboard operations
export interface PillarData {
  easting: number;
  northing: number;
  pointIndex: number;
  pillarNumber: string;
  geometry?: string; // GeoJSON point
}

// Enhanced coordinate conversion using proper projection
export function convertCoordinates(
  easting: number,
  northing: number,
  fromEPSG: number = 26331 // Default to Minna / Nigeria Mid Belt
): { lat: number; lng: number } {
  // This is a simplified conversion for Nigeria Mid Belt (EPSG:26331) to WGS84
  // In production, you should use a proper projection library like proj4js

  // Approximate conversion factors for Nigeria Mid Belt to WGS84
  // These are rough estimates and should be replaced with proper projection
  const latOffset = 6.5; // Approximate latitude offset
  const lngOffset = 3.4; // Approximate longitude offset

  // Convert from meters to degrees (very rough approximation)
  const lat = latOffset + northing / 111000;
  const lng = lngOffset + easting / (111000 * Math.cos((lat * Math.PI) / 180));

  return { lat, lng };
}

// Enhanced CSV parsing with better error handling
export function parseCSVContent(csvContent: string): PillarData[] {
  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header and one data row");
    }

    // Parse header
    const header = lines[0].split(",").map((h) =>
      h
        .trim()
        .split(" ")
        .map((word) => word.trim())
        .join("")
        .toLowerCase()
    );

    // Validate required columns
    const requiredColumns = ["pillarnumber", "easting", "northing"];
    const missingColumns = requiredColumns.filter(
      (col) => !header.includes(col)
    );

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Get column indices
    const pillarNumberIndex = header.indexOf("pillarnumber");
    const eastingIndex = header.indexOf("easting");
    const northingIndex = header.indexOf("northing");

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
      `Failed to parse CSV: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Generate GeoJSON polygon from pillars with proper closure
export function generatePolygonFromPillars(pillars: PillarData[]): string {
  if (pillars.length < 3) {
    throw new Error("Need at least 3 pillars to form a polygon");
  }

  // Convert all pillars to WGS84 coordinates
  const coordinates = pillars.map((pillar) => {
    const { lat, lng } = convertCoordinates(pillar.easting, pillar.northing);
    return [lng, lat]; // GeoJSON format: [longitude, latitude]
  });

  // Close the polygon by repeating the first point
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push([...coordinates[0]]);
  }

  const polygon = {
    type: "Polygon",
    coordinates: [coordinates],
  };

  return JSON.stringify(polygon);
}

// Generate GeoJSON point for a pillar
export function generatePointFromPillar(pillar: PillarData): string {
  const { lat, lng } = convertCoordinates(pillar.easting, pillar.northing);

  const point = {
    type: "Point",
    coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
  };

  return JSON.stringify(point);
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

// Helper function to get file URL from key
export function getSurfboardFileUrl(key: string): string {
  const bucketName =
    process.env.SURFBOARD_AWS_BUCKET_NAME || process.env.REVA_AWS_BUCKET_NAME!;
  const region =
    process.env.SURFBOARD_AWS_REGION || process.env.REVA_AWS_REGION!;
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}
