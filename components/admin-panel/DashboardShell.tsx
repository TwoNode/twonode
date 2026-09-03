"use client";

import React from "react";
import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { Menu, LogOut } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { sideBarWidthClass } from "@/reva/layouts/revaAdminPanelLayout";
import type { MenuItem } from "@/components/sidebars/menu";
import {
  getNavItemsForRole,
  type SurfboardRouteGroup,
} from "@/surfboard/access/routes";

/**
 * Data-driven replacement for the per-product, per-role layout components
 * (surfboardAdminPanelLayout.tsx and friends) — same markup, but nav items
 * come from a registry (surfboard/access/routes.ts) instead of being
 * hardcoded per file. Pilot scope: Surfboard's admin panel only for now: see
 * out/architecture-rebuild-implementation-plan.md Phase 1 Step 8. The other
 * layouts keep their own hardcoded arrays until their phases migrate them.
 *
 * Nav resolution (including the LucideIcon component references) happens
 * IN HERE, client-side — role/group are the only things passed in from the
 * server layout, because a LucideIcon is a function component and React
 * server->client props must be serializable. Resolving icons on the server
 * and passing them down throws "Functions cannot be passed directly to
 * Client Components" (confirmed live while building this).
 */

export interface DashboardShellColorPalette {
  primary: { main: string; dark: string; light: string; contrastText?: string };
  secondary?: { main: string; light: string };
  background: { paper: string; default: string };
}

export interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  logoSrc: string;
  colorPalette: DashboardShellColorPalette;
  role: string | null | undefined;
  group: SurfboardRouteGroup;
  user?: { picture?: string; name?: string };
  logoutRedirectUrl?: string;
}

export function DashboardShell({
  children,
  title,
  logoSrc,
  colorPalette,
  role,
  group,
  user,
  logoutRedirectUrl = "/api/auth/logout_redirect",
}: DashboardShellProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  const navItems = getNavItemsForRole(role, group).map((r) => ({
    icon: r.icon,
    label: r.label,
    url: r.path,
    section: r.section,
  }));

  const sidebarItems: MenuItem[] = [
    ...navItems,
    {
      element: (
        <LogoutLink
          key="logout"
          postLogoutRedirectURL={logoutRedirectUrl}
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-15 rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
          style={{ backgroundColor: "transparent" }}
        >
          <span className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200 bg-blue-50 border border-blue-100">
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: colorPalette.primary.light }}
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
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <header
        className="w-full h-20 flex items-center px-6 shadow bg-white border-b border-blue-100"
        style={{ background: colorPalette.primary.dark }}
      >
        <div className="flex flex-row-reverse lg:flex-row items-center gap-3">
          <button
            onClick={() => sidebar?.toggleOpen()}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          <img
            src={logoSrc}
            alt={`${title} Logo`}
            className="w-12 h-12 rounded-full shadow border-2 border-blue-100 bg-white object-contain"
          />
          <span className="hidden lg:inline text-xl font-bold text-white tracking-wide drop-shadow">
            {title}
          </span>
        </div>
        <div className="flex-1" />
        {user?.name && (
          <span className="text-base font-medium text-white bg-blue-900/60 px-4 py-2 rounded-lg shadow ml-2">
            {user.name}
          </span>
        )}
      </header>

      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: colorPalette.background.paper }}
      >
        {sidebar.isOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
            onClick={() => sidebar?.toggleOpen()}
            aria-label="Close sidebar"
          />
        )}

        <div className={sideBarWidthClass + " h-full max-h-full"}>
          <Sidebar
            items={sidebarItems}
            userImageUrl={user?.picture}
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
