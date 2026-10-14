"use client";

/**
 * PARKED: not imported anywhere. Importing @arcgis/core made the Vercel production
 * build hang (>10 min), so page.tsx shows Coming Soon for now. Rewire only after
 * a build-safe way to load ArcGIS is found (see docs/tasks/current-tasks.md).
 */

import { useEffect, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  ArrowRightIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

// The published web map that holds the SpatialRecords layer.
const WEBMAP_ID = "9f45cec473534d49a1d56633b8516609";
const LAYER_TITLE = "SpatialRecords";
// Nigeria West Belt (UTM zone 31N), the coordinate system surveyors type in.
const UTM_WKID = 26331;
const ARCGIS_ASSETS = "https://js.arcgis.com/4.34/@arcgis/core/assets";
// Same options as the other REVA pages, so the Google script loads once.
const libraries: "places"[] = ["places"];

type FieldOption = { name: string; label: string };

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10";
const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground";

// The ArcGIS objects live outside React state: they own their own lifecycle.
type MapRefs = {
  view: any;
  layer: any;
  graphics: any;
  mod: {
    Graphic: any;
    Point: any;
    SpatialReference: any;
    projection: any;
  };
};

export default function SpatialRecordMap() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  const refs = useRef<MapRefs | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [zooming, setZooming] = useState(false);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [field, setField] = useState("");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [utm, setUtm] = useState("");
  const [address, setAddress] = useState("");

  const { isLoaded: googleLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const showZoomIndicator = () => {
    setZooming(true);
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setZooming(false), 1000);
  };

  /** Open the popup for any record under the point. */
  const checkIntersection = (point: any) => {
    const r = refs.current;
    if (!r?.layer || !point) return;
    const query = r.layer.createQuery();
    query.geometry = point;
    query.spatialRelationship = "intersects";
    query.outFields = ["*"];
    query.returnGeometry = true;
    r.layer
      .queryFeatures(query)
      .then((res: any) => {
        if (res?.features?.length > 0) {
          r.view.popup.open({ features: res.features, location: point });
        } else {
          r.view.popup.close();
        }
      })
      .catch((e: unknown) => console.error("Error querying features:", e));
  };

  const mark = (point: any, color: string, size: string, outline = false) => {
    const r = refs.current!;
    r.graphics.removeAll();
    r.graphics.add(
      new r.mod.Graphic({
        geometry: point,
        symbol: {
          type: "simple-marker",
          color,
          size,
          ...(outline ? { outline: { color: "white", width: 2 } } : {}),
        },
      })
    );
  };

  // Build the map once, in the browser only.
  useEffect(() => {
    let destroyed = false;
    let view: any;

    // The ArcGIS theme is a very large stylesheet; fetching it from the CDN
    // keeps it out of the production build.
    const themeHref = `${ARCGIS_ASSETS}/esri/themes/light/main.css`;
    if (!document.querySelector(`link[href="${themeHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = themeHref;
      document.head.appendChild(link);
    }

    (async () => {
      try {
        const [
          { default: esriConfig },
          { default: WebMap },
          { default: MapView },
          { default: GraphicsLayer },
          { default: Graphic },
          { default: Point },
          { default: SpatialReference },
          { default: Legend },
          { default: LayerList },
          { default: Expand },
          projection,
        ] = await Promise.all([
          import("@arcgis/core/config"),
          import("@arcgis/core/WebMap"),
          import("@arcgis/core/views/MapView"),
          import("@arcgis/core/layers/GraphicsLayer"),
          import("@arcgis/core/Graphic"),
          import("@arcgis/core/geometry/Point"),
          import("@arcgis/core/geometry/SpatialReference"),
          import("@arcgis/core/widgets/Legend"),
          import("@arcgis/core/widgets/LayerList"),
          import("@arcgis/core/widgets/Expand"),
          import("@arcgis/core/geometry/projection"),
        ]);
        if (destroyed || !mapDiv.current) return;

        esriConfig.assetsPath = ARCGIS_ASSETS;
        // Never show ArcGIS's own sign-in box: the map is public or it is unavailable.
        esriConfig.request.useIdentity = false;

        const webmap = new WebMap({ portalItem: { id: WEBMAP_ID } });
        view = new MapView({ container: mapDiv.current, map: webmap });
        const graphics = new GraphicsLayer({
          title: "Search point",
          listMode: "show",
        });
        view.map.add(graphics);

        const mod = { Graphic, Point, SpatialReference, projection };
        refs.current = { view, layer: null, graphics, mod };

        view.ui.add(
          new Expand({ view, content: new Legend({ view }), expanded: false }),
          "bottom-left"
        );
        view.ui.add(
          new Expand({
            view,
            content: new LayerList({ view }),
            expanded: false,
          }),
          "top-right"
        );

        // The web map lives in an ArcGIS Online organisation. If that account
        // is unavailable (for example a lapsed subscription) the load never
        // finishes, so give up after a while and say so.
        await Promise.race([
          webmap.when(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("web map timeout")), 25000)
          ),
        ]);
        if (destroyed) return;
        view.map.reorder(graphics, view.map.layers.length - 1);
        const layer = webmap.layers.find((l: any) => l.title === LAYER_TITLE);
        if (!layer) {
          setMapError(
            `The "${LAYER_TITLE}" layer was not found in the web map.`
          );
          return;
        }
        await (layer as any).load();
        if (destroyed) return;
        refs.current.layer = layer;

        const stringFields: FieldOption[] = (layer as any).fields
          .filter((f: any) => f.type === "string")
          .map((f: any) => ({ name: f.name, label: f.alias || f.name }));
        setFields(stringFields);
        setField(stringFields[0]?.name ?? "");

        // Click: fill the UTM box and the address, mark it, zoom in, show records.
        view.on("click", async (event: any) => {
          try {
            const point = event.mapPoint;
            if (!point) return;
            await projection.load();
            const projected = projection.project(
              point,
              new SpatialReference({ wkid: UTM_WKID })
            );
            if (
              projected &&
              !Array.isArray(projected) &&
              projected.type === "point"
            ) {
              const p = projected as __esri.Point;
              setUtm(`${p.x.toFixed(3)},${p.y.toFixed(3)}`);
            }
            if (window.google?.maps) {
              new window.google.maps.Geocoder().geocode(
                { location: { lat: point.latitude, lng: point.longitude } },
                (res, status) => {
                  if (status === "OK" && res?.[0])
                    setAddress(res[0].formatted_address);
                }
              );
            }
            mark(point, "orange", "12px", true);
            showZoomIndicator();
            await view.goTo(
              { target: point, zoom: 20 },
              { duration: 1000, easing: "ease-out" }
            );
            setTimeout(async () => {
              const hit = await view.hitTest(event);
              const features = hit.results
                .filter((r: any) => r.graphic?.layer?.type === "feature")
                .map((r: any) => r.graphic);
              if (features.length > 0) {
                view.popup.open({ features, location: point });
              } else {
                view.popup.close();
              }
            }, 500);
          } catch (e) {
            console.error("Error in click handler:", e);
          }
        });

        // Double-click: maximum zoom.
        view.on("double-click", async (event: any) => {
          try {
            const point = event.mapPoint;
            if (!point) return;
            showZoomIndicator();
            await view.goTo(
              { target: point, zoom: 22 },
              { duration: 1500, easing: "ease-out" }
            );
            setTimeout(async () => {
              const hit = await view.hitTest(event);
              const features = hit.results
                .filter((r: any) => r.graphic?.layer?.type === "feature")
                .map((r: any) => r.graphic);
              if (features.length > 0) {
                view.popup.open({ features, location: point });
              } else {
                view.popup.close();
              }
            }, 500);
          } catch (e) {
            console.error("Error in double-click handler:", e);
          }
        });

        setReady(true);
      } catch (e) {
        console.error("Spatial record map failed to start:", e);
        if (!destroyed)
          setMapError(
            "The map could not be loaded. The map service (ArcGIS Online) may be unavailable; check the account and try again."
          );
      }
    })();

    return () => {
      destroyed = true;
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      view?.destroy();
      refs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Address search: Google Places autocomplete on the address box.
  useEffect(() => {
    if (!googleLoaded || !ready || !addressInput.current) return;
    const autocomplete = new google.maps.places.Autocomplete(
      addressInput.current
    );
    const listener = autocomplete.addListener("place_changed", () => {
      const r = refs.current;
      const place = autocomplete.getPlace();
      if (!r || !place.geometry?.location) return;
      const point = new r.mod.Point({
        longitude: place.geometry.location.lng(),
        latitude: place.geometry.location.lat(),
      });
      mark(point, "green", "10px");
      showZoomIndicator();
      r.view.goTo(
        { target: point, zoom: 20 },
        { duration: 1000, easing: "ease-out" }
      );
      setTimeout(() => checkIntersection(point), 500);
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoaded, ready]);

  // Text search: list the matching values of the chosen field.
  useEffect(() => {
    const r = refs.current;
    const text = searchText.trim();
    if (!ready || !r?.layer || !field || text.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const query = r.layer.createQuery();
        // Quotes in what was typed must not end the string early.
        query.where = `${field} LIKE '%${text.replace(/'/g, "''")}%'`;
        query.outFields = [field];
        query.returnGeometry = false;
        const res = await r.layer.queryFeatures(query);
        if (!cancelled)
          setResults(res.features.map((f: any) => String(f.attributes[field])));
      } catch (e) {
        console.error("Search failed:", e);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText, field, ready]);

  const goToUtm = async () => {
    const r = refs.current;
    if (!r) return;
    setMessage(null);
    const parts = utm.trim().split(",");
    if (parts.length !== 2) {
      setMessage(
        "Enter the coordinate as X,Y (for example 542520.253,724085.335)."
      );
      return;
    }
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (isNaN(x) || isNaN(y)) {
      setMessage("The coordinates must be numbers.");
      return;
    }
    try {
      const utmPoint = new r.mod.Point({
        x,
        y,
        spatialReference: new r.mod.SpatialReference({ wkid: UTM_WKID }),
      });
      await r.mod.projection.load();
      const projected = r.mod.projection.project(
        utmPoint,
        r.view.spatialReference
      );
      if (!projected || Array.isArray(projected)) return;
      mark(projected, "red", "10px");
      showZoomIndicator();
      await r.view.goTo(
        { target: projected, zoom: 20 },
        { duration: 1000, easing: "ease-out" }
      );
      setTimeout(() => checkIntersection(projected), 500);
    } catch (e) {
      console.error("Error in goToUtm:", e);
      setMessage("The coordinates could not be processed.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-white p-5 dark:bg-surface">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Spatial Record Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click the map to zoom to level 20 and fill the coordinate and address;
          double-click for maximum zoom (level 22).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="searchField" className={labelClass}>
              <RectangleGroupIcon className="h-4 w-4" /> Select field
            </label>
            <select
              id="searchField"
              className={inputClass}
              value={field}
              onChange={(e) => setField(e.target.value)}
              disabled={!fields.length}
            >
              {fields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fieldSearch" className={labelClass}>
              <MagnifyingGlassIcon className="h-4 w-4" /> Search text
            </label>
            <input
              id="fieldSearch"
              type="text"
              className={inputClass}
              placeholder="Enter search text..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="searchResults" className={labelClass}>
              <ArrowRightIcon className="h-4 w-4" /> Results
              {results.length > 0 && (
                <span className="font-normal normal-case tracking-normal">
                  ({results.length})
                </span>
              )}
            </label>
            <select id="searchResults" className={inputClass}>
              {results.map((value, i) => (
                <option key={`${value}-${i}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="utmCoord" className={labelClass}>
              <MapPinIcon className="h-4 w-4" /> Locate by UTM
            </label>
            <input
              id="utmCoord"
              type="text"
              className={inputClass}
              placeholder="e.g., 542520.253,724085.335"
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToUtm()}
            />
          </div>

          <div>
            <label htmlFor="addressInput" className={labelClass}>
              <BuildingOfficeIcon className="h-4 w-4" /> Search address
            </label>
            <input
              id="addressInput"
              ref={addressInput}
              type="text"
              className={inputClass}
              placeholder="Enter address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!googleLoaded}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={goToUtm}
              disabled={!ready}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Locate coordinate
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {message && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {message}
          </p>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={mapDiv} className="h-[75vh] min-h-120 w-full" />
        {!ready && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
        {mapError && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-surface px-6 text-center text-sm text-red-600"
          >
            {mapError}
          </div>
        )}
        {zooming && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-xs font-medium text-white">
            Zooming to location…
          </div>
        )}
      </div>
    </div>
  );
}
