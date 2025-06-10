"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { RevaAdminDashboardNavbar } from "@/components/headers/RevaAdminDashboardHeader";
import {
  Home,
  ListChecks,
  Map,
  FilePlus,
  Settings,
  LogOut,
} from "lucide-react";
import { ReactNode } from "react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

export default function RevaAdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/reva-restricted/dashboard";

  const { user } = useKindeBrowserClient();

  const sidebarItems = [
    { icon: Home, label: "Home", url: dashboardUrl },
    {
      icon: ListChecks,
      label: "All Requests",
      url: `${dashboardUrl}/alluserrequests`,
    },
    {
      icon: ListChecks,
      label: "Review",
      url: `${dashboardUrl}/review`,
    },
    {
      icon: Map,
      label: "Parcel Report",
      url: `${dashboardUrl}/parcel-report`,
    },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },

    {
      element: (
        <LogoutLink
          key={"logout"}
          // postLogoutRedirectURL="/dashboard"
          className="flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg"
        >
          <span className="w-max lg:mx-auto">
            <LogOut />
          </span>
          <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
            Logout
          </span>
        </LogoutLink>
      ),
    },
  ];

  if (!sidebar) return null;

  // const { getOpenState, settings } = sidebar;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh_-_80px)]">
      <RevaAdminDashboardNavbar
        items={sidebarItems}
        userImageUrl={user?.picture!}
      />

      <main
        className={cn(
          "relative min-h-[calc(100vh_-_80px)] max-h-[calc(100vh_-_80px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
      >
        <div className={"lg:w-[105px] h-full max-h-full"}>
          <Sidebar items={sidebarItems} userImageUrl={user?.picture!} />
        </div>

        <main className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </main>
    </div>
  );
}
