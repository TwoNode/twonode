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
  Shield,
  Bell,
  CreditCard,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useRevaAdminAccess } from "@/hooks/useRevaAdminAccess";
import RevaLoading from "./RevaLoading";
import { REVA_COLORS } from "@/reva-colors";
import { canAccessRevaSuperAdminPanel } from "@/permissions";

export default function RevaAdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/reva-restricted/dashboard";
  const { user, isAdmin, isLoading, userData } = useRevaAdminAccess();

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
      icon: CreditCard,
      label: "Payment Verification",
      url: `${dashboardUrl}/payment-verification`,
    },
    {
      icon: Map,
      label: "Spatial Record",
      url: `${dashboardUrl}/spatial-record`,
    },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },
    // Only show Superadmin menu item for SUPERADMIN users
    ...(userData?.role && canAccessRevaSuperAdminPanel(userData.role)
      ? [
          {
            icon: Shield,
            label: "Superadmin",
            url: `${dashboardUrl}/superadmin`,
          },
          {
            icon: Bell,
            label: "Notifications",
            url: `${dashboardUrl}/notifications`,
          },
        ]
      : []),
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
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh_-_80px)]">
      <RevaAdminDashboardNavbar
        items={sidebarItems}
        userImageUrl={user?.picture!}
        userData={userData}
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
