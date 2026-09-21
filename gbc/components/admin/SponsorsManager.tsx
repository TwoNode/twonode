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
import { Sponsor, type SponsorTier } from "@/gbc/types/sponsor";
import type { GBCEdition } from "@/gbc/utils/settings";

interface SponsorsManagerProps {
  initialSponsors: Sponsor[];
  editions: GBCEdition[];
  tiers: SponsorTier[];
}

export function SponsorsManager({ initialSponsors, editions, tiers }: SponsorsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [selectedEdition, setSelectedEdition] = useState("ALL");

  const filteredSponsors = initialSponsors.filter((sponsor) => {
    const matchesSearch = sponsor.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "ALL" || sponsor.tier === selectedTier;
    const matchesEdition = selectedEdition === "ALL" || sponsor.edition === selectedEdition;

    return matchesSearch && matchesTier && matchesEdition;
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
              {tiers.map((tier) => (
                <SelectItem key={tier.key} value={tier.key}>
                  {tier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEdition} onValueChange={setSelectedEdition}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by edition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Editions</SelectItem>
              {editions.map((edition) => (
                <SelectItem key={edition.key} value={edition.key}>
                  {edition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SponsorsList sponsors={filteredSponsors} tiers={tiers} />
    </div>
  );
}
