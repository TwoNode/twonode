// app/surf/plans/PlansMapClient.tsx  (Client Component)
"use client";

import { useMemo } from "react";
import * as turf from "@turf/turf";
import MaplibreMultiPlansWithSearch from "./maps/MaplibreMultiPlans";
import { PillarData, Plan } from "../types/surfboardTypes";

type DBPlan = {
  id: string;
  planNumber: string;
  surveyTitle: string | null;
  pillars: any; // Prisma.JsonValue | PillarData[] | null
  geometry: any; // Prisma.JsonValue | GeoJSON | null
};

export default function PlansMapClient({
  plansRaw,
  getPlanDetailUrl,
}: {
  plansRaw: Plan[];
  getPlanDetailUrl?: (id: string) => string;
}) {
  // const plansForMap: Plan[] = useMemo(() => {
  //   return plansRaw
  //     .map((p) => toPlanForMap(p))
  //     .filter((p): p is Plan => !!p && !!p.processedPillars?.length);
  // }, [plansRaw]);

  return (
    <div className="h-full w-full">
      <MaplibreMultiPlansWithSearch
        plans={plansRaw}
        getPlanDetailUrl={getPlanDetailUrl}
        // basemap="roadmap"
        // autofit
        // height="100%"
      />
    </div>
  );
}

/** --- Helpers to normalize DB shapes into what the map expects --- */

// function toPlanForMap(db: DBPlan): Plan | null {
//   const processedPillars = coercePillars(db.pillars);
//   if (!processedPillars.length) return null;

//   const polygon = extractPolygon(db.geometry); // optional

//   return {
//     id: db.id,
//     label: db.planNumber || db.surveyTitle || db.id,
//     processedPillars,
//     polygon: polygon ?? undefined,
//     // color: "#7c3aed",  // (optional) override per plan
//   };
// }

// function coercePillars(pillarsJson: any): PillarData[] {
//   if (!pillarsJson) return [];

//   // Already in PillarData[] shape?
//   if (
//     Array.isArray(pillarsJson) &&
//     typeof pillarsJson[0]?.easting === "number" &&
//     typeof pillarsJson[0]?.northing === "number"
//   ) {
//     return pillarsJson as PillarData[];
//   }

//   // If it’s a JSON string, try to parse it
//   if (typeof pillarsJson === "string") {
//     try {
//       return coercePillars(JSON.parse(pillarsJson));
//     } catch {
//       return [];
//     }
//   }

//   // Some folks store { pillars: [...] }
//   if (Array.isArray(pillarsJson?.pillars)) {
//     return coercePillars(pillarsJson.pillars);
//   }

//   // If it’s GeoJSON Points, convert to PillarData
//   if (pillarsJson?.type === "FeatureCollection") {
//     try {
//       const feats = (pillarsJson.features || []) as any[];
//       return feats
//         .filter((f) => f?.geometry?.type === "Point")
//         .map((f, i) => {
//           const [lng, lat] = f.geometry.coordinates as [number, number];
//           // You *can* back-project to UTM here if you store only UTM; otherwise keep zeros
//           return {
//             easting: f.properties?.easting ?? 0,
//             northing: f.properties?.northing ?? 0,
//             pointIndex: f.properties?.pointIndex ?? i,
//             pillarNumber: f.properties?.pillarNumber ?? `P${i + 1}`,
//           } as PillarData;
//         });
//     } catch {
//       return [];
//     }
//   }

//   // Unknown shape
//   return [];
// }

// function extractPolygon(geometryJson: any) {
//   if (!geometryJson) return null;

//   // Already a Polygon
//   if (geometryJson.type === "Polygon") {
//     return geometryJson as { type: "Polygon"; coordinates: number[][][] };
//   }

//   // MultiPolygon → choose the largest by area
//   if (geometryJson.type === "MultiPolygon") {
//     try {
//       const polys = (geometryJson.coordinates as number[][][][]).map(
//         (coords) => ({ type: "Polygon", coordinates: coords } as any)
//       );
//       const largest = polys.reduce(
//         (acc, cur) => (turf.area(cur) > turf.area(acc) ? cur : acc),
//         polys[0]
//       );
//       return largest as { type: "Polygon"; coordinates: number[][][] };
//     } catch {
//       return null;
//     }
//   }

//   // Stringified?
//   if (typeof geometryJson === "string") {
//     try {
//       return extractPolygon(JSON.parse(geometryJson));
//     } catch {
//       return null;
//     }
//   }

//   return null;
// }
