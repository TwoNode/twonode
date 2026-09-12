"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface InquiriesFiltersProps {
  currentType?: string;
  currentStatus?: string;
  currentSearch?: string;
}

export function InquiriesFilters({
  currentType,
  currentStatus,
  currentSearch,
}: InquiriesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
  }, []);

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    }, 350);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            defaultValue={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, or subject…"
            className="w-full pl-9 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">Filter by Type</label>
        <select
          className="w-full px-4 py-2 border rounded-lg"
          value={currentType || "all"}
          onChange={(e) => handleTypeChange(e.target.value)}
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
          onChange={(e) => handleStatusChange(e.target.value)}
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
