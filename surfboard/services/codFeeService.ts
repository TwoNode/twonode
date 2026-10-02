import prisma from "@/lib/prisma";
import type { ZoneFeeRow } from "@/app/(projects)/(surfboard)/utils/CoDFees";

/**
 * Migrated from app/(projects)/(surfboard)/actions/codActions.ts — pure
 * calculation plus the two PostGIS zone lookups. No dependents to migrate
 * first, per the Phase 2 spec's sequencing.
 *
 * getChartingInterpretation/getZoneFromGeometry hit PostGIS-backed tables
 * ("LASG_charting_interpretation", "Scale_of_fees") directly via raw SQL —
 * unavailable against a local Postgres without the PostGIS extension, same
 * caveat as the schema-split work in Phase 1 (temporarily remove gis.prisma
 * before `db push` locally; these two functions themselves can't be
 * exercised locally either way without real PostGIS data loaded).
 *
 * ZoneFeeRow is re-exported from utils/CoDFees.ts (not redeclared here) so
 * every caller — this file, remitaVerificationService.ts, and the
 * fee-preview route — shares the one canonical shape settingsActions.ts's
 * getZoneFees() already returns.
 */

export type { ZoneFeeRow };

export async function getChartingInterpretation(
  geometry: any
): Promise<string | null> {
  try {
    const geom = typeof geometry === "string" ? JSON.parse(geometry) : geometry;

    if (geom.type === "MultiPolygon") {
      const interpretations = new Set<string>();
      for (let i = 0; i < geom.coordinates.length; i++) {
        const poly = { type: "Polygon", coordinates: geom.coordinates[i] };
        const polyString = JSON.stringify(poly);
        const result = await prisma.$queryRaw<
          Array<{ interpretation: string }>
        >`
          SELECT interpretation
          FROM "LASG_charting_interpretation"
          WHERE ST_Intersects(
            geom,
            ST_SetSRID(ST_GeomFromGeoJSON(${polyString}), 4326)
          )
          LIMIT 1;
        `;
        if (result?.length && result[0].interpretation) {
          interpretations.add(result[0].interpretation);
        }
      }
      return interpretations.size > 0
        ? Array.from(interpretations).join(", ")
        : null;
    }

    const geometryString = JSON.stringify(geom);
    const result = await prisma.$queryRaw<Array<{ interpretation: string }>>`
      SELECT interpretation
      FROM "LASG_charting_interpretation"
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryString}), 4326)
      )
      LIMIT 1;
    `;
    return result?.length && result[0].interpretation
      ? result[0].interpretation
      : null;
  } catch (err) {
    console.error("Charting interpretation error:", err);
    return null;
  }
}

export async function getZoneFromGeometry(
  geometry: any
): Promise<string | null> {
  try {
    const geom = typeof geometry === "string" ? JSON.parse(geometry) : geometry;

    // For MultiPolygon, we take the zone of the first parcel for plan-level
    // storage; the actual fee calculation iterates through all parcels.
    const geometryToUse =
      geom.type === "MultiPolygon"
        ? { type: "Polygon", coordinates: geom.coordinates[0] }
        : geom;
    const geometryString = JSON.stringify(geometryToUse);

    const result = await prisma.$queryRaw<Array<{ Zone: string }>>`
      SELECT "Zone"
      FROM "Scale_of_fees"
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryString}), 4326)
      )
      LIMIT 1;
    `;
    return result?.length && result[0].Zone ? result[0].Zone : null;
  } catch (err) {
    console.error("Zone intersection error:", err);
    return null;
  }
}

/**
 * True if a plan should be charged double: corporate ownership, more than
 * two names on the survey title (by newline or "and"/"&" separator), or a
 * corporate-sounding keyword in the title.
 */
function shouldChargeDoubleFee(
  surveyTitle: string,
  ethnicity?: string | null
): boolean {
  if (ethnicity?.toLowerCase() === "corporate") return true;

  const names = surveyTitle
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  if (names.length > 2) return true;

  const corporateKeywords = [
    "limited",
    "ltd",
    "corporation",
    "inc",
    "plc",
    "company",
    "co.",
    "enterprises",
    "ventures",
    "holdings",
    "group",
    "associates",
  ];
  const lowerTitle = surveyTitle.toLowerCase();
  if (corporateKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return true;

  const andSeparators = surveyTitle
    .split(/\s+and\s+|\s*&\s*/i)
    .filter((n) => n.trim().length > 0);
  if (andSeparators.length > 2) return true;

  return false;
}

function calculateFeeFromRow(
  feeRow: Pick<
    ZoneFeeRow,
    "lagosZoneA" | "lagosZoneB" | "lagosZoneC" | "lagosZoneD"
  >,
  zone: string,
  surveyTitle: string,
  ethnicity?: string | null
): { fee: number; isDoubleFee: boolean } {
  let baseFee = 0;
  switch (zone) {
    case "lagosZoneA":
      baseFee = feeRow.lagosZoneA;
      break;
    case "lagosZoneB":
      baseFee = feeRow.lagosZoneB;
      break;
    case "lagosZoneC":
      baseFee = feeRow.lagosZoneC;
      break;
    case "lagosZoneD":
      baseFee = feeRow.lagosZoneD;
      break;
    default:
      console.error(`Unknown zone: ${zone}`);
      return { fee: 0, isDoubleFee: false };
  }

  const isDoubleFee = shouldChargeDoubleFee(surveyTitle, ethnicity);
  return { fee: isDoubleFee ? baseFee * 2 : baseFee, isDoubleFee };
}

export async function calculatePlanFeeByZone(
  zone: string,
  areaSqM: number,
  surveyTitle: string,
  zoneFees: ZoneFeeRow[],
  ethnicity?: string | null
): Promise<{ fee: number; isDoubleFee: boolean }> {
  const feeRow = zoneFees.find(
    (row) => areaSqM >= row.start && areaSqM <= row.end
  );

  if (!feeRow) {
    const lastRow = zoneFees[zoneFees.length - 1];
    if (lastRow && areaSqM > lastRow.end) {
      return calculateFeeFromRow(lastRow, zone, surveyTitle, ethnicity);
    }
    console.error(`No fee range found for area: ${areaSqM} sqm`);
    return { fee: 0, isDoubleFee: false };
  }

  return calculateFeeFromRow(feeRow, zone, surveyTitle, ethnicity);
}
