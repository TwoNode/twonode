"use client";

import React from "react";
import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import {
  Home,
  FileCheck,
  Map,
  Settings,
  LogOut,
  User,
  FileText,
  BarChart3,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { SURFBOARD_COLORS } from "@/surfboard-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";

// MDA Portal navbar with logo and username
function SurfboardMDADashboardNavbar({ username }: { username?: string }) {
  return (
    <header
      className="w-full h-[80px] flex items-center px-6 shadow bg-white border-b border-purple-100"
      style={{
        background: "linear-gradient(135deg, #6B21A8 0%, #7C3AED 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src="/surfboard/surf_logo.png"
          alt="Surfboard Logo"
          className="w-12 h-12 rounded-full shadow border-2 border-purple-100 bg-white object-contain"
        />
        <span className="text-xl font-bold text-white tracking-wide drop-shadow">
          MDA Portal
        </span>
      </div>
      <div className="flex-1" />
      {username && (
        <span className="text-base font-medium text-white bg-purple-900/60 px-4 py-2 rounded-lg shadow ml-2">
          {username}
        </span>
      )}
    </header>
  );
}

export default function SurfboardMDAPanelLayout({
  children,
  user,
  userData,
}: {
  children: React.ReactNode;
  user?: { picture?: string; name?: string };
  userData?: { role?: string; name?: string };
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/surf-mda/dashboard";

  // MDA users are authenticated through the auth success route
  const isMDAUser = true;
  const isLoading = false;

  const sidebarItems = [
    { icon: Home, label: "Home", url: dashboardUrl },

    // Role-specific menu items for MDA departments
    ...(userData?.role === "ACCOUNTS" ||
    userData?.role === "SUPERADMIN" ||
    userData?.role === "MDA_SUPERADMIN"
      ? [
          {
            icon: FileCheck,
            label: "Accounts",
            url: `${dashboardUrl}/accounts`,
          },
        ]
      : []),
    ...(userData?.role === "CHARTING" ||
    userData?.role === "SUPERADMIN" ||
    userData?.role === "MDA_SUPERADMIN"
      ? [
          {
            icon: Map,
            label: "Charting",
            url: `${dashboardUrl}/charting`,
          },
        ]
      : []),
    ...(userData?.role === "SURCON" ||
    userData?.role === "SUPERADMIN" ||
    userData?.role === "MDA_SUPERADMIN"
      ? [
          {
            icon: BarChart3,
            label: "SURCON",
            url: `${dashboardUrl}/surcon`,
          },
        ]
      : []),
    ...(userData?.role === "RECORDS_I" ||
    userData?.role === "SUPERADMIN" ||
    userData?.role === "MDA_SUPERADMIN"
      ? [
          {
            icon: FileText,
            label: "Records I",
            url: `${dashboardUrl}/records-i`,
          },
        ]
      : []),
    ...(userData?.role === "RECORDS_II" ||
    userData?.role === "SUPERADMIN" ||
    userData?.role === "MDA_SUPERADMIN"
      ? [
          {
            icon: FileText,
            label: "Records II",
            url: `${dashboardUrl}/records-ii`,
          },
        ]
      : []),

    // Common menu items for all MDA users
    { icon: User, label: "Profile", url: `${dashboardUrl}/profile` },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },

    {
      element: (
        <LogoutLink
          key={"logout"}
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
          style={{ backgroundColor: "transparent" }}
        >
          <span className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200 bg-purple-50 border border-purple-100">
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: "#7C3AED" }}
            />
          </span>
          <span className="text-center text-[10px] font-medium font-['Eudoxus Sans'] transition-colors duration-200 text-purple-900">
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
  if (!isMDAUser) {
    return null;
  }

  // Custom purple color palette for MDA
  const mdaColorPalette = {
    ...SURFBOARD_COLORS,
    primary: {
      main: "#7C3AED",
      light: "#A78BFA",
      dark: "#6B21A8",
    },
    secondary: {
      main: "#DB2777",
      light: "#F472B6",
      dark: "#9F1239",
    },
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <SurfboardMDADashboardNavbar username={user?.name || userData?.name} />

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: "#F9FAFB" }}
      >
        <div className={sideBarWidthClass + " h-full max-h-full"}>
          <Sidebar
            items={sidebarItems}
            userImageUrl={user?.picture}
            sideBarWidthClass={sideBarWidthClass}
            colorPalette={mdaColorPalette}
          />
        </div>
        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
