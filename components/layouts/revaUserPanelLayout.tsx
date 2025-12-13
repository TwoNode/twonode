"use client";

import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { RevaUserDashboardNavbar } from "@/components/headers/RevaUserDashboardHeader";
import {
  Home,
  ListChecks,
  Map,
  FilePlus,
  Settings,
  LogOut,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useRevaUserAccess } from "@/hooks/useRevaUserAccess";
import RevaLoading from "@/components/admin-panel/RevaLoading";
import { REVA_COLORS } from "@/reva-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";

export default function RevaUserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/reva/dashboard";
  const { user, isUser, isLoading } = useRevaUserAccess();

  const menuList = [
    { icon: Home, label: "Home", url: dashboardUrl },
    {
      icon: ListChecks,
      label: "All Requests",
      url: `${dashboardUrl}/allrequests`,
    },
    { icon: Map, label: "View Map", url: `${dashboardUrl}/viewmap` },
    { icon: FilePlus, label: "New Request", url: `${dashboardUrl}/newrequest` },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },
    {
      element: (
        <LogoutLink
          key={"logout"}
          // postLogoutRedirectURL="/dashboard"
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
          style={{
            backgroundColor: "transparent",
          }}
        >
          <span
            className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: "transparent",
            }}
          >
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{
                color: REVA_COLORS.text.muted,
              }}
            />
          </span>
          <span
            className="text-center text-[10px] font-medium font-['Eudoxus Sans'] transition-colors duration-200"
            style={{
              color: REVA_COLORS.text.secondary,
            }}
          >
            Logout
          </span>
        </LogoutLink>
      ),
    },
  ];

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
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
      >
        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture!}
            sideBarWidthClass={sideBarWidthClass}
          />
        </div>

        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
