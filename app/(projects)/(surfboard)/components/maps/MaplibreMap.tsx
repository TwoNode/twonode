"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, LngLatBoundsLike } from "maplibre-gl";
import proj4 from "proj4";
import * as turf from "@turf/turf";
import { Feature, Point, Polygon, FeatureCollection, BBox } from "geojson";

// ---- Extra types you asked for ----
type PillarLngLat = { pillarNumber?: string; lng: number; lat: number };
type PillarUTM26331 = {
  pillarNumber?: string;
  easting: number;
  northing: number;
};
type PlanInfo = {
  title?: string;
  polygon?: {
    rings?: number[][][]; // ArcGIS-style rings (assume [lng, lat] if wkid=4326)
    spatialReference?: { wkid?: number; wkt?: string };
  };
};

export type MapLibreParcelProps = {
  center?: [number, number];
  zoom?: number;
  apiBase?: string;
  height?: string | number;

  // NEW props:
  planInfo?: PlanInfo;
  pillars?: FeatureCollection<Point> | PillarLngLat[] | PillarUTM26331[];
  onSubmit?: (payload: {
    admin: {
      wardname?: string;
      lcdaname?: string;
      lganame?: string;
      statename?: string;
    } | null;
    polygon: FeatureCollection<Polygon> | null;
    points: FeatureCollection<Point> | null;
    planInfo?: PlanInfo;
  }) => void | any;

  autofit?: boolean; // default true
};

const DEFAULT_CENTER: [number, number] = [3.3792, 6.5244]; // Lagos

// Define your local projection once
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

