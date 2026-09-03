"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface InquiriesFiltersProps {
  currentType?: string;
  currentStatus?: string;
}

export function InquiriesFilters({
  currentType,
  currentStatus,
}: InquiriesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    router.push(`?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
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
