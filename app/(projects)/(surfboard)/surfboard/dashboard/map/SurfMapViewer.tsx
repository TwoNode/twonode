// =============================================
// File: app/(surfboard)/SurfMapViewer.tsx
// =============================================
"use client";
import React, { useEffect, useRef } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";

import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import Basemap from "@arcgis/core/Basemap";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import { getAllSurfPlans } from "../../../actions/surfboardActions";
import { featureFromPlan, toFeatureCollection } from "../../../utils/geojson";

/** Ensure each polygon (and multipolygon parts) has a closed outer ring */
function closeRingsInFeatureCollection(fc: any) {
  if (!fc || !Array.isArray(fc.features)) return fc;

  fc.features = fc.features.map((feat: any) => {
    const g = feat?.geometry;
    if (!g) return feat;
    if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
      g.coordinates = g.coordinates.map((ring: number[][]) => closeRing(ring));
    } else if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
      g.coordinates = g.coordinates.map((poly: number[][][]) =>
        poly.map((ring: number[][]) => closeRing(ring))
      );
    }
    return feat;
  });
  return fc;
}

function closeRing(ring: number[][]) {
  if (!Array.isArray(ring) || ring.length < 3) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
}

export default function SurfMapViewer() {
  const divRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const hasInitRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasInitRef.current) return; // guard against double init in Strict Mode
    hasInitRef.current = true;

    let cancelled = false;
    let view: MapView | null = null;
    let layer: GeoJSONLayer | null = null;

    (async () => {
      // 1) Fetch & build GeoJSON (and defensively close rings)
      const plans = await getAllSurfPlans();
      const features = plans.data?.map((p: any) =>
        featureFromPlan({
          id: p.id,
          planNumber: p.planNumber,
          geometry: p.geometry,
          properties: { planType: p.planType },
        })
      );
      const fcRaw = toFeatureCollection(features || []);
      const fc = closeRingsInFeatureCollection(fcRaw);

      // Optional: drop degenerate polygons to avoid renderer crashes
      fc.features = fc.features.filter((f: any) => {
        try {
          return geometryEngine.simplify(f.geometry) != null;
        } catch {
          return true;
        }
      });

      const blob = new Blob([JSON.stringify(fc)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      // 2) Create a stable OSM basemap via WebTileLayer (no API key needed)
      const osm = new WebTileLayer({
        urlTemplate:
          "https://{subDomain}.tile.openstreetmap.org/{level}/{col}/{row}.png",
        subDomains: ["a", "b", "c"],
        copyright: "© OpenStreetMap contributors",
      });
      const basemap = new Basemap({ baseLayers: [osm], title: "OSM" });

      const map = new Map({ basemap });
      view = new MapView({
        container: divRef.current as HTMLDivElement,
        map,
        zoom: 10,
        center: [3.3792, 6.5244], // [lon, lat] ~ Lagos
        constraints: { snapToZoom: false },
        popup: { dockEnabled: true, dockOptions: { breakpoint: false } },
      });
      viewRef.current = view;

      // 3) Add GeoJSON layer
      layer = new GeoJSONLayer({
        url,
        title: "Survey Plans",
        outFields: ["*"],
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [59, 130, 246, 0.15],
            outline: { color: [59, 130, 246, 1], width: 1.25 },
          },
        } as any,
        popupTemplate: {
          title: "{planNumber}",
          content: [{ type: "fields" }],
        },
      });
      map.add(layer);

      try {
        await view.when();
        await layer.when();

        // 4) Fit once to layer extent (if any)
        const { extent } = await layer.queryExtent();
        if (extent && !extent.isEmpty) {
          await view.goTo(extent.expand(1.1), { duration: 800 });
        }
      } catch (e) {
        // If basemap/tiles abort during hot reload, just ignore – view remains usable
        console.warn("SurfMapViewer init warning:", e);
      }

      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  return <div ref={divRef} className="w-full h-[600px] rounded-xl border" />;
}

// // =============================================
// // File: app/(surfboard)/SurfMapViewer.tsx
// // =============================================
// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import "@arcgis/core/assets/esri/themes/light/main.css";

// import { getAllSurfPlans } from "../../../actions/surfboardActions";
// import { featureFromPlan, toFeatureCollection } from "../../../utils/geojson";

// // --- Local helpers ----------------------------------------------------------

// type PlanRow = {
//   id: string;
//   planNumber: string;
//   planType: string;
//   geometry: any;
// };

// type Feature = {
//   type: "Feature";
//   id?: string | number;
//   geometry: any;
//   properties: Record<string, any>;
// };

// type FeatureCollection = {
//   type: "FeatureCollection";
//   features: Feature[];
// };

// function closeLinearRing<T extends number[]>(ring: T[]): T[] {
//   // Avoids visual gaps and renderer issues on some clients
//   if (!ring || ring.length < 3) return ring;
//   const first = ring[0];
//   const last = ring[ring.length - 1];
//   const same = first[0] === last[0] && first[1] === last[1];
//   return same ? ring : ([...ring, first] as T[]);
// }

// function closePolygonCoordinates(coords: any): any {
//   // Supports Polygon and MultiPolygon
//   if (!coords) return coords;
//   // Polygon: coord[][]
//   if (Array.isArray(coords) && coords.length && Array.isArray(coords[0][0])) {
//     return (coords as any[]).map((ring) => closeLinearRing(ring));
//   }
//   return coords;
// }

// function closeAllRings(geometry: any): any {
//   if (!geometry) return geometry;
//   if (geometry.type === "Polygon") {
//     return {
//       ...geometry,
//       coordinates: closePolygonCoordinates(geometry.coordinates),
//     };
//   }
//   if (geometry.type === "MultiPolygon") {
//     const polys = geometry.coordinates as any[];
//     return {
//       ...geometry,
//       coordinates: polys.map((poly) => closePolygonCoordinates(poly)),
//     };
//   }
//   return geometry;
// }

// // --- Component --------------------------------------------------------------

// export default function SurfMapViewer() {
//   const divRef = useRef<HTMLDivElement | null>(null);
//   const viewRef = useRef<any>(null);
//   const layerRef = useRef<any>(null);
//   const mapRef = useRef<any>(null);
//   const urlRef = useRef<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [plans, setPlans] = useState<PlanRow[]>([]);
//   const [planTypeFilter, setPlanTypeFilter] = useState<string>("ALL");

//   // Distinct plan types for filter dropdown
//   const planTypes = useMemo(() => {
//     const set = new Set<string>();
//     plans.forEach((p) => p.planType && set.add(p.planType));
//     return ["ALL", ...Array.from(set).sort()];
//   }, [plans]);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const plansRes = await getAllSurfPlans();
//         if (cancelled) return;
//         const rows: PlanRow[] = (plansRes?.data || []).map((p: any) => ({
//           id: p.id,
//           planNumber: p.planNumber,
//           planType: p.planType,
//           geometry: p.geometry,
//         }));
//         setPlans(rows);
//         console.log(rows);
//       } catch (e: any) {
//         if (cancelled) return;
//         setError(e?.message || "Failed to load plans");
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   // Build and (re)apply GeoJSON layer when plans or filter change
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       if (!divRef.current) return;

//       // lazy-import ArcGIS modules only in the client
//       const [
//         { default: Map },
//         { default: MapView },
//         { default: GeoJSONLayer },
//         { default: Legend },
//         { default: LayerList },
//         { default: Expand },
//         { default: ScaleBar },
//         { default: Compass },
//         { default: Home },
//       ] = await Promise.all([
//         import("@arcgis/core/Map"),
//         import("@arcgis/core/views/MapView"),
//         import("@arcgis/core/layers/GeoJSONLayer"),
//         import("@arcgis/core/widgets/Legend"),
//         import("@arcgis/core/widgets/LayerList"),
//         import("@arcgis/core/widgets/Expand"),
//         import("@arcgis/core/widgets/ScaleBar"),
//         import("@arcgis/core/widgets/Compass"),
//         import("@arcgis/core/widgets/Home"),
//       ]);
//       if (cancelled) return;

//       // Tear down previous url/layer/view cleanly when filter changes
//       if (urlRef.current) {
//         URL.revokeObjectURL(urlRef.current);
//         urlRef.current = null;
//       }
//       if (layerRef.current && mapRef.current) {
//         try {
//           mapRef.current.remove(layerRef.current);
//         } catch {}
//         layerRef.current = null;
//       }

//       // Filter + convert to FeatureCollection with closed rings
//       const filtered =
//         planTypeFilter === "ALL"
//           ? plans
//           : plans.filter((p) => p.planType === planTypeFilter);

//       const features: Feature[] | any = (filtered || [])
//         .filter((p) => !!p.geometry)
//         .map((p) => {
//           // Use provided util, but force-close rings defensively
//           const f = featureFromPlan({
//             id: p.id,
//             planNumber: p.planNumber,
//             geometry: closeAllRings(p.geometry),
//             properties: { planType: p.planType, planNumber: p.planNumber },
//           }) as Feature;
//           // Ensure our geometry object is closed even if util doesn't
//           if (
//             f.geometry?.type === "Polygon" ||
//             f.geometry?.type === "MultiPolygon"
//           ) {
//             f.geometry = closeAllRings(f.geometry);
//           }
//           return f;
//         });

//       const fc: FeatureCollection | any = toFeatureCollection(features);
//       const blob = new Blob([JSON.stringify(fc)], { type: "application/json" });
//       const url = URL.createObjectURL(blob);
//       urlRef.current = url;

//       // First time: create map + view
//       if (!viewRef.current) {
//         const map = new Map({ basemap: "osm" });
//         const view = new MapView({
//           container: divRef.current,
//           map,
//           zoom: 11,
//           center: [3.3792, 6.5244], // Lagos (lon, lat)
//           constraints: { snapToZoom: false },
//           popup: {
//             dockEnabled: true,
//             dockOptions: { breakpoint: false, position: "bottom-right" },
//           },
//           highlightOptions: {
//             color: [255, 128, 0, 0.8],
//             haloOpacity: 0.9,
//             fillOpacity: 0.1,
//           },
//         });
//         viewRef.current = view;
//         mapRef.current = map;

//         // nice-to-have widgets that don't require API key
//         const legend = new Legend({ view });
//         const layerList = new LayerList({ view });
//         const legendEx = new Expand({ view, content: legend, expanded: false });
//         const layersEx = new Expand({
//           view,
//           content: layerList,
//           expanded: false,
//         });
//         const scalebar = new ScaleBar({ view, unit: "metric" });
//         const compass = new Compass({ view });
//         const home = new Home({ view });
//         view.ui.add(home, "top-left");
//         view.ui.add(compass, "top-left");
//         view.ui.add(scalebar, "bottom-left");
//         view.ui.add([legendEx, layersEx], "bottom-right");
//       }

//       // (Re)create GeoJSON layer
//       const layer = new GeoJSONLayer({
//         url,
//         title:
//           planTypeFilter === "ALL"
//             ? "All Surf Plans"
//             : `Plans – ${planTypeFilter}`,
//         outFields: ["*"],
//         popupTemplate: {
//           title: "Plan {planNumber}",
//           content: [
//             { type: "text", text: "Type: {planType}" },
//             {
//               type: "fields",
//               fieldInfos: [
//                 { fieldName: "planNumber", label: "Plan Number" },
//                 { fieldName: "planType", label: "Plan Type" },
//               ],
//             },
//           ],
//         },
//         labelingInfo: [
//           {
//             symbol: {
//               type: "text",
//               color: "#111827",
//               haloColor: "#ffffff",
//               haloSize: 1,
//               font: { size: 10, weight: "bold" },
//             } as any,
//             labelPlacement: "center-center",
//             labelExpressionInfo: { expression: "$feature.planNumber" },
//           },
//         ],
//         renderer: {
//           type: "unique-value",
//           field: "planType",
//           defaultSymbol: {
//             type: "simple-fill",
//             color: [59, 130, 246, 0.15],
//             outline: { color: [59, 130, 246, 1], width: 1.5 },
//           },
//           uniqueValueInfos: [
//             {
//               value: "DEED",
//               label: "DEED",
//               symbol: {
//                 type: "simple-fill",
//                 color: [99, 102, 241, 0.18],
//                 outline: { color: [99, 102, 241, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "APPROVED LAYOUT",
//               label: "APPROVED LAYOUT",
//               symbol: {
//                 type: "simple-fill",
//                 color: [16, 185, 129, 0.18],
//                 outline: { color: [16, 185, 129, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "PROVISIONAL",
//               label: "PROVISIONAL",
//               symbol: {
//                 type: "simple-fill",
//                 color: [234, 179, 8, 0.18],
//                 outline: { color: [234, 179, 8, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "PROVISIONAL LAYOUT",
//               label: "PROVISIONAL LAYOUT",
//               symbol: {
//                 type: "simple-fill",
//                 color: [245, 158, 11, 0.18],
//                 outline: { color: [245, 158, 11, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "DEED CHANGE OF TITLE",
//               label: "DEED CHANGE OF TITLE",
//               symbol: {
//                 type: "simple-fill",
//                 color: [236, 72, 153, 0.18],
//                 outline: { color: [236, 72, 153, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "DEED CHANGE OF TITLE(LAYOUT)",
//               label: "DEED CHANGE OF TITLE(LAYOUT)",
//               symbol: {
//                 type: "simple-fill",
//                 color: [14, 165, 233, 0.18],
//                 outline: { color: [14, 165, 233, 1], width: 1.5 },
//               },
//             },
//             {
//               value: "WITHDRAWAL AND RE-SUBMISSION",
//               label: "WITHDRAWAL AND RE-SUBMISSION",
//               symbol: {
//                 type: "simple-fill",
//                 color: [34, 197, 94, 0.18],
//                 outline: { color: [34, 197, 94, 1], width: 1.5 },
//               },
//             },
//           ],
//         } as any,
//       });

//       // Replace old layer
//       const view = viewRef.current as __esri.MapView;
//       const map = mapRef.current as __esri.Map;
//       map.add(layer);
//       layerRef.current = layer;

//       try {
//         await view.when();
//         await layer.when();
//         const ext = layer.fullExtent;
//         if (ext) await view.goTo(ext);
//       } catch {}
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [plans, planTypeFilter]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (urlRef.current) URL.revokeObjectURL(urlRef.current);
//       try {
//         viewRef.current?.destroy?.();
//       } catch {}
//       try {
//         mapRef.current?.destroy?.();
//       } catch {}
//       viewRef.current = null;
//       mapRef.current = null;
//       layerRef.current = null;
//     };
//   }, []);

//   return (
//     <div className="w-full">
//       {/* Toolbar */}
//       <div className="flex items-center justify-between gap-3 mb-2">
//         <div className="flex items-center gap-2">
//           <span className="text-sm text-gray-600">Filter:</span>
//           <select
//             className="px-2 py-1 border rounded-md text-sm"
//             value={planTypeFilter}
//             onChange={(e) => setPlanTypeFilter(e.target.value)}
//           >
//             {planTypes.map((t) => (
//               <option key={t} value={t}>
//                 {t}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div className="text-xs text-gray-500">
//           {loading ? (
//             "Loading plans…"
//           ) : error ? (
//             <span className="text-red-600">{error}</span>
//           ) : (
//             `${plans.length} plan(s)`
//           )}
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
//             onClick={async () => {
//               try {
//                 const view = viewRef.current as __esri.MapView;
//                 const layer = layerRef.current as __esri.GeoJSONLayer;
//                 await layer.when();
//                 const ext = layer.fullExtent;
//                 if (ext) await view.goTo(ext);
//               } catch {}
//             }}
//           >
//             Reset view
//           </button>
//         </div>
//       </div>

//       <div
//         ref={divRef}
//         className="w-full h-[70vh] rounded-xl shadow border border-gray-200"
//       />
//     </div>
//   );
// }

// // // =============================================
// // // File: app/(surfboard)/SurfMapViewer.tsx
// // // =============================================
// // "use client";
// // import React, { useEffect, useRef } from "react";
// // // import {
// // //   normalizePolygon,
// // //   // featureFromPlan,
// // //   toFeatureCollection,
// // // } from "@/app/lib/geojson";
// // import { getAllSurfPlans } from "../../../actions/surfboardActions";
// // import { featureFromPlan, toFeatureCollection } from "../../../utils/geojson";

// // export default function SurfMapViewer() {
// //   const divRef = useRef<HTMLDivElement | null>(null);

// //   useEffect(() => {
// //     let view: any, GeoJSONLayer: any, Map: any, MapView: any;
// //     let layer: any;
// //     let cancelled = false;
// //     (async () => {
// //       const plans = await getAllSurfPlans();
// //       const features = plans.data?.map((p: any) =>
// //         featureFromPlan({
// //           id: p.id,
// //           planNumber: p.planNumber,
// //           geometry: p.geometry,
// //           properties: { planType: p.planType },
// //         })
// //       );
// //       const fc = toFeatureCollection(features || []);
// //       const [m, mv, gj] = await Promise.all([
// //         import("@arcgis/core/Map"),
// //         import("@arcgis/core/views/MapView"),
// //         import("@arcgis/core/layers/GeoJSONLayer"),
// //       ]);
// //       if (cancelled) return;
// //       Map = m.default;
// //       MapView = mv.default;
// //       GeoJSONLayer = gj.default;

// //       const blob = new Blob([JSON.stringify(fc)], { type: "application/json" });
// //       const url = URL.createObjectURL(blob);

// //       const map = new Map({ basemap: "gray-vector" });
// //       view = new MapView({
// //         container: divRef.current as HTMLDivElement,
// //         map,
// //         zoom: 10,
// //         center: [3.39, 6.52],
// //       });

// //       layer = new GeoJSONLayer({
// //         url,
// //         renderer: {
// //           type: "simple",
// //           symbol: { type: "simple-fill", outline: { width: 1 } },
// //         } as any,
// //       });
// //       map.add(layer);
// //       try {
// //         await view.when();
// //         await view.goTo(layer.fullExtent);
// //       } catch {}
// //     })();
// //     return () => {
// //       cancelled = true;
// //     };
// //   }, []);

// //   return <div ref={divRef} className="w-full h-[600px]" />;
// // }

// // // "use client";
// // // import { useEffect, useState } from "react";
// // // import ArcGISMap from "@/app/(projects)/(surfboard)/surfboard/dashboard/newplan/ArcGISMap";
// // // import { getAllSurfPlans } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
// // // import { Plan } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
// // // import { Loader2 } from "lucide-react";
// // // import {
// // //   GeoJSONPolygon,
// // //   PillarData,
// // // } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

// // // const SurfMapViewer = () => {
// // //   const [plans, setPlans] = useState<Plan[]>([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [error, setError] = useState<string | null>(null);

// // //   useEffect(() => {
// // //     const fetchPlans = async () => {
// // //       try {
// // //         setLoading(true);
// // //         const result = await getAllSurfPlans();
// // //         if (result.success && result.data) {
// // //           // Filter out plans without geometry data
// // //           const validPlans = result.data.filter(
// // //             (plan) =>
// // //               plan.geometry &&
// // //               (
// // //                 plan.geometry as
// // //                   | GeoJSONPolygon
// // //                   | { type: "Polygon"; coordinates: [[number, number][]] }
// // //               ).coordinates &&
// // //               (
// // //                 plan.geometry as
// // //                   | GeoJSONPolygon
// // //                   | { type: "Polygon"; coordinates: [[number, number][]] }
// // //               ).coordinates.length > 0
// // //           );
// // //           setPlans(validPlans);
// // //         } else {
// // //           setError(result.error || "Failed to load plans");
// // //         }
// // //       } catch (err) {
// // //         console.error("Error fetching plans:", err);
// // //         setError("An unexpected error occurred while loading plans");
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     };

