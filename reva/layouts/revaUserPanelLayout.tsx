"use client";

import { Sidebar, RAIL_WIDTH_CLASS } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { cn } from "@/lib/utils";
import { RevaUserDashboardNavbar } from "@/reva/components/RevaUserDashboardHeader";
import { LogOut } from "lucide-react";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import { useRevaUserAccess } from "@/reva/hooks/useRevaUserAccess";
import RevaLoading from "@/reva/components/RevaLoading";
import { sideBarWidthClass } from "./revaAdminPanelLayout";
import { getNavItemsForRole } from "@/reva/access/routes";
import { Platform } from "@/utils/platform";
import { useRouter } from "next/navigation";
import { VerificationNagBanner } from "@/components/dashboard/VerificationNagBanner";

export default function RevaUserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const { user, isUser, isLoading, userData } = useRevaUserAccess();
  const router = useRouter();
  useNativeAuthRefresh(Platform.REVA);

  const menuList = [
    // reva/access/routes.ts is the single source of truth for which nav
    // items render per role — replaces the hand-written array.
    ...getNavItemsForRole(userData?.role ?? null, "user").map((r) => ({
      icon: r.icon,
      label: r.label,
      url: r.path,
      section: r.section,
    })),
    {
      element: (
        <ConfirmedLogoutLink
          key="logout"
          onConfirm={() => {
            fetch("/api/auth/logout_redirect?from=reva");
            router.push("/reva/login");
          }}
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

  const userName = userData
    ? `${userData.firstName} ${userData.lastName}`.trim()
    : undefined;

  if (isLoading) {
    return <RevaLoading />;
  }

  if (!isUser) {
    return null; // Will redirect via the hook
  }

  if (!sidebar) return null;

  // const { getOpenState, settings } = sidebar;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <RevaUserDashboardNavbar items={menuList} userImageUrl={user?.picture!} />

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] bg-background transition-[margin-left] ease-in-out duration-300",
          "flex overflow-hidden"
        )}
      >
        {sidebar.isOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
            onClick={() => sidebar?.toggleOpen()}
            aria-label="Close sidebar"
          />
        )}

        <div
          className={
            (sidebar.isRailCollapsed ? RAIL_WIDTH_CLASS : sideBarWidthClass) +
            "h-full max-h-full transition-[width] ease-in-out duration-300"
          }
        >
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture!}
            userName={userName}
            userRole={userData?.role}
            sideBarWidthClass={sideBarWidthClass}
            enableRailCollapse
          />
        </div>

        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          <VerificationNagBanner
            platform={Platform.REVA}
            verifyHref="/reva/verify-email"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
