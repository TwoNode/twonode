"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import type { Map as MapLibre } from "maplibre-gl"; // alias the class type
import "maplibre-gl/dist/maplibre-gl.css";

import proj4 from "proj4";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Point, Polygon, BBox } from "geojson";

// ================== Types ==================
export interface PillarData {
  easting: number;
  northing: number;
  pointIndex: number;
  pillarNumber: string;
}

export interface PlanForMap {
  id: string;
  label?: string; // e.g. planNumber or surveyTitle
  processedPillars: PillarData[];
  color?: string; // optional custom color
  polygon?: { type: "Polygon"; coordinates: number[][][] }; // optional prebuilt polygon (WGS84)

  // Optional fields to enable richer filters:
  status?: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW" | string;
  planType?: string;
  facilitator?: string;
  addressText?: string; // if you have one; used in free-text filter
  description?: string; // used in free-text filter
}

export interface MaplibreMultiPlansWithSearchProps {
  plans: PlanForMap[];

  // Map props
  center?: [number, number]; // default Lagos
  zoom?: number; // default 11
  height?: string | number; // default "100%"
  basemap?: "roadmap" | "satellite" | "hybrid" | "terrain" | "osm"; // default "roadmap"

  // UX
  autofit?: boolean; // fit to active/filtered plans (default true)
}

// ================== Projection (EPSG:26331 -> WGS84) ==================
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

// ================== Helpers ==================
function hsl(i: number, total: number, s = 70, l = 50) {
  const h = Math.round((360 * i) / Math.max(total, 1));
  return `hsl(${h} ${s}% ${l}%)`;
}

function ensureClosedRing(coords: [number, number][]) {
  if (!coords.length) return coords;
  const [fx, fy] = coords[0];
  const [lx, ly] = coords[coords.length - 1];
  if (fx !== lx || fy !== ly) coords.push([fx, fy]);
  return coords;
}

function pillarsToPointsFC(plan: PlanForMap): FeatureCollection<Point> {
  const feats: Feature<Point>[] = plan.processedPillars.map((p) => {
    const [lng, lat] = proj4("EPSG:26331", "EPSG:4326", [
      p.easting,
      p.northing,
    ]) as [number, number];
    return turf.point([lng, lat], {
      planId: plan.id,
      planLabel: plan.label ?? plan.id,
      pillarNumber: p.pillarNumber,
      pointIndex: p.pointIndex,
      status: plan.status ?? null,
      planType: plan.planType ?? null,
      facilitator: plan.facilitator ?? null,
    });
  });
  return turf.featureCollection(feats);
}

function pointsFCToPolygonFC(
  points: FeatureCollection<Point>,
  plan: PlanForMap
): FeatureCollection<Polygon> {
  if (!points.features.length) return turf.featureCollection([]);
  const coords = points.features.map(
    (f) => f.geometry.coordinates as [number, number]
  );
  ensureClosedRing(coords);
  const poly = turf.polygon([coords], {
    planId: plan.id,
    planLabel: plan.label ?? plan.id,
    status: plan.status ?? null,
    planType: plan.planType ?? null,
    facilitator: plan.facilitator ?? null,
  });
  return turf.featureCollection([poly]);
}

const DEFAULT_CENTER: [number, number] = [3.3792, 6.5244];

// Simple Photon (OSM) geocoding; no key required (respect rate limits for production).
async function geocodePhoton(
  query: string
): Promise<Array<{ name: string; lat: number; lon: number }>> {
  if (!query.trim()) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const feats = (data?.features ?? []) as Array<any>;
  return feats
    .map((f) => ({
      name:
        f?.properties?.name ||
        f?.properties?.street ||
        f?.properties?.city ||
        f?.properties?.state ||
        "Result",
      lat: f?.geometry?.coordinates?.[1],
      lon: f?.geometry?.coordinates?.[0],
    }))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon));
}

// ================== Component ==================
const MaplibreMultiPlansWithSearch: React.FC<
  MaplibreMultiPlansWithSearchProps
