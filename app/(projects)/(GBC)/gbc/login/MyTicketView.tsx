import Link from "next/link";
import { CheckCircle2, Clock, Calendar, MapPin } from "lucide-react";
import type { GBCTicket } from "@/prisma/generated";
import type { GBCEdition } from "@/gbc/utils/settings";

const TICKET_TYPE_LABEL: Record<string, string> = {
  EARLY_BIRD: "Early Bird",
  REGULAR: "Regular (Pair)",
  COMPANY: "Company (Group)",
  VIP: "VIP",
  STUDENT: "Student",
};

export default function MyTicketView({
  ticket,
  edition,
  qrUrl,
}: {
  ticket: GBCTicket;
  edition: GBCEdition | null;
  /** Short-lived signed link to the QR code (the stored file is private). */
  qrUrl: string | null;
}) {
  const isPending = ticket.paymentStatus !== "COMPLETED";

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-linear-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
            {edition ? (
              <>
                <div className="text-sm font-semibold text-purple-100 mb-1">
                  GBC {edition.key}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1">
                  {edition.name}
                </h1>
                <p className="text-purple-100 text-sm">{edition.theme}</p>
              </>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold">
                Geospatial Builders Conference
              </h1>
            )}
          </div>

          <div className="p-6 sm:p-8 text-center">
            {isPending ? (
              <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4 shrink-0" />
                Payment not yet confirmed for this ticket
              </div>
            ) : ticket.checkedIn ? (
              <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Checked in
                {ticket.checkedInAt
                  ? ` at ${new Date(ticket.checkedInAt).toLocaleString()}`
                  : ""}
              </div>
            ) : (
              <div className="mb-6 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-800">
                Not yet checked in — bring this QR code to the venue
              </div>
            )}

            {qrUrl && !isPending && (
              <div className="mb-6 flex justify-center">
                <img
                  src={qrUrl}
                  alt={`QR code for ticket ${ticket.ticketNumber}`}
                  className="w-48 h-48 rounded-lg border border-gray-200 shadow-sm"
                />
              </div>
            )}

            <h2 className="text-2xl font-bold mb-1">{ticket.name}</h2>
            <p className="text-gray-500 text-sm mb-4">{ticket.email}</p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-6">
              {TICKET_TYPE_LABEL[ticket.ticketType] ?? ticket.ticketType}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ticket Number</span>
                <span className="font-mono font-medium">
                  {ticket.ticketNumber}
                </span>
              </div>
              {edition && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {new Date(edition.startDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {edition.venue}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/gbc/login"
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            Look up a different ticket
          </Link>
        </div>
      </div>
    </div>
  );
}
