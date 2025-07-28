"use client";

import React, { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import { execute, load } from "@arcgis/core/geometry/operators/projectOperator";
import Point from "@arcgis/core/geometry/Point";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import Polygon from "@arcgis/core/geometry/Polygon";
import { PillarData } from "@/app/(projects)/(surboard)/utils/surfboardUtils";

interface ArcGISMapPreviewProps {
  pillars: PillarData[];
  geometry?: string;
  className?: string;
}

export default function ArcGISMapPreview({
  pillars,
  geometry,
  className = "",
}: ArcGISMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapRef.current || pillars.length === 0) return;

    // Clean up previous view
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    let isMounted = true;

    const setupMap = async () => {
      await load();
      // Project pillars from UTM (26331) to WGS84 (4326)
      const srcSR = new SpatialReference({ wkid: 26331 });
      const destSR = new SpatialReference({ wkid: 4326 });
      const projectedPillars = pillars
        .map((pillar) => {
          const original = new Point({
            x: pillar.easting,
            y: pillar.northing,
            spatialReference: srcSR,
          });
          const projected = execute(original, destSR) as Point;
          return {
            ...pillar,
            lng: projected?.x,
            lat: projected?.y,
          };
        })
        .filter((p) => p.lng !== undefined && p.lat !== undefined);

      if (!isMounted) return;

      // Use WebMap as in the HTML demo
      const webmap = new WebMap({
        portalItem: { id: "5b13e132fb1c403fb19d389b0462af4e" },
      });
      const polygonLayer = new GraphicsLayer({ title: "Uploaded Survey" });
      const pointLayer = new GraphicsLayer({
        title: "Uploaded Survey Pillars",
      });
      webmap.addMany([polygonLayer, pointLayer]);

      const view = new MapView({
        container: mapRef.current!,
        map: webmap,
      });
      viewRef.current = view;

      // Add polygon geometry if provided
      if (geometry) {
        try {
          const geoJSON = JSON.parse(geometry);
          // Project polygon coordinates if needed
          let rings = geoJSON.coordinates[0];
          // If the geometry is not in WGS84, project it (assume it's in UTM 26331 like pillars)
          if (rings && rings.length > 0 && Math.abs(rings[0][0]) < 10) {
            // Already in WGS84, skip
          } else {
            // Project each ring point
            rings = rings.map(([x, y]: [number, number]) => {
              const original = new Point({ x, y, spatialReference: srcSR });
              const projected = execute(original, destSR) as Point;
              return [projected.x, projected.y];
            });
          }
          const polygonGraphic = new Graphic({
            geometry: new Polygon({ rings: [rings], spatialReference: destSR }),
            symbol: {
              type: "simple-fill",
              color: [59, 130, 246, 0.2],
              outline: { color: [59, 130, 246], width: 2 },
            },
          });
          polygonLayer.removeAll();
          polygonLayer.add(polygonGraphic);
        } catch (error) {
          console.error("Error parsing geometry for ArcGIS:", error);
        }
      } else if (projectedPillars.length >= 3) {
        let ring = projectedPillars.map((p) => [p.lng, p.lat]);
        // Ensure ring is closed
        if (
          ring.length > 0 &&
          (ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1])
        ) {
          ring.push(ring[0]);
        }
        // Log for debugging
        console.log("Polygon ring:", ring);

        // Check for degenerate ring (all points the same)
        const uniquePoints = new Set(ring.map(([lng, lat]) => `${lng},${lat}`));
        if (uniquePoints.size < 3) {
          console.warn(
            "Degenerate ring: not enough unique points for a polygon."
          );
        } else {
          // Helper to check if a ring is clockwise
          const isClockwise = (ring: number[][]) => {
            let sum = 0;
            for (let i = 0; i < ring.length - 1; i++) {
              const [x1, y1] = ring[i];
              const [x2, y2] = ring[i + 1];
              sum += (x2 - x1) * (y2 + y1);
            }
            return sum > 0;
          }
          // Ensure counterclockwise order for ArcGIS
          if (isClockwise(ring)) {
            ring.reverse();
          }
          const polygon = new Polygon({
            rings: [ring],
            spatialReference: { wkid: 4326 },
          });
          // Log polygon geometry for debugging
          console.log("Polygon geometry:", polygon);
          const polygonGraphic = new Graphic({
            geometry: polygon,
            symbol: {
              type: "simple-fill",
              color: [59, 130, 246, 0.2],
              outline: { color: [59, 130, 246], width: 2 },
            },
          });
          polygonLayer.removeAll();
          polygonLayer.add(polygonGraphic);
        }
      }

      // Add pillar markers
      pointLayer.removeAll();
      projectedPillars.forEach((pillar, index) => {
        const pointGraphic = new Graphic({
          geometry: {
            type: "point",
            longitude: pillar.lng,
            latitude: pillar.lat,
            spatialReference: destSR,
          },
          symbol: {
            type: "simple-marker",
            color: [226, 119, 40],
            outline: { color: [255, 255, 255], width: 1 },
            size: 8,
          },
          attributes: {
            pillarNumber: pillar.pillarNumber,
            easting: pillar.easting,
            northing: pillar.northing,
            index,
          },
          popupTemplate: {
            title: `Pillar ${pillar.pillarNumber}`,
            content: `Index: ${index}<br>Easting: ${pillar.easting.toFixed(
              2
            )}<br>Northing: ${pillar.northing.toFixed(2)}`,
          },
        });
        pointLayer.add(pointGraphic);
      });

      // Always zoom to the polygon/points using the calculated extent
      if (projectedPillars.length > 0) {
        const points = projectedPillars.map((pillar) => [
          pillar.lng,
          pillar.lat,
        ]);
        if (points.length > 0) {
          // Create an extent from the points
          const extent = {
            xmin: Math.min(...points.map((p) => p[0])),
            xmax: Math.max(...points.map((p) => p[0])),
            ymin: Math.min(...points.map((p) => p[1])),
            ymax: Math.max(...points.map((p) => p[1])),
            spatialReference: { wkid: 4326 },
          };
          view.when(() => {
            view.goTo(extent, { duration: 1000 });
          });
        }
      }
    };

    setupMap();

    return () => {
      isMounted = false;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [pillars, geometry]);

  if (pillars.length === 0) {
    return (
      <div
        className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}
      >
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
            />
          </svg>
        </div>
        <p className="text-gray-600">No survey data to display</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload a CSV file to see the map preview
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="h-[500px] overflow-hidden w-full rounded-lg"
      />
    </div>
  );
}
