// app/(projects)/(surfboard)/surfboard/dashboard/newplan/ArcGISMap.tsx
"use client";

import { useEffect, useRef } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";

import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as projection from "@arcgis/core/geometry/projection";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import LayerList from "@arcgis/core/widgets/LayerList";
import Zoom from "@arcgis/core/widgets/Zoom";
import Search from "@arcgis/core/widgets/Search";
import Home from "@arcgis/core/widgets/Home";
import Compass from "@arcgis/core/widgets/Compass";
import ScaleBar from "@arcgis/core/widgets/ScaleBar";
import Legend from "@arcgis/core/widgets/Legend";
import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Fullscreen from "@arcgis/core/widgets/Fullscreen";
import Expand from "@arcgis/core/widgets/Expand";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import esriConfig from "@arcgis/core/config";

import type { PillarData } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

export type PlanInfo = Record<string, any>;

interface ArcGISMapProps {
  pillars: PillarData[];
  planInfo: PlanInfo;
  initialCenter?: [number, number];
  zoomPadding?: {
    duration?: number;
    padding?: number;
    zoom?: number;
    tilt?: number;
  };
  onSubmit?: (data: any) => void;
  /** Optional; if omitted we skip admin lookup to avoid timeouts. */
  adminLayerUrl?: string;
}

