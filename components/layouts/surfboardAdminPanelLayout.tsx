"use client";

import React from "react";
import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import {
  Home,
  ListChecks,
  Map,
  FilePlus,
  Settings,
  LogOut,
  Shield,
  Bell,
  FileCheck,
  Users,
  Award,
  Receipt,
  FileText,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { SURFBOARD_COLORS } from "@/surfboard-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";

// Surfboard admin dashboard navbar with logo and username
function SurfboardAdminDashboardNavbar({ username }: { username?: string }) {
  return (
    <header
      className="w-full h-[80px] flex items-center px-6 shadow bg-white border-b border-blue-100"
      style={{ background: SURFBOARD_COLORS.primary.dark }}
    >
      <div className="flex items-center gap-3">
        <img
          src="/surfboard/surf_logo.png"
          alt="Surfboard Logo"
          className="w-12 h-12 rounded-full shadow border-2 border-blue-100 bg-white object-contain"
        />
        <span className="text-xl font-bold text-white tracking-wide drop-shadow">
          Surfboard Admin
        </span>
      </div>
      <div className="flex-1" />
      {username && (
        <span className="text-base font-medium text-white bg-blue-900/60 px-4 py-2 rounded-lg shadow ml-2">
          {username}
        </span>
      )}
    </header>
  );
}

export default function SurfboardAdminPanelLayout({
  children,
  user,
  userData,
}: {
  children: React.ReactNode;
  user?: { picture?: string; name?: string };
  userData?: { role?: string; name?: string };
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/surf-restricted/dashboard";

  // TODO: Replace with actual surfboard admin role check
  const isAdmin = true;
  const isLoading = false;

  const sidebarItems = [
    { icon: Home, label: "Home", url: dashboardUrl },
    {
      icon: ListChecks,
      label: "Surf Plans",
      url: `${dashboardUrl}/surf-plans`,
    },
    {
      icon: Map,
      label: "Map Viewer",
      url: `${dashboardUrl}/map`,
    },
    {
      icon: ListChecks,
      label: "User Management",
      url: `${dashboardUrl}/user-management`,
    },
    {
      icon: Bell,
      label: "Notifications",
      url: `${dashboardUrl}/notifications`,
    },
    {
      icon: Award,
      label: "Certificates",
      url: `${dashboardUrl}/certificates`,
    },
    {
      icon: Receipt,
      label: "CoD Batches",
      url: `${dashboardUrl}/cod/batches`,
    },
    { icon: Settings, label: "Analytics", url: `${dashboardUrl}/analytics` },
    ...(userData?.role === "SUPERADMIN"
      ? [
          {
            icon: Shield,
            label: "Superadmin",
            url: `${dashboardUrl}/superadmin`,
          },
          {
            icon: FileText,
            label: "Audit Logs",
            url: `${dashboardUrl}/audit-logs`,
          },
        ]
      : []),
    {
      element: (
        <LogoutLink
          key={"logout"}
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
          style={{ backgroundColor: "transparent" }}
        >
          <span className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200 bg-blue-50 border border-blue-100">
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: SURFBOARD_COLORS.primary.light }}
            />
          </span>
          <span className="text-center text-[10px] font-medium font-['Eudoxus Sans'] transition-colors duration-200 text-blue-900">
            Logout
          </span>
        </LogoutLink>
      ),
    },
  ];

  if (!sidebar) return null;
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <SurfboardAdminDashboardNavbar username={user?.name || userData?.name} />

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: SURFBOARD_COLORS.background.paper }}
      >
        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={sidebarItems}
            userImageUrl={user?.picture}
            // background={`linear-gradient(180deg, ${SURFBOARD_COLORS.primary.main} 70%, ${SURFBOARD_COLORS.secondary.light} 100%)`}
            sideBarWidthClass={sideBarWidthClass}
            colorPalette={SURFBOARD_COLORS}
          />
        </div>
        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
