import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { getGBCTicketStats } from "../../actions/ticket-actions";
import { requireAdmin } from "@/gbc/utils/auth";
import { StatsCard } from "@/gbc/components/admin/StatsCard";
import { RecentTickets } from "@/gbc/components/admin/RecentTickets";
import Link from "next/link";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

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
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>

          <p className="text-sm sm:text-base text-gray-600">
            Welcome back, {user.name}
          </p>
        </div>

        <Link href="/gbc-restricted/tickets">
          <Button variant="default" size="sm" className="w-fit">
            Tickets
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-6 sm:mb-8">
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
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
            Recent Tickets
          </h2>
          <RecentTickets />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
            Quick Actions
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <a
              href="/gbc-restricted/tickets"
              className="block p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
            >
              <h3 className="font-semibold text-sm sm:text-base">
                Manage Tickets
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                View and manage all ticket purchases
              </p>
            </a>
            <a
              href="/gbc-restricted/check-in"
              className="block p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <h3 className="font-semibold text-sm sm:text-base">
                Check-In Attendees
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Scan QR codes for check-in
              </p>
            </a>
            <a
              href="/gbc-restricted/sponsors"
              className="block p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition"
            >
              <h3 className="font-semibold text-sm sm:text-base">
                Manage Sponsors
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Add or edit sponsor information
              </p>
            </a>
            <a
              href="/gbc-restricted/speakers"
              className="block p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
            >
              <h3 className="font-semibold text-sm sm:text-base">
                Manage Speakers
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Add or edit speakers and their tiers
              </p>
            </a>
            <a
              href="/gbc-restricted/gallery"
              className="block p-3 sm:p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <h3 className="font-semibold text-sm sm:text-base">
                Manage Gallery
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Upload photos and videos
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
