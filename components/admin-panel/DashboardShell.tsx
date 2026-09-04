"use client";

import React from "react";
import { Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { Platform } from "@/utils/platform";
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
  const { theme } = useTheme();
  // DashboardShell is Surfboard-only today (pilot scope, see doc-comment
  // above) — hardcoded rather than a prop until a second product adopts it.
  useNativeAuthRefresh(Platform.SURFBOARD);

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
          aria-label="Logout"
          title="Logout"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-white/55 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </LogoutLink>
      ),
    },
  ];

  if (!sidebar) return null;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen flex">
      {sidebar.isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={() => sidebar?.toggleOpen()}
          aria-label="Close sidebar"
        />
      )}

      <div className={sideBarWidthClass + " relative h-full shrink-0"}>
        <Sidebar
          items={sidebarItems}
          userImageUrl={user?.picture}
          userName={user?.name}
          userRole={role ?? undefined}
          sideBarWidthClass={sideBarWidthClass}
          title={title}
          logoSrc={logoSrc}
        />
      </div>

      <div
        className="flex-1 min-w-0 flex flex-col overflow-hidden"
        style={{ background: theme === "dark" ? "#0B1A26" : colorPalette.background.paper }}
      >
        <header
          className="w-full h-16 shrink-0 flex items-center px-4 sm:px-6 shadow bg-white border-b border-blue-100"
          style={{ background: colorPalette.primary.dark }}
        >
          <button
            onClick={() => sidebar?.toggleOpen()}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-all duration-200 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1" />
          <ThemeToggle className="mr-2 border-white/25 bg-white/10 text-white hover:bg-white/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" />
          {user?.name && (
            <span className="hidden sm:inline text-sm font-medium text-white bg-blue-900/60 px-4 py-2 rounded-lg shadow ml-2 truncate max-w-[200px]">
              {user.name}
            </span>
          )}
        </header>

        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
