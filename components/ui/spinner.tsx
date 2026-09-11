"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
} as const;

export type SpinnerSize = keyof typeof SIZE_CLASSES;

/**
 * Shared spinner icon — the one loading indicator every product should use,
 * in place of the dozen one-off `animate-spin` variants (bare CSS border
 * rings, uncolored Loader2 icons, brand-hardcoded rings) scattered across
 * the codebase. Neutral violet accent so it reads consistently regardless
 * of which product's page it's dropped into.
 */
export function Spinner({ size = "md", className }: { size?: SpinnerSize; className?: string }) {
  return (
    <Loader2
      className={cn(SIZE_CLASSES[size], "animate-spin text-violet-600 dark:text-violet-400", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Drop-in replacement for the common "centered spinner + message, filling
 * the available space" loading state (page bodies, tab panels, modals).
 */
export function PageLoader({
  label,
  size = "xl",
  className,
}: {
  label?: string;
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <Spinner size={size} />
      {label && <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>}
    </div>
  );
}

/** For a full-viewport overlay (initial app/shell load), not a section within an already-rendered page. */
export function FullscreenLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <Spinner size="xl" />
      {label && <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>}
    </div>
  );
}

/** For inline use next to text or inside a button, e.g. `<Button disabled={loading}>{loading && <InlineSpinner />} Save</Button>`. */
export function InlineSpinner({ className }: { className?: string }) {
  return <Spinner size="xs" className={cn("mr-2", className)} />;
}
