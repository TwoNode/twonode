"use client";

import { Loader2, Search } from "lucide-react";
import { useDebouncedSearchParam, useSearchParamsUpdater } from "@/hooks/useSearchParamsUpdater";
import type { GBCEdition } from "@/gbc/utils/settings";

interface InquiriesFiltersProps {
  editions: GBCEdition[];
  currentType?: string;
  currentStatus?: string;
  currentEdition?: string;
}

export function InquiriesFilters({
  editions,
  currentType,
  currentStatus,
  currentEdition,
}: InquiriesFiltersProps) {
  const updater = useSearchParamsUpdater();
  const { update, isPending } = updater;
  const { value: search, setValue: setSearch } = useDebouncedSearchParam(updater);

  // "all" drops the param; every filter change also drops `page` so the list
  // restarts on page 1.
  const onSelect = (key: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    update({ [key]: e.target.value === "all" ? "" : e.target.value, page: "" });

  return (
    <div className="flex flex-col md:flex-row gap-4" aria-busy={isPending}>
      <div className="flex-1 md:flex-[1.5]">
        <label className="block text-sm font-medium mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or subject…"
            className="w-full pl-9 pr-9 py-2 border rounded-lg"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">Filter by Edition</label>
        <select
          className="w-full px-4 py-2 border rounded-lg"
          value={currentEdition || "all"}
          onChange={onSelect("edition")}
        >
          <option value="all">All Editions</option>
          {editions.map((edition) => (
            <option key={edition.key} value={edition.key}>
              {edition.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">Filter by Type</label>
        <select
          className="w-full px-4 py-2 border rounded-lg"
          value={currentType || "all"}
          onChange={onSelect("type")}
        >
          <option value="all">All Types</option>
          <option value="GENERAL">General</option>
          <option value="SPONSORSHIP">Sponsorship</option>
          <option value="TECHNICAL">Technical</option>
          <option value="MEDIA">Media</option>
          <option value="SPEAKING">Speaking</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">
          Filter by Status
        </label>
        <select
          className="w-full px-4 py-2 border rounded-lg"
          value={currentStatus || "all"}
          onChange={onSelect("status")}
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
    </div>
  );
}
