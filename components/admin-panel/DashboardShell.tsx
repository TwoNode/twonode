"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sidebar, RAIL_WIDTH_CLASS } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Platform } from "@/utils/platform";
import { Menu, LogOut } from "lucide-react";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import NotificationBell from "@/components/NotificationBell";
import { UserAccountMenu } from "@/components/dashboard/UserAccountMenu";
import { sideBarWidthClass } from "@/reva/layouts/revaAdminPanelLayout";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";
import type { MenuItem } from "@/components/sidebars/menu";
import {
  getNavItemsForRole,
  type SurfboardRouteGroup,
} from "@/surfboard/access/routes";
import {
  canAccessSurfSuperAdminPanel,
  canAccessSurfAdminPanel,
  isMDARole,
} from "@/permissions";

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

export interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  logoSrc: string;
  role: string | null | undefined;
  group: SurfboardRouteGroup;
  user?: { picture?: string; name?: string; email?: string };
  logoutRedirectUrl?: string;
}

export function DashboardShell({
  children,
  title,
  logoSrc,
  role,
  group,
  user,
  logoutRedirectUrl,
}: DashboardShellProps) {
  const sidebar = useStore(useSidebar, (x) => x);
  const router = useRouter();
  // DashboardShell is Surfboard-only today (pilot scope, see doc-comment
  // above) — hardcoded rather than a prop until a second product adopts it.
  useNativeAuthRefresh(Platform.SURFBOARD);

  // Surfboard admin/MDA sessions are native-JWT-only — they never have a
  // Kinde session to end, so routing logout through Kinde's LogoutLink (as
  // ConfirmedLogoutLink's postLogoutRedirectURL path does) sends the browser
  // to Kinde's own hosted "Signed out" page instead of back to this app, and
  // never clears the native access/refresh cookies at all (confirmed live:
  // refresh_token_surfboard survived a full click-through logout). Calling
  // our own /api/auth/logout_redirect directly — same fix already used by
  // the superadmin page's logout button — bypasses Kinde entirely.
  const postLogoutPath = canAccessSurfSuperAdminPanel(role) || canAccessSurfAdminPanel(role)
    ? "/surfboard-restricted/login"
    : isMDARole(role)
      ? "/surfboard-mda/login"
      : "/surfboard/login";

  const roleLabel = canAccessSurfSuperAdminPanel(role)
    ? "Super Admin"
    : canAccessSurfAdminPanel(role)
      ? "Admin"
      : role ?? undefined;
  const accountBasePath = group === "mda" ? "/surfboard-mda/dashboard" : "/surfboard-restricted/dashboard";
  const profileHref = group === "mda" ? `${accountBasePath}/profile` : `${accountBasePath}/settings`;
  const settingsHref = `${accountBasePath}/settings`;

  const navItems = getNavItemsForRole(role, group).map((r) => ({
    icon: r.icon,
    label: r.label,
    url: r.path,
    section: r.section,
    sectionCollapsedByDefault: r.sectionCollapsedByDefault,
  }));

  const sidebarItems: MenuItem[] = [
    ...navItems,
    {
      element: (
        <ConfirmedLogoutLink
          key="logout"
          onConfirm={() => {
            fetch(logoutRedirectUrl ?? "/api/auth/logout_redirect?from=surfboard");
            router.push(postLogoutPath);
          }}
          trigger={
            <button
              type="button"
              aria-label="Logout"
              title="Logout"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-white/55 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          }
        />
      ),
    },
  ];

  if (!sidebar) return null;

  // MDA now gets a full indigo treatment carried through from its own login
  // page (SURFBOARD_GRADIENTS.mda, the same accentDark/accent pair as
  // AuthSplitLayout's default background there) across sidebar, navbar, and
  // the profile menu's accent — not just small accent details as before.
  const isMda = group === "mda";

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen flex">
      {sidebar.isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={() => sidebar?.toggleOpen()}
          aria-label="Close sidebar"
        />
      )}

      <div
        className={
          (sidebar.isRailCollapsed ? RAIL_WIDTH_CLASS : sideBarWidthClass) +
          " relative h-full shrink-0 transition-[width] ease-in-out duration-300"
        }
      >
        <Sidebar
          items={sidebarItems}
          userImageUrl={user?.picture}
          userName={user?.name}
          userRole={role ?? undefined}
          sideBarWidthClass={sideBarWidthClass}
          title={title}
          logoSrc={logoSrc}
          enableRailCollapse
          railBackground={isMda ? SURFBOARD_GRADIENTS.mda : undefined}
          toggleColor={isMda ? "#7C3AED" : undefined}
        />
      </div>

      <div
        className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background"
      >
        <header
          className="w-full h-16 shrink-0 flex items-center px-4 sm:px-6 shadow border-b border-blue-100"
          style={{ background: isMda ? SURFBOARD_GRADIENTS.mda : "var(--color-brand-primary-dark)" }}
        >
          <button
            onClick={() => sidebar?.toggleOpen()}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-all duration-200 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1" />
          <NotificationBell
            platform="surfboard"
            viewAllHref={group === "mda" ? "/surfboard-mda/dashboard/notifications" : "/surfboard-restricted/dashboard/notifications"}
            className="mr-1"
            iconClassName="h-5 w-5 text-white"
          />
          <ThemeToggle
            className="mr-2 border-white/25 bg-white/10 text-white hover:bg-white/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          />
          <UserAccountMenu
            name={user?.name || "Account"}
            email={user?.email}
            picture={user?.picture}
            roleLabel={roleLabel}
            profileHref={profileHref}
            settingsHref={settingsHref}
            onLogout={() => {
              fetch(logoutRedirectUrl ?? "/api/auth/logout_redirect?from=surfboard");
              router.push(postLogoutPath);
            }}
            className="ml-2 ring-2 ring-white/15"
            accentColor={isMda ? "#7C3AED" : undefined}
            accentColorDark={isMda ? "#5B21B6" : undefined}
          />
        </header>

        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          <div className="max-w-400 mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
