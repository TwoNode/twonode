import { getTicketStats } from "@/gbc/services/ticketService";
import { requireAdmin } from "@/gbc/utils/auth";
import { RecentTickets } from "@/gbc/components/admin/RecentTickets";
import { DashboardOverview } from "@/gbc/components/admin/DashboardOverview";
import { GBC_COLORS } from "@/gbc/colors";

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
      <DashboardOverview userName={user.name} stats={stats} />

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
