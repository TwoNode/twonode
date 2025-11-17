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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tickets Management</h1>
          <p className="text-gray-600">View and manage all ticket purchases</p>
        </div>
        <ExportButton />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <form className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                name="search"
                type="search"
                placeholder="Search by name, email, or ticket number..."
                className="pl-10"
                defaultValue={searchParams.search}
              />
            </div>
          </div>

          <select
            name="status"
            className="px-4 py-2 border rounded-lg bg-white"
            defaultValue={searchParams.status || "all"}
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      <AdminTicketsTable tickets={tickets} />
    </div>
  );
}
