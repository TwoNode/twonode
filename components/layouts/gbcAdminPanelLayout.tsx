"use client";

import React from "react";
import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { LogOut, Shield } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { GBC_COLORS } from "@/gbc-colors";
import { sideBarWidthClass } from "@/reva/layouts/revaAdminPanelLayout";
import { useGBCAdminAccess } from "@/hooks/useGBCAdminAccess";
import { canAccessGBCSuperAdminPanel } from "@/permissions";
import { getNavItemsForRole } from "@/gbc/access/routes";

// GBC admin dashboard navbar with logo and username
function GBCAdminDashboardNavbar({
  username,
  userData,
}: {
  username?: string;
  userData?: {
    platform: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}) {
  return (
    <header
      className="w-full h-20 flex items-center px-6 shadow bg-white border-b border-purple-100"
      style={{ background: GBC_COLORS.primary.dark }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full shadow border-2 border-purple-100 bg-white flex items-center justify-center">
          <Shield className="w-6 h-6 text-purple-700" />
        </div>
        <span className="text-xl font-bold text-white tracking-wide drop-shadow">
          GBC Admin
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

export default function GBCAdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/gbc-restricted";
  const { user, isAdmin, isLoading, userData } = useGBCAdminAccess();

  const sidebarItems = [
    // gbc/access/routes.ts is the single source of truth for which nav
    // items render per role — replaces the hand-written array (which was
    // missing Gallery/Speakers/Sponsors/Inquiries/Certificates/Admin Users
    // despite those pages existing, and linked a dead /qr-code page under
    // "QR Codes" — both found while wiring this up).
    ...getNavItemsForRole(userData?.role ?? null, "admin").map((r) => ({
      icon: r.icon,
      label: r.label,
      url: r.path,
    })),
    ...(userData?.role && canAccessGBCSuperAdminPanel(userData.role)
      ? [
          {
            icon: Shield,
            label: "Superadmin",
            url: `${dashboardUrl}/superadmin`,
          },
        ]
      : []),
    {
      element: (
        <LogoutLink
          key={"logout"}
          postLogoutRedirectURL="/api/auth/logout_redirect"
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

  if (!sidebar) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-700 mb-4"></div>
          <p className="text-purple-700 font-medium">Loading GBC Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <GBCAdminDashboardNavbar
        username={user?.given_name || user?.family_name || undefined}
        userData={userData || undefined}
      />

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: GBC_COLORS.background.paper }}
      >
        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={sidebarItems}
            userImageUrl={user?.picture || undefined}
            sideBarWidthClass={sideBarWidthClass}
            colorPalette={GBC_COLORS}
          />
        </div>
        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
