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
  GeoJSONSource,
  FilterSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plan, PillarData } from "../../types/surfboardTypes";
import proj4 from "proj4";
import { surfboardApi } from "@/surfboard/apiClient";
import { applyVisualizationShift } from "../../utils/surfboardUtils";

interface AllPlansMapProps {
  plans: Plan[];
}

// Temporary plan structure for uploaded CSVs
interface TempPlan extends Omit<Plan, "status"> {
  status: "UPLOADED";
  planType: "CSV";
}

// Define the coordinate reference system for pillar conversion
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs",
);

// Helper to generate a unique signature from pillar data to detect duplicates
const generatePlanSignature = (pillars: PillarData[]): string => {
  if (!pillars || pillars.length === 0) return "";
  // Sort by pillar number to ensure consistent order, then create a string
  const sortedPillars = [...pillars].sort((a, b) =>
    a.pillarNumber.localeCompare(b.pillarNumber),
  );
  return JSON.stringify(
    sortedPillars.map((p) => [p.easting.toFixed(2), p.northing.toFixed(2)]),
  );
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // --- Temporary CSV data state ---
  const [tempPlans, setTempPlans] = useState<TempPlan[]>([]);
  const [visibleTempPlanIds, setVisibleTempPlanIds] = useState<string[]>([]);

  // --- Notification State ---
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  // --- UI State ---
  const [activeBasemap, setActiveBasemap] = useState<string>("roadmap");
  const [displayMode, setDisplayMode] = useState<"shape" | "dots" | "dots-lines">("shape");

  // --- Memoized Derived Data ---
  const combinedPlans = useMemo(
    () => [...plans, ...tempPlans],
    [plans, tempPlans],
  );

  const dbPlanSignatures = useMemo(() => {
    const signatures = new Map<string, string>();
    plans.forEach((plan) => {
      if (Array.isArray(plan.pillars)) {
        const signature = generatePlanSignature(plan.pillars as PillarData[]);
        if (signature) signatures.set(signature, plan.id);
      }
    });
    return signatures;
  }, [plans]);

  const tempPlanSignatures = useMemo(() => {
    const signatures = new Map<string, string>();
    tempPlans.forEach((plan) => {
      const signature = generatePlanSignature(plan.pillars as PillarData[]);
      if (signature) signatures.set(signature, plan.id);
    });
    return signatures;
  }, [tempPlans]);

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
    return combinedPlans.filter((plan) => {
      if (plan.status === "UPLOADED") return true;
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(plan.status);
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(plan.planType as string);
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus && matchesType;
      const matchesSearch =
        plan.planNumber.toLowerCase().includes(query) ||
        plan.surveyTitle.toLowerCase().includes(query) ||
        plan.facilitator.toLowerCase().includes(query);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [combinedPlans, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    setVisiblePlanIds(
      filteredPlans.filter((p) => p.status !== "UPLOADED").map((p) => p.id),
    );
    setVisibleTempPlanIds(
      filteredPlans.filter((p) => p.status === "UPLOADED").map((p) => p.id),
    );
  }, [filteredPlans]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const flyToLoc = (lat: number, lon: number) => {
    map.current?.flyTo({ center: [lon, lat], zoom: 15 });
  };
  const zoomToPlan = useCallback(
    (planId: string) => {
      const plan = combinedPlans.find((p) => p.id === planId);
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
    [combinedPlans],
  );

  const handleCsvUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newTempPlans: TempPlan[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const lines = text.trim().split("\n");
        const headers = lines.shift()?.toLowerCase().split(",") || [];
        const pillarIndex = headers.findIndex((h) => h.includes("pillar"));
        const eastingIndex = headers.findIndex((h) => h.includes("easting"));
        const northingIndex = headers.findIndex((h) => h.includes("northing"));

        if (pillarIndex === -1 || eastingIndex === -1 || northingIndex === -1) {
          console.warn(`Skipping file ${file.name}: Missing required columns.`);
          continue;
        }

        const pillars: PillarData[] = lines
          .map((line, index) => ({
            pillarNumber: line.split(",")[pillarIndex]?.trim(),
            easting: parseFloat(line.split(",")[eastingIndex]),
            northing: parseFloat(line.split(",")[northingIndex]),
            pointIndex: index,
          }))
          .filter(
            (p) => p.pillarNumber && !isNaN(p.easting) && !isNaN(p.northing),
          );

        if (pillars.length < 3) continue;

        // Check for duplicates
        const signature = generatePlanSignature(pillars);
        const existingPlanId = dbPlanSignatures.get(signature);
        if (existingPlanId) {
          const existingPlan = plans.find((p) => p.id === existingPlanId);
          setNotification({
            message: `CSV for "${existingPlan?.planNumber}" already exists in the database. Zooming to plan.`,
            type: "info",
          });
          zoomToPlan(existingPlanId);
          continue;
        }

        const existingTempPlanId = tempPlanSignatures.get(signature);
        if (existingTempPlanId) {
          const existingTempPlan = tempPlans.find(
            (p) => p.id === existingTempPlanId,
          );
          setNotification({
            message: `This CSV content is already uploaded as "${existingTempPlan?.planNumber}". Zooming.`,
            type: "info",
          });
          zoomToPlan(existingTempPlanId);
          continue;
        }

        const coords = pillars.map((p) => {
          const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
            p.easting,
            p.northing,
          ]);
          return [lon, lat];
        });
        if (
          coords.length > 0 &&
          (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1])
        ) {
          coords.push(coords[0]);
        }

        const polygon = turf.polygon([coords]);
        const currentDate = new Date();
        newTempPlans.push({
          id: `csv-${file.name}-${Date.now()}`,
          planNumber: file.name.replace(/\.csv$/i, ""),
          surveyTitle: "Uploaded from CSV",
          facilitator: "Local File",
          status: "UPLOADED",
          planType: "CSV",
          geometry: {
            type: "Polygon",
            coordinates: polygon.geometry.coordinates,
          },
          pillars,
          referencePlanNumber: null,
          deededArea: "0",
          pillarType: "UNKNOWN",
          pdfFilePaths: [],
          cadFilePaths: [],
          certificateFilePaths: [],
          ward: null,
          lcda: null,
          lga: null,
          state: null,
          locality: null,
          isLive: false,
          dateOnSurveyPlan: currentDate,
          dateLodged: null,
          reasonForWithdrawalAndResubmission: null,
          createdAt: currentDate,
          updatedAt: currentDate,
        });
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
      }
    }
    setTempPlans((prev) => [...prev, ...newTempPlans]);
    if (event.target) event.target.value = "";
  };

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
        id: "plans-outline",
        type: "line",
        source: "plansLayer",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
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
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
      });
      const showPopup = (
        e: maplibregl.MapMouseEvent & {
          features?: maplibregl.MapGeoJSONFeature[];
        },
      ) => {
        const properties = e.features?.[0].properties;
        if (!properties || !map.current) return;
        let popupContent = "";
        if (properties.easting) {
          popupContent = `<div class="p-1 font-sans"><h3 class="font-bold text-base text-gray-800">Pillar: ${
            properties.pillarNumber
          }</h3><ul class="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5"><li><strong>Index:</strong> ${
            properties.pointIndex ?? "N/A"
          }</li><li><strong>Easting:</strong> ${
            properties.rawEasting !== undefined
              ? properties.rawEasting.toFixed(3)
              : properties.easting !== undefined
                ? properties.easting.toFixed(3)
                : "N/A"
          }</li><li><strong>Northing:</strong> ${
            properties.rawNorthing !== undefined
              ? properties.rawNorthing.toFixed(3)
              : properties.northing !== undefined
                ? properties.northing.toFixed(3)
                : "N/A"
          }</li></ul></div>`;
        } else {
          popupContent = `<div class="p-1 font-sans"><h3 class="font-bold text-base" style="color:${properties.color}">${properties.planNumber}</h3><p class="text-sm text-gray-600 dark:text-gray-400">${properties.surveyTitle}</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Facilitator: ${properties.facilitator}</p><span class="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:text-gray-300">${properties.status}</span></div>`;
        }
        popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map.current);
      };
      map.current.on("click", "plans-fill", showPopup);
      map.current.on("click", "pillars-symbol", showPopup);
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

  useEffect(() => {
    if (!isReady || !map.current) return;

    const fetchAndRender = async () => {
      const allVisibleIds = [...visiblePlanIds, ...visibleTempPlanIds];
      const polygonFeatures: Feature<
        Polygon | import("geojson").MultiPolygon
      >[] = [];
      const pillarFeatures: Feature<Point>[] = [];

      const shiftsResult = await surfboardApi.settings.coordinateShifts();
      const shifts = shiftsResult.success ? shiftsResult.data : {};

      filteredPlans.forEach((plan) => {
        const color = generateColor(plan.id);
        const stateName = plan.state;

        let hasPillars = false;

        if (Array.isArray(plan.pillars) && plan.pillars.length >= 3) {
          hasPillars = true;
          const shiftedPillars = applyVisualizationShift(
            plan.pillars as PillarData[],
            stateName,
            shifts,
          );

          const groups: Record<number, any[]> = {};
          shiftedPillars.forEach((p) => {
            const [lon, lat] = proj4("EPSG:26331", "EPSG:4326", [
              p.easting,
              p.northing,
            ]);
            pillarFeatures.push(
              turf.point([lon, lat], {
                ...p,
                planId: plan.id,
                rawEasting: p.rawEasting ?? p.easting,
                rawNorthing: p.rawNorthing ?? p.northing,
              }),
            );

            const idx = p.polygonIndex ?? 0;
            if (!groups[idx]) groups[idx] = [];
            groups[idx].push([lon, lat]);
          });

          const polygonRings = Object.values(groups).map((coords) => {
            const closedCoords = [...coords];
            if (
              turf.booleanEqual(
                turf.point(closedCoords[0]),
                turf.point(closedCoords.at(-1)!),
              ) === false
            ) {
              closedCoords.push(closedCoords[0]);
            }
            return closedCoords;
          });

          if (polygonRings.length === 1) {
            polygonFeatures.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: polygonRings },
              properties: { ...plan, color },
            });
          } else if (polygonRings.length > 1) {
            polygonFeatures.push({
              type: "Feature",
              geometry: {
                type: "MultiPolygon",
                coordinates: polygonRings.map((r) => [r]),
              },
              properties: { ...plan, color },
            });
          }
        }

        if (
          !hasPillars &&
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
      });

      (map.current?.getSource("plansLayer") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: polygonFeatures as Feature<Polygon>[],
      });
      (map.current?.getSource("pillarsLayer") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: pillarFeatures,
      });

      const filter = (
        allVisibleIds.length > 0
          ? ["in", ["get", "id"], ["literal", allVisibleIds]]
          : ["==", true, false]
      ) as FilterSpecification;
      const pillarFilter = (
        allVisibleIds.length > 0
          ? ["in", ["get", "planId"], ["literal", allVisibleIds]]
          : ["==", true, false]
      ) as FilterSpecification;

      map.current?.setFilter("plans-fill", filter);
      map.current?.setFilter("plans-outline", filter);
      map.current?.setFilter("plans-labels", filter);
      map.current?.setFilter("pillars-symbol", pillarFilter);

      if (polygonFeatures.length > 0 && allVisibleIds.length > 0) {
        const visibleFeatures = polygonFeatures.filter((f) =>
          allVisibleIds.includes(f.properties?.id),
        );
        if (visibleFeatures.length > 0) {
          const bounds = turf.bbox({
            type: "FeatureCollection",
            features: visibleFeatures as any,
          });
          map.current?.fitBounds(bounds as [number, number, number, number], {
            padding: 80,
            duration: 500,
            maxZoom: 16,
          });
        }
      }
    };

    fetchAndRender();
  }, [filteredPlans, isReady, visiblePlanIds, visibleTempPlanIds]);

  useEffect(() => {
    if (!map.current || !isReady) return;
    ["roadmap", "satellite", "hybrid", "terrain", "osm"].forEach((bm) => {
      const layerId = `${bm}-base`;
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(
          layerId,
          "visibility",
          activeBasemap === bm ? "visible" : "none",
        );
      }
    });
  }, [activeBasemap, isReady]);

  // Toggle between the filled plan polygons and the raw pillar dots — the
  // two layers already render from separate sources, so this is just a
  // visibility swap rather than a re-render of the underlying data.
  useEffect(() => {
    if (!map.current || !isReady) return;
    if (!map.current.getLayer("plans-fill") || !map.current.getLayer("pillars-symbol") || !map.current.getLayer("plans-outline")) return;
    map.current.setLayoutProperty("plans-fill", "visibility", displayMode === "shape" ? "visible" : "none");
    map.current.setLayoutProperty("plans-outline", "visibility", displayMode === "dots-lines" ? "visible" : "none");
    map.current.setLayoutProperty("pillars-symbol", "visibility", displayMode === "dots" || displayMode === "dots-lines" ? "visible" : "none");
  }, [displayMode, isReady]);

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
            locQuery,
          )}&countrycodes=ng`,
        );
        const data = await res.json();
        setLocResults(
          data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          })),
        );
      } catch (error) {
        console.error("Failed to fetch location:", error);
      }
      setLocLoading(false);
    }, 500);
    return () => clearTimeout(handler);
  }, [locQuery]);

  const clearAll = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setTypeFilter([]);
    setLocQuery("");
    setLocResults([]);
    map.current?.flyTo({ center: [3.3792, 6.5244], zoom: 10 });
  };
  const clearTempPlans = () => {
    setTempPlans([]);
  };
  const removeTempPlan = (idToRemove: string) => {
    setTempPlans((prev) => prev.filter((p) => p.id !== idToRemove));
  };

  return (
    <div className="relative w-full h-full font-sans">
      <div
        ref={mapContainer}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      {notification && (
        <div
          className={`absolute z-60 top-24 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-md text-sm font-semibold
            ${
              notification.type === "info"
                ? "bg-blue-100 dark:bg-blue-500/15 border border-blue-400 dark:border-blue-500/30 text-blue-800 dark:text-blue-300"
                : ""
            }
            ${
              notification.type === "error"
                ? "bg-red-100 dark:bg-red-500/15 border border-red-400 dark:border-red-500/30 text-red-800 dark:text-red-300"
                : ""
            }`}
        >
          {notification.message}
        </div>
      )}

      {/* Controls Panel */}
      <div className="absolute z-50 top-2 left-2 max-w-4xl mx-auto bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3 space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] max-sm:grid-cols-[1fr] gap-3">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface-muted text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-blue-400"
              />
              {locLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
                </div>
              )}
            </div>
            {locResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-lg shadow-md max-h-48 overflow-y-auto">
                {locResults.map((r, i) => (
                  <button
                    key={`${r.lon}-${i}`}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
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
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Search Plans
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Plan number, title, facilitator..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface-muted text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex flex-col max-sm:grid grid-cols-2 gap-1 items-center">
            {" "}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1 px-3 text-xs rounded-lg bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500 dark:border-green-500/40 hover:bg-green-100 dark:hover:bg-green-500/25 transition-colors whitespace-nowrap"
            >
              Upload CSV
            </button>
            <button
              onClick={clearAll}
              className="w-full py-1 px-3 text-xs rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-red-400 dark:border-red-500/40 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="p-2 rounded-md border border-gray-100 dark:border-white/5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setStatusFilter((p) =>
                      p.includes(s) ? p.filter((x) => x !== s) : [...p, s],
                    )
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    statusFilter.includes(s)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-surface text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2 rounded-md border border-gray-100 dark:border-white/5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Plan Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setTypeFilter((p) =>
                      p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
                    )
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    typeFilter.includes(t)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white dark:bg-surface text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Basemap and Plan Visibility */}
      <div className="absolute z-40 bottom-2 left-2 w-56 bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3">
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Plan Display</div>
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1 mb-2">
          <button
            type="button"
            onClick={() => setDisplayMode("shape")}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              displayMode === "shape"
                ? "bg-white dark:bg-surface text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Shape
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("dots")}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              displayMode === "dots"
                ? "bg-white dark:bg-surface text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Dots
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("dots-lines")}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              displayMode === "dots-lines"
                ? "bg-white dark:bg-surface text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Dots + Lines
          </button>
        </div>
        <hr className="my-2 border-gray-200 dark:border-white/10" />
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Basemap</div>
        {(["roadmap", "satellite", "hybrid", "terrain", "osm"] as const).map(
          (k) => (
            <label
              key={k}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
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
          ),
        )}
        <hr className="my-2 border-gray-200 dark:border-white/10" />
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Database Plans ({visiblePlanIds.length})
        </div>
        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
          {filteredPlans
            .filter((p) => p.status !== "UPLOADED")
            .map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={visiblePlanIds.includes(p.id)}
                  onChange={(e) =>
                    setVisiblePlanIds((prev) =>
                      e.target.checked
                        ? [...prev, p.id]
                        : prev.filter((x) => x !== p.id),
                    )
                  }
                />{" "}
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
        {tempPlans.length > 0 && (
          <>
            <hr className="my-2 border-gray-200 dark:border-white/10" />
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Uploaded Layers ({visibleTempPlanIds.length})
              </div>
              <button
                onClick={clearTempPlans}
                className="text-xs text-red-500 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1 mt-1">
              {tempPlans.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <label className="flex items-center gap-2 cursor-pointer grow truncate">
                    <input
                      type="checkbox"
                      checked={visibleTempPlanIds.includes(p.id)}
                      onChange={(e) =>
                        setVisibleTempPlanIds((prev) =>
                          e.target.checked
                            ? [...prev, p.id]
                            : prev.filter((x) => x !== p.id),
                        )
                      }
                    />{" "}
                    <span
                      className="inline-block w-3 h-3 rounded-sm shrink-0"
                      style={{ background: generateColor(p.id) }}
                    />
                    <button
                      className="hover:underline truncate text-left"
                      onClick={() => zoomToPlan(p.id)}
                      title={p.planNumber}
                    >
                      {p.planNumber}
                    </button>
                  </label>
                  <button
                    onClick={() => removeTempPlan(p.id)}
                    className="ml-auto text-red-400 hover:text-red-600 font-bold text-lg leading-none shrink-0"
                    title="Remove Layer"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Summary Strip */}
      {filteredPlans.length > 0 && (
        <div className="absolute z-40 bottom-3 right-3 max-w-lg overflow-x-hidden bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Filtered Plans ({filteredPlans.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 overflow-x-hidden overflow-y-auto max-h-28">
            {filteredPlans.map((p) => (
              <button
                key={p.id}
                className="p-2 border border-gray-200 dark:border-white/10 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/5 overflow-hidden"
                onClick={() => {
                  const allVisible = [...visiblePlanIds, ...visibleTempPlanIds];
                  if (!allVisible.includes(p.id)) {
                    if (p.status === "UPLOADED") {
                      setVisibleTempPlanIds((prev) => [...prev, p.id]);
                    } else {
                      setVisiblePlanIds((prev) => [...prev, p.id]);
                    }
                  }
                  zoomToPlan(p.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: generateColor(p.id) }}
                  />
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{p.planNumber}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {p.planType as string} · {p.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPlansMap;
