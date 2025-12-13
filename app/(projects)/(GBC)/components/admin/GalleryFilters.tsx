"use client";

import { useState } from "react";

interface GalleryFiltersProps {
  onSearchChange?: (search: string) => void;
  onMediaTypeChange?: (type: string) => void;
  onSortChange?: (sort: string) => void;
}

export function GalleryFilters({
  onSearchChange,
  onMediaTypeChange,
  onSortChange,
}: GalleryFiltersProps) {
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [sort, setSort] = useState("newest");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const handleMediaTypeChange = (value: string) => {
    setMediaType(value);
    onMediaTypeChange?.(value);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    onSortChange?.(value);
  };

  return (
    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        placeholder="Search gallery..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="px-4 py-2 border rounded-lg text-sm w-full"
      />
      <select
        value={mediaType}
        onChange={(e) => handleMediaTypeChange(e.target.value)}
        className="px-4 py-2 border rounded-lg text-sm bg-white"
      >
        <option value="all">All Media</option>
        <option value="photos">Photos</option>
        <option value="videos">Videos</option>
        <option value="featured">Featured</option>
      </select>
      <select
        value={sort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="px-4 py-2 border rounded-lg text-sm bg-white"
      >
        <option value="newest">Sort by: Newest</option>
        <option value="oldest">Oldest</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
      </select>
    </div>
  );
}
