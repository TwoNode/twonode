"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import type { BadgeTone } from "./DashboardBadge";

const TONE_CLASSES: Record<Exclude<BadgeTone, "danger">, string> = {
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  neutral: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300",
};

export interface StatCardAccent {
  /** e.g. SURFBOARD_COLORS.primary.main — used for the icon tint on tone="brand". */
  main: string;
  /** Lighter shade used instead of `main` on a dark background, for contrast. */
  light?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  /** Small line under the number breaking it down, e.g. "Pending 3 · Lodged 8 · Queried 1". */
  breakdown?: string;
  icon: LucideIcon;
  tone?: "brand" | Exclude<BadgeTone, "danger">;
  /**
   * Only needed to override the platform's own brand color (rare) — by
   * default tone="brand" reads the --color-brand-primary token, which
   * already resolves to the right product via the DOM's [data-product]
   * scope with no prop-drilling required.
   */
  accent?: StatCardAccent;
  /** Optional up/down change indicator, e.g. { value: "+12%", direction: "up" }. */
  trend?: { value: string; direction: "up" | "down" };
  className?: string;
}

/**
 * Tone-tinted stat card: icon sits in a soft-tinted chip instead of a solid
 * fill, and a breakdown line gives the number context. Replaces the
 * dl/dt/dd + solid-icon-square pattern used across the dashboards today.
 */
export function StatCard({
  label,
  value,
  breakdown,
  icon: Icon,
  tone = "brand",
  accent,
  trend,
  className,
}: StatCardProps) {
  const { theme } = useTheme();
  const isBrand = tone === "brand";
  const brandColor = isBrand
    ? (theme === "dark" && accent?.light) ||
      accent?.main ||
      "var(--color-brand-primary)"
    : undefined;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-2xl border p-5 shadow-sm",
        "border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-semibold shrink-0",
                trend.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              <TrendingUp className={cn("h-3.5 w-3.5", trend.direction === "down" && "rotate-180")} />
              {trend.value}
            </span>
          )}
        </div>
        <strong className="mt-2 block text-[28px] font-bold leading-none tracking-tight text-gray-900 tabular-nums dark:text-white">
          {value}
        </strong>
        {breakdown && (
          <p className="mt-2 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            {breakdown}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
          !isBrand && TONE_CLASSES[tone]
        )}
        style={
          isBrand
            ? {
                background: brandColor?.startsWith("var(")
                  ? `color-mix(in srgb, ${brandColor} ${theme === "dark" ? 15 : 10}%, transparent)`
                  : `${brandColor}${theme === "dark" ? "26" : "1A"}`,
                color: brandColor,
              }
            : undefined
        }
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
