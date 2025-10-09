"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map, LngLatLike, GeoJSONSource } from "maplibre-gl";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Polygon, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import proj4 from "proj4";
import { Plan, PillarData } from "../../../types/surfboardTypes";

interface AllPlansMapProps {
  plans: Plan[];
}

// Define the coordinate reference system for pillar conversion
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

const AllPlansMap: React.FC<AllPlansMapProps> = ({ plans }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Memoize the filtering logic to avoid re-calculating on every render
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesStatus =
        statusFilter === "ALL" || plan.status === statusFilter;

      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        return matchesStatus;
      }

      const matchesSearch =
        plan.planNumber.toLowerCase().includes(query) ||
        plan.surveyTitle.toLowerCase().includes(query) ||
        plan.facilitator.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [plans, searchQuery, statusFilter]);

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
            id: "roadmap-base",
            type: "raster",
            source: "roadmap",
            layout: { visibility: "visible" },
          },
        ],
      },
      center: [3.3792, 6.5244], // Default center (Lagos)
      zoom: 10,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add sources for plans (polygons) and pillars (points)
      map.current.addSource("plansLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addSource("pillarsLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Add layer to visualize the polygons
      map.current.addLayer({
        id: "plans-fill",
        type: "fill",
        source: "plansLayer",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "LODGED",
            "#10B981",
            "QUERIED",
            "#F59E0B",
            "UNDER_REVIEW",
            "#3B82F6",
            "#6B7280",
          ],
          "fill-opacity": 0.5,
          "fill-outline-color": "#000000",
        },
      });

      // Add layer for plan labels
      map.current.addLayer({
        id: "plans-labels",
        type: "symbol",
        source: "plansLayer",
        layout: {
          "text-field": ["get", "planNumber"],
          "text-size": 10,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      // Add layer for pillar points
      map.current.addLayer({
        id: "pillars-symbol",
        type: "circle",
        source: "pillarsLayer",
        paint: {
          "circle-radius": 4,
          "circle-color": "#FF0000",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
      });
      map.current.on("click", "plans-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const properties = e.features[0].properties;
          const popupContent = `
            <div class="p-1 font-sans">
              <h3 class="font-bold text-base text-gray-800">${properties.planNumber}</h3>
              <p class="text-sm text-gray-600">${properties.surveyTitle}</p>
              <p class="text-xs text-gray-500 mt-1">Facilitator: ${properties.facilitator}</p>
              <span class="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">${properties.status}</span>
            </div>`;
          popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map.current!);
        }
      });

      map.current.on("mouseenter", "plans-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "plans-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      setIsReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map data when filtered plans change
  useEffect(() => {
    if (!isReady || !map.current) return;

    const polygonFeatures: Feature<Polygon>[] = [];
    const pillarFeatures: Feature<Point>[] = [];

    filteredPlans.forEach((plan) => {
      // Process Polygons
      if (
        plan.geometry &&
        typeof plan.geometry === "object" &&
        "type" in plan.geometry
      ) {
        polygonFeatures.push({
          type: "Feature",
          geometry: plan.geometry as Polygon,
          properties: {
            id: plan.id,
            planNumber: plan.planNumber,
            surveyTitle: plan.surveyTitle,
            facilitator: plan.facilitator,
            status: plan.status,
          },
        });
      }

      // Process Pillars
      if (Array.isArray(plan.pillars)) {
        (plan.pillars as PillarData[]).forEach((p) => {
          const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
            p.easting,
            p.northing,
          ]);
          pillarFeatures.push(
            turf.point([lon, lat], {
              pillarNumber: p.pillarNumber,
              planId: plan.id,
            })
          );
        });
      }
    });

    const polygonGeoJSON: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: polygonFeatures,
    };
    const pillarGeoJSON: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: pillarFeatures,
    };

    (map.current.getSource("plansLayer") as GeoJSONSource)?.setData(
      polygonGeoJSON
    );
    (map.current.getSource("pillarsLayer") as GeoJSONSource)?.setData(
      pillarGeoJSON
    );

    if (polygonFeatures.length > 0) {
      const bounds = turf.bbox(polygonGeoJSON) as [
        number,
        number,
        number,
        number
      ];
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [filteredPlans, isReady]);

  const handleBasemapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = `${e.target.value}-base`;
    ["osm-base", "satellite-base", "hybrid-base", "roadmap-base"].forEach(
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
      e.target.id === "plansToggle" ? "plans-fill" : "pillars-symbol";
    const visibility = e.target.checked ? "visible" : "none";
    if (map.current?.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, "visibility", visibility);
      // also toggle labels
      if (layerId === "plans-fill" && map.current?.getLayer("plans-labels")) {
        map.current.setLayoutProperty("plans-labels", "visibility", visibility);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      {/* Search and Filter UI */}
      <div className="absolute top-4 left-4 right-4 flex gap-4 bg-white/80 backdrop-blur-sm p-3 z-50 shadow-lg rounded-xl font-sans text-sm items-center">
        <input
          id="search-plans"
          type="text"
          placeholder="Search Plan No, Title, Facilitator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />

        <div className="flex items-center gap-2">
          <label
            htmlFor="status-filter"
            className="font-medium text-gray-700 whitespace-nowrap"
          >
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="LODGED">Lodged</option>
            <option value="QUERIED">Queried</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </select>
        </div>
        <p className="text-xs text-gray-600 whitespace-nowrap">
          {filteredPlans.length} / {plans.length} showing
        </p>
      </div>

      {/* Basemap and Layer Controls */}
      <div className="absolute bottom-3 left-3 w-40 bg-white p-3 z-50 shadow-lg rounded-xl font-sans text-xs">
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
          Satellite
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="radio"
            name="basemap"
            value="hybrid"
            onChange={handleBasemapChange}
            className="mr-2"
          />{" "}
          Hybrid
        </label>
        <hr className="my-2" />
        <strong className="block text-base font-bold mb-1.5 text-gray-800">
          Overlays
        </strong>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="checkbox"
            id="plansToggle"
            defaultChecked
            onChange={handleLayerToggle}
            className="mr-2"
          />{" "}
          Survey Plans
        </label>
        <label className="flex items-center my-1 cursor-pointer">
          <input
            type="checkbox"
            id="pillarsToggle"
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

export default AllPlansMap;