export default function MapLibreParcel({
  center = DEFAULT_CENTER,
  zoom = 11,
  apiBase = "http://localhost:3000",
  height = "100%",
  planInfo,
  pillars,
  onSubmit,
  autofit = true,
}: MapLibreParcelProps) {
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [showPolygon, setShowPolygon] = useState(true);
  const [showPillars, setShowPillars] = useState(true);
  const [activeBasemap, setActiveBasemap] = useState<
    "osm" | "satellite" | "hybrid" | "terrain" | "roadmap"
  >("osm");

  const [adminNames, setAdminNames] = useState({
    wardname: "",
    lcdaname: "",
    lganame: "",
    statename: "",
  });

  const [csvName, setCsvName] = useState<string>("");

  const [pointFC, setPointFC] = useState<FeatureCollection<Point>>({
    type: "FeatureCollection",
    features: [],
  });
  const [polygonFC, setPolygonFC] = useState<FeatureCollection<Polygon>>({
    type: "FeatureCollection",
    features: [],
  });

  const styleSpec = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
        satellite: {
          type: "raster" as const,
          tiles: ["https://tile.server/satellite/{z}/{x}/{y}.png"],
          tileSize: 256,
        },
        hybrid: {
          type: "raster" as const,
          tiles: ["https://tile.server/hybrid/{z}/{x}/{y}.png"],
          tileSize: 256,
        },
        terrain: {
          type: "raster" as const,
          tiles: ["https://tile.server/terrain/{z}/{x}/{y}.png"],
          tileSize: 256,
        },
        roadmap: {
          type: "raster" as const,
          tiles: ["https://tile.server/roadmap/{z}/{x}/{y}.png"],
          tileSize: 256,
        },

        polygonLayer: {
          type: "geojson" as const,
          data: { type: "FeatureCollection", features: [] },
        },
        pointLayer: {
          type: "geojson" as const,
          data: { type: "FeatureCollection", features: [] },
        },
      },
      layers: [
        {
          id: "osm-base",
          type: "raster" as const,
          source: "osm",
          layout: { visibility: "visible" },
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
          layout: { visibility: "none" },
        },

        {
          id: "polygon-fill",
          type: "fill" as const,
          source: "polygonLayer",
          paint: {
            "fill-color": "rgba(0,0,255,0.2)",
            "fill-outline-color": "#ff0000",
          },
          layout: { visibility: showPolygon ? "visible" : "none" },
        },
        {
          id: "polygon-outline",
          type: "line" as const,
          source: "polygonLayer",
          paint: { "line-color": "#ff0000", "line-width": 2 },
          layout: { visibility: showPolygon ? "visible" : "none" },
        },
        {
          id: "point-symbol",
          type: "circle" as const,
          source: "pointLayer",
          paint: {
            "circle-radius": 6,
            "circle-color": "#0066ff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ff0000",
          },
          layout: { visibility: showPillars ? "visible" : "none" },
        },
      ],
    }),
    [showPolygon, showPillars]
  );

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleSpec as any,
      center,
      zoom,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-left"
    );

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
    });
    map.on("click", "point-symbol", (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      popup
        .setLngLat((f.geometry as any).coordinates)
        .setHTML(`<strong>Pillar:</strong> ${f.properties?.pillarNumber ?? ""}`)
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, styleSpec]);

  // Basemap toggle
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

  // ---------- Helpers ----------
  function ensureMapReady(run: () => void) {
    const map = mapRef.current;
    if (!map) return;
    if ((map as any).isStyleLoaded?.()) run();
    else map.once("load", run);
  }

  function normalizePillars(
    input: MapLibreParcelProps["pillars"]
  ): FeatureCollection<Point> | null {
    if (!input) return null;
    if ((input as FeatureCollection<Point>).type === "FeatureCollection") {
      return input as FeatureCollection<Point>;
    }
    const arr = input as Array<any>;
    if (!Array.isArray(arr) || arr.length === 0) return null;

    if (typeof arr[0]?.lng === "number" && typeof arr[0]?.lat === "number") {
      const feats: Feature<Point>[] = arr.map((p: PillarLngLat) =>
        turf.point([p.lng, p.lat], { pillarNumber: p.pillarNumber ?? "" })
      );
      return turf.featureCollection(feats);
    }
    if (
      typeof arr[0]?.easting === "number" &&
      typeof arr[0]?.northing === "number"
    ) {
      const feats: Feature<Point>[] = arr.map((p: PillarUTM26331) => {
        const [lng, lat] = proj4("EPSG:26331", "EPSG:4326", [
          p.easting,
          p.northing,
        ]) as [number, number];
        return turf.point([lng, lat], { pillarNumber: p.pillarNumber ?? "" });
      });
      return turf.featureCollection(feats);
    }
    return null;
  }

  function polygonFromPlanRings(
    rings?: number[][][]
  ): FeatureCollection<Polygon> | null {
    if (!rings || !rings.length) return null;
    const poly = turf.polygon(rings as any);
    return turf.featureCollection([poly]);
  }

  function buildClosedPolygonFromPoints(fc: FeatureCollection<Point>) {
    if (!fc.features.length) return turf.featureCollection([]);
    const coords = fc.features.map(
      (f) => f.geometry.coordinates as [number, number]
    );
    // close ring if needed
    const first = coords[0],
      last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
    const poly = turf.polygon([coords]);
    return turf.featureCollection([poly]);
  }

  function applyMapData(
    points: FeatureCollection<Point> | null,
    polyFC: FeatureCollection<Polygon> | null
  ) {
    ensureMapReady(() => {
      const map = mapRef.current!;
      if (points) {
        setPointFC(points);
        (map.getSource("pointLayer") as any)?.setData(points);
      }
      if (polyFC) {
        setPolygonFC(polyFC as any);
        (map.getSource("polygonLayer") as any)?.setData(polyFC);
        if (autofit && polyFC.features.length) {
          const bbox = turf.bbox(polyFC) as BBox;
          map.fitBounds(bbox as LngLatBoundsLike, { padding: 40 });
        }
      }
    });
  }

  async function postIntersectAndNotify(
    polyFC: FeatureCollection<Polygon> | null,
    points: FeatureCollection<Point> | null
  ) {
    const geometry = polyFC?.features?.[0]?.geometry;
    if (!geometry) {
      setAdminNames({
        wardname: "N/A",
        lcdaname: "N/A",
        lganame: "N/A",
        statename: "N/A",
      });
      onSubmit?.({
        admin: null,
        polygon: polyFC ?? null,
        points: points ?? null,
        planInfo,
      });
      return;
    }
    try {
      const res = await fetch(`${apiBase}/intersect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geometry),
      });
      const data = await res.json();
      let admin: any;
      if (data?.success && data?.data) {
        admin = {
          wardname: data.data.wardname || "",
          lcdaname: data.data.lcdaname || "",
          lganame: data.data.lganame || "",
          statename: data.data.statename || "",
        };
      } else {
        admin = {
          wardname: "N/A",
          lcdaname: "N/A",
          lganame: "N/A",
          statename: "N/A",
        };
      }
      setAdminNames(admin);
      onSubmit?.({
        admin,
        polygon: polyFC ?? null,
        points: points ?? null,
        planInfo,
      });
    } catch (err) {
      console.error("/intersect failed", err);
      const admin = {
        wardname: "N/A",
        lcdaname: "N/A",
        lganame: "N/A",
        statename: "N/A",
      };
      setAdminNames(admin);
      onSubmit?.({
        admin,
        polygon: polyFC ?? null,
        points: points ?? null,
        planInfo,
      });
    }
  }

  // CSV handler stays (optional)
  async function onCsvSelected(file: File | null) {
    if (!file) return;
    setCsvName(file.name);
    const text = await file.text();
    const points = parseCsv(text);
    const poly = buildClosedPolygonFromPoints(points);
    applyMapData(points, poly as any);
    await postIntersectAndNotify(poly as any, points);
  }

  function parseCsv(text: string) {
    try {
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV file must have at least 2 rows (header + data)");
      }

      // Parse header
      const header = lines[0].split(",").map((h) =>
        h
          .trim()
          .split(" ")
          .map((word) => word.trim())
          .join("")
          .toLowerCase()
      );

      // Validate required columns
      const requiredColumns = ["pillarnumber", "easting", "northing"];
      const missingColumns = requiredColumns.filter(
        (col) => !header.includes(col)
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}`
        );
      }

      // Get column indices
      const pillarNumberIndex = header.indexOf("pillarnumber");
      const eastingIndex = header.indexOf("easting");
      const northingIndex = header.indexOf("northing");

      // Parse data rows
      const feats: Feature<Point>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(",").map((v) => v.trim());

        if (
          values.length <
          Math.max(pillarNumberIndex, eastingIndex, northingIndex) + 1
        ) {
          console.warn(`Skipping invalid line ${i + 1}: insufficient columns`);
          continue;
        }

        const pillarNumber = values[pillarNumberIndex];
        const easting = parseFloat(values[eastingIndex]);
        const northing = parseFloat(values[northingIndex]);

        // Validate data
        if (!pillarNumber || isNaN(easting) || isNaN(northing)) {
          console.warn(`Skipping invalid line ${i + 1}: invalid data`);
          continue;
        }

        // Convert UTM to WGS84 (EPSG:4326)
        const [lng, lat] = proj4("EPSG:26331", "EPSG:4326", [
          easting,
          northing,
        ]) as [number, number];

        feats.push(turf.point([lng, lat], { pillarNumber }));
      }

      if (feats.length === 0) {
        throw new Error("No valid pillar data found in CSV");
      }

      return turf.featureCollection(feats);
    } catch (error) {
      throw new Error(
        `Failed to parse CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ---------- AUTO-APPLY props (what you asked for) ----------
  useEffect(() => {
    const points = normalizePillars((pillars as any) ?? null);
    const polyFromPlan = polygonFromPlanRings(planInfo?.polygon?.rings);

    if (polyFromPlan) {
      applyMapData(points ?? null, polyFromPlan);
      postIntersectAndNotify(polyFromPlan, points ?? null);
      return;
    }
    if (points) {
      const poly = buildClosedPolygonFromPoints(points);
      applyMapData(points, poly as any);
      postIntersectAndNotify(poly as any, points);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(planInfo), JSON.stringify(pillars)]);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Controls (CSV optional) */}
      <div className="absolute z-10 top-2 left-2 bg-white/95 rounded-xl shadow p-3 w-[260px] space-y-2">
        <div className="text-sm font-semibold">
          Select CSV (PillarNumber,Easting,Northing)
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => onCsvSelected(e.target.files?.[0] || null)}
        />
        {csvName && (
          <div className="text-xs text-gray-600">Loaded: {csvName}</div>
        )}
      </div>

      {/* Basemap + overlays */}
      <div className="absolute z-10 bottom-4 left-4 bg-white/95 rounded-xl shadow p-3 w-[240px]">
        <div className="text-sm font-semibold mb-1">Basemaps</div>
        <div className="space-y-1 text-sm">
          {(["osm", "satellite", "hybrid", "terrain", "roadmap"] as const).map(
            (key) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="basemap"
                  value={key}
                  checked={activeBasemap === key}
                  onChange={() => setActiveBasemap(key)}
                />
                <span className="capitalize">{key}</span>
              </label>
            )
          )}
        </div>
        <hr className="my-2" />
        <div className="text-sm font-semibold mb-1">Overlays</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showPolygon}
            onChange={(e) => setShowPolygon(e.target.checked)}
          />
          Uploaded Polygon
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showPillars}
            onChange={(e) => setShowPillars(e.target.checked)}
          />
          Pillar Points
        </label>
      </div>

      {/* Attributes panel */}
      <div className="absolute z-10 top-2 right-2 bg-white/95 rounded-xl shadow p-4 w-[320px] max-h-[90%] overflow-y-auto">
        <div className="text-base font-semibold mb-2">
          {planInfo?.title ?? "Parcel Attributes"}
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <label className="font-semibold">WARD</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={adminNames.wardname}
              readOnly
            />
          </div>
          <div>
            <label className="font-semibold">LCDA</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={adminNames.lcdaname}
              readOnly
            />
          </div>
          <div>
            <label className="font-semibold">LGA</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={adminNames.lganame}
              readOnly
            />
          </div>
          <div>
            <label className="font-semibold">STATE</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={adminNames.statename}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
