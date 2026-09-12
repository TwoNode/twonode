"use client";

import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid";

/**
 * Shared list/grid switcher for admin pages with a listing — one control
 * instead of each page building its own. Persists per page via the caller's
 * own state (see useViewMode) so the choice survives a refresh.
 */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-gray-300 dark:border-white/15 p-0.5", className)}>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          value === "list"
            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={value === "grid"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          value === "grid"
            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
