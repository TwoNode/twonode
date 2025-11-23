import { getGBCTickets } from "../../../actions/ticket-actions";
import {
  AdminTicketsTable,
  type Ticket,
} from "../../../components/admin/TicketsTable";
import { ExportButton } from "../../../components/admin/ExportButton";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const { search, status } = await searchParams;
  const ticketsResult = await getGBCTickets({
    search,
    status,
  });

  // Ensure we always pass an array to the TicketsTable
  const tickets: Ticket[] = ticketsResult.success
    ? ticketsResult.data || []
    : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tickets Management</h1>
          <p className="text-sm sm:text-base text-gray-600">
            View and manage all ticket purchases
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <form className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                name="search"
                type="search"
                placeholder="Search by name, email, or ticket number..."
                className="pl-9 sm:pl-10 text-sm sm:text-base"
                defaultValue={searchParams.search}
              />
            </div>
          </div>

          <select
            name="status"
            className="px-3 sm:px-4 py-2 border rounded-lg bg-white text-sm sm:text-base"
            defaultValue={searchParams.status || "all"}
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="submit"
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            Apply Filters
          </button>
        </form>
      </div>

      <AdminTicketsTable tickets={tickets} />
    </div>
  );
}
