"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardBadge, type BadgeTone } from "./DashboardBadge";

export interface DashboardSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  badge?: { label: string; tone: BadgeTone };
}

export interface DashboardSearchProps {
  placeholder?: string;
  /** Fetch matches for the current query. Return [] for no matches. */
  onSearch: (query: string) => Promise<DashboardSearchResult[]>;
  /** Where "View all results" links to once the user has typed something. */
  viewAllHref?: (query: string) => string;
  minChars?: number;
  debounceMs?: number;
  className?: string;
}

/**
 * Debounced topbar search with a live results dropdown. Product-agnostic —
 * the caller supplies the fetcher (e.g. surfboardApi.plans.list under the
 * hood) and how results map to a destination link.
 */
export function DashboardSearch({
  placeholder = "Search…",
  onSearch,
  viewAllHref,
  minChars = 2,
  debounceMs = 300,
  className,
}: DashboardSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const matches = await onSearch(trimmed);
        if (requestId.current === id) {
          setResults(matches);
          setLoading(false);
        }
      } catch {
        if (requestId.current === id) {
          setResults([]);
          setLoading(false);
          setError(true);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minChars, debounceMs]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim();
  const showDropdown = open && trimmed.length >= minChars;

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xs", className)}>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm",
          "border-gray-200 bg-white text-gray-500 focus-within:border-gray-300",
          "dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:focus-within:border-white/20"
        )}
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && viewAllHref && trimmed.length >= minChars) {
              goTo(viewAllHref(trimmed));
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />}
      </div>

      {showDropdown && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border shadow-lg",
            "border-gray-200 bg-white",
            "dark:border-white/10 dark:bg-[#101E2B]"
          )}
        >
          {error && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Couldn't load results. Try again.
            </p>
          )}
          {!error && !loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No matches for "{trimmed}".
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(r.href)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                "hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-gray-900 dark:text-white">
                  {r.title}
                </span>
                {r.subtitle && (
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {r.subtitle}
                  </span>
                )}
              </span>
              {r.badge && (
                <DashboardBadge tone={r.badge.tone} className="flex-shrink-0">
                  {r.badge.label}
                </DashboardBadge>
              )}
            </button>
          ))}
          {viewAllHref && trimmed.length >= minChars && (
            <button
              type="button"
              onClick={() => goTo(viewAllHref(trimmed))}
              className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-gray-50 dark:border-white/10 dark:text-blue-400 dark:hover:bg-white/5"
            >
              View all results for "{trimmed}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
