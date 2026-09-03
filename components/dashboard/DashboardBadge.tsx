import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  warning:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  danger:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  neutral:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
};

export interface DashboardBadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/** Shared status-badge look for REVA/Surfboard/GBC — one tone system instead of a per-product one. */
export function DashboardBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: DashboardBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold leading-none",
        TONE_CLASSES[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
