"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TAB_ACCENT } from "./RequestStatCards";

/** The tab row: each tab has its own colour, filled when selected. */
export function RequestTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-muted p-1 dark:bg-surface-muted">
        {tabs.map((t) => {
          const accent = TAB_ACCENT[t.id] ?? "#2563eb";
          return (
            <TabsTrigger
              key={t.id}
              value={t.id}
              style={{ ["--tab" as string]: accent }}
              className="group gap-2 rounded-md data-[state=active]:bg-(--tab) data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-(--tab) dark:data-[state=active]:text-white"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full group-data-[state=active]:bg-white"
                style={{ backgroundColor: accent }}
              />
              {t.label}
              <span className="text-xs tabular-nums text-muted-foreground group-data-[state=active]:text-white/85">
                {t.count}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