// // //     fetchPlans();
// // //   }, []);

// // //   // Combine all pillars from all plans for the map
// // //   const allPillars = plans.flatMap((plan) =>
// // //     Array.isArray(plan.pillars as PillarData[])
// // //       ? (plan.pillars as PillarData[])
// // //       : []
// // //   ) as PillarData[];

// // //   if (loading) {
// // //     return (
// // //       <div className="flex items-center justify-center h-64">
// // //         <div className="flex flex-col items-center">
// // //           <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
// // //           <p className="text-gray-600">Loading surfboard plans...</p>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   if (error) {
// // //     return (
// // //       <div className="bg-red-50 border-l-4 border-red-400 p-4">
// // //         <div className="flex">
// // //           <div className="flex-shrink-0">
// // //             <svg
// // //               className="h-5 w-5 text-red-400"
// // //               xmlns="http://www.w3.org/2000/svg"
// // //               viewBox="0 0 20 20"
// // //               fill="currentColor"
// // //             >
// // //               <path
// // //                 fillRule="evenodd"
// // //                 d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
// // //                 clipRule="evenodd"
// // //               />
// // //             </svg>
// // //           </div>
// // //           <div className="ml-3">
// // //             <p className="text-sm text-red-700">{error}</p>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   if (plans.length === 0) {
// // //     return (
// // //       <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
// // //         <div className="flex">
// // //           <div className="flex-shrink-0">
// // //             <svg
// // //               className="h-5 w-5 text-blue-400"
// // //               xmlns="http://www.w3.org/2000/svg"
// // //               viewBox="0 0 20 20"
// // //               fill="currentColor"
// // //             >
// // //               <path
// // //                 fillRule="evenodd"
// // //                 d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
// // //                 clipRule="evenodd"
// // //               />
// // //             </svg>
// // //           </div>
// // //           <div className="ml-3">
// // //             <p className="text-sm text-blue-700">
// // //               No surfboard plans found with valid geometry data.
// // //             </p>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <div className="flex flex-col h-full">
// // //       <header className="bg-white shadow">
// // //         <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
// // //           <h1 className="text-2xl font-semibold text-gray-900">
// // //             Surfboard Plans Map
// // //           </h1>
// // //           <p className="mt-1 text-sm text-gray-500">
// // //             Viewing {plans.length} surfboard plan{plans.length !== 1 ? "s" : ""}{" "}
// // //             on the map
// // //           </p>
// // //         </div>
// // //       </header>
// // //       <main className="flex-1">
// // //         <div className="h-[calc(100vh-180px)] w-full">
// // //           <ArcGISMap
// // //             pillars={allPillars}
// // //             planInfo={{
// // //               totalPlans: plans.length,
// // //               lastUpdated: new Date().toISOString(),
// // //             }}
// // //             initialCenter={[6.5244, 3.3792]} // Default to Lagos
// // //             zoomPadding={{
// // //               duration: 1000,
// // //               padding: 50,
// // //               zoom: 14,
// // //             }}
// // //           />
// // //         </div>
// // //       </main>
// // //     </div>
// // //   );
// // // };

// // // export default SurfMapViewer;
