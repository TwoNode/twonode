import { Ticket, DollarSign, CheckCircle, Clock } from "lucide-react";
import { getTicketStats } from "@/gbc/services/ticketService";
import { requireAdmin } from "@/gbc/utils/auth";
import { RecentTickets } from "@/gbc/components/admin/RecentTickets";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StatCard } from "@/components/dashboard/StatCard";
import { GBC_COLORS, GBC_GRADIENTS } from "@/gbc/colors";

// Admin page gated by a real per-request auth check (requireAdmin) — never safe to statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = {
    name: "John Doe",
    id: "1",
  };
  const stats = await getTicketStats();

  return (
    <div>
      <DashboardHero
        greeting={`Welcome back, ${user.name}.`}
        title="Dashboard"
        description="Ticket sales, check-ins, and payments update automatically as attendees register and check in."
        pills={[
          `${stats.completedTickets} Sold`,
          `${stats.checkedInTickets} Checked In`,
          `${stats.pendingTickets} Pending`,
        ]}
        gradient={GBC_GRADIENTS.hero}
        cta={{ label: "Tickets", href: "/gbc-restricted/tickets", icon: Ticket }}
        className="mb-6 sm:mb-8"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-6 sm:mb-8">
        <StatCard
          label="Total Tickets Sold"
          value={stats.completedTickets}
          breakdown={`${stats.availableTickets} remaining`}
          icon={Ticket}
          tone="brand"
          accent={{ main: GBC_COLORS.primary.main, light: GBC_COLORS.primary.light }}
        />
        <StatCard
          label="Total Revenue"
          value={`₦${(stats.totalRevenue / 1000).toFixed(0)}K`}
          breakdown="From completed sales"
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Checked In"
          value={stats.checkedInTickets}
          breakdown={`${stats.completedTickets - stats.checkedInTickets} pending`}
          icon={CheckCircle}
          tone="info"
        />
        <StatCard
          label="Pending Payments"
          value={stats.pendingTickets}
          breakdown="Awaiting payment"
          icon={Clock}
          tone="warning"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-white">
            Recent Tickets
          </h2>
          <RecentTickets />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-white">
            Quick Actions
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <a
              href="/gbc-restricted/tickets"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: GBC_COLORS.surface.main }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Manage Tickets
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                View and manage all ticket purchases
              </p>
            </a>
            <a
              href="/gbc-restricted/check-in"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: GBC_COLORS.surface.main }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Check-In Attendees
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Scan QR codes for check-in
              </p>
            </a>
            <a
              href="/gbc-restricted/editions"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: "#FCE7F3" }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Manage Editions
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Switch the active edition, review past editions
              </p>
            </a>
            <a
              href="/gbc-restricted/sponsors"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: GBC_COLORS.surface.main }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Manage Sponsors
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Add or edit sponsor information
              </p>
            </a>
            <a
              href="/gbc-restricted/speakers"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: "#FCE7F3" }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Manage Speakers
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Add or edit speakers and their tiers
              </p>
            </a>
            <a
              href="/gbc-restricted/gallery"
              className="block p-3 sm:p-4 rounded-lg transition hover:brightness-95 dark:hover:brightness-125"
              style={{ background: GBC_COLORS.surface.main }}
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
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
