import { getTickets } from "@/gbc/services/ticketService";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, Clock } from "lucide-react";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminAttendeesPage() {
  const tickets = await getTickets({ status: "COMPLETED" });

  const checkedIn = tickets?.filter((t) => t.checkedIn).length || 0;
  const pending = tickets?.length ? tickets.length - checkedIn : 0;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Attendees</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        View and manage event attendees
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 mb-1">
                Total Attendees
              </p>
              <p className="text-2xl sm:text-3xl font-bold">
                {tickets?.length || 0}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 mb-1">
                Checked In
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {checkedIn}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 mb-1">
                Pending Check-in
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {pending}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-2">
          <h2 className="text-lg sm:text-xl font-bold">Attendee List</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search attendees..."
              className="px-3 sm:px-4 py-2 border rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
            />
            <button className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm hover:bg-purple-700 transition-colors whitespace-nowrap">
              Export
            </button>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {tickets && tickets?.length > 0 ? (
            tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2 sm:gap-0"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base">
                    {ticket.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {ticket.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.profession?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  {ticket.checkedIn ? (
                    <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Checked In
                    </span>
                  ) : (
                    <button className="px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors">
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No attendees found
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
