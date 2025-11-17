import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { getGBCTicketStats } from "../../actions/ticket-actions";
import { requireAdmin } from "../../utils/auth";
import { StatsCard } from "../../components/admin/StatsCard";
import { RecentTickets } from "../../components/admin/RecentTickets";

export default async function AdminDashboard() {
  const user = {
    name: "John Doe",
    id: "1",
  };
  const statsResult = await getGBCTicketStats();

  if (!statsResult.success) {
    return <div>Error loading stats</div>;
  }

  const stats = statsResult.data!;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>
        <LogoutLink>
          <Button variant="outline">Sign Out</Button>
        </LogoutLink>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Tickets Sold"
          value={stats.completedTickets}
          subtitle={`${stats.availableTickets} remaining`}
          icon="ticket"
          color="purple"
        />
        <StatsCard
          title="Total Revenue"
          value={`₦${(stats.totalRevenue / 1000).toFixed(0)}K`}
          subtitle="From completed sales"
          icon="money"
          color="green"
        />
        <StatsCard
          title="Checked In"
          value={stats.checkedInTickets}
          subtitle={`${
            stats.completedTickets - stats.checkedInTickets
          } pending`}
          icon="check"
          color="blue"
        />
        <StatsCard
          title="Pending Payments"
          value={stats.pendingTickets}
          subtitle="Awaiting payment"
          icon="clock"
          color="yellow"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Tickets</h2>
          <RecentTickets />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/gbc2/restricted/tickets"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
            >
              <h3 className="font-semibold">Manage Tickets</h3>
              <p className="text-sm text-gray-600">
                View and manage all ticket purchases
              </p>
            </a>
            <a
              href="/gbc2/restricted/check-in"
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <h3 className="font-semibold">Check-In Attendees</h3>
              <p className="text-sm text-gray-600">
                Scan QR codes for check-in
              </p>
            </a>
            <a
              href="/gbc2/restricted/sponsors"
              className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition"
            >
              <h3 className="font-semibold">Manage Sponsors</h3>
              <p className="text-sm text-gray-600">
                Add or edit sponsor information
              </p>
            </a>
            <a
              href="/gbc2/restricted/gallery"
              className="block p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <h3 className="font-semibold">Manage Gallery</h3>
              <p className="text-sm text-gray-600">Upload photos and videos</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
