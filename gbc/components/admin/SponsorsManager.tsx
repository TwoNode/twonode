"use client";

import { useState } from "react";
import { SponsorsList } from "./SponsorsList";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Sponsor } from "@/gbc/types/sponsor";

interface SponsorsManagerProps {
  initialSponsors: Sponsor[];
}

export function SponsorsManager({ initialSponsors }: SponsorsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");

  const filteredSponsors = initialSponsors.filter((sponsor) => {
    const matchesSearch = sponsor.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "ALL" || sponsor.tier === selectedTier;

    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">All Sponsors</h2>
          <p className="text-sm text-gray-500">
            {filteredSponsors.length}{" "}
            {filteredSponsors.length === 1 ? "sponsor" : "sponsors"} found
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search sponsors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tiers</SelectItem>
              <SelectItem value="HEADLINE">Headline Sponsor</SelectItem>
              <SelectItem value="IMPACT">Impact Sponsor</SelectItem>
              <SelectItem value="SUPPORTING">Supporting Sponsor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SponsorsList sponsors={filteredSponsors} />
    </div>
  );
}
