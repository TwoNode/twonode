"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as turf from "@turf/turf";
import maplibregl, {
  Map as MaplibreMap,
  LngLatLike,
  GeoJSONSource,
  FilterSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plan, PillarData } from "../../types/surfboardTypes";
import proj4 from "proj4";

interface AllPlansMapProps {
  plans: Plan[];
}

// Define the coordinate reference system for pillar conversion
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

// Helper to generate consistent colors for plans
const colorCache = new Map<string, string>();
const generateColor = (id: string): string => {
  if (colorCache.has(id)) {
    return colorCache.get(id)!;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  colorCache.set(id, color);
  return color;
};

interface LocationResult {
  name: string;
  lat: number;
  lon: number;
}

const AllPlansMap: React.FC<AllPlansMapProps> = ({ plans }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MaplibreMap | null>(null);
  const [isReady, setIsReady] = useState(false);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [visiblePlanIds, setVisiblePlanIds] = useState<string[]>([]);

  // --- Location Search States ---
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<LocationResult[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  // --- UI State ---
  const [activeBasemap, setActiveBasemap] = useState<string>("roadmap");

  // --- Memoized Derived Data ---
  const { allStatuses, allTypes } = useMemo(() => {
    const statuses = new Set<string>();
    const types = new Set<string>();
    plans.forEach((plan) => {
      if (plan.status) statuses.add(plan.status);
      if (plan.planType) types.add(plan.planType as string);
    });
    return { allStatuses: Array.from(statuses), allTypes: Array.from(types) };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(plan.status);
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(plan.planType as string);

      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        return matchesStatus && matchesType;
      }

      const matchesSearch =
        plan.planNumber.toLowerCase().includes(query) ||
        plan.surveyTitle.toLowerCase().includes(query) ||
        plan.facilitator.toLowerCase().includes(query);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [plans, searchQuery, statusFilter, typeFilter]);

  // Set all filtered plans to be visible by default when filter changes
  useEffect(() => {
    setVisiblePlanIds(filteredPlans.map((p) => p.id));
  }, [filteredPlans]);

  // --- Map Initialization ---
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
      center: [3.3792, 6.5244],
      zoom: 10,
    });

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("plansLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addSource("pillarsLayer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addLayer({
        id: "plans-fill",
        type: "fill",
        source: "plansLayer",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.6,
          "fill-outline-color": "#000",
        },
      });
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
          "text-color": "#fff",
          "text-halo-color": "#000",
          "text-halo-width": 1,
        },
      });
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

      const planPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
      });
      const pillarPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
      });

      // Click listener for plan polygons
      map.current.on("click", "plans-fill", (e) => {
        const properties = e.features?.[0].properties;
        if (properties) {
          const popupContent = `<div class="p-1 font-sans"><h3 class="font-bold text-base" style="color:${properties.color}">${properties.planNumber}</h3><p class="text-sm text-gray-600">${properties.surveyTitle}</p><p class="text-xs text-gray-500 mt-1">Facilitator: ${properties.facilitator}</p><span class="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">${properties.status}</span></div>`;
          planPopup
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current!);
        }
      });

      // Click listener for pillar points
      map.current.on("click", "pillars-symbol", (e) => {
        const properties = e.features?.[0].properties;
        if (properties) {
          const popupContent = `
             <div class="p-1 font-sans">
               <h3 class="font-bold text-base text-gray-800">Pillar: ${
                 properties.pillarNumber
               }</h3>
               <ul class="text-xs text-gray-600 mt-1 space-y-0.5">
                 <li><strong>Index:</strong> ${
                   properties.pointIndex ?? "N/A"
                 }</li>
                 <li><strong>Easting:</strong> ${
                   properties.easting ?? "N/A"
                 }</li>
                 <li><strong>Northing:</strong> ${
                   properties.northing ?? "N/A"
                 }</li>
               </ul>
             </div>`;
          pillarPopup
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current!);
        }
      });

      map.current.on("mouseenter", "plans-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "plans-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
      map.current.on("mouseenter", "pillars-symbol", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "pillars-symbol", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      setIsReady(true);
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // --- Data Update Effect ---
  useEffect(() => {
    if (!isReady || !map.current) return;

    const polygonFeatures: Feature<Polygon>[] = [];
    const pillarFeatures: Feature<Point>[] = [];

    filteredPlans.forEach((plan) => {
      const color = generateColor(plan.id);
      if (
        plan.geometry &&
        typeof plan.geometry === "object" &&
        "type" in plan.geometry
      ) {
        polygonFeatures.push({
          type: "Feature",
          geometry: plan.geometry as Polygon,
          properties: { ...plan, color },
        });
      }
      if (Array.isArray(plan.pillars)) {
        (plan.pillars as PillarData[]).forEach((p) => {
          const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
            p.easting,
            p.northing,
          ]);
          pillarFeatures.push(
            turf.point([lon, lat], {
              pillarNumber: p.pillarNumber,
              pointIndex: p.pointIndex,
              easting: p.easting,
              northing: p.northing,
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

    // Filter layers based on visiblePlanIds
    const planFilter = (
      visiblePlanIds.length > 0
        ? ["in", ["get", "id"], ...visiblePlanIds]
        : ["==", true, false]
    ) as FilterSpecification;
    const pillarFilter = (
      visiblePlanIds.length > 0
        ? ["in", ["get", "planId"], ...visiblePlanIds]
        : ["==", true, false]
    ) as FilterSpecification;

    map.current.setFilter("plans-fill", planFilter);
    map.current.setFilter("plans-labels", planFilter);
    map.current.setFilter("pillars-symbol", pillarFilter);
    if (polygonFeatures.length > 0 && visiblePlanIds.length > 0) {
      const visibleFeatures = polygonFeatures.filter((f) =>
        visiblePlanIds.includes(f.properties?.id)
      );
      if (visibleFeatures.length > 0) {
        const bounds = turf.bbox({
          type: "FeatureCollection",
          features: visibleFeatures,
        });
        map.current.fitBounds(bounds as [number, number, number, number], {
          padding: 80,
          duration: 500,
          maxZoom: 16,
        });
      }
    }
  }, [filteredPlans, isReady, visiblePlanIds]);

  // --- Basemap Changer ---
  useEffect(() => {
    if (!map.current || !isReady) return;
    ["roadmap", "satellite", "hybrid", "terrain", "osm"].forEach((bm) => {
      const layerId = `${bm}-base`;
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(
          layerId,
          "visibility",
          activeBasemap === bm ? "visible" : "none"
        );
      }
    });
  }, [activeBasemap, isReady]);

  // --- Location Search Effect ---
  useEffect(() => {
    if (!locQuery.trim()) {
      setLocResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setLocLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            locQuery
          )}&countrycodes=ng`
        );
        const data = await res.json();
        setLocResults(
          data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch location:", error);
      }
      setLocLoading(false);
    }, 500); // Debounce API calls
    return () => clearTimeout(handler);
  }, [locQuery]);

  // --- Interaction Callbacks ---
  const flyToLoc = (lat: number, lon: number) => {
    map.current?.flyTo({ center: [lon, lat], zoom: 15 });
  };

  const zoomToPlan = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId);
      if (
        plan?.geometry &&
        typeof plan.geometry === "object" &&
        "type" in plan.geometry
      ) {
        const bounds = turf.bbox(plan.geometry as any);
        map.current?.fitBounds(bounds as [number, number, number, number], {
          padding: 50,
          maxZoom: 17,
        });
      }
    },
    [plans]
  );

  const clearAll = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setTypeFilter([]);
    setLocQuery("");
    setLocResults([]);
    map.current?.flyTo({ center: [3.3792, 6.5244], zoom: 10 });
  };

  return (
    <div className="relative w-full h-full font-sans">
      <div
        ref={mapContainer}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      {/* Controls Panel - Compact Design */}
      <div className="absolute z-50 top-2 left-2 max-w-4xl mx-auto bg-white/95 rounded-xl shadow-lg p-3 space-y-2">
        {/* Location and Search */}
        <div className="grid grid-cols-[1fr_1fr] max-sm:grid-cols-[1fr] gap-3">
          {/* Location Search */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-400"
              />
              {locLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
                </div>
              )}
            </div>
            {locResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {locResults.map((r, i) => (
                  <button
                    key={`${r.lon}-${i}`}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      flyToLoc(r.lat, r.lon);
                      setLocResults([]);
                      setLocQuery(r.name);
                    }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Plan Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search Plans
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Plan number, title, facilitator..."
              className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="shadow-md p-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setStatusFilter((p) =>
                      p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
                    )
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    statusFilter.includes(s)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Type Filter */}
          <div className="shadow-md p-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plan Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setTypeFilter((p) =>
                      p.includes(t) ? p.filter((x) => x !== t) : [...p, t]
                    )
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    typeFilter.includes(t)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex items-end m-auto">
            <button
              onClick={clearAll}
              className="w-full py-1.5 px-3 text-sm rounded-lg bg-blue-50 text-blue-700 border border-blue-500 hover:bg-blue-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Basemap and Plan Visibility */}
      <div className="absolute z-40 bottom-2 left-2 w-52 bg-white/95 rounded-xl shadow-lg p-3">
        <div className="text-sm font-semibold mb-1">Basemap</div>
        {(["roadmap", "satellite", "hybrid", "terrain", "osm"] as const).map(
          (k) => (
            <label
              key={k}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="basemap"
                value={k}
                checked={activeBasemap === k}
                onChange={() => setActiveBasemap(k)}
              />{" "}
              <span className="capitalize">{k}</span>
            </label>
          )
        )}
        <hr className="my-2" />
        <div className="text-sm font-semibold mb-1">
          Visible Plans ({visiblePlanIds.length})
        </div>
        <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
          {filteredPlans.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={visiblePlanIds.includes(p.id)}
                onChange={(e) =>
                  setVisiblePlanIds((prev) =>
                    e.target.checked
                      ? [...prev, p.id]
                      : prev.filter((x) => x !== p.id)
                  )
                }
              />
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: generateColor(p.id) }}
              />
              <button
                className="hover:underline truncate"
                onClick={() => zoomToPlan(p.id)}
                title="Zoom to plan"
              >
                {p.planNumber}
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      {filteredPlans.length > 0 && (
        <div className="absolute z-40 bottom-3 right-3 max-w-lg overflow-x-hidden bg-white/95 rounded-xl shadow-lg p-3">
          <div className="text-sm font-semibold mb-2">
            Filtered Plans ({filteredPlans.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 overflow-x-hidden overflow-y-auto max-h-28">
            {filteredPlans.map((p) => (
              <button
                key={p.id}
                className="p-2 border rounded-lg text-left hover:bg-gray-50 overflow-hidden"
                onClick={() => {
                  if (!visiblePlanIds.includes(p.id)) {
                    setVisiblePlanIds((prev) => [...prev, p.id]);
                  }
                  zoomToPlan(p.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: generateColor(p.id) }}
                  />
                  <span className="font-medium text-sm">{p.planNumber}</span>
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {p.planType as string} · {p.status}
                </div>
              </button>
            ))}
          </div>
          {filteredPlans.length > 6 && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              +{filteredPlans.length - 6} more plans
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AllPlansMap;
