"use client";

import { Loader2, Search } from "lucide-react";
import {
  useDebouncedSearchParam,
  useSearchParamsUpdater,
} from "@/hooks/useSearchParamsUpdater";
import type { GalleryTypeFilter, GallerySort } from "@/gbc/types/gallery";
import type { GBCEdition } from "@/gbc/utils/settings";

const selectClass = "px-4 py-2 border rounded-lg text-sm bg-white";

/** Search, media-type and sort controls for the searchParams-driven admin Gallery page. */
export function GalleryFilters({
  editions,
  edition,
  type,
  sort,
}: {
  editions: GBCEdition[];
  edition: string;
  type: GalleryTypeFilter;
  sort: GallerySort;
}) {
  const updater = useSearchParamsUpdater();
  const { update, isPending } = updater;
  const { value: search, setValue: setSearch } =
    useDebouncedSearchParam(updater);

  return (
    <div
      className="w-full sm:w-auto flex flex-col sm:flex-row gap-2"
      aria-busy={isPending}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search gallery..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 py-2 border rounded-lg text-sm w-full"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
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
      <select
        aria-label="Media type"
        value={type}
        onChange={(e) => update({ type: e.target.value, page: "" })}
        className={selectClass}
      >
        <option value="all">All Media</option>
        <option value="photos">Photos</option>
        <option value="videos">Videos</option>
      </select>
      <select
        aria-label="Sort"
        value={sort}
        onChange={(e) => update({ sort: e.target.value, page: "" })}
        className={selectClass}
      >
        <option value="order">Sort by: Display order</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
      </select>
    </div>
  );
}
