import { getGBCTickets } from "../../actions/ticket-actions";
import { formatDate } from "../../utils";

export async function RecentTickets() {
  const result = await getGBCTickets({ limit: 5 });

  if (!result.success || !result.data) {
    return <p className="text-gray-500">No tickets found</p>;
  }

  const tickets = result.data;

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div>
            <p className="font-medium">{ticket.name}</p>
            <p className="text-sm text-gray-600">{ticket.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {ticket.ticketType.replace("_", " ")}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(ticket.createdAt)}
            </p>
          </div>
        </div>
      ))}
      <a
        href="/gbc-restricted/tickets"
        className="block text-center text-sm text-purple-600 hover:text-purple-700 font-medium"
      >
        View all tickets →
      </a>
    </div>
  );
}
