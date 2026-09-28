"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { useSearchParamsUpdater } from "@/hooks/useSearchParamsUpdater";
import { gbcApi } from "@/gbc/apiClient";
import type { GBCEdition } from "@/gbc/utils/settings";
import { GBC_EDITION_COOKIE } from "@/gbc/utils/editionCookie";

const LAST_EDITION_KEY = "gbc-admin-selected-edition";
const ALL_EDITIONS_VALUE = "all";

/**
 * Navbar-level edition switcher, sitting above every admin page rather than
 * duplicated per-page (previously only Settings had its own local picker —
 * SettingsEditionPicker). Writes the same `?edition=` query param the
 * current page reads, so switching here immediately re-scopes that page's
 * data to the selected edition (or clears the filter entirely for "All
 * editions"). Also written to a cookie (gbc/utils/editionCookie.ts), not
 * just localStorage — a plain sidebar `<Link>` doesn't carry query params
 * across navigation, so localStorage alone can't inform a page's *server*
 * render of the last selection; the cookie can, since it travels with the
 * request. Every admin page that filters by edition reads that cookie as
 * its fallback default when its own `?edition=` is absent, so the
 * selection now persists across navigation instead of being page-local.
 * A page's own local edition filter (if it has one) always overrides this
 * for that page specifically — see editionCookie.ts.
 */
export function GBCEditionSwitcher() {
  const [editions, setEditions] = useState<GBCEdition[] | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { update, isPending, searchParams } = useSearchParamsUpdater();

  useEffect(() => {
    let cancelled = false;
    gbcApi.editions.list().then((res) => {
      if (!cancelled && res.success) setEditions(res.data);
    });
    try {
      setLastSaved(localStorage.getItem(LAST_EDITION_KEY));
    } catch {
      // Ignore — falls back to the active edition below.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!editions || editions.length === 0) return null;

  const activeKey = editions.find((e) => e.status === "ACTIVE")?.key ?? editions[0].key;
  const current = searchParams.get("edition") || lastSaved || activeKey;
  const currentEdition = editions.find((e) => e.key === current);

  return (
    <div className="flex items-center gap-1.5">
      <CalendarRange className="h-4 w-4 text-gray-400 shrink-0" />
      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      <select
        aria-label="Switch edition"
        value={currentEdition?.key ?? current}
        onChange={(e) => {
          try {
            localStorage.setItem(LAST_EDITION_KEY, e.target.value);
          } catch {
            // Best-effort only — the query param below is the real state.
          }
          try {
            // 1 year, readable by any admin page's server render.
            document.cookie = `${GBC_EDITION_COOKIE}=${encodeURIComponent(e.target.value)}; path=/; max-age=31536000; SameSite=Lax`;
          } catch {
            // Best-effort — worst case, cross-page persistence just doesn't kick in.
          }
          update({ edition: e.target.value });
        }}
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value={ALL_EDITIONS_VALUE}>All editions</option>
        {editions.map((e) => (
          <option key={e.key} value={e.key}>
            {e.name}
            {e.status === "ACTIVE" ? " (Active)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
