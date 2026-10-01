"use client";

import { useEffect, useState } from "react";
import type { ViewMode } from "@/components/ui/view-toggle";

const STORAGE_PREFIX = "twonodes-view-mode:";

/** Per-page list/grid preference, persisted in localStorage under its own key. */
export function useViewMode(pageKey: string, initial: ViewMode = "list") {
  const [mode, setMode] = useState<ViewMode>(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + pageKey);
      if (stored === "list" || stored === "grid") setMode(stored);
    } catch {
      // localStorage unavailable (private mode, etc.) — just keep the default.
    }
  }, [pageKey]);

  const update = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_PREFIX + pageKey, next);
    } catch {
      // Non-fatal — the toggle still works for the current session.
    }
  };

  return [mode, update] as const;
}
