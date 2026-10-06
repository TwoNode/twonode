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
import { ChevronDown, ChevronUp } from "lucide-react";
import { Plan, PillarData, PLAN_TYPES } from "../../types/surfboardTypes";
import { resolveCsvState } from "@/app/(projects)/(surfboard)/utils/csvState";
import proj4 from "proj4";
import { surfboardApi } from "@/surfboard/apiClient";
import {
  applyVisualizationShift,
  normalizeCsvHeader,
  resolvePillarColumnIndices,
  findCsvColumnIndex,
} from "../../utils/surfboardUtils";

interface AllPlansMapProps {
  plans: Plan[];
  /** Builds the URL a plan's popup should link to — differs between the facilitator and admin map viewers, which share this component. */
  getPlanDetailUrl?: (id: string) => string;
}

const defaultGetPlanDetailUrl = (id: string) =>
  `/surfboard/dashboard/plan?planId=${id}`;

// Temporary plan structure for uploaded CSVs
interface TempPlan extends Omit<Plan, "status"> {
  status: "UPLOADED";
  planType: "CSV";
}

// Define the coordinate reference system for pillar conversion
proj4.defs(
  "EPSG:26331",
  "+proj=utm +zone=31 +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +units=m +no_defs"
);

// Helper to generate a unique signature from pillar data to detect duplicates
const generatePlanSignature = (pillars: PillarData[]): string => {
  if (!pillars || pillars.length === 0) return "";
  // Sort by pillar number to ensure consistent order, then create a string
  const sortedPillars = [...pillars].sort((a, b) =>
    a.pillarNumber.localeCompare(b.pillarNumber)
  );
  return JSON.stringify(
    sortedPillars.map((p) => [p.easting.toFixed(2), p.northing.toFixed(2)])
  );
};

