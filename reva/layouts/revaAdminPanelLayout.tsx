"use client";

import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { RevaAdminDashboardNavbar } from "@/reva/components/RevaAdminDashboardHeader";
import { LogOut } from "lucide-react";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import { useRevaAdminAccess } from "@/reva/hooks/useRevaAdminAccess";
import RevaLoading from "@/reva/components/RevaLoading";
import { getNavItemsForRole } from "@/reva/access/routes";
import { Platform } from "@/utils/platform";

export const sideBarWidthClass = " lg:w-[284px] ";

export default function RevaAdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const { user, isAdmin, isLoading, userData } = useRevaAdminAccess();
  useNativeAuthRefresh(Platform.REVA);

  const sidebarItems = [
    // reva/access/routes.ts is the single source of truth for which nav
    // items render per role — replaces the hand-written array + the
    // separate canAccessRevaSuperAdminPanel conditional that used to gate
    // just the last two items.
    ...getNavItemsForRole(userData?.role ?? null, "admin").map((r) => ({
      icon: r.icon,
      label: r.label,
      url: r.path,
      section: r.section,
    })),
    {
      element: (
        <ConfirmedLogoutLink
          key="logout"
          postLogoutRedirectURL="/api/auth/logout_redirect"
          trigger={
            <button
              type="button"
              aria-label="Logout"
              title="Logout"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-white/55 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          }
        />
      ),
    },
  ];

  const userName = userData ? `${userData.firstName} ${userData.lastName}`.trim() : undefined;

  if (!sidebar) return null;

  // Show loading state while checking admin access
  if (isLoading) {
    return <RevaLoading />;
  }

  // If not admin, don't render the admin panel
  if (!isAdmin) {
    return null; // Will redirect via the hook
  }

  // const { getOpenState, settings } = sidebar;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen flex">
      {sidebar.isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={() => sidebar?.toggleOpen()}
          aria-label="Close sidebar"
        />
      )}

      <div className={sideBarWidthClass + " relative h-full shrink-0"}>
        <Sidebar
          items={sidebarItems}
          userImageUrl={user?.picture!}
          userName={userName}
          userRole={userData?.role}
          sideBarWidthClass={sideBarWidthClass}
          title="REVA Admin"
          logoSrc="/reva/revaLogo.png"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        <RevaAdminDashboardNavbar
          userImageUrl={user?.picture!}
          userData={userData}
        />

        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
