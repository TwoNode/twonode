"use client";

import React, { useEffect, useRef, useState } from "react";
// Import ArcGIS core CSS for widgets and themes
import "@arcgis/core/assets/esri/themes/light/main.css";

import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as projection from "@arcgis/core/geometry/projection";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import LayerList from "@arcgis/core/widgets/LayerList";
import Zoom from "@arcgis/core/widgets/Zoom";
// for 2D MapView
// ← note the .js
// (or, for both 2D & 3D…) import type { GoToOptions } from "@arcgis/core/views/View";

// Use the shared PillarData type from actions
import type { PillarData } from "@/app/(projects)/(surboard)/types/surfboardTypes";

/**
 * Arbitrary metadata for the plan
 */
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
}

export default function ArcGISMap({
  pillars,
  planInfo,
  initialCenter = [6.5244, 3.3792], // default to Lagos
  zoomPadding = { duration: 1000 }, // default animation duration in milliseconds
  onSubmit,
}: ArcGISMapProps) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!mapDiv.current || pillars.length === 0) return;

    const graphicsLayer = new GraphicsLayer({ title: "Uploaded Survey" });
    const pointLayer = new GraphicsLayer({ title: "Uploaded Survey Pillars" });

    let webmap;
    try {
      webmap = new WebMap({
        portalItem: { id: "5b13e132fb1c403fb19d389b0462af4e" },
      });
    } catch (error) {
      console.error("Error loading WebMap:", error);
      webmap = new WebMap({
        basemap: "topo-vector", // Using a default basemap instead of portal item
      });
    }

    webmap.addMany([graphicsLayer, pointLayer]);

    const view = new MapView({
      container: mapDiv.current,
      map: webmap,
      center: initialCenter,
      zoom: 14,
    });

    // LayerList widget
    const layerList = new LayerList({ view });
    view.ui.add(layerList, "bottom-left");

    // Zoom widget
    const zoomWidget = new Zoom({ view });
    view.ui.add(zoomWidget, "top-left");

    // Ensure correct draw order
    view.when(() => webmap.reorder(graphicsLayer, 2));
    view.when(() => webmap.reorder(pointLayer, 3));

    const loadGraphics = async () => {
      await projection.load();

      // Project each Survey pillar to WGS84
      const projectedPoints = pillars.map((pt) => {
        const original = new Point({
          x: pt.easting,
          y: pt.northing,
          spatialReference: new SpatialReference({ wkid: 26331 }),
        });
        const projected = projection.project(
          original,
          new SpatialReference({ wkid: 4326 })
        ) as Point;
        return {
          x: projected.x,
          y: projected.y,
          pillarNumber: pt.pillarNumber,
        };
      });

      // Construct polygon ring
      const ring = projectedPoints.map((p) => [p.x, p.y]);
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
      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: {
          type: "simple-fill",
          color: [0, 0, 255, 0.2],
          outline: { color: "red", width: 2 },
        },
      });

      // Render
      graphicsLayer.removeAll();
      graphicsLayer.add(polygonGraphic);
      pointLayer.removeAll();
      projectedPoints.forEach((p) => {
        pointLayer.add(
          new Graphic({
            geometry: new Point({
              x: p.x,
              y: p.y,
              spatialReference: { wkid: 4326 },
            }),
            symbol: {
              type: "simple-marker",
              color: [0, 102, 255],
              outline: { color: [255, 0, 0], width: 2 },
            },
            attributes: { pillarNumber: p.pillarNumber },
            popupTemplate: {
              title: "Pillar",
              content: "Number: {pillarNumber}",
            },
          })
        );
      });

      // Zoom / pan to polygon
      view.when(() => view.goTo(polygonGraphic));
      // view.goTo({
      //   target: polygonGraphic.geometry,
      //   zoom: zoomPadding?.zoom || 15,
      //   duration: zoomPadding?.duration || 1000,
      //   tilt: zoomPadding?.tilt || 0
      // });

      // Query administrative boundaries
      const adminLayer = new FeatureLayer({
        url: "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/2",
        outFields: ["WARD", "LCDA", "LGA"],
      });
      const query = adminLayer.createQuery();
      query.geometry = polygon;
      query.spatialRelationship = "intersects";
      query.returnGeometry = false;
      const result = await adminLayer.queryFeatures(query);

      const attrs = result.features[0]?.attributes || {};
      const attributes = {
        ...planInfo,
        WARD: attrs.WARD || "N/A",
        LCDA: attrs.LCDA || "N/A",
        LGA: attrs.LGA || "N/A",
      };

      polygonGraphic.attributes = {
        WARD: attrs.WARD,
        LCDA: attrs.LCDA,
        LGA: attrs.LGA,
      };

      if (onSubmit) {
        onSubmit?.({
          geometry: polygonGraphic?.geometry?.toJSON() || "",
          attributes,
          pillars,
        });
      }
    };

    loadGraphics();
  }, [pillars, planInfo, initialCenter, zoomPadding, onSubmit]);

  if (!pillars.length) {
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
              d="M12 ..."
            />
          </svg>
        </div>
        <p>No survey data uploaded</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-full max-h-full">
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className={`${isFullscreen ? "fixed" : "absolute"} top-4 right-4 z-[1000] p-2 bg-white/90 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center w-10 h-10`}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        )}
      </button>
      <div
        ref={mapDiv}
        className={
          isFullscreen
            ? "fixed inset-0 z-[999]"
            : "w-full h-[70vh] max-h-[1200px] rounded-xl shadow-lg border-8 border-blue-500 overflow-hidden max-w-full"
        }
      />
    </div>
  );
}
