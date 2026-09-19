"use client";

import { Loader2, Search } from "lucide-react";
import { useDebouncedSearchParam, useSearchParamsUpdater } from "@/hooks/useSearchParamsUpdater";
import type { GBCEdition } from "@/gbc/utils/settings";
import type { CheckedInFilter } from "@/gbc/utils/ticketListParams";

const selectClass = "px-3 py-2 border rounded-lg text-sm bg-white";

/** Search + check-in + edition filters for the searchParams-driven Attendees and Certificates pages. */
export function TicketListFilters({
  editions,
  checkedIn,
  edition,
}: {
  editions: GBCEdition[];
  checkedIn: CheckedInFilter;
  edition: string;
}) {
  const updater = useSearchParamsUpdater();
  const { update, isPending } = updater;
  const { value: search, setValue: setSearch } = useDebouncedSearchParam(updater);

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3" aria-busy={isPending}>
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search by name, email, or ticket #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      <select
        aria-label="Check-in status"
        value={checkedIn}
        onChange={(e) => update({ checkedIn: e.target.value, page: "" })}
        className={selectClass}
      >
        <option value="all">All Tickets</option>
        <option value="yes">Checked In Only</option>
        <option value="no">Pending Check-in</option>
      </select>
      <select
        aria-label="Edition"
        value={edition}
        onChange={(e) => update({ edition: e.target.value, page: "" })}
        className={selectClass}
      >
        <option value="all">All Editions</option>
        {editions.map((e) => (
          <option key={e.key} value={e.key}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  );
}
