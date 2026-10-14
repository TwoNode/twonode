"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  BeakerIcon,
  CheckBadgeIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentPlusIcon,
  ListBulletIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type StatCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  /** Set for cards that select something (a tab, a filter) when clicked. */
  key?: string;
};

/** One colour and icon per card id, so the same figure looks the same on every page. */
const LOOK: Record<string, { accent: string; Icon: Icon }> = {
  total: { accent: "#2563eb", Icon: ListBulletIcon },
  none: { accent: "#ef4444", Icon: DocumentPlusIcon },
  review: { accent: "#f59e0b", Icon: ClockIcon },
  approved: { accent: "#10b981", Icon: CheckBadgeIcon },
  unpaid: { accent: "#8b5cf6", Icon: CreditCardIcon },
  fees: { accent: "#0d9488", Icon: BanknotesIcon },
  "pay-total": { accent: "#2563eb", Icon: ListBulletIcon },
  "pay-paid": { accent: "#10b981", Icon: BanknotesIcon },
  "pay-unpaid": { accent: "#ef4444", Icon: CreditCardIcon },
  "pay-processing": { accent: "#f59e0b", Icon: ArrowPathIcon },
  "pay-live": { accent: "#e11d48", Icon: SignalIcon },
  "pay-test": { accent: "#0ea5e9", Icon: BeakerIcon },
};
const FALLBACK = { accent: "#64748b", Icon: ListBulletIcon };

/** The accent colour of a tab, shared with the tab row. */
export const TAB_ACCENT: Record<string, string> = {
  all: "#2563eb",
  oneTime: "#7c3aed",
  regular: "#0891b2",
  none: "#ef4444",
  review: "#f59e0b",
  approved: "#10b981",
};

/** Summary tiles above the lists. The ones with a `key` select it when clicked. */
export function RequestStatCards({
  cards,
  activeKey,
  onSelect,
}: {
  cards: StatCard[];
  activeKey?: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div
      className={cn(
        "mb-6 grid grid-cols-2 gap-3 md:grid-cols-3",
        cards.length === 5 && "xl:grid-cols-5",
        cards.length === 6 && "xl:grid-cols-6"
      )}
    >
      {cards.map((card) => {
        const { accent, Icon } = LOOK[card.id] ?? FALLBACK;
        const interactive = !!card.key && !!onSelect;
        const active = interactive && card.key === activeKey;
        const body = (
          <>
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${accent}1F`, color: accent }}
              >
                <Icon className="h-4 w-4" />
              </span>
            </span>
            <span
              className="mt-2 block text-2xl font-semibold tabular-nums"
              style={{ color: accent }}
            >
              {card.value}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {card.hint}
            </span>
          </>
        );
        const className = cn(
          "flex flex-col items-start justify-start rounded-xl border p-4 text-left"
        );
        const style = {
          backgroundColor: `${accent}${active ? "1A" : "0F"}`,
          borderColor: active ? accent : `${accent}33`,
          boxShadow: active ? `0 0 0 1px ${accent}` : undefined,
        };
        return interactive ? (
          <button
            key={card.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect!(card.key!)}
            className={cn(
              className,
              "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            )}
            style={style}
          >
            {body}
          </button>
        ) : (
          <div key={card.id} className={className} style={style}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