export default function ArcGISMap({
  pillars,
  planInfo,
  initialCenter = [3.3792, 6.5244],
  zoomPadding = { duration: 1000, padding: 32, zoom: 16, tilt: 0 },
  onSubmit,
  adminLayerUrl,
}: ArcGISMapProps) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const webmapRef = useRef<WebMap | null>(null);
  const polygonLayerRef = useRef<GraphicsLayer | null>(null);
  const pillarLayerRef = useRef<GraphicsLayer | null>(null);
  const pillarLabelLayerRef = useRef<GraphicsLayer | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const coordRef = useRef<HTMLDivElement | null>(null);

  // Autofit controls
  const userInteractedRef = useRef(false);
  const drawnOnceRef = useRef(false);
  const lastGeomHashRef = useRef<string | null>(null);
  const zoomOptsRef = useRef(zoomPadding);

  // Initialize once
  useEffect(() => {
    if (!mapDiv.current) return;

    (async () => {
      try {
        const key = (process as any)?.env?.NEXT_PUBLIC_ARCGIS_API_KEY;
        if (key) esriConfig.apiKey = key;
      } catch {}
      const hasEsriKey = !!esriConfig.apiKey;

      polygonLayerRef.current = new GraphicsLayer({ title: "Survey Polygon" });
      pillarLayerRef.current = new GraphicsLayer({ title: "Survey Pillars" });
      pillarLabelLayerRef.current = new GraphicsLayer({
        title: "Pillar Labels",
      });

      let webmap: WebMap = hasEsriKey
        ? new WebMap({ portalItem: { id: "5b13e132fb1c403fb19d389b0462af4e" } })
        : new WebMap({ basemap: "osm" });

      webmap.addMany([
        polygonLayerRef.current!,
        pillarLayerRef.current!,
        pillarLabelLayerRef.current!,
      ]);
      webmapRef.current = webmap;

      const view = new MapView({
        container: mapDiv.current!,
        map: webmap,
        center: initialCenter, // [lon, lat]
        zoom: 14,
        constraints: { snapToZoom: false },
        popup: {
          dockEnabled: true,
          dockOptions: { breakpoint: false, position: "bottom-right" },
        },
        highlightOptions: {
          color: [255, 128, 0, 0.8],
          haloOpacity: 0.9,
          fillOpacity: 0.1,
        },
      });
      viewRef.current = view;

      if (hasEsriKey) {
        try {
          await webmap.load();
        } catch (err) {
          console.warn("Portal WebMap failed to load; using OSM basemap.", err);
          const fallback = new WebMap({ basemap: "osm" });
          fallback.addMany([
            polygonLayerRef.current!,
            pillarLayerRef.current!,
            pillarLabelLayerRef.current!,
          ]);
          view.map = fallback;
          webmapRef.current = fallback;
        }
      }

      await view.when();

      // Widgets (safe without API key)
      const zoom = new Zoom({ view });
      const home = new Home({ view });
      const compass = new Compass({ view });
      const scalebar = new ScaleBar({ view, unit: "metric" });
      const legend = new Legend({ view });
      const layerList = new LayerList({ view });
      const fullscreen = new Fullscreen({ view });

      view.ui.add(fullscreen, "top-left");
      view.ui.add(home, "top-left");
      view.ui.add(zoom, "top-left");
      view.ui.add(compass, "top-left");
      view.ui.add(scalebar, "bottom-left");
      const legendExpand = new Expand({
        view,
        content: legend,
        expanded: false,
        group: "right",
      });
      const layersExpand = new Expand({
        view,
        content: layerList,
        expanded: false,
        group: "right",
      });
      view.ui.add(legendExpand, "bottom-right");
      view.ui.add(layersExpand, "bottom-right");

      // Premium widgets only with key
      if (hasEsriKey) {
        try {
          const search = new Search({ view });
          const toggle = new BasemapToggle({ view, nextBasemap: "satellite" });
          const gallery = new BasemapGallery({ view });
          const galleryExpand = new Expand({
            view,
            content: gallery,
            expanded: false,
            group: "right",
          });
          view.ui.add(toggle, "top-right");
          view.ui.add(search, "top-right");
          view.ui.add(galleryExpand, "bottom-right");
        } catch (e) {
          console.warn("Premium widgets unavailable:", e);
        }
      }

      // Tooltip and coordinate readout (DOM-only)
      const tooltip = document.createElement("div");
      tooltip.className =
        "pointer-events-none absolute z-[1000] bg-white/90 text-gray-800 text-xs px-2 py-1 rounded shadow border border-gray-200";
      tooltip.style.display = "none";
      tooltipRef.current = tooltip;
      mapDiv.current!.appendChild(tooltip);

      const coord = document.createElement("div");
      coord.className =
        "absolute right-3 bottom-3 z-[1000] bg-white/90 text-gray-700 text-xs px-2 py-1 rounded shadow border border-gray-200";
      coordRef.current = coord;
      mapDiv.current!.appendChild(coord);

      // Render order
      view.when(() => view.map?.reorder(polygonLayerRef.current!, 2));
      view.when(() => view.map?.reorder(pillarLayerRef.current!, 3));
      view.when(() => view.map?.reorder(pillarLabelLayerRef.current!, 4));

      // Stop future auto-fit after any user navigation
      const stopAuto = () => (userInteractedRef.current = true);
      const h1 = view.on("drag", stopAuto);
      const h2 = view.on("mouse-wheel", stopAuto);
      const h3 = view.on("double-click", stopAuto);
      const h4 = view.on("key-down", stopAuto);
      const h5 = view.on("pointer-down", stopAuto);

      // Pointer move: coords + pillar tooltip
      const pointerHandle = view.on("pointer-move", async (event) => {
        const mapPoint = view.toMap(event);

        if (mapPoint && coordRef.current) {
          let lat: number | null = null;
          let lon: number | null = null;

          const mpAny = mapPoint as any;
          if (mpAny.latitude != null && mpAny.longitude != null) {
            lat = mpAny.latitude as number;
            lon = mpAny.longitude as number;
          } else if (mapPoint.spatialReference?.isWebMercator) {
            const g = webMercatorUtils.webMercatorToGeographic(
              mapPoint
            ) as Point | null;
            lat = g?.y ?? null;
            lon = g?.x ?? null;
          } else if (mapPoint.spatialReference?.wkid !== 4326) {
            try {
              await projection.load();
              const g = projection.project(
                mapPoint,
                new SpatialReference({ wkid: 4326 })
              ) as Point | null;
              lat = g?.y ?? null;
              lon = g?.x ?? null;
            } catch {
              lat = null;
              lon = null;
            }
          } else {
            lat = (mapPoint as Point).y;
            lon = (mapPoint as Point).x;
          }

          if (lat != null && lon != null) {
            coordRef.current.innerHTML = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          }
        }

        const hit = await view.hitTest(event);
        const graphicHit: any = hit.results.find(
          (r: any) =>
            "graphic" in r && r.graphic?.layer === pillarLayerRef.current
        );
        const hitGfx = graphicHit?.graphic;
        if (hitGfx && tooltipRef.current) {
          tooltipRef.current.style.left = `${event.x + 12}px`;
          tooltipRef.current.style.top = `${event.y + 12}px`;
          tooltipRef.current.textContent = `Pillar ${
            hitGfx.attributes?.pillarNumber ?? "?"
          }`;
          tooltipRef.current.style.display = "block";
        } else if (tooltipRef.current) {
          tooltipRef.current.style.display = "none";
        }
      });

      return () => {
        h1.remove();
        h2.remove();
        h3.remove();
        h4.remove();
        h5.remove();
        pointerHandle.remove();
        tooltipRef.current && tooltipRef.current.remove();
        coordRef.current && coordRef.current.remove();
        view.destroy();
        webmapRef.current?.destroy?.();
        viewRef.current = null;
        webmapRef.current = null;
        polygonLayerRef.current = null;
        pillarLayerRef.current = null;
        pillarLabelLayerRef.current = null;
      };
    })();
  }, []);

  // Keep zoom options in a ref to avoid effect thrash
  useEffect(() => {
    zoomOptsRef.current = zoomPadding;
  }, [
    zoomPadding?.duration,
    zoomPadding?.padding,
    zoomPadding?.zoom,
    zoomPadding?.tilt,
  ]);

  // Draw or update graphics when pillars/planInfo change
  useEffect(() => {
    const view = viewRef.current;
    const polygonLayer = polygonLayerRef.current;
    const pillarLayer = pillarLayerRef.current;
    const pillarLabelLayer = pillarLabelLayerRef.current;
    if (!view || !polygonLayer || !pillarLayer || !pillarLabelLayer) return;

    if (!pillars?.length) {
      polygonLayer.removeAll();
      pillarLayer.removeAll();
      pillarLabelLayer.removeAll();
      return;
    }

    (async () => {
      await projection.load();

      // Project survey pillars from 26331 -> 4326
      const projected = pillars.map((pt) => {
        const original = new Point({
          x: pt.easting,
          y: pt.northing,
          spatialReference: new SpatialReference({ wkid: 26331 }),
        });
        const p = projection.project(
          original,
          new SpatialReference({ wkid: 4326 })
        ) as Point;
        return { x: p.x, y: p.y, pillarNumber: pt.pillarNumber };
      });

      // Hash geometry to detect real changes
      const geomHash = pillars
        .map((p) => `${p.easting},${p.northing}`)
        .join("|");
      const geomChanged = geomHash !== lastGeomHashRef.current;
      if (geomChanged) lastGeomHashRef.current = geomHash;

      // Build closed ring
      const ring: [number, number][] = projected.map((p) => [p.x, p.y]);
      if (
        ring.length &&
        (ring[0][0] !== ring[ring.length - 1][0] ||
          ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push(ring[0]);
      }

      const polygon = new Polygon({
        rings: [ring],
        spatialReference: { wkid: 4326 },
      });

      // Area (ha) using geodesic
      let areaHa: number | null = null;
      try {
        const area = geometryEngine.geodesicArea(polygon, "square-meters");
        areaHa = area && isFinite(area) ? Math.abs(area) / 10000 : null;
      } catch {
        areaHa = null;
      }

      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: {
          type: "simple-fill",
          color: [59, 130, 246, 0.15],
          outline: { color: [59, 130, 246, 1], width: 2 },
        },
        attributes: { areaHa },
        popupTemplate: {
          title: "Survey Polygon",
          content: [
            {
              type: "text",
              text: areaHa
                ? `Area: ${areaHa.toFixed(2)} ha`
                : "Area not available",
            },
          ],
        },
      });

      // Render graphics
      polygonLayer.removeAll();
      polygonLayer.add(polygonGraphic);
      pillarLayer.removeAll();
      pillarLabelLayer.removeAll();

      projected.forEach((p) => {
        const point = new Point({
          x: p.x,
          y: p.y,
          spatialReference: { wkid: 4326 },
        });
        const g = new Graphic({
          geometry: point,
          symbol: {
            type: "simple-marker",
            size: 8,
            color: [255, 255, 255, 0.95],
            outline: { color: [239, 68, 68, 1], width: 2 },
          },
          attributes: { pillarNumber: p.pillarNumber },
          popupTemplate: {
            title: `Pillar ${p.pillarNumber}`,
            content: "{pillarNumber}",
          },
        });
        pillarLayer.add(g);

        const label = new Graphic({
          geometry: point,
          symbol: {
            type: "text",
            color: "#111827",
            haloColor: "#ffffff",
            haloSize: 1,
            font: { size: 10, weight: "bold" },
            text: String(p.pillarNumber),
            horizontalAlignment: "center",
            verticalAlignment: "bottom",
            yoffset: 8,
          } as any,
        });
        pillarLabelLayer.add(label);
      });

      // Auto-fit only once or when geometry truly changes AND only if user hasn't interacted yet
      if (
        !userInteractedRef.current &&
        (!drawnOnceRef.current || geomChanged)
      ) {
        const z = zoomOptsRef.current;
        try {
          await view.goTo(
            { target: polygonGraphic.geometry, tilt: z?.tilt, zoom: z?.zoom },
            { duration: z?.duration, easing: "ease-in-out" as any }
          );
        } catch {}
        drawnOnceRef.current = true;
      }

      // Optional admin lookup
      if (adminLayerUrl) {
        try {
          const adminLayer = new FeatureLayer({
            url: adminLayerUrl,
            outFields: ["*"],
          });
          const query = adminLayer.createQuery();
          query.geometry = polygon;
          query.spatialRelationship = "intersects";
          query.returnGeometry = false;
          query.outFields = ["WARD", "LCDA", "LGA"];
          const result = await adminLayer.queryFeatures(query);
          const attrs = result.features[0]?.attributes || {};
          const attributes = {
            ...planInfo,
            ward: attrs.WARD || "N/A",
            lcda: attrs.LCDA || "N/A",
            lga: attrs.LGA || "N/A",
          };
          polygonGraphic.attributes = {
            ...polygonGraphic.attributes,
            ...attributes,
          };
          onSubmit?.({
            geometry: polygonGraphic.geometry?.toJSON() || "",
            attributes,
            pillars,
          });
        } catch {
          onSubmit?.({
            geometry: polygonGraphic.geometry?.toJSON() || "",
            attributes: planInfo,
            pillars,
          });
        }
      } else {
        onSubmit?.({
          geometry: polygonGraphic.geometry?.toJSON() || "",
          attributes: planInfo,
          pillars,
        });
      }
    })();
  }, [pillars, planInfo, onSubmit, adminLayerUrl]);

  if (!pillars?.length) {
    return (
      <div className="h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M13 5v6m8 8H3"
            />
          </svg>
        </div>
        <p>No survey data uploaded</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-full max-h-full">
      <div
        ref={mapDiv}
        className="w-full h-[70vh] max-h-[1200px] rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      />
    </div>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import "@arcgis/core/assets/esri/themes/light/main.css";

// import WebMap from "@arcgis/core/WebMap";
// import MapView from "@arcgis/core/views/MapView";
// import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
// import Graphic from "@arcgis/core/Graphic";
// import Point from "@arcgis/core/geometry/Point";
// import Polygon from "@arcgis/core/geometry/Polygon";
// import SpatialReference from "@arcgis/core/geometry/SpatialReference";
// import * as projection from "@arcgis/core/geometry/projection";
// import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
// import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

// import LayerList from "@arcgis/core/widgets/LayerList";
// import Zoom from "@arcgis/core/widgets/Zoom";
// import Search from "@arcgis/core/widgets/Search";
// import Home from "@arcgis/core/widgets/Home";
// import Compass from "@arcgis/core/widgets/Compass";
// import ScaleBar from "@arcgis/core/widgets/ScaleBar";
// import Legend from "@arcgis/core/widgets/Legend";
// import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
// import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
// import Fullscreen from "@arcgis/core/widgets/Fullscreen";
// import Expand from "@arcgis/core/widgets/Expand";
// import esriConfig from "@arcgis/core/config";
// import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";

// import type { PillarData } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

// export type PlanInfo = Record<string, any>;

// interface ArcGISMapProps {
//   pillars: PillarData[];
//   planInfo: PlanInfo;
//   initialCenter?: [number, number];
//   zoomPadding?: {
//     duration?: number;
//     padding?: number;
//     zoom?: number;
//     tilt?: number;
//   };
//   onSubmit?: (data: any) => void;
// }

// export default function ArcGISMap({
//   pillars,
//   planInfo,
//   initialCenter = [6.5244, 3.3792],
//   zoomPadding = { duration: 1000, padding: 32, zoom: 16, tilt: 0 },
//   onSubmit,
// }: ArcGISMapProps) {
//   const mapDiv = useRef<HTMLDivElement>(null);
//   const viewRef = useRef<MapView | null>(null);
//   const webmapRef = useRef<WebMap | null>(null);
//   const polygonLayerRef = useRef<GraphicsLayer | null>(null);
//   const pillarLayerRef = useRef<GraphicsLayer | null>(null);
//   const pillarLabelLayerRef = useRef<GraphicsLayer | null>(null);
//   const tooltipRef = useRef<HTMLDivElement | null>(null);
//   const coordRef = useRef<HTMLDivElement | null>(null);

//   const [ready, setReady] = useState(false);

//   // Initialize once
//   useEffect(() => {
//     if (!mapDiv.current) return;

//     (async () => {
//       // Optional API key; prevents basemap/portal failures if provided
//       try {
//         const key = (process as any)?.env?.NEXT_PUBLIC_ARCGIS_API_KEY;
//         if (key) esriConfig.apiKey = key;
//       } catch {
//         /* no-op in browser */
//       }

//       polygonLayerRef.current = new GraphicsLayer({ title: "Survey Polygon" });
//       pillarLayerRef.current = new GraphicsLayer({ title: "Survey Pillars" });
//       pillarLabelLayerRef.current = new GraphicsLayer({
//         title: "Pillar Labels",
//       });

//       let webmap: WebMap = new WebMap({
//         portalItem: { id: "5b13e132fb1c403fb19d389b0462af4e" },
//       });
//       webmap.addMany([
//         polygonLayerRef.current!,
//         pillarLayerRef.current!,
//         pillarLabelLayerRef.current!,
//       ]);
//       webmapRef.current = webmap;

//       const view = new MapView({
//         container: mapDiv.current!,
//         map: webmap,
//         center: initialCenter, // [lon, lat]
//         zoom: 14,
//         constraints: { snapToZoom: false },
//         popup: {
//           dockEnabled: true,
//           dockOptions: { breakpoint: false, position: "bottom-right" },
//         },
//         highlightOptions: {
//           color: [255, 128, 0, 0.8],
//           haloOpacity: 0.9,
//           fillOpacity: 0.1,
//         },
//       });
//       viewRef.current = view;

//       // Try loading the portal webmap; if it fails, fallback to an open basemap
//       try {
//         await webmap.load();
//       } catch (err) {
//         console.warn("Portal WebMap failed to load; using OSM basemap.", err);
//         const fallback = new WebMap({ basemap: "osm" });
//         fallback.addMany([
//           polygonLayerRef.current!,
//           pillarLayerRef.current!,
//           pillarLabelLayerRef.current!,
//         ]);
//         view.map = fallback;
//         webmapRef.current = fallback;
//       }

//       await view.when();

//       // Widgets
//       const zoom = new Zoom({ view });
//       const search = new Search({ view });
//       const home = new Home({ view });
//       const compass = new Compass({ view });
//       const scalebar = new ScaleBar({ view, unit: "metric" });
//       const legend = new Legend({ view });
//       const layerList = new LayerList({ view });
//       const toggle = new BasemapToggle({ view, nextBasemap: "satellite" });
//       const gallery = new BasemapGallery({ view });
//       const fullscreen = new Fullscreen({ view });

//       const legendExpand = new Expand({
//         view,
//         content: legend,
//         expanded: false,
//         group: "right",
//       });
//       const layersExpand = new Expand({
//         view,
//         content: layerList,
//         expanded: false,
//         group: "right",
//       });
//       const galleryExpand = new Expand({
//         view,
//         content: gallery,
//         expanded: false,
//         group: "right",
//       });

//       view.ui.add(fullscreen, "top-left");
//       view.ui.add(home, "top-left");
//       view.ui.add(zoom, "top-left");
//       view.ui.add(compass, "top-left");
//       view.ui.add(toggle, "top-right");
//       view.ui.add(search, "top-right");
//       view.ui.add(scalebar, "bottom-left");
//       view.ui.add([legendExpand, layersExpand, galleryExpand], "bottom-right");

//       // Simple HTML tooltip for pillar hover
//       const tooltip = document.createElement("div");
//       tooltip.className =
//         "pointer-events-none absolute z-[1000] bg-white/90 text-gray-800 text-xs px-2 py-1 rounded shadow border border-gray-200";
//       tooltip.style.display = "none";
//       tooltipRef.current = tooltip;
//       mapDiv.current!.appendChild(tooltip);

//       // Bottom-right coordinate readout
//       const coord = document.createElement("div");
//       coord.className =
//         "absolute right-3 bottom-3 z-[1000] bg-white/90 text-gray-700 text-xs px-2 py-1 rounded shadow border border-gray-200";
//       coordRef.current = coord;
//       mapDiv.current!.appendChild(coord);

//       // Render order
//       view.when(
//         () =>
//           webmapRef.current && view.map?.reorder(polygonLayerRef.current!, 2)
//       );
//       view.when(
//         () => webmapRef.current && view.map?.reorder(pillarLayerRef.current!, 3)
//       );
//       view.when(
//         () =>
//           webmapRef.current &&
//           view.map?.reorder(pillarLabelLayerRef.current!, 4)
//       );

//       // Pointer move for tooltip + coords
//       const pointerHandle = view.on("pointer-move", async (event) => {
//         const mapPoint = view.toMap(event);

//         if (mapPoint && coordRef.current) {
//           let lat: number | null = null;
//           let lon: number | null = null;

//           const mpAny = mapPoint as any;
//           if (mpAny.latitude != null && mpAny.longitude != null) {
//             lat = mpAny.latitude as number;
//             lon = mpAny.longitude as number;
//           } else if (mapPoint.spatialReference?.isWebMercator) {
//             const g = webMercatorUtils.webMercatorToGeographic(
//               mapPoint
//             ) as Point | null;
//             lat = g?.y ?? null;
//             lon = g?.x ?? null;
//           } else if (mapPoint.spatialReference?.wkid !== 4326) {
//             try {
//               await projection.load();
//               const g = projection.project(
//                 mapPoint,
//                 new SpatialReference({ wkid: 4326 })
//               ) as Point | null;
//               lat = g?.y ?? null;
//               lon = g?.x ?? null;
//             } catch {
//               lat = null;
//               lon = null;
//             }
//           } else {
//             lat = (mapPoint as Point).y;
//             lon = (mapPoint as Point).x;
//           }

//           if (lat != null && lon != null) {
//             coordRef.current.innerHTML = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
//           }
//         }

//         const hit = await view.hitTest(event);
//         const graphicHit: any = hit.results.find(
//           (r: any) =>
//             "graphic" in r && r.graphic?.layer === pillarLayerRef.current
//         );
//         const hitGfx = graphicHit?.graphic;
//         if (hitGfx && tooltipRef.current) {
//           tooltipRef.current.style.left = `${event.x + 12}px`;
//           tooltipRef.current.style.top = `${event.y + 12}px`;
//           tooltipRef.current.textContent = `Pillar ${
//             hitGfx.attributes?.pillarNumber ?? "?"
//           }`;
//           tooltipRef.current.style.display = "block";
//         } else if (tooltipRef.current) {
//           tooltipRef.current.style.display = "none";
//         }
//       });

//       setReady(true);

//       return () => {
//         pointerHandle.remove();
//         tooltipRef.current && tooltipRef.current.remove();
//         coordRef.current && coordRef.current.remove();
//         view.destroy();
//         webmapRef.current?.destroy?.();
//         viewRef.current = null;
//         webmapRef.current = null;
//         polygonLayerRef.current = null;
//         pillarLayerRef.current = null;
//         pillarLabelLayerRef.current = null;
//       };
//     })();
//   }, []);

//   // Whenever pillars or planInfo change, (re)draw graphics and run queries
//   useEffect(() => {
//     const view = viewRef.current;
//     const polygonLayer = polygonLayerRef.current;
//     const pillarLayer = pillarLayerRef.current;
//     const pillarLabelLayer = pillarLabelLayerRef.current;
//     if (!ready || !view || !polygonLayer || !pillarLayer || !pillarLabelLayer)
//       return;

//     if (!pillars?.length) {
//       polygonLayer.removeAll();
//       pillarLayer.removeAll();
//       return;
//     }

//     (async () => {
//       await projection.load();

//       // Project survey pillars from 26331 -> 4326
//       const projected = pillars.map((pt) => {
//         const original = new Point({
//           x: pt.easting,
//           y: pt.northing,
//           spatialReference: new SpatialReference({ wkid: 26331 }),
//         });
//         const p = projection.project(
//           original,
//           new SpatialReference({ wkid: 4326 })
//         ) as Point;
//         return { x: p.x, y: p.y, pillarNumber: pt.pillarNumber };
//       });

//       // Build closed ring
//       const ring: [number, number][] = projected.map((p) => [p.x, p.y]);
//       if (
//         ring.length &&
//         (ring[0][0] !== ring[ring.length - 1][0] ||
//           ring[0][1] !== ring[ring.length - 1][1])
//       ) {
//         ring.push(ring[0]);
//       }

//       const polygon = new Polygon({
//         rings: [ring],
//         spatialReference: { wkid: 4326 },
//       });

//       // Area for overlay (hectares). Geodesic for accuracy.
//       let areaHa: number | null = null;
//       try {
//         const area = geometryEngine.geodesicArea(polygon, "square-meters");
//         areaHa = area && isFinite(area) ? Math.abs(area) / 10000 : null;
//       } catch {
//         areaHa = null;
//       }

//       const polygonGraphic = new Graphic({
//         geometry: polygon,
//         symbol: {
//           type: "simple-fill",
//           color: [59, 130, 246, 0.15],
//           outline: { color: [59, 130, 246, 1], width: 2 },
//         },
//         attributes: { areaHa },
//         popupTemplate: {
//           title: "Survey Polygon",
//           content: [
//             {
//               type: "text",
//               text: areaHa
//                 ? `Area: ${areaHa.toFixed(2)} ha`
//                 : "Area not available",
//             },
//           ],
//         },
//       });

//       // Render graphics
//       polygonLayer.removeAll();
//       polygonLayer.add(polygonGraphic);
//       pillarLayer.removeAll();
//       pillarLabelLayer.removeAll();
//       projected.forEach((p) => {
//         const point = new Point({
//           x: p.x,
//           y: p.y,
//           spatialReference: { wkid: 4326 },
//         });
//         const g = new Graphic({
//           geometry: point,
//           symbol: {
//             type: "simple-marker",
//             size: 8,
//             color: [255, 255, 255, 0.95],
//             outline: { color: [239, 68, 68, 1], width: 2 },
//           },
//           attributes: { pillarNumber: p.pillarNumber },
//           popupTemplate: {
//             title: `Pillar ${p.pillarNumber}`,
//             content: "{pillarNumber}",
//           },
//         });
//         pillarLayer.add(g);

//         // Labels layer uses text graphics (GraphicsLayer doesn't support labelingInfo)
//         const label = new Graphic({
//           geometry: point,
//           symbol: {
//             type: "text",
//             color: "#111827",
//             haloColor: "#ffffff",
//             haloSize: 1,
//             font: { size: 10, weight: "bold" },
//             text: String(p.pillarNumber),
//             horizontalAlignment: "center",
//             verticalAlignment: "bottom",
//             yoffset: 8,
//           } as any,
//         });
//         pillarLabelLayer.add(label);
//       });

//       // Animate to polygon
//       try {
//         await view.goTo(
//           {
//             target: polygonGraphic.geometry,
//             tilt: zoomPadding.tilt,
//             zoom: zoomPadding.zoom,
//           },
//           { duration: zoomPadding.duration, easing: "ease-in-out" as any }
//         );
//       } catch {
//         /* view was interrupted */
//       }

//       // Query administrative boundaries (same service as before)
//       try {
//         const adminLayer = new FeatureLayer({
//           url: "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/2",
//           outFields: ["WARD", "LCDA", "LGA"],
//         });
//         const query = adminLayer.createQuery();
//         query.geometry = polygon;
//         query.spatialRelationship = "intersects";
//         query.returnGeometry = false;
//         const result = await adminLayer.queryFeatures(query);
//         const attrs = result.features[0]?.attributes || {};
//         const attributes = {
//           ...planInfo,
//           ward: attrs.WARD || "N/A",
//           lcda: attrs.LCDA || "N/A",
//           lga: attrs.LGA || "N/A",
//         };
//         polygonGraphic.attributes = {
//           ...polygonGraphic.attributes,
//           ...attributes,
//         };

//         onSubmit?.({
//           geometry: polygonGraphic.geometry?.toJSON() || "",
//           attributes,
//           pillars,
//         });
//       } catch (e) {
//         console.warn("Admin query failed", e);
//         onSubmit?.({
//           geometry: polygonGraphic.geometry?.toJSON() || "",
//           attributes: planInfo,
//           pillars,
//         });
//       }
//     })();
//   }, [pillars, zoomPadding, ready, onSubmit]);

//   if (!pillars?.length) {
//     return (
//       <div className="h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
//         <div className="text-gray-400 mb-4">
//           <svg
//             className="mx-auto h-12 w-12"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M3 12l2-2m0 0l7-7 7 7M13 5v6m8 8H3"
//             />
//           </svg>
//         </div>
//         <p>No survey data uploaded</p>
//       </div>
//     );
//   }

//   return (
//     <div className="relative max-w-full max-h-full">
//       <div
//         ref={mapDiv}
//         className="w-full h-[70vh] max-h-[1200px] rounded-xl shadow-lg border border-gray-200 overflow-hidden"
//       />
//     </div>
//   );
// }

// //
// //
// //
// //
// //
// //

// import { useEffect, useRef, useState } from "react";
// // Import ArcGIS core CSS for widgets and themes
// import "@arcgis/core/assets/esri/themes/light/main.css";

// import WebMap from "@arcgis/core/WebMap";
// import MapView from "@arcgis/core/views/MapView";
// import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
// import Graphic from "@arcgis/core/Graphic";
// import Point from "@arcgis/core/geometry/Point";
// import Polygon from "@arcgis/core/geometry/Polygon";
// import SpatialReference from "@arcgis/core/geometry/SpatialReference";
// import * as projection from "@arcgis/core/geometry/projection";
// import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
// import LayerList from "@arcgis/core/widgets/LayerList";
// import Zoom from "@arcgis/core/widgets/Zoom";
// // for 2D MapView
// // ← note the .js
// // (or, for both 2D & 3D…) import type { GoToOptions } from "@arcgis/core/views/View";

// // Use the shared PillarData type from actions
// import type { PillarData } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

// /**
//  * Arbitrary metadata for the plan
//  */
// export type PlanInfo = Record<string, any>;

// interface ArcGISMapProps {
//   pillars: PillarData[];
//   planInfo: PlanInfo;
//   initialCenter?: [number, number];
//   zoomPadding?: {
//     duration?: number;
//     padding?: number;
//     zoom?: number;
//     tilt?: number;
//   };
//   onSubmit?: (data: any) => void;
// }

// export default function ArcGISMap({
//   pillars,
//   planInfo,
//   initialCenter = [6.5244, 3.3792], // default to Lagos
//   zoomPadding = { duration: 1000 }, // default animation duration in milliseconds
//   onSubmit,
// }: ArcGISMapProps) {
//   const mapDiv = useRef<HTMLDivElement>(null);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   useEffect(() => {
//     if (!mapDiv.current || pillars.length === 0) return;

//     const graphicsLayer = new GraphicsLayer({ title: "Uploaded Survey" });
//     const pointLayer = new GraphicsLayer({ title: "Uploaded Survey Pillars" });

//     let webmap;
//     try {
//       webmap = new WebMap({
//         portalItem: { id: "5b13e132fb1c403fb19d389b0462af4e" },
//       });
//     } catch (error) {
//       console.error("Error loading WebMap:", error);
//       webmap = new WebMap({
//         basemap: "topo-vector", // Using a default basemap instead of portal item
//       });
//     }

//     webmap.addMany([graphicsLayer, pointLayer]);

//     const view = new MapView({
//       container: mapDiv.current,
//       map: webmap,
//       center: initialCenter,
//       zoom: 14,
//     });

//     // LayerList widget
//     const layerList = new LayerList({ view });
//     view.ui.add(layerList, "bottom-left");

//     // Zoom widget
//     const zoomWidget = new Zoom({ view });
//     view.ui.add(zoomWidget, "top-left");

//     // Ensure correct draw order
//     view.when(() => webmap.reorder(graphicsLayer, 2));
//     view.when(() => webmap.reorder(pointLayer, 3));

//     const loadGraphics = async () => {
//       await projection.load();

//       // Project each Survey pillar to WGS84
//       const projectedPoints = pillars.map((pt) => {
//         const original = new Point({
//           x: pt.easting,
//           y: pt.northing,
//           spatialReference: new SpatialReference({ wkid: 26331 }),
//         });
//         const projected = projection.project(
//           original,
//           new SpatialReference({ wkid: 4326 })
//         ) as Point;
//         return {
//           x: projected.x,
//           y: projected.y,
//           pillarNumber: pt.pillarNumber,
//         };
//       });

//       // Construct polygon ring
//       const ring = projectedPoints.map((p) => [p.x, p.y]);
//       if (
//         ring.length &&
//         (ring[0][0] !== ring[ring.length - 1][0] ||
//           ring[0][1] !== ring[ring.length - 1][1])
//       ) {
//         ring.push(ring[0]);
//       }

//       const polygon = new Polygon({
//         rings: [ring],
//         spatialReference: { wkid: 4326 },
//       });
//       const polygonGraphic = new Graphic({
//         geometry: polygon,
//         symbol: {
//           type: "simple-fill",
//           color: [0, 0, 255, 0.2],
//           outline: { color: "red", width: 2 },
//         },
//       });

//       // Render
//       graphicsLayer.removeAll();
//       graphicsLayer.add(polygonGraphic);
//       pointLayer.removeAll();
//       projectedPoints.forEach((p) => {
//         pointLayer.add(
//           new Graphic({
//             geometry: new Point({
//               x: p.x,
//               y: p.y,
//               spatialReference: { wkid: 4326 },
//             }),
//             symbol: {
//               type: "simple-marker",
//               color: [0, 102, 255],
//               outline: { color: [255, 0, 0], width: 2 },
//             },
//             attributes: { pillarNumber: p.pillarNumber },
//             popupTemplate: {
//               title: "Pillar",
//               content: "Number: {pillarNumber}",
//             },
//           })
//         );
//       });

//       // Zoom / pan to polygon
//       view.when(() => view.goTo(polygonGraphic));
//       // view.goTo({
//       //   target: polygonGraphic.geometry,
//       //   zoom: zoomPadding?.zoom || 15,
//       //   duration: zoomPadding?.duration || 1000,
//       //   tilt: zoomPadding?.tilt || 0
//       // });

//       // Query administrative boundaries
//       const adminLayer = new FeatureLayer({
//         url: "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/2",
//         outFields: ["WARD", "LCDA", "LGA"],
//       });
//       const query = adminLayer.createQuery();
//       query.geometry = polygon;
//       query.spatialRelationship = "intersects";
//       query.returnGeometry = false;
//       const result = await adminLayer.queryFeatures(query);

//       const attrs = result.features[0]?.attributes || {};
//       const attributes = {
//         ...planInfo,
//         WARD: attrs.WARD || "N/A",
//         LCDA: attrs.LCDA || "N/A",
//         LGA: attrs.LGA || "N/A",
//       };

//       polygonGraphic.attributes = {
//         WARD: attrs.WARD,
//         LCDA: attrs.LCDA,
//         LGA: attrs.LGA,
//       };

//       if (onSubmit) {
//         onSubmit?.({
//           geometry: polygonGraphic?.geometry?.toJSON() || "",
//           attributes,
//           pillars,
//         });
//       }
//     };

//     loadGraphics();
//   }, [pillars, planInfo, initialCenter, zoomPadding, onSubmit]);

//   if (!pillars.length) {
//     return (
//       <div className="h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
//         <div className="text-gray-400 mb-4">
//           <svg
//             className="mx-auto h-12 w-12"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M12 ..."
//             />
//           </svg>
//         </div>
//         <p>No survey data uploaded</p>
//       </div>
//     );
//   }

//   return (
//     <div className="relative max-w-full max-h-full">
//       <button
//         onClick={() => setIsFullscreen(!isFullscreen)}
//         className={`${
//           isFullscreen ? "fixed" : "absolute"
//         } top-4 right-4 z-[1000] p-2 bg-white/90 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center w-10 h-10`}
//         title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
//       >
//         {isFullscreen ? (
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="h-5 w-5 text-gray-700"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M6 18L18 6M6 6l12 12"
//             />
//           </svg>
//         ) : (
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="h-5 w-5 text-gray-700"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
//             />
//           </svg>
//         )}
//       </button>
//       <div
//         ref={mapDiv}
//         className={
//           isFullscreen
//             ? "fixed inset-0 z-[999]"
//             : "w-full h-[70vh] max-h-[1200px] rounded-xl shadow-lg border-8 border-blue-500 overflow-hidden max-w-full"
//         }
//       />
//     </div>
//   );
// }
