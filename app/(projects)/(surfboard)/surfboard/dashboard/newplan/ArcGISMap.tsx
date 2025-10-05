// app/(projects)/(surfboard)/surfboard/dashboard/newplan/ArcGISMap.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";

type PillarData = {
  easting: number;
  northing: number;
  pointIndex: number;
  pillarNumber: string;
};

type PlanInfo = {
  title?: string;
  polygon?: {
    rings: number[][][];
    spatialReference?: { wkid?: number } | __esri.SpatialReferenceProperties;
  };
  color?: [number, number, number, number?];
  metadata?: any;
};

type ViewPaddingLike =
  | number
  | Partial<{
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
      duration?: number;
    }>;

export type ArcGISMapProps = {
  className?: string;
  basemap?: string;
  qualityProfile?: "low" | "medium" | "high";
  pillars?: PillarData[];
  planInfo?: PlanInfo;
  initialCenter?: [number, number]; // lon/lat fallback
  zoomPadding?: ViewPaddingLike;
  onSubmit?: (payload: {
    center: { longitude: number; latitude: number };
    scale: number;
    extent: {
      xmin: number;
      ymin: number;
      xmax: number;
      ymax: number;
      spatialReference: any;
    };
    visiblePillars: Array<Pick<PillarData, "pointIndex" | "pillarNumber">>;
  }) => void;
  /** If omitted, we auto-detect (defaults to 26331 when values look projected) */
  pillarSpatialRef?: { wkid?: number } | __esri.SpatialReferenceProperties;
  /** Turn on a tiny overlay with counts + WKID */
  devDiagnostics?: boolean;
};

type ArcGISModules = {
  WebMap: any;
  MapView: any;
  FeatureLayer: any;
  Graphic: any;
  GraphicsLayer: any;
  Zoom: any;
  Home: any;
  ScaleBar: any;
  Compass: any;
  Polygon: any;
  SpatialReference: any;
  projection?: any;
};

let __mods: Promise<Omit<ArcGISModules, "projection">> | null = null;
async function loadArcGISBase(): Promise<Omit<ArcGISModules, "projection">> {
  if (!__mods) {
    __mods = Promise.all([
      import("@arcgis/core/WebMap"),
      import("@arcgis/core/views/MapView"),
      import("@arcgis/core/layers/FeatureLayer"),
      import("@arcgis/core/Graphic"),
      import("@arcgis/core/layers/GraphicsLayer"),
      import("@arcgis/core/widgets/Zoom"),
      import("@arcgis/core/widgets/Home"),
      import("@arcgis/core/widgets/ScaleBar"),
      import("@arcgis/core/widgets/Compass"),
      import("@arcgis/core/geometry/Polygon"),
      import("@arcgis/core/geometry/SpatialReference"),
    ]).then(
      ([
        WebMap,
        MapView,
        FeatureLayer,
        Graphic,
        GraphicsLayer,
        Zoom,
        Home,
        ScaleBar,
        Compass,
        Polygon,
        SpatialReference,
      ]) => ({
        WebMap: WebMap.default,
        MapView: MapView.default,
        FeatureLayer: FeatureLayer.default,
        Graphic: Graphic.default,
        GraphicsLayer: GraphicsLayer.default,
        Zoom: Zoom.default,
        Home: Home.default,
        ScaleBar: ScaleBar.default,
        Compass: Compass.default,
        Polygon: Polygon.default,
        SpatialReference: SpatialReference.default,
      })
    );
  }
  return __mods;
}

async function ensureProjection(wkid?: number) {
  if (!wkid || wkid === 4326 || wkid === 3857 || wkid === 102100) return;
  const mod = await import("@arcgis/core/geometry/projection");
  await mod.load();
  return mod;
}

/** Heuristic: treat values outside lon/lat as projected UTM → default NG: 26331 */
function inferWKID(pillars: PillarData[], override?: number): number {
  if (override && override !== 4326) return override;
  if (!pillars?.length) return override ?? 4326;
  const looksLikeDeg = pillars.every(
    (p) => Math.abs(p.easting) <= 180 && Math.abs(p.northing) <= 90
  );
  if (looksLikeDeg) return override ?? 4326;
  // Lagos datasets often come as Minna / UTM zone 31N
  return 26331; // set to 32631 if your pillars are WGS84/UTM
}

