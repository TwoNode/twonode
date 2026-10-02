"use client";

import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  /** yyyy-mm-dd, straight out of an `<input type="date">`. */
  from?: string;
  to?: string;
}

export interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  label?: string;
  className?: string;
}

/**
 * Dashboard-wide date-range filter, scoped to a single field per caller
 * (Surfboard filters on `dateOnSurveyPlan`) — product-agnostic so any
 * dashboard can drop it in without re-implementing the two-input-plus-clear
 * pattern.
 */
export function DateRangeFilter({
  value,
  onChange,
  label = "Survey plan date",
  className,
}: DateRangeFilterProps) {
  const hasRange = !!(value.from || value.to);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <CalendarRange className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        type="date"
        value={value.from ?? ""}
        onChange={(e) =>
          onChange({ ...value, from: e.target.value || undefined })
        }
        max={value.to}
        className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-sm text-gray-700 outline-none focus:border-gray-300 dark:border-white/10 dark:text-gray-200 dark:scheme-dark"
      />
      <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
      <input
        type="date"
        value={value.to ?? ""}
        onChange={(e) =>
          onChange({ ...value, to: e.target.value || undefined })
        }
        min={value.from}
        className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-sm text-gray-700 outline-none focus:border-gray-300 dark:border-white/10 dark:text-gray-200 dark:scheme-dark"
      />
      {hasRange && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-1 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  );
}
