"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, Mail, CheckSquare, Square, Loader2 } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";
import { toast } from "sonner";

export default function CertificatesClient({ initialTickets }: { initialTickets: any[] }) {
  const [tickets, setTickets] = useState(initialTickets || []);
  const [filter, setFilter] = useState<"ALL" | "CHECKED_IN" | "PENDING">("CHECKED_IN");
  const [search, setSearch] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [emailBody, setEmailBody] = useState(
    "Thank you for attending Geospatial Builders Conference (GBC) 2.0!\n\nWe appreciate your active participation and are thrilled to have you as part of our geospatial community."
  );
  const [isSending, setIsSending] = useState(false);

  const filteredTickets = tickets.filter((t: any) => {
    const matchesFilter = 
      filter === "ALL" ? true :
      filter === "CHECKED_IN" ? t.checkedIn === true :
      t.checkedIn === false;
      
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  const toggleSelection = (ticketNumber: string) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketNumber)) {
      newSelection.delete(ticketNumber);
    } else {
      newSelection.add(ticketNumber);
    }
    setSelectedTickets(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map((t: any) => t.ticketNumber)));
    }
  };

  const handleSendCertificates = async () => {
    if (selectedTickets.size === 0) {
      toast.error("Please select at least one attendee.");
      return;
    }
    if (!emailBody.trim()) {
      toast.error("Please provide a message for the email body.");
      return;
    }

    setIsSending(true);
    try {
      const selected = Array.from(selectedTickets);
      const res = await gbcApi.certificates.sendBulk(selected, emailBody);
      if (res.success) {
        toast.success(res.data.message);
        setSelectedTickets(new Set());
        // Update local state to reflect sent count implicitly (or refetch if we wanted to)
        const updatedTickets = tickets.map(t => {
          if (selected.includes(t.ticketNumber)) {
            return { ...t, certificateSentCount: (t.certificateSentCount || 0) + 1 };
          }
          return t;
        });
        setTickets(updatedTickets);
      } else {
        toast.error(res.error || "Failed to send certificates.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            Email Composition
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message Body
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-40 p-3 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your congratulatory message..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will appear above the "View & Download Certificate" button.
              </p>
            </div>
            
            <button
              onClick={handleSendCertificates}
              disabled={isSending || selectedTickets.size === 0}
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="w-4 h-4" /> Send to {selectedTickets.size} Attendee(s)</>
              )}
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50">
             <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
             <p className="text-2xl font-bold text-gray-900">{tickets.filter((t: any) => t.checkedIn).length}</p>
             <p className="text-sm text-gray-500">Checked In</p>
          </Card>
          <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50">
             <Mail className="w-8 h-8 text-blue-600 mb-2" />
             <p className="text-2xl font-bold text-gray-900">{tickets.filter((t: any) => t.certificateSentCount > 0).length}</p>
             <p className="text-sm text-gray-500">Certificates Sent</p>
          </Card>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-lg sm:text-xl font-bold">Select Attendees</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="ALL">All Tickets</option>
              <option value="CHECKED_IN">Checked In Only</option>
              <option value="PENDING">Pending Check-in</option>
            </select>
            <input
              type="text"
              placeholder="Search by name, email, or ticket #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-full sm:w-64"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {selectedTickets.size === filteredTickets.length && filteredTickets.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-purple-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
            Select All ({filteredTickets.length})
          </button>
          <span className="text-sm text-gray-500">{selectedTickets.size} selected</span>
        </div>

        <div className="space-y-2 max-h-150 overflow-y-auto pr-2">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket: any) => (
              <div
                key={ticket.id}
                onClick={() => toggleSelection(ticket.ticketNumber)}
                className={`flex items-center gap-4 p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedTickets.has(ticket.ticketNumber) 
                    ? "bg-purple-50 border-purple-200" 
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="shrink-0">
                  {selectedTickets.has(ticket.ticketNumber) ? (
                    <CheckSquare className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div>
                    <p className="font-medium text-gray-900 truncate">{ticket.name}</p>
                    <p className="text-sm text-gray-500 truncate">{ticket.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ticket #{ticket.ticketNumber}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-right">
                    {ticket.checkedIn ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium whitespace-nowrap">
                        Checked In
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium whitespace-nowrap">
                        Pending
                      </span>
                    )}
                    {ticket.certificateSentCount > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium whitespace-nowrap">
                        Sent ({ticket.certificateSentCount})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No attendees match your filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
