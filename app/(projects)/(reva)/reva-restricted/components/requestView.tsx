"use client";

import { useEffect, useState } from "react";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export type RequestView = "grid" | "list";

const STORAGE_KEY = "reva-admin-request-view";

/** The chosen layout, remembered in this browser (grid until it is known). */
export function useRequestView(): [RequestView, (v: RequestView) => void] {
  const [view, setView] = useState<RequestView>("grid");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const choose = (next: RequestView) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not remembered, still works */
    }
  };

  return [view, choose];
}

/** Grid / list switch for the request lists. */
export function RequestViewToggle({
  view,
  onChange,
}: {
  view: RequestView;
  onChange: (v: RequestView) => void;
}) {
  const options: {
    id: RequestView;
    label: string;
    Icon: typeof ListBulletIcon;
  }[] = [
    { id: "grid", label: "Grid", Icon: Squares2X2Icon },
    { id: "list", label: "List", Icon: ListBulletIcon },
  ];
  return (
    <div
      role="group"
      aria-label="Layout"
      className="inline-flex rounded-lg border border-border bg-white p-0.5 dark:bg-surface"
    >
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            view === id
              ? "bg-surface-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
