"use client";

import { useState } from "react";
import { SpeakersList } from "./SpeakersList";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Speaker } from "@/gbc/types/speaker";

interface SpeakersManagerProps {
  initialSpeakers: Speaker[];
}

export function SpeakersManager({ initialSpeakers }: SpeakersManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");

  const filteredSpeakers = initialSpeakers.filter((speaker) => {
    const matchesSearch = speaker.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "ALL" || speaker.tier === selectedTier;

    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">All Speakers</h2>
          <p className="text-sm text-gray-500">
            {filteredSpeakers.length}{" "}
            {filteredSpeakers.length === 1 ? "speaker" : "speakers"} found
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search speakers..."
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
              <SelectItem value="KEYNOTE">Keynote</SelectItem>
              <SelectItem value="PANELIST">Panelist</SelectItem>
              <SelectItem value="FIRESIDE_CHAT">Fireside Chat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SpeakersList speakers={filteredSpeakers} />
    </div>
  );
}
