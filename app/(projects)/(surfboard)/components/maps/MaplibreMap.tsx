"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map, LngLatLike, GeoJSONSource } from "maplibre-gl";
import * as turf from "@turf/turf";
import { Feature, GeoJsonProperties, Point } from "geojson";
import proj4 from "proj4";
import "maplibre-gl/dist/maplibre-gl.css";
import { surfboardApi } from "@/surfboard/apiClient";
import { applyVisualizationShift } from "@/app/(projects)/(surfboard)/utils/surfboardUtils";

// Define the updated structure of pillar data passed as props
export interface PillarData {
  easting: number;
  northing: number;
  pointIndex: number;
  pillarNumber: string;
  polygonIndex?: number;
}

interface MaplibreMapProps {
  processedPillars: PillarData[];
  state?: string | null;
}

// Define the coordinate reference system
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

const MaplibreMap: React.FC<MaplibreMapProps> = ({ processedPillars, state }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize the map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
          satellite: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
            tileSize: 256,
          },
          hybrid: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
            tileSize: 256,
          },
          terrain: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}"],
            tileSize: 256,
          },
          roadmap: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm-base",
            type: "raster",
            source: "osm",
            layout: { visibility: "none" },
          },
          {
            id: "satellite-base",
            type: "raster",
            source: "satellite",
            layout: { visibility: "none" },
          },
          {
            id: "hybrid-base",
            type: "raster",
            source: "hybrid",
            layout: { visibility: "none" },
          },
          {
            id: "terrain-base",
            type: "raster",
            source: "terrain",
            layout: { visibility: "none" },
          },
          {
            id: "roadmap-base",
            type: "raster",
            source: "roadmap",
            layout: { visibility: "visible" },
          },
        ],
      },
      center: [3.3792, 6.5244], // Default center (Lagos)
      zoom: 11,
    });

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("polygonLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygonLayer",
        paint: {
          "fill-color": "rgba(59, 130, 246, 0.2)",
          "fill-outline-color": "rgb(239, 68, 68)",
        },
      });
      map.current.addSource("pointLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addLayer({
        id: "point-symbol",
        type: "circle",
        source: "pointLayer",
        paint: {
          "circle-radius": 6,
          "circle-color": "#2563eb",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ef4444",
        },
      });

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
      });
      map.current.on("click", "point-symbol", (e) => {
        const feature = e.features?.[0] as Feature<Point, GeoJsonProperties>;
        if (
          feature?.geometry?.type === "Point" &&
          feature.geometry.coordinates
        ) {
          const { easting, northing, pointIndex, pillarNumber, rawEasting, rawNorthing } =
            feature.properties || {};
          const displayEasting = rawEasting ?? easting;
          const displayNorthing = rawNorthing ?? northing;
          popup
            .setLngLat(feature.geometry.coordinates as LngLatLike)
            .setHTML(
              `
              <div class="space-y-1">
                <div><strong>Pillar Number:</strong> ${
                  pillarNumber ?? "N/A"
                }</div>
                <div><strong>Index:</strong> ${pointIndex ?? "N/A"}</div>
                <div><strong>Easting:</strong> ${
                  displayEasting ? displayEasting.toFixed(3) : "N/A"
                }</div>
                <div><strong>Northing:</strong> ${
                  displayNorthing ? displayNorthing.toFixed(3) : "N/A"
                }</div>
              </div>
            `
            )
            .addTo(map.current!);
        }
      });

      setIsReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map data when props change
  useEffect(() => {
    if (
      !map.current ||
      !processedPillars ||
      processedPillars.length < 3 ||
      !isReady
    ) {
      return;
    }

    const fetchAndRender = async () => {
      const shiftsResult = await surfboardApi.settings.coordinateShifts();
      const shifts = shiftsResult.success ? shiftsResult.data : {};
      const visualPillars = applyVisualizationShift(processedPillars, state, shifts);

      const mapInstance = map.current;
      if (!mapInstance) return;

      const groups: Record<number, any[]> = {};
      visualPillars.forEach((p) => {
      const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
        p.easting,
        p.northing,
      ]);
      const idx = p.polygonIndex ?? 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push([lon, lat]);
    });

    const polygonFeatures = Object.values(groups).map((coords) => {
      const closedCoords = [...coords];
      if (
        turf.booleanEqual(
          turf.point(closedCoords[0]),
          turf.point(closedCoords.at(-1)!)
        ) === false
      ) {
        closedCoords.push(closedCoords[0]);
      }
      return turf.polygon([closedCoords]);
    });

    const pointFeatures = visualPillars.map((p) => {
      const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
        p.easting,
        p.northing,
      ]);
      return turf.point([lon, lat], {
        pillarNumber: p.pillarNumber,
        easting: p.easting,
        northing: p.northing,
        pointIndex: p.pointIndex,
        polygonIndex: p.polygonIndex,
        rawEasting: p.rawEasting ?? p.easting,
        rawNorthing: p.rawNorthing ?? p.northing,
      });
    });

    (mapInstance.getSource("pointLayer") as GeoJSONSource)?.setData(
      turf.featureCollection(pointFeatures)
    );
    (mapInstance.getSource("polygonLayer") as GeoJSONSource)?.setData(
      turf.featureCollection(polygonFeatures)
    );

    const fullCollection = turf.featureCollection(polygonFeatures);
    mapInstance.fitBounds(
      turf.bbox(fullCollection) as [number, number, number, number],
      { padding: 40 }
    );
    };
    
    fetchAndRender();
  }, [processedPillars, isReady, state]);

  const handleBasemapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = `${e.target.value}-base`;
    const basemaps = [
      "osm-base",
      "satellite-base",
      "hybrid-base",
      "terrain-base",
      "roadmap-base",
    ];
    basemaps.forEach(
      (id) =>
        map.current?.getLayer(id) &&
        map.current.setLayoutProperty(
          id,
          "visibility",
          id === selected ? "visible" : "none"
        )
    );
  };

  const handleLayerToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const layerId =
      e.target.id === "polygonToggle" ? "polygon-fill" : "point-symbol";
    if (map.current?.getLayer(layerId)) {
      map.current.setLayoutProperty(
        layerId,
        "visibility",
        e.target.checked ? "visible" : "none"
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      <div className="absolute bottom-5 left-5 w-44 bg-white dark:bg-surface p-3 z-50 shadow-lg rounded-xl font-sans text-sm">
        <strong className="block text-base font-bold mb-1.5 text-gray-800">
          Basemaps
        </strong>

        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="roadmap"
            defaultChecked
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          Google Roadmap
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="satellite"
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          Google Satellite
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="hybrid"
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          Google Hybrid
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="terrain"
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          Google Terrain
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="osm"
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          OSM
        </label>
        <hr className="my-2" />
        <strong className="block text-base font-bold mb-1.5 text-gray-800">
          Overlays
        </strong>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="checkbox"
            id="polygonToggle"
            defaultChecked
            onChange={handleLayerToggle}
            className="mr-2"
          />{" "}
          Uploaded Polygon
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="checkbox"
            id="pillarToggle"
            defaultChecked
            onChange={handleLayerToggle}
            className="mr-2"
          />{" "}
          Pillar Points
        </label>
      </div>
    </div>
  );
};

export default MaplibreMap;
