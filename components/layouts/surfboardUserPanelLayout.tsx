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
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { SURFBOARD_COLORS } from "@/surfboard-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";

// Surfboard dashboard navbar with logo and username
function SurfboardUserDashboardNavbar({ username }: { username?: string }) {
  return (
    <header
      className="w-full h-[80px] flex items-center px-6 shadow bg-white border-b border-blue-100"
      style={{
        background: `linear-gradient(90deg, ${SURFBOARD_COLORS.primary.main} 60%, ${SURFBOARD_COLORS.secondary.main} 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src="/surfboard/surf_logo.png"
          alt="Surfboard Logo"
          className="w-12 h-12 rounded-full shadow border-2 border-blue-100 bg-white object-contain"
        />
        <span className="text-xl font-bold text-white tracking-wide drop-shadow">
          Surfboard
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

export default function SurfboardUserPanelLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { picture?: string; name?: string };
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/surfboard/dashboard";

  const menuList = [
    { icon: Home, label: "Home", url: dashboardUrl },
    {
      icon: ListChecks,
      label: "All Plans",
      url: `${dashboardUrl}/allplans`,
    },
    { icon: Map, label: "Map Viewer", url: `${dashboardUrl}/map` },
    { icon: FilePlus, label: "New Plan", url: `${dashboardUrl}/newplan` },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },
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

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh_-_80px)]">
      <SurfboardUserDashboardNavbar username={user?.name} />
      <main
        className={cn(
          "relative min-h-[calc(100vh_-_80px)] max-h-[calc(100vh_-_80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: SURFBOARD_COLORS.background.default }}
      >
        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture}
            // background={`linear-gradient(180deg, ${SURFBOARD_COLORS.primary.main} 70%, ${SURFBOARD_COLORS.secondary.light} 100%)`}
            colorPalette={SURFBOARD_COLORS}
            sideBarWidthClass={sideBarWidthClass}
          />
        </div>
        <main className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </main>
    </div>
  );
}