> = ({
  plans,
  center = DEFAULT_CENTER,
  zoom = 11,
  height = "100%",
  basemap = "roadmap",
  autofit = true,
}) => {
  const mapRef = useRef<MapLibre | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [activeBasemap, setActiveBasemap] = useState(basemap);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // multi-select
  const [typeFilter, setTypeFilter] = useState<string[]>([]); // multi-select
  const [visiblePlanIds, setVisiblePlanIds] = useState<string[]>(() =>
    plans.map((p) => p.id)
  );

  // Location search
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<
    Array<{ name: string; lat: number; lon: number }>
  >([]);
  const [locLoading, setLocLoading] = useState(false);

  // Color map per plan
  const colorByPlan = useMemo(() => {
    const m = new globalThis.Map<string, string>();
    plans.forEach((p, i) => m.set(p.id, p.color ?? hsl(i, plans.length)));
    return m;
  }, [plans]);

  // Free-text + facet filter (status/planType/facilitator etc.)
  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      // text search
      const textHit =
        !q ||
        [
          p.id,
          p.label,
          p.status,
          p.planType,
          p.facilitator,
          p.addressText,
          p.description,
        ]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q));

      // status filter
      const statusHit =
        !statusFilter.length || (p.status && statusFilter.includes(p.status));

      // type filter
      const typeHit =
        !typeFilter.length || (p.planType && typeFilter.includes(p.planType));

      return textHit && statusHit && typeHit;
    });
  }, [plans, searchQuery, statusFilter, typeFilter]);

  // Keep visible plans aligned with current filtered set
  useEffect(() => {
    const ids = filteredPlans.map((p) => p.id);
    setVisiblePlanIds((prev) => prev.filter((id) => ids.includes(id))); // remove now-hidden
    // Also ensure any newly filtered in are visible by default:
    setVisiblePlanIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, [filteredPlans]);

  // Build combined GeoJSON + per-plan bbox
  const { combined, bboxByPlanId } = useMemo(() => {
    const allPointFeats: Feature<Point>[] = [];
    const allPolyFeats: Feature<Polygon>[] = [];
    const bboxMap = new globalThis.Map<string, BBox>();

    for (const p of plans) {
      const pointsFC = pillarsToPointsFC(p);

      const polyFC =
        p.polygon && p.polygon.type === "Polygon"
          ? turf.featureCollection<Polygon>([
              {
                type: "Feature",
                geometry: p.polygon,
                properties: {
                  planId: p.id,
                  planLabel: p.label ?? p.id,
                  status: p.status ?? null,
                  planType: p.planType ?? null,
                  facilitator: p.facilitator ?? null,
                },
              },
            ])
          : pointsFCToPolygonFC(pointsFC, p);

      allPointFeats.push(...pointsFC.features);
      allPolyFeats.push(...polyFC.features);

      // compute bbox for quick zoom
      const bbox = polyFC.features.length
        ? (turf.bbox(polyFC) as BBox)
        : (turf.bbox(pointsFC) as BBox);
      bboxMap.set(p.id, bbox);
    }

    return {
      combined: {
        points: turf.featureCollection(allPointFeats),
        polys: turf.featureCollection(allPolyFeats),
      },
      bboxByPlanId: bboxMap,
    };
  }, [plans]);

  // Map style
  const style = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        // For production, prefer OSM/MapTiler/Stadia or other licensed providers.
        osm: {
          type: "raster" as const,
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
        satellite: {
          type: "raster" as const,
          tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
          tileSize: 256,
        },
        hybrid: {
          type: "raster" as const,
          tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
          tileSize: 256,
        },
        terrain: {
          type: "raster" as const,
          tiles: ["https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}"],
          tileSize: 256,
        },
        roadmap: {
          type: "raster" as const,
          tiles: ["https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"],
          tileSize: 256,
        },

        points: {
          type: "geojson" as const,
          data: { type: "FeatureCollection", features: [] },
        },
        polys: {
          type: "geojson" as const,
          data: { type: "FeatureCollection", features: [] },
        },
      },
      layers: [
        {
          id: "osm-base",
          type: "raster" as const,
          source: "osm",
          layout: { visibility: "none" },
        },
        {
          id: "satellite-base",
          type: "raster" as const,
          source: "satellite",
          layout: { visibility: "none" },
        },
        {
          id: "hybrid-base",
          type: "raster" as const,
          source: "hybrid",
          layout: { visibility: "none" },
        },
        {
          id: "terrain-base",
          type: "raster" as const,
          source: "terrain",
          layout: { visibility: "none" },
        },
        {
          id: "roadmap-base",
          type: "raster" as const,
          source: "roadmap",
          layout: { visibility: "visible" },
        },

        // polygons
        {
          id: "plan-polys-fill",
          type: "fill" as const,
          source: "polys",
          paint: {
            "fill-color": ["match", ["get", "planId"], "default", "#3388ff"],
            "fill-opacity": 0.25,
          },
        },
        {
          id: "plan-polys-outline",
          type: "line" as const,
          source: "polys",
          paint: {
            "line-color": ["match", ["get", "planId"], "default", "#ff3b30"],
            "line-width": 2,
          },
        },
        // points
        {
          id: "plan-points",
          type: "circle" as const,
          source: "points",
          paint: {
            "circle-radius": 5.5,
            "circle-color": ["match", ["get", "planId"], "default", "#2563eb"],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ef4444",
          },
        },
      ],
    }),
    []
  );

  // Init map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style as any,
      center,
      zoom,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-left"
    );

    // Popups
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
    });
    map.on("click", "plan-points", (e: any) => {
      const f = e.features?.[0] as Feature<Point> | undefined;
      if (!f) return;
      popup
        .setLngLat(f.geometry.coordinates as [number, number])
        .setHTML(
          `<div style="font-size:12px;line-height:1.2">
            <div><strong>Plan:</strong> ${
              f.properties?.planLabel ?? f.properties?.planId
            }</div>
            <div><strong>Pillar:</strong> ${
              f.properties?.pillarNumber ?? "N/A"
            }</div>
          </div>`
        )
        .addTo(map);
    });

    // Inject per-plan colors once layers exist
    map.on("load", () => {
      const matchPairs: any[] = [];
      colorByPlan.forEach((color, id) => {
        matchPairs.push(id, color);
      });
      const fillExpr = ["match", ["get", "planId"], ...matchPairs, "#3388ff"];
      const lineExpr = ["match", ["get", "planId"], ...matchPairs, "#ff3b30"];
      const pointExpr = ["match", ["get", "planId"], ...matchPairs, "#2563eb"];
      map.setPaintProperty("plan-polys-fill", "fill-color", fillExpr as any);
      map.setPaintProperty("plan-polys-outline", "line-color", lineExpr as any);
      map.setPaintProperty("plan-points", "circle-color", pointExpr as any);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, style, colorByPlan]);

  // Push data to sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const push = () => {
      (map.getSource("points") as GeoJSONSource)?.setData(combined.points);
      (map.getSource("polys") as GeoJSONSource)?.setData(combined.polys);

      // Apply per-plan visibility filter (also respects free-text filters)
      const filterIds = visiblePlanIds.filter((id) =>
        filteredPlans.some((p) => p.id === id)
      );
      const filterExpr: any = ["in", ["get", "planId"], ["literal", filterIds]];
      map.setFilter("plan-polys-fill", filterExpr);
      map.setFilter("plan-polys-outline", filterExpr);
      map.setFilter("plan-points", filterExpr);

      if (autofit) {
        // Fit to currently shown features
        const shownPolys = {
          type: "FeatureCollection",
          features: combined.polys.features.filter((f: any) =>
            filterIds.includes(f.properties?.planId)
          ),
        } as FeatureCollection<Polygon>;
        const shownPoints = {
          type: "FeatureCollection",
          features: combined.points.features.filter((f: any) =>
            filterIds.includes(f.properties?.planId)
          ),
        } as FeatureCollection<Point>;
        let bbox: BBox | null = null;
        if (shownPolys.features.length) bbox = turf.bbox(shownPolys) as BBox;
        else if (shownPoints.features.length)
          bbox = turf.bbox(shownPoints) as BBox;
        if (bbox) map.fitBounds(bbox as LngLatBoundsLike, { padding: 40 });
      }
    };

    if (map.isStyleLoaded()) push();
    else map.once("load", push);
  }, [combined, filteredPlans, visiblePlanIds, autofit]);

  // Basemap switcher
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = [
      "osm-base",
      "satellite-base",
      "hybrid-base",
      "terrain-base",
      "roadmap-base",
    ];
    ids.forEach((id) => {
      const visible = id.startsWith(activeBasemap);
      if (map.getLayer(id))
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    });
  }, [activeBasemap]);

  // Location search (debounced)
  useEffect(() => {
    const q = locQuery.trim();
    if (!q) {
      setLocResults([]);
      return;
    }
    let alive = true;
    setLocLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await geocodePhoton(q);
        if (alive) setLocResults(results);
      } finally {
        if (alive) setLocLoading(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [locQuery]);

  // =============== UI ===============
  const allStatuses = useMemo(
    () =>
      Array.from(
        new Set(plans.map((p) => p.status).filter(Boolean))
      ) as string[],
    [plans]
  );
  const allTypes = useMemo(
    () =>
      Array.from(
        new Set(plans.map((p) => p.planType).filter(Boolean))
      ) as string[],
    [plans]
  );

  const filteredCount = filteredPlans.length;
  const totalCount = plans.length;

  const zoomToPlan = (planId: string) => {
    const map = mapRef.current;
    const bbox = bboxByPlanId.get(planId);
    if (map && bbox)
      map.fitBounds(bbox as LngLatBoundsLike, { padding: 40, maxZoom: 18 });
  };

  const flyToLoc = (lat: number, lon: number) => {
    const map = mapRef.current;
    if (map) map.flyTo({ center: [lon, lat], zoom: 15 });
  };

  const clearAll = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setTypeFilter([]);
    setLocQuery("");
    setLocResults([]);
    setVisiblePlanIds(plans.map((p) => p.id));
  };

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Controls panel */}
      <div className="absolute z-50 top-3 left-3 right-3 max-w-[1100px] mx-auto bg-white/95 rounded-xl shadow p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Free-text search */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Plans
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by plan number, title, facilitator, status, type…"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <p className="text-xs text-gray-600 mt-1">
                Showing {filteredCount} of {totalCount} plans
              </p>
            )}
          </div>

          {/* Status filter */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {allStatuses.map((s) => {
                const active = statusFilter.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        active ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    className={`px-2 py-1 rounded-full text-xs border ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Type
            </label>
            <div className="flex flex-wrap gap-2">
              {allTypes.map((t) => {
                const active = typeFilter.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setTypeFilter((prev) =>
                        active ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                    className={`px-2 py-1 rounded-full text-xs border ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location search */}
          <div className="lg:col-span-1 flex lg:justify-end">
            <button
              onClick={clearAll}
              className="px-3 py-2 h-[38px] rounded-lg border bg-gray-50 hover:bg-gray-100 text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="lg:col-span-12">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Type an address or place…"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {/* Suggestions */}
              {locQuery && (locLoading || locResults.length > 0) && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-60 overflow-y-auto">
                  {locLoading && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Searching…
                    </div>
                  )}
                  {!locLoading &&
                    locResults.map((r, i) => (
                      <button
                        key={`${r.lon},${r.lat}-${i}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => {
                          flyToLoc(r.lat, r.lon);
                          setLocResults([]);
                          setLocQuery(r.name);
                        }}
                      >
                        {r.name}{" "}
                        <span className="text-gray-400">
                          ({r.lat.toFixed(5)}, {r.lon.toFixed(5)})
                        </span>
                      </button>
                    ))}
                  {!locLoading && !locResults.length && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basemap + per-plan visibility */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <div className="text-sm font-semibold mb-1">Basemaps</div>
            {(
              ["roadmap", "satellite", "hybrid", "terrain", "osm"] as const
            ).map((k) => (
              <label
                key={k}
                className="flex items-center gap-2 cursor-pointer mb-1"
              >
                <input
                  type="radio"
                  name="basemap"
                  value={k}
                  checked={activeBasemap === k}
                  onChange={() => setActiveBasemap(k)}
                />
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>

          <div className="lg:col-span-9">
            <div className="text-sm font-semibold mb-1">Plans</div>
            <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto pr-1">
              {filteredPlans.map((p) => {
                const checked = visiblePlanIds.includes(p.id);
                const color = colorByPlan.get(p.id)!;
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setVisiblePlanIds((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, p.id])]
                            : prev.filter((x) => x !== p.id)
                        )
                      }
                    />
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ background: color }}
                    />
                    <button
                      className="text-sm hover:underline"
                      onClick={() => zoomToPlan(p.id)}
                      title="Zoom to plan"
                    >
                      {p.label ?? p.id}
                    </button>
                  </label>
                );
              })}
              {!filteredPlans.length && (
                <div className="text-xs text-gray-500">
                  No plans match filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary strip like your Google example (first 6) */}
      {!!filteredPlans.length && (
        <div className="absolute z-40 bottom-3 left-3 right-3 max-w-[1100px] mx-auto bg-white/95 rounded-xl shadow p-3">
          <div className="text-sm font-semibold mb-2">Plans on Map</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPlans.slice(0, 6).map((p) => (
              <button
                key={p.id}
                className="p-2 border rounded-lg text-left hover:bg-gray-50"
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
                    style={{ background: colorByPlan.get(p.id) }}
                  />
                  <span className="font-medium text-sm">{p.label ?? p.id}</span>
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {p.planType ?? "—"} · {p.status ?? "—"}{" "}
                  {p.facilitator ? `· ${p.facilitator}` : ""}
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

export default MaplibreMultiPlansWithSearch;
