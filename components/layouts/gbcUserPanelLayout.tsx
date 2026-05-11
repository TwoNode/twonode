"use client";

import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import {
  Home,
  Ticket,
  ImageIcon,
  Users,
  Settings,
  LogOut,
  Mail,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useGBCUserAccess } from "@/hooks/useGBCUserAccess";
import { GBC_COLORS } from "@/gbc-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";

// GBC dashboard navbar with logo and username
function GBCUserDashboardNavbar({
  user,
}: {
  user?: { picture?: string; firstName?: string; id?: string } | any;
}) {
  return (
    <header
      className="w-full h-[80px] flex items-center px-6 shadow bg-white border-b border-purple-100"
      style={{
        background: `linear-gradient(90deg, ${GBC_COLORS.primary.main} 60%, ${GBC_COLORS.secondary.main} 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full shadow border-2 border-purple-100 bg-white flex items-center justify-center">
          <Ticket className="w-6 h-6 text-purple-700" />
        </div>
        <span className="text-xl font-bold text-white tracking-wide drop-shadow">
          GBC 2.0
        </span>
      </div>
      <div className="flex-1" />
      {user?.firstName && (
        <span className="text-base font-medium text-white bg-purple-900/60 px-4 py-2 rounded-lg shadow ml-2">
          {user.firstName}
        </span>
      )}
      {user?.picture && (
        <img
          src={user.picture}
          alt="Profile"
          className="w-12 h-12 rounded-full shadow border-2 border-purple-100 ml-2"
        />
      )}
    </header>
  );
}

export default function GBCUserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/gbc";
  const { user, isUser, isLoading } = useGBCUserAccess();

  const menuList = [
    { icon: Home, label: "Home", url: dashboardUrl },
    {
      icon: Ticket,
      label: "Tickets",
      url: `${dashboardUrl}/tickets`,
    },
    {
      icon: ImageIcon,
      label: "Gallery",
      url: `${dashboardUrl}/gallery`,
    },
    {
      icon: Users,
      label: "Sponsors",
      url: `${dashboardUrl}/sponsors`,
    },
    {
      icon: Mail,
      label: "Contact",
      url: `${dashboardUrl}/contact`,
    },
    { icon: Settings, label: "Settings", url: `${dashboardUrl}/settings` },
    {
      element: (
        <LogoutLink
          key={"logout"}
          postLogoutRedirectURL="/api/auth/logout_redirect?from=gbc"
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
          style={{ backgroundColor: "transparent" }}
        >
          <span className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200 bg-purple-50 border border-purple-100">
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: GBC_COLORS.primary.light }}
            />
          </span>
          <span className="text-center text-[10px] font-medium font-['Eudoxus Sans'] transition-colors duration-200 text-purple-900">
            Logout
          </span>
        </LogoutLink>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-700 mb-4"></div>
          <p className="text-purple-700 font-medium">Loading GBC...</p>
        </div>
      </div>
    );
  }

  if (!isUser) {
    return null; // Will redirect via the hook
  }

  if (!sidebar) return null;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <GBCUserDashboardNavbar user={user} />

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: GBC_COLORS.background.default }}
      >
        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture || undefined}
            colorPalette={GBC_COLORS}
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
