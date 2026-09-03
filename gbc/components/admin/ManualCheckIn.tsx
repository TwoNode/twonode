"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { gbcApi } from "@/gbc/apiClient";
import { toast } from "sonner";
import { Search, CheckCircle, Loader2 } from "lucide-react";

export function ManualCheckIn() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);

    try {
      const result = await gbcApi.tickets.admin.list({
        search: searchTerm,
        status: "COMPLETED",
      });

      if (result.success && result.data) {
        setResults(result.data);

        if (result.data.length === 0) {
          toast.error("No tickets found");
        }
      } else {
        toast.error("Search failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCheckIn(ticketNumber: string) {
    const result = await gbcApi.tickets.admin.checkIn(ticketNumber);

    if (result.success) {
      toast.success(result.data?.message || "Check-in successful!");
      // Remove from results
      setResults(results.filter((t) => t.ticketNumber !== ticketNumber));
    } else {
      toast.error(result.error || "Check-in failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="p-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Search by name, email, or ticket number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">
            {results.length} {results.length === 1 ? "Result" : "Results"} Found
          </h3>

          {results.map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold">{ticket.name}</h4>
                  <p className="text-sm text-gray-600">{ticket.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.ticketNumber} •{" "}
                    {ticket.ticketType.replace("_", " ")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {ticket.checkedIn ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Checked In</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleCheckIn(ticket.ticketNumber)}
                      size="sm"
                    >
                      Check In
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
