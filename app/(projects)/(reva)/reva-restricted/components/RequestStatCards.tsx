"use client";

import { cn } from "@/lib/utils";
import { revaStatusBadgeStyle } from "@/reva/colors";
import type { RequestTone } from "./requestUi";
import type { RequestTab } from "./requestStats";

export type StatCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone?: RequestTone;
  /** Set for cards that open a tab when clicked. */
  tab?: RequestTab;
};

/** Summary tiles above the request tabs. The ones tied to a tab switch to it. */
export function RequestStatCards({
  cards,
  activeTab,
  onSelectTab,
}: {
  cards: StatCard[];
  activeTab: RequestTab;
  onSelectTab: (tab: RequestTab) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const interactive = !!card.tab;
        const active = interactive && card.tab === activeTab;
        const body = (
          <>
            <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {card.tone && (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: revaStatusBadgeStyle(card.tone).color,
                  }}
                />
              )}
              {card.label}
            </span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums text-foreground">
              {card.value}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {card.hint}
            </span>
          </>
        );
        const className = cn(
          "flex flex-col items-start justify-start rounded-xl border bg-white p-4 text-left dark:bg-surface",
          active ? "border-foreground/40" : "border-border"
        );
        return interactive ? (
          <button
            key={card.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectTab(card.tab!)}
            className={cn(
              className,
              "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            )}
          >
            {body}
          </button>
        ) : (
          <div key={card.id} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