// Symbology is by plan type, not by individual plan — every plan of the
// same type reads as the same color on the map, so the palette below is a
// fixed legend rather than a per-id hash. "CSV" covers locally-uploaded
// plans (see TempPlan below); an unrecognized type falls back to a
// deterministic hash so it's still stable across renders instead of random.
const PLAN_TYPE_COLORS: Record<string, string> = {
  [PLAN_TYPES.APPROVED_LAYOUT]: "#2563eb",
  [PLAN_TYPES.DEED]: "#16a34a",
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE]: "#d97706",
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE_LAYOUT]: "#ca8a04",
  [PLAN_TYPES.PROVISIONAL]: "#7c3aed",
  [PLAN_TYPES.PROVISIONAL_LAYOUT]: "#9333ea",
  [PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION]: "#dc2626",
  CSV: "#0891b2",
};
const fallbackColorCache = new Map<string, string>();
const getColorForPlanType = (planType: string | undefined | null): string => {
  if (!planType) return "#6b7280";
  if (PLAN_TYPE_COLORS[planType]) return PLAN_TYPE_COLORS[planType];
  if (fallbackColorCache.has(planType))
    return fallbackColorCache.get(planType)!;
  let hash = 0;
  for (let i = 0; i < planType.length; i++) {
    hash = planType.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  fallbackColorCache.set(planType, color);
  return color;
};

interface LocationResult {
  name: string;
  lat: number;
  lon: number;
}

// --- Overlay panels ---------------------------------------------------
// Each map overlay is its own memoized component so that a purely-local
// interaction (e.g. collapsing/expanding one panel) never forces React to
// re-render and reconcile the *other* two panels' JSX — this was showing up
// as a ~166-240ms Interaction-to-Next-Paint cost on panel-toggle clicks,
// even though the toggle only visually affects one small panel. Each
// panel's own collapsed/expanded flag lives as local state here rather than
// being lifted to the parent, since nothing outside the panel reads it —
// that alone keeps a toggle click from re-rendering AllPlansMap at all.

interface SearchFiltersPanelProps {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  /** Plans currently matching searchQuery (+ status/type filters) — rendered as a
   * dropdown under the input itself, since previously the only feedback for a
   * search was the (easy to miss) filtered "Database Plans" checklist elsewhere
   * on the page. */
  searchSuggestions: Array<{
    id: string;
    planNumber: string;
    surveyTitle: string;
    facilitator: string;
  }>;
  onSelectSearchSuggestion: (planId: string) => void;
  statusFilter: string[];
  onToggleStatus: (s: string) => void;
  typeFilter: string[];
  onToggleType: (t: string) => void;
  allStatuses: string[];
  allTypes: string[];
  locQuery: string;
  onLocQueryChange: (v: string) => void;
  locResults: LocationResult[];
  onLocResultsChange: (r: LocationResult[]) => void;
  locLoading: boolean;
  onFlyTo: (lat: number, lon: number) => void;
  onCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
}

const SearchFiltersPanel = React.memo(function SearchFiltersPanel({
  searchQuery,
  onSearchQueryChange,
  searchSuggestions,
  onSelectSearchSuggestion,
  statusFilter,
  onToggleStatus,
  typeFilter,
  onToggleType,
  allStatuses,
  allTypes,
  locQuery,
  onLocQueryChange,
  locResults,
  onLocResultsChange,
  locLoading,
  onFlyTo,
  onCsvUpload,
  onClearAll,
}: SearchFiltersPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dismissed on selection, re-armed as soon as the query changes again —
  // mirrors why the location dropdown disappears on pick (there it's driven
  // by locResults being cleared; searchSuggestions is a derived list with no
  // setter of its own, so dismissal needs its own flag instead).
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  useEffect(() => {
    setSuggestionsDismissed(false);
  }, [searchQuery]);

  return (
    <div className="absolute z-50 top-2 left-2 max-w-[calc(100vw-1rem)] bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3 space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Search &amp; Filters
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <>
          <div className="grid grid-cols-[1fr_1fr_auto] max-sm:grid-cols-[1fr] gap-3">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locQuery}
                  onChange={(e) => onLocQueryChange(e.target.value)}
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
                        onFlyTo(r.lat, r.lon);
                        onLocResultsChange([]);
                        onLocQueryChange(r.name);
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Search Plans
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Plan number, title, surveyor..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface-muted text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-blue-400"
              />
              {searchQuery.trim() &&
                !suggestionsDismissed &&
                searchSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {searchSuggestions.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                        onClick={() => {
                          onSelectSearchSuggestion(plan.id);
                          onSearchQueryChange(plan.planNumber);
                          setSuggestionsDismissed(true);
                        }}
                      >
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {plan.planNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {plan.surveyTitle}
                          {plan.facilitator ? ` · ${plan.facilitator}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex flex-col max-sm:grid grid-cols-2 gap-1 items-center">
              {" "}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".csv"
                onChange={onCsvUpload}
                className="hidden"
              />{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-1 px-3 text-xs rounded-lg bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500 dark:border-green-500/40 hover:bg-green-100 dark:hover:bg-green-500/25 transition-colors whitespace-nowrap"
              >
                Upload CSV
              </button>
              <button
                onClick={onClearAll}
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
                    onClick={() => onToggleStatus(s)}
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
                    onClick={() => onToggleType(t)}
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
        </>
      )}
    </div>
  );
});

interface DisplayPanelProps {
  displayMode: "shape" | "dots" | "dots-lines";
  onDisplayModeChange: (m: "shape" | "dots" | "dots-lines") => void;
  activeBasemap: string;
  onBasemapChange: (b: string) => void;
  filteredPlans: (Plan | TempPlan)[];
  visiblePlanIds: string[];
  onToggleVisiblePlan: (id: string, checked: boolean) => void;
  zoomToPlan: (planId: string) => void;
  tempPlans: TempPlan[];
  visibleTempPlanIds: string[];
  onToggleVisibleTempPlan: (id: string, checked: boolean) => void;
  onClearTempPlans: () => void;
  onRemoveTempPlan: (id: string) => void;
}

const DisplayPanel = React.memo(function DisplayPanel({
  displayMode,
  onDisplayModeChange,
  activeBasemap,
  onBasemapChange,
  filteredPlans,
  visiblePlanIds,
  onToggleVisiblePlan,
  zoomToPlan,
  tempPlans,
  visibleTempPlanIds,
  onToggleVisibleTempPlan,
  onClearTempPlans,
  onRemoveTempPlan,
}: DisplayPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const dbPlans = useMemo(
    () => filteredPlans.filter((p) => p.status !== "UPLOADED"),
    [filteredPlans]
  );

  return (
    <div className="absolute z-40 bottom-2 left-2 w-56 bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3 max-h-[70vh] overflow-y-auto">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full text-left mb-1"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Plan Display
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <>
          <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1 mb-2">
            <button
              type="button"
              onClick={() => onDisplayModeChange("shape")}
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
              onClick={() => onDisplayModeChange("dots")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                displayMode === "dots"
                  ? "bg-white dark:bg-surface text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Points
            </button>
            <button
              type="button"
              onClick={() => onDisplayModeChange("dots-lines")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                displayMode === "dots-lines"
                  ? "bg-white dark:bg-surface text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Points + Lines
            </button>
          </div>
          <hr className="my-2 border-gray-200 dark:border-white/10" />
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Basemap
          </div>
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
                  onChange={() => onBasemapChange(k)}
                />{" "}
                <span className="capitalize">{k}</span>
              </label>
            )
          )}
          {tempPlans.length > 0 && (
            <>
              <hr className="my-2 border-gray-200 dark:border-white/10" />
              <div className="flex justify-between items-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Uploaded Layers ({visibleTempPlanIds.length})
                </div>
                <button
                  onClick={onClearTempPlans}
                  className="text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1 mt-1">
                {tempPlans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <label className="flex items-center gap-2 cursor-pointer grow truncate">
                      <input
                        type="checkbox"
                        checked={visibleTempPlanIds.includes(p.id)}
                        onChange={(e) =>
                          onToggleVisibleTempPlan(p.id, e.target.checked)
                        }
                      />{" "}
                      <span
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                        style={{
                          background: getColorForPlanType(p.planType as string),
                        }}
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
                      onClick={() => onRemoveTempPlan(p.id)}
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
          <hr className="my-2 border-gray-200 dark:border-white/10" />
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Database Plans ({visiblePlanIds.length})
          </div>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
            {dbPlans.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={visiblePlanIds.includes(p.id)}
                  onChange={(e) => onToggleVisiblePlan(p.id, e.target.checked)}
                />{" "}
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{
                    background: getColorForPlanType(p.planType as string),
                  }}
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
        </>
      )}
    </div>
  );
});

interface SummaryPanelProps {
  filteredPlans: (Plan | TempPlan)[];
}

const SummaryPanel = React.memo(function SummaryPanel({
  filteredPlans,
}: SummaryPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (filteredPlans.length === 0) return null;

  return (
    <div className="absolute z-40 bottom-3 right-3 max-w-xs overflow-x-hidden bg-white/95 dark:bg-surface/95 rounded-xl border border-gray-200 dark:border-white/10 shadow-md p-3">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Legend
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mt-2">
          {Object.entries(PLAN_TYPE_COLORS)
            .filter(([type]) => type !== "CSV")
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: color }}
                />
                <span
                  className="text-[11px] text-gray-600 dark:text-gray-400 truncate"
                  title={type}
                >
                  {type}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
});

const AllPlansMap: React.FC<AllPlansMapProps> = ({
  plans,
  getPlanDetailUrl = defaultGetPlanDetailUrl,
}) => {
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
  const [displayMode, setDisplayMode] = useState<
    "shape" | "dots" | "dots-lines"
  >("shape");

  // --- Memoized Derived Data ---
  const combinedPlans = useMemo(
    () => [...plans, ...tempPlans],
    [plans, tempPlans]
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

  /** Substring/case-insensitive match against the same fields as the plans search, plus any pillar's pillarNumber — unindexed, client-side (combinedPlans is already loaded in full). */
  const matchesSearchQuery = useCallback(
    (plan: Plan | TempPlan, query: string) =>
      (plan.planNumber ?? "").toLowerCase().includes(query) ||
      (plan.surveyTitle ?? "").toLowerCase().includes(query) ||
      (plan.facilitator ?? "").toLowerCase().includes(query) ||
      (Array.isArray(plan.pillars) &&
        (plan.pillars as PillarData[]).some((p) =>
          (p.pillarNumber ?? "").toLowerCase().includes(query)
        )),
    []
  );

  const filteredPlans = useMemo(() => {
    return combinedPlans.filter((plan) => {
      if (plan.status === "UPLOADED") return true;
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(plan.status);
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(plan.planType as string);
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus && matchesType;
      return matchesStatus && matchesType && matchesSearchQuery(plan, query);
    });
  }, [
    combinedPlans,
    searchQuery,
    statusFilter,
    typeFilter,
    matchesSearchQuery,
  ]);

  // Top matches shown as a dropdown directly under the Search Plans input —
  // filteredPlans itself already drives the (easy-to-miss, separately
  // positioned) "Database Plans" checklist; capped since a broad query can
  // match dozens of plans and this is meant to be a quick-pick list, not a
  // second results table.
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredPlans.slice(0, 8);
  }, [filteredPlans, searchQuery]);

  // Map visibility (which polygons render): status/type only — search never
  // hides a plan from the map, it only highlights matches (see searchMatchIds).
  const visibilityFilteredPlans = useMemo(() => {
    return combinedPlans.filter((plan) => {
      if (plan.status === "UPLOADED") return true;
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(plan.status);
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(plan.planType as string);
      return matchesStatus && matchesType;
    });
  }, [combinedPlans, statusFilter, typeFilter]);

  const searchMatchIds = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return visibilityFilteredPlans
      .filter((plan) => matchesSearchQuery(plan, query))
      .map((plan) => plan.id);
  }, [visibilityFilteredPlans, searchQuery, matchesSearchQuery]);

  useEffect(() => {
    isVisibilityResetRef.current = true;
    setVisiblePlanIds(
      visibilityFilteredPlans
        .filter((p) => p.status !== "UPLOADED")
        .map((p) => p.id)
    );
    setVisibleTempPlanIds(
      visibilityFilteredPlans
        .filter((p) => p.status === "UPLOADED")
        .map((p) => p.id)
    );
  }, [visibilityFilteredPlans]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const flyToLoc = useCallback((lat: number, lon: number) => {
    map.current?.flyTo({ center: [lon, lat], zoom: 15 });
  }, []);

  // Bounds of each plan's *rendered* polygon (after the per-state
  // coordinate-shift correction applied in fetchAndRender below), keyed by
  // plan id — kept in sync every time fetchAndRender runs. zoomToPlan reads
  // from this first so it pans to where the polygon actually is, not to
  // `plan.geometry`'s unshifted bbox (which can be meaningfully offset for
  // any state with a configured shift, making the camera jump to empty
  // space with the plan nowhere in view).
  const planBoundsRef = useRef<Map<string, [number, number, number, number]>>(
    new Map()
  );

  const zoomToPlan = useCallback(
    (planId: string) => {
      const cachedBounds = planBoundsRef.current.get(planId);
      if (cachedBounds) {
        map.current?.fitBounds(cachedBounds, { padding: 50, maxZoom: 17 });
        return;
      }
      // Fallback for a plan fetchAndRender hasn't rendered yet (e.g. a
      // brand-new CSV upload, before its first render pass).
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
    [combinedPlans]
  );

  // Consumed by fetchAndRender: when set, that effect zooms to this specific
  // plan's just-computed bounds instead of running its normal "fit
  // everything visible" auto-fit — deterministic (no fixed-delay timer
  // racing an async coordinate-shift fetch of unknown latency), since it's
  // resolved synchronously within the same render pass that computes bounds.
  const pendingZoomTargetRef = useRef<string | null>(null);

  // True only when the currently-visible set was just reset in bulk (initial
  // load, a status/type filter change, Clear Filters, or a CSV upload) —
  // set by the sync effect below, consumed (and reset) by fetchAndRender.
  // Set to false. Individual checkbox toggles never touch this, so
  // re-checking a box back to "everything visible" does NOT re-trigger the
  // auto-fit — only an actual bulk reset does.
  const isVisibilityResetRef = useRef(false);

  // Incremented on every fetchAndRender effect run; lets a stale (superseded)
  // async invocation detect it's no longer current and bail out. See the
  // comment at its use site in the fetchAndRender effect below.
  const renderGenerationRef = useRef(0);

  const handleCsvUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const newTempPlans: TempPlan[] = [];

      for (const file of Array.from(files)) {
        try {
          const text = await file.text();
          const lines = text.trim().split("\n");
          // Shared with parseCSVContent (surfboardUtils.ts) — this used to be
          // its own, less careful copy (just lowercase + split, no
          // whitespace/punctuation stripping or BOM handling), which could
          // fail to recognize header variants like "Pillar No." or a BOM'd
          // first column that the other CSV upload flow already handled fine.
          const headers = (lines.shift() ?? "")
            .split(",")
            .map(normalizeCsvHeader);
          const {
            pillarNumberIndex: pillarIndex,
            eastingIndex,
            northingIndex,
          } = resolvePillarColumnIndices(headers);
          const stateIndex = findCsvColumnIndex(headers, ["state"]);

          if (
            pillarIndex === -1 ||
            eastingIndex === -1 ||
            northingIndex === -1
          ) {
            console.warn(
              `Skipping file ${file.name}: Missing required columns.`
            );
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
              (p) => p.pillarNumber && !isNaN(p.easting) && !isNaN(p.northing)
            );

          if (pillars.length < 3) continue;

          // A CSV without a state is drawn as Lagos so the map correction
          // applies to it too (see utils/csvState.ts).
          const state = resolveCsvState(
            stateIndex !== -1 ? lines[0]?.split(",")[stateIndex] : null
          );

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
            pendingZoomTargetRef.current = existingPlanId;
            continue;
          }

          const existingTempPlanId = tempPlanSignatures.get(signature);
          if (existingTempPlanId) {
            const existingTempPlan = tempPlans.find(
              (p) => p.id === existingTempPlanId
            );
            setNotification({
              message: `This CSV content is already uploaded as "${existingTempPlan?.planNumber}". Zooming.`,
              type: "info",
            });
            zoomToPlan(existingTempPlanId);
            pendingZoomTargetRef.current = existingTempPlanId;
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
          const newPlanId = `csv-${file.name}-${Date.now()}`;
          pendingZoomTargetRef.current = newPlanId;
          newTempPlans.push({
            id: newPlanId,
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
            state,
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
      // pendingZoomTargetRef (set above per-file) is consumed by fetchAndRender
      // once it re-renders with the new plan and computes its real bounds.
    },
    [dbPlanSignatures, tempPlanSignatures, plans, tempPlans, zoomToPlan]
  );

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
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");
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
          // Fixed red rather than per-type ["get","color"] — the outline's
          // job is to make a plan's boundary clearly visible against any
          // basemap, independent of its fill color.
          "line-color": "#dc2626",
          "line-width": 2,
        },
      });
      map.current.addLayer({
        id: "plans-search-highlight",
        type: "line",
        source: "plansLayer",
        paint: {
          "line-color": "#FDE047",
          "line-width": 4,
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
      // Renders one plan's popup body, with a "1 of N · Next" footer when
      // `group` has more than one plan stacked at this click point
      // (multiple survey plans sharing the same location) — clicking Next
      // advances through the group in the date order it was sorted in
      // (see showPopup below: descending by dateOnSurveyPlan).
      const renderPlanPopup = (
        e: maplibregl.MapMouseEvent,
        group: Record<string, any>[],
        index: number
      ) => {
        if (!map.current) return;
        const properties = group[index];
        // CSV-uploaded rows aren't real saved plans (no detail page to link to).
        const detailUrl =
          properties.id && properties.status !== "UPLOADED"
            ? getPlanDetailUrl(properties.id)
            : null;
        const planNumberHtml = detailUrl
          ? `<a href="${detailUrl}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color:${properties.color}">${properties.planNumber}</a>`
          : `<span style="color:${properties.color}">${properties.planNumber}</span>`;
        const dateLabel = properties.dateOnSurveyPlan
          ? new Date(properties.dateOnSurveyPlan).toLocaleDateString()
          : "N/A";
        const stackNav =
          group.length > 1
            ? `<div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400"><span>${
                index + 1
              } of ${group.length}</span><button type="button" id="popup-next-plan" class="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 font-medium text-gray-700 dark:text-gray-300">Next &rarr;</button></div>`
            : "";
        const popupContent = `<div class="p-1 font-sans"><h3 class="font-bold text-base">${planNumberHtml}</h3><p class="text-sm text-gray-600 dark:text-gray-400">${properties.surveyTitle}</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Surveyor: ${properties.facilitator ?? "Unknown"}</p><p class="text-xs text-gray-500 dark:text-gray-400">Survey date: ${dateLabel}</p><span class="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:text-gray-300">${properties.status}</span>${stackNav}</div>`;
        popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map.current);
        if (group.length > 1) {
          popup
            .getElement()
            ?.querySelector<HTMLButtonElement>("#popup-next-plan")
            ?.addEventListener("click", () => {
              renderPlanPopup(e, group, (index + 1) % group.length);
            });
        }
      };

      const showPopup = (
        e: maplibregl.MapMouseEvent & {
          features?: maplibregl.MapGeoJSONFeature[];
        }
      ) => {
        const features = e.features;
        if (!features?.length || !map.current) return;
        const firstProperties = features[0].properties;
        if (!firstProperties) return;

        if (firstProperties.easting !== undefined) {
          // Pillar points don't cluster — one exact click point is one pillar.
          const properties = firstProperties;
          const popupContent = `<div class="p-1 font-sans"><h3 class="font-bold text-base text-gray-800">Pillar: ${
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
          popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map.current);
          return;
        }

        // Multiple plans can share one location (e.g. a resubmitted/re-surveyed
        // plot) — maplibre hands every plans-fill feature under the click
        // point in `features`, so dedupe by plan id and sort newest-first.
        const uniqueByPlan = new Map<string, Record<string, any>>();
        features.forEach((f) => {
          const id = f.properties?.id;
          if (id && !uniqueByPlan.has(id))
            uniqueByPlan.set(id, f.properties as Record<string, any>);
        });
        const group = Array.from(uniqueByPlan.values()).sort((a, b) => {
          const da = a.dateOnSurveyPlan
            ? new Date(a.dateOnSurveyPlan).getTime()
            : 0;
          const db = b.dateOnSurveyPlan
            ? new Date(b.dateOnSurveyPlan).getTime()
            : 0;
          return db - da;
        });
        if (group.length === 0) return;
        renderPlanPopup(e, group, 0);
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

    // This effect's dependencies can change twice in quick succession for a
    // single logical update — e.g. a CSV upload changes tempPlans, which
    // changes visibilityFilteredPlans (triggering this effect), and the
    // separate sync effect above reacts to that same change a moment later
    // by updating visiblePlanIds/visibleTempPlanIds (triggering this effect
    // again). Both calls to the async fetchAndRender below run concurrently;
    // without this guard, whichever one's `await` happens to resolve last
    // wins and overwrites the other's (possibly more correct/current)
    // planBoundsRef/pendingZoomTargetRef/isVisibilityResetRef state — a race
    // that previously showed up as the camera settling on the wrong view
    // after an upload. Only the most-recently-started invocation is allowed
    // to apply its results.
    renderGenerationRef.current += 1;
    const myGeneration = renderGenerationRef.current;

    const fetchAndRender = async () => {
      const allVisibleIds = [...visiblePlanIds, ...visibleTempPlanIds];
      const polygonFeatures: Feature<
        Polygon | import("geojson").MultiPolygon
      >[] = [];
      const pillarFeatures: Feature<Point>[] = [];

      const shiftsResult = await surfboardApi.settings.coordinateShifts();
      if (myGeneration !== renderGenerationRef.current) return; // superseded by a newer render
      const shifts = shiftsResult.success ? shiftsResult.data : {};

      visibilityFilteredPlans.forEach((plan) => {
        const color = getColorForPlanType(plan.planType as string);
        const stateName = plan.state;

        let hasPillars = false;

        if (Array.isArray(plan.pillars) && plan.pillars.length >= 3) {
          hasPillars = true;
          const shiftedPillars = applyVisualizationShift(
            plan.pillars as PillarData[],
            stateName,
            shifts
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
              })
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
                turf.point(closedCoords.at(-1)!)
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

      const newBoundsMap = new Map<string, [number, number, number, number]>();
      polygonFeatures.forEach((f) => {
        const id = (f.properties as any)?.id;
        if (!id) return;
        try {
          newBoundsMap.set(
            id,
            turf.bbox(f) as [number, number, number, number]
          );
        } catch {
          // malformed geometry — leave unset, zoomToPlan falls back to raw plan.geometry
        }
      });
      planBoundsRef.current = newBoundsMap;

      (map.current?.getSource("plansLayer") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: polygonFeatures as Feature<Polygon>[],
      });
      (map.current?.getSource("pillarsLayer") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: pillarFeatures,
      });

      // `false` (a bare boolean), not `["==", true, false]` — MapLibre's
      // filter validator parses a 3-element array starting with `"=="` as
      // a *legacy* filter (which requires a property-name string in
      // position 1, not a boolean), so that array threw "string expected,
      // boolean found" on every setFilter call whenever nothing was
      // selected/matched, logging a console error each render without
      // actually breaking the "nothing visible" behavior (setFilter left
      // the layer's previous filter in place on a thrown validation
      // error). A bare boolean is valid as an expression-style filter and
      // means exactly the same thing: match nothing.
      const filter = (
        allVisibleIds.length > 0
          ? ["in", ["get", "id"], ["literal", allVisibleIds]]
          : false
      ) as FilterSpecification;
      const pillarFilter = (
        allVisibleIds.length > 0
          ? ["in", ["get", "planId"], ["literal", allVisibleIds]]
          : false
      ) as FilterSpecification;

      map.current?.setFilter("plans-fill", filter);
      map.current?.setFilter("plans-outline", filter);
      map.current?.setFilter("plans-labels", filter);
      map.current?.setFilter("pillars-symbol", pillarFilter);

      // Search highlight — a distinct layer on top of plans-outline, never
      // hiding anything; empty when there's no active search.
      const highlightFilter = (
        searchMatchIds.length > 0
          ? ["in", ["get", "id"], ["literal", searchMatchIds]]
          : false
      ) as FilterSpecification;
      map.current?.setFilter("plans-search-highlight", highlightFilter);

      // A pending specific-plan zoom (search-list click, CSV upload target)
      // always wins over the general auto-fit below, using the bounds just
      // computed above from this same render pass — deterministic, not
      // racing the coordinateShifts fetch on a fixed timer.
      if (pendingZoomTargetRef.current) {
        const targetId = pendingZoomTargetRef.current;
        pendingZoomTargetRef.current = null;
        const targetBounds = planBoundsRef.current.get(targetId);
        if (targetBounds) {
          map.current?.fitBounds(targetBounds, { padding: 50, maxZoom: 17 });
        }
      } else if (isVisibilityResetRef.current) {
        // Only auto-fit the camera when this render was triggered by a bulk
        // reset of the visible set (initial load, a status/type filter
        // change, Clear Filters, or a CSV upload) — never by an individual
        // checkbox toggle, even one that happens to land back on "every
        // plan visible" (re-checking the last unchecked plan). That
        // distinction is what isVisibilityResetRef tracks; a plain
        // "everything currently visible" check can't tell those two cases
        // apart, which previously made re-checking a box zoom out to fit
        // all plans exactly like a filter reset would.
        const availableIds = new Set(visibilityFilteredPlans.map((p) => p.id));
        const isFullSelection =
          allVisibleIds.length === availableIds.size &&
          allVisibleIds.every((id) => availableIds.has(id));

        if (
          isFullSelection &&
          polygonFeatures.length > 0 &&
          allVisibleIds.length > 0
        ) {
          const visibleFeatures = polygonFeatures.filter((f) =>
            allVisibleIds.includes(f.properties?.id)
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
      }
      isVisibilityResetRef.current = false;
    };

    fetchAndRender();
  }, [
    visibilityFilteredPlans,
    isReady,
    visiblePlanIds,
    visibleTempPlanIds,
    searchMatchIds,
  ]);

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

  // Toggle between the filled plan polygons and the raw pillar dots — the
  // two layers already render from separate sources, so this is just a
  // visibility swap rather than a re-render of the underlying data.
  useEffect(() => {
    if (!map.current || !isReady) return;
    if (
      !map.current.getLayer("plans-fill") ||
      !map.current.getLayer("pillars-symbol") ||
      !map.current.getLayer("plans-outline")
    )
      return;
    // Default ("shape") mode shows the filled shape, its red outline, AND
    // the pillar points together — "points" is only hidden in the
    // "shape"-exclusive sense the display-mode toggle never actually offers
    // (there's no shape-only mode), so it's really "points always visible,
    // shape visible except in point-only mode."
    map.current.setLayoutProperty(
      "plans-fill",
      "visibility",
      displayMode === "shape" ? "visible" : "none"
    );
    map.current.setLayoutProperty(
      "plans-outline",
      "visibility",
      displayMode === "shape" || displayMode === "dots-lines"
        ? "visible"
        : "none"
    );
    map.current.setLayoutProperty("pillars-symbol", "visibility", "visible");
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
    }, 500);
    return () => clearTimeout(handler);
  }, [locQuery]);

  const clearAll = useCallback(() => {
    setSearchQuery("");
    setStatusFilter([]);
    setTypeFilter([]);
    setLocQuery("");
    setLocResults([]);
    map.current?.flyTo({ center: [3.3792, 6.5244], zoom: 10 });
  }, []);
  const clearTempPlans = useCallback(() => {
    setTempPlans([]);
  }, []);
  const removeTempPlan = useCallback((idToRemove: string) => {
    setTempPlans((prev) => prev.filter((p) => p.id !== idToRemove));
  }, []);

  const toggleStatus = useCallback((s: string) => {
    setStatusFilter((p) =>
      p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
    );
  }, []);
  const toggleType = useCallback((t: string) => {
    setTypeFilter((p) =>
      p.includes(t) ? p.filter((x) => x !== t) : [...p, t]
    );
  }, []);
  const toggleVisiblePlan = useCallback((id: string, checked: boolean) => {
    setVisiblePlanIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }, []);
  const toggleVisibleTempPlan = useCallback((id: string, checked: boolean) => {
    setVisibleTempPlanIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }, []);
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

      <SearchFiltersPanel
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchSuggestions={searchSuggestions}
        onSelectSearchSuggestion={zoomToPlan}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        typeFilter={typeFilter}
        onToggleType={toggleType}
        allStatuses={allStatuses}
        allTypes={allTypes}
        locQuery={locQuery}
        onLocQueryChange={setLocQuery}
        locResults={locResults}
        onLocResultsChange={setLocResults}
        locLoading={locLoading}
        onFlyTo={flyToLoc}
        onCsvUpload={handleCsvUpload}
        onClearAll={clearAll}
      />

      <DisplayPanel
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        activeBasemap={activeBasemap}
        onBasemapChange={setActiveBasemap}
        filteredPlans={filteredPlans}
        visiblePlanIds={visiblePlanIds}
        onToggleVisiblePlan={toggleVisiblePlan}
        zoomToPlan={zoomToPlan}
        tempPlans={tempPlans}
        visibleTempPlanIds={visibleTempPlanIds}
        onToggleVisibleTempPlan={toggleVisibleTempPlan}
        onClearTempPlans={clearTempPlans}
        onRemoveTempPlan={removeTempPlan}
      />

      <SummaryPanel filteredPlans={filteredPlans} />
    </div>
  );
};

export default AllPlansMap;
