"use client";
import React, { useEffect, useRef } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";

import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import Basemap from "@arcgis/core/Basemap";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { getAllSurfPlans } from "../actions/surfboardActions";
import { featureFromPlan, toFeatureCollection } from "../utils/geojson";
import { Plan } from "../types/surfboardTypes";

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

export default function SurfMapViewer({ plan }: { plan: Plan | any }) {
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
    let abortController: AbortController | null = new AbortController();

    const initializeMap = async () => {
      try {
        // 1) Fetch & build GeoJSON (and defensively close rings)
        const feature = featureFromPlan({
          id: plan.id,
          planNumber: plan.planNumber,
          geometry: plan.geometry,
          properties: { planType: plan.planType },
        });

        const fcRaw = toFeatureCollection([feature]);
        const fc = closeRingsInFeatureCollection(fcRaw);

        // Filter out invalid geometries
        fc.features = fc.features.filter((f: any) => {
          try {
            return geometryEngine.simplify(f.geometry) != null;
          } catch {
            return false;
          }
        });

        // 2) Create a more reliable basemap
        const basemap = new Basemap({
          baseLayers: [
            new WebTileLayer({
              urlTemplate:
                "https://{subDomain}.tile.openstreetmap.org/{level}/{col}/{row}.png",
              subDomains: ["a", "b", "c"],
              title: "OpenStreetMap",
              copyright: " OpenStreetMap contributors",
            }),
          ],
        });

        // 3) Create map and view
        const map = new Map({
          basemap,
          ground: "world-elevation",
        });

        view = new MapView({
          container: divRef.current as HTMLDivElement,
          map,
          zoom: 10,
          center: [3.3792, 6.5244],
          constraints: { snapToZoom: false },
          popup: {
            dockEnabled: true,
            dockOptions: {
              breakpoint: false,
            },
          },
        });

        viewRef.current = view;

        // 4) Set up error handling for view
        view
          .when(() => {
            console.log("Map view is ready");
          })
          .catch((error) => {
            if (!cancelled) {
              console.error("Map view failed to initialize:", error);
            }
          });

        // 5) Create and add GeoJSON layer
        const blob = new Blob([JSON.stringify(fc)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

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

        // 6) Fit view to layer extent
        try {
          const { extent } = await layer.queryExtent();
          if (extent && !extent.isEmpty) {
            await view.goTo(extent.expand(1.1), { duration: 800 });
          }
        } catch (error) {
          console.warn("Could not zoom to layer extent:", error);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (view) {
        view.destroy();
        view = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [plan]);

  return <div ref={divRef} className="w-full h-[600px] rounded-xl border" />;
}
