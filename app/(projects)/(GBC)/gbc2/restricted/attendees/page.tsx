import { getGBCTickets } from "../../../actions/ticket-actions";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, Clock } from "lucide-react";

export default async function AdminAttendeesPage() {
  const ticketsResult = await getGBCTickets({ status: "COMPLETED" });
  const tickets = ticketsResult.success ? ticketsResult.data : [];

  const checkedIn = tickets?.filter((t) => t.checkedIn).length || 0;
  const pending = tickets?.length ? tickets.length - checkedIn : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Attendees</h1>
      <p className="text-gray-600 mb-8">View and manage event attendees</p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Total Attendees</p>
              <p className="text-3xl font-bold">{tickets?.length || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Checked In</p>
              <p className="text-3xl font-bold text-green-600">{checkedIn}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Pending Check-in</p>
              <p className="text-3xl font-bold text-yellow-600">{pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Attendee List</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search attendees..."
              className="px-4 py-2 border rounded-lg text-sm"
            />
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
              Export
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {tickets && tickets?.length > 0 ? (
            tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-semibold">{ticket.name}</p>
                  <p className="text-sm text-gray-600">{ticket.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.profession?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  {ticket.checkedIn ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Checked In
                    </span>
                  ) : (
                    <button className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors">
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