export default function ArcGISMap({
  className,
  basemap = "gray-vector",
  qualityProfile = "low",
  pillars = [],
  planInfo,
  initialCenter = [3.3792, 6.5244],
  zoomPadding = 64,
  onSubmit,
  pillarSpatialRef,
  devDiagnostics = true,
}: ArcGISMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<__esri.MapView | null>(null);
  const mapRef = useRef<__esri.WebMap | null>(null);
  const pillarsLayerRef = useRef<__esri.FeatureLayer | null>(null);
  const planLayerRef = useRef<__esri.GraphicsLayer | null>(null);
  const [isUpdating, setIsUpdating] = useState(true);
  const [diag, setDiag] = useState<{ wkid: number; count: number } | null>(
    null
  );

  const mergedClass = useMemo(
    () =>
      className ??
      "w-full h-[70vh] max-h-[1200px] rounded-xl border overflow-hidden",
    [className]
  );

  // Init ONCE
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { WebMap, MapView, GraphicsLayer, Zoom, Home, ScaleBar, Compass } =
        await loadArcGISBase();
      if (cancelled) return;

      const webmap = new WebMap({ basemap });
      mapRef.current = webmap;

      const view = new MapView({
        map: webmap,
        container: containerRef.current as HTMLDivElement,
        center: initialCenter,
        zoom: 12,
        constraints: { snapToZoom: true, rotationEnabled: false },
        popup: { autoOpenEnabled: false },
        qualityProfile,
      });
      viewRef.current = view;

      await view.when();
      if (cancelled) return;

      view.ui.add(new Zoom({ view }), "top-left");
      view.ui.add(new Home({ view }), "top-left");
      view.ui.add(new Compass({ view }), "top-left");
      view.ui.add(new ScaleBar({ view, unit: "metric" }), "bottom-left");

      // Add plan layer container now
      const gLayer = new GraphicsLayer();
      webmap.add(gLayer);
      planLayerRef.current = gLayer;

      const removeUpdating = view.watch("updating", (u: boolean) =>
        setIsUpdating(u)
      );
      return () => removeUpdating.remove();
    })();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        try {
          (viewRef.current as any).container = null;
          viewRef.current.destroy();
        } catch {}
        viewRef.current = null;
      }
      mapRef.current = null;
      pillarsLayerRef.current = null;
      planLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← critical: do NOT depend on pillars/planInfo to avoid re-creating the view

  // Data/reactive updates (pillars + plan)
  useEffect(() => {
    (async () => {
      const view = viewRef.current;
      const map = mapRef.current;
      if (!view || !map) return;

      const {
        FeatureLayer,
        Graphic,
        GraphicsLayer,
        Polygon,
        SpatialReference,
      } = await loadArcGISBase();

      // --- Pillars ---
      const wkid = inferWKID(pillars, (pillarSpatialRef as any)?.wkid);
      await ensureProjection(wkid);
      const sr = new SpatialReference({ wkid });

      const makeSource = () =>
        (pillars || []).map((p, i) => {
          const oid = i + 1;
          return new Graphic({
            geometry: {
              type: "point",
              x: p.easting,
              y: p.northing,
              spatialReference: sr,
            },
            attributes: {
              oid,
              pointIndex: p.pointIndex,
              pillarNumber: p.pillarNumber,
            },
          });
        });

      const mustRecreate =
        !pillarsLayerRef.current ||
        (pillarsLayerRef.current as any).spatialReference?.wkid !== wkid;

      if (mustRecreate) {
        if (pillarsLayerRef.current) {
          try {
            map.remove(pillarsLayerRef.current);
          } catch {}
          pillarsLayerRef.current = null;
        }
        if (pillars.length) {
          const layer = new FeatureLayer({
            source: makeSource(),
            objectIdField: "oid",
            fields: [
              { name: "oid", type: "oid", alias: "ObjectID" },
              { name: "pointIndex", type: "integer" },
              { name: "pillarNumber", type: "string" },
            ],
            geometryType: "point",
            title: "Pillars",
            // why: make them obviously visible while debugging
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-marker",
                size: 9,
                color: [255, 255, 255, 0.95],
                outline: { color: [220, 38, 38, 1], width: 2 },
              },
            },
            popupEnabled: true,
            labelingInfo: [
              {
                symbol: {
                  type: "text",
                  color: "#111827",
                  haloColor: "#ffffff",
                  haloSize: 1,
                  font: { size: 10, weight: "bold" },
                },
                labelPlacement: "center-center",
                labelExpressionInfo: { expression: "$feature.pillarNumber" },
                minScale: 20000,
              },
            ] as any,
            featureReduction:
              pillars.length > 200
                ? {
                    type: "cluster",
                    clusterRadius: "64px",
                    labelsVisible: false,
                  }
                : undefined,
          });
          // Attach SR for quick compare later
          (layer as any).spatialReference = sr;
          map.add(layer);
          pillarsLayerRef.current = layer;
        }
      } else {
        // Replace source fast without re-instantiating the layer
        const layer = pillarsLayerRef.current as any;
        const src = layer.source as __esri.Collection<__esri.Graphic>;
        src.removeAll();
        if (pillars.length) src.addMany(makeSource());
      }

      setDiag(devDiagnostics ? { wkid, count: pillars.length } : null);

      // --- Plan polygon ---
      if (planLayerRef.current) {
        const gLayer = planLayerRef.current;
        gLayer.removeAll();
        if (planInfo?.polygon?.rings?.length) {
          const polygon = new Polygon({
            rings: planInfo.polygon.rings,
            spatialReference: planInfo.polygon.spatialReference ?? {
              wkid: 4326,
            },
          });
          const fill = new Graphic({
            geometry: polygon,
            symbol: {
              type: "simple-fill",
              color: planInfo.color ?? [59, 130, 246, 0.12],
              outline: { color: [59, 130, 246, 1], width: 1.5 },
            },
            attributes: {
              title: planInfo.title ?? "Plan Area",
              ...(planInfo.metadata || {}),
            },
          });
          gLayer.add(fill);
        }
      }

      // --- Fit view once we have something to look at ---
      try {
        const targets: any[] = [];
        if (planLayerRef.current?.graphics?.length)
          targets.push(planLayerRef.current.graphics.getItemAt(0));
        if (pillarsLayerRef.current) {
          await (pillarsLayerRef.current as any).when();
          const { extent } = await (
            pillarsLayerRef.current as any
          ).queryExtent();
          if (extent && !extent.isEmpty) targets.push(extent);
        }
        if (targets.length) {
          await view.goTo(targets, {
            // padding:
            //   typeof zoomPadding === "number"
            //     ? {
            //         left: zoomPadding,
            //         right: zoomPadding,
            //         top: zoomPadding,
            //         bottom: zoomPadding,
            //       }
            //     : zoomPadding,
          });
        }
      } catch {
        /* goTo cancelled */
      }
    })();
  }, [pillars, planInfo, zoomPadding, pillarSpatialRef, devDiagnostics]);

  const handleSubmit = async () => {
    if (!onSubmit || !viewRef.current) return;
    const view = viewRef.current;
    const extent = view.extent;
    const visible: Array<Pick<PillarData, "pointIndex" | "pillarNumber">> = [];
    if (pillarsLayerRef.current && extent) {
      const src = (pillarsLayerRef.current as any)
        .source as __esri.Collection<__esri.Graphic>;
      src.forEach((g) => {
        try {
          if ((extent as any).contains(g.geometry)) {
            const { pointIndex, pillarNumber } = g.attributes || {};
            if (pointIndex != null && pillarNumber != null)
              visible.push({ pointIndex, pillarNumber });
          }
        } catch {}
      });
    }
    onSubmit({
      center: {
        longitude: view.center.longitude ?? 0,
        latitude: view.center.latitude ?? 0,
      },
      scale: view.scale,
      extent: extent?.toJSON() as any,
      visiblePillars: visible,
    });
  };

  return (
    <div className="relative">
      <div ref={containerRef} className={mergedClass} />
      {isUpdating && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2">
          <div className="text-[11px] bg-white/85 border rounded px-2 py-1 shadow">
            Rendering…
          </div>
        </div>
      )}
      {diag && (
        <div className="pointer-events-none absolute left-2 bottom-2 text-[11px] bg-white/90 border rounded px-2 py-1 shadow">
          pillars: {diag.count} • wkid: {diag.wkid}
        </div>
      )}
      {onSubmit && (
        <div className="absolute right-3 bottom-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-md border bg-white/90 px-3 py-1.5 text-sm shadow hover:bg-white transition"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
