"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail, CheckSquare, Square, Loader2 } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";
import { toast } from "sonner";
import { SearchParamsPagination } from "@/components/ui/search-params-pagination";
import { TicketListFilters } from "@/gbc/components/admin/TicketListFilters";
import type { GBCEdition } from "@/gbc/utils/settings";
import type { CheckedInFilter } from "@/gbc/utils/ticketListParams";

interface CertificateTicket {
  id: string;
  name: string;
  email: string;
  ticketNumber: string;
  checkedIn: boolean;
  certificateSentCount: number;
}

interface CertificatesClientProps {
  tickets: CertificateTicket[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  stats: { checkedIn: number; certificatesSent: number };
  editions: GBCEdition[];
  filters: { search?: string; checkedIn: CheckedInFilter; edition: string };
}

export default function CertificatesClient({
  tickets,
  pagination,
  stats,
  editions,
  filters,
}: CertificatesClientProps) {
  const router = useRouter();
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  // The default message names the edition being filtered (from the database),
  // or the conference generally when every edition is shown. `null` means the
  // admin hasn't typed anything, so the default keeps following the filter.
  const editionName =
    editions.find((e) => e.key === filters.edition)?.name ?? "Geospatial Builders Conference (GBC)";
  const defaultBody = `Thank you for attending ${editionName}!\n\nWe appreciate your active participation and are thrilled to have you as part of our geospatial community.`;
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const emailBody = editedBody ?? defaultBody;
  const [isSending, setIsSending] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const allSelected =
    pagination.total > 0 &&
    selectedTickets.size === pagination.total &&
    tickets.every((t) => selectedTickets.has(t.ticketNumber));

  const toggleSelection = (ticketNumber: string) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketNumber)) {
      newSelection.delete(ticketNumber);
    } else {
      newSelection.add(ticketNumber);
    }
    setSelectedTickets(newSelection);
  };

  // "Select All" covers every ticket matching the filters, not just the
  // rendered page, so it asks the server for the full list of numbers.
  const toggleSelectAll = async () => {
    if (allSelected) {
      setSelectedTickets(new Set());
      return;
    }

    setIsSelectingAll(true);
    try {
      const res = await gbcApi.certificates.recipients(filters);
      if (res.success) {
        setSelectedTickets(new Set(res.data.ticketNumbers));
      } else {
        toast.error(res.error || "Failed to select all attendees.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSelectingAll(false);
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
        // Sent counts and the "Certificates Sent" stat live on the server.
        router.refresh();
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
                onChange={(e) => setEditedBody(e.target.value)}
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
             <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
             <p className="text-sm text-gray-500">Checked In</p>
          </Card>
          <Card className="p-4 flex flex-col justify-center items-center text-center bg-gray-50">
             <Mail className="w-8 h-8 text-blue-600 mb-2" />
             <p className="text-2xl font-bold text-gray-900">{stats.certificatesSent}</p>
             <p className="text-sm text-gray-500">Certificates Sent</p>
          </Card>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-lg sm:text-xl font-bold">Select Attendees</h2>
          <TicketListFilters editions={editions} checkedIn={filters.checkedIn} edition={filters.edition} />
        </div>

        <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
          <button
            onClick={toggleSelectAll}
            disabled={isSelectingAll || pagination.total === 0}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            {isSelectingAll ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            ) : allSelected ? (
              <CheckSquare className="w-5 h-5 text-purple-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
            Select All ({pagination.total})
          </button>
          <span className="text-sm text-gray-500">{selectedTickets.size} selected</span>
        </div>

        <div className="space-y-2 max-h-150 overflow-y-auto pr-2">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
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

        {pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} • {pagination.total} attendees
            </p>
            <SearchParamsPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
