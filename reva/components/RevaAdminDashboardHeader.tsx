import Link from "next/link";
import React from "react";
import { Menu as MenuIcon } from "lucide-react";
import { MenuProps } from "@/components/sidebars/menu";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import NotificationBell from "@/components/NotificationBell";
import { canAccessRevaSuperAdminPanel } from "@/permissions";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  emailVerified: boolean;
}

interface DashboardNavbarProps extends Pick<MenuProps, "userImageUrl"> {
  userData?: UserData | any;
}

/**
 * Slim top bar scoped to the content column only — the admin panel's
 * branding/logo now lives in the full-height Sidebar itself (see
 * revaAdminPanelLayout.tsx), matching the "admin/mda platforms get the
 * top-to-bottom sidebar pattern" convention. This bar just carries the
 * per-page utilities (mobile nav toggle, notifications, the role-based CTA)
 * that don't belong in the persistent sidebar.
 */
export const RevaAdminDashboardNavbar = ({
  userData,
}: DashboardNavbarProps) => {
  const sidebar = useStore(useSidebar, (x) => x);

  return (
    <div
      className="w-full max-w-full h-16 shrink-0 px-4 sm:px-6 justify-between items-center flex"
      style={{ background: REVA_GRADIENTS.header }}
    >
      <button
        onClick={() => sidebar?.toggleOpen()}
        className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        <MenuIcon className="w-6 h-6 text-white" />
      </button>

      <div className="flex-1" />

      <div className="justify-start items-center gap-2.5 flex">
        <NotificationBell
          platform="reva"
          viewAllHref="/reva-restricted/dashboard/notifications"
          iconClassName="h-[30px] w-[30px] text-white"
        />

        {userData &&
        userData?.role &&
        canAccessRevaSuperAdminPanel(userData.role) ? (
          <Link
            href="/reva-restricted/dashboard/superadmin"
            className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 ease-in-out hover:scale-105 hover:brightness-130"
            style={{
              background: `linear-gradient(to right, ${REVA_COLORS.primary.main}, ${REVA_COLORS.secondary.main})`,
            }}
          >
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: REVA_COLORS.text.light }}
            >
              Invite Admin
            </span>
          </Link>
        ) : (
          <Link
            href="/reva-restricted/dashboard/alluserrequests"
            className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 ease-in-out hover:scale-105 hover:brightness-130"
            style={{
              background: `linear-gradient(to right, ${REVA_COLORS.primary.main}, ${REVA_COLORS.secondary.main})`,
            }}
          >
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: REVA_COLORS.text.light }}
            >
              All Requests
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};
