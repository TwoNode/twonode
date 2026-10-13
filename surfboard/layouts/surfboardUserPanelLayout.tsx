"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RAIL_WIDTH_CLASS, Sidebar } from "@/components/sidebars/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import {
  Home,
  ListChecks,
  Map,
  Settings,
  LogOut,
  CreditCard,
  AlertTriangle,
  Plus,
  Bell,
  Menu,
  QrCode,
} from "lucide-react";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import NotificationBell from "@/components/NotificationBell";
import { AnnouncementModal } from "@/app/(projects)/(surfboard)/components/AnnouncementModal";
import { SURFBOARD_COLORS, SURFBOARD_GRADIENTS } from "@/surfboard/colors";
import { sideBarWidthClass } from "@/reva/layouts/revaAdminPanelLayout";
import Link from "next/link";
import { surfboardApi } from "@/surfboard/apiClient";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { Platform } from "@/utils/platform";
import SurfboardLoading from "@/surfboard/components/SurfboardLoading";
import type { SurfboardPanelInitial } from "@/surfboard/access/panelInitial";
import {
  DashboardSearch,
  type DashboardSearchResult,
} from "@/components/dashboard/DashboardSearch";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { UserAccountMenu } from "@/components/dashboard/UserAccountMenu";
import { VerificationNagBanner } from "@/components/dashboard/VerificationNagBanner";
import {
  surfboardPlanStatusLabel,
  surfboardPlanStatusTone,
} from "@/surfboard/statusTone";

async function searchPlans(query: string): Promise<DashboardSearchResult[]> {
  const result = await surfboardApi.plans.list({
    pageSize: 6,
    filters: { search: query },
  });
  if (!result.success || !result.data) return [];
  const plans = (result.data as any).plans ?? [];
  return plans.map((p: any) => ({
    id: p.id,
    title: p.planNumber,
    subtitle: p.surveyTitle,
    href: `/surfboard/dashboard/plans?tab=all&search=${encodeURIComponent(p.planNumber)}`,
    badge: {
      label: surfboardPlanStatusLabel(p.status),
      tone: surfboardPlanStatusTone(p.status),
    },
  }));
}

// Surfboard dashboard navbar with logo and username
function SurfboardUserDashboardNavbar({
  user,
  showSubscriptionBadge = false,
  sidebar,
}: {
  user?: { picture?: string; firstName?: string; id?: string } | any;
  showSubscriptionBadge?: boolean;
  sidebar?: any;
}) {
  const router = useRouter();
  const fullName =
    `${user?.firstName || user?.given_name || ""} ${user?.family_name || ""}`.trim() ||
    "Surveyor";

  return (
    <header
      className="w-full h-20 flex items-center px-6 shadow-md border-b border-white/10 relative"
      style={{ background: SURFBOARD_GRADIENTS.hero }}
    >
      <div className="flex flex-row-reverse lg:flex-row items-center gap-3">
        {/* Hamburger Menu Button */}
        <button
          onClick={() => sidebar?.toggleOpen()}
          className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        <img
          src="/surfboard/surf_logo.svg"
          alt="Surfboard Logo"
          className="w-12 h-12 rounded-full shadow border-2 border-white/15 bg-white object-contain"
        />
        <span className="hidden lg:inline text-xl font-bold text-white tracking-wide drop-shadow">
          Surfboard
        </span>
      </div>
      <div className="hidden md:flex flex-1 justify-center px-6">
        <DashboardSearch
          placeholder="Search plans, facilitators…"
          onSearch={searchPlans}
          viewAllHref={(q) =>
            `/surfboard/dashboard/plans?tab=all&search=${encodeURIComponent(q)}`
          }
          className="max-w-sm"
          variant="translucent"
        />
      </div>
      <div className="flex-1 md:hidden" />

      {showSubscriptionBadge && (
        <Link href="/surfboard/dashboard/subscription" className="pointer">
          <div className="flex items-center mr-4 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Subscription Required
          </div>
        </Link>
      )}

      <ThemeToggle className="mr-2 border-white/25 bg-white/10 text-white hover:bg-white/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" />

      <NotificationBell
        platform="surfboard"
        viewAllHref="/surfboard/dashboard/notifications"
        className="mr-2"
        iconClassName="h-6 w-6 text-white"
      />

      <UserAccountMenu
        name={fullName}
        email={user?.email}
        picture={user?.picture}
        roleLabel="Surveyor"
        profileHref="/surfboard/dashboard/settings"
        settingsHref="/surfboard/dashboard/settings"
        onLogout={async () => {
          // Clear per-session announcement markers so the modal re-surfaces
          // on next login if a campaign is still active.
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("surf_announcement_seen_"))
            .forEach((k) => sessionStorage.removeItem(k));
          try {
            await fetch("/api/auth/logout_redirect?from=surfboard");
          } catch {
          } finally {
            window.location.href = "/surfboard/login";
          }
        }}

        className="ml-2 ring-2 ring-white/15"
      />
    </header>
  );
}

export default function SurfboardUserPanelLayout({
  children,
  initial,
}: {
  children: React.ReactNode;
  /** Read on the server by the route layout; when null the browser checks, behind a skeleton. */
  initial?: SurfboardPanelInitial | null;
}) {
  const [hasSubscriptionAccess, setHasSubscriptionAccess] = useState(
    initial?.hasSubscriptionAccess ?? true
  );
  const [isLoading, setIsLoading] = useState(!initial);
  const [user, setUser] = useState<any>(initial?.user ?? null);
  const sidebar = useStore(useSidebar, (x) => x);
  const router = useRouter();
  useNativeAuthRefresh(Platform.SURFBOARD);
  const dashboardUrl = "/surfboard/dashboard";

  async function isUserSubscribed(): Promise<boolean> {
    try {
      const result = await surfboardApi.subscription.userAndActiveSub();
      if (!result.success) return false;

      const userData = result.data?.user || null;
      setUser(userData);

      return !!result.data?.subscription;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  }

  useEffect(() => {
    // The server already answered (same lookups as the API call below).
    if (initial) return;
    const checkSubscription = async () => {
      try {
        console.log("--- Checking subscription access...");
        const hasAccess = await isUserSubscribed();
        // const hasAccess = true;

        setHasSubscriptionAccess(hasAccess);
        console.log("--- Subscription access:", hasAccess);
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Default to showing dashboard if there's an error
        setHasSubscriptionAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  const menuList = [
    {
      icon: Home,
      label: "Home",
      url: dashboardUrl,
      section: "Overview",
      requiresSubscription: false,
    },
    {
      icon: ListChecks,
      label: "Plans",
      url: `${dashboardUrl}/plans`,
      section: "Plans",
      // Read-only access — proxy.ts's alwaysAllowedEvenUnsubscribed list
      // permits this page for anyone, subscribed or not (viewing owned and
      // shared-to-you plans shouldn't require paying). Creating/editing a
      // plan is still capability-gated server-side and in the UI itself.
      requiresSubscription: false,
    },
    {
      icon: Map,
      label: "Map Viewer",
      url: `${dashboardUrl}/map`,
      section: "Plans",
      requiresSubscription: false,
    },
    {
      icon: CreditCard,
      label: "Subscription",
      url: "/surfboard/dashboard/subscription",
      section: "Account",
      requiresSubscription: false,
    },
    {
      icon: Bell,
      label: "Notifications",
      url: "/surfboard/dashboard/notifications",
      section: "Account",
      requiresSubscription: true,
    },
    {
      icon: QrCode,
      label: "QR Earnings",
      url: `${dashboardUrl}/qr-earnings`,
      section: "Account",
      requiresSubscription: true,
    },
    {
      icon: Settings,
      label: "Settings",
      url: `${dashboardUrl}/settings`,
      section: "Account",
      requiresSubscription: false,
    },
    {
      element: (
        <ConfirmedLogoutLink
          key="logout"
          onConfirm={async () => {
            // Clear per-session announcement markers so the modal re-surfaces
            // on next login if a campaign is still active.
            Object.keys(sessionStorage)
              .filter((k) => k.startsWith("surf_announcement_seen_"))
              .forEach((k) => sessionStorage.removeItem(k));
            try {
              await fetch("/api/auth/logout_redirect?from=surfboard");
            } catch {
            } finally {
              window.location.href = "/surfboard/login";
            }
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
      requiresSubscription: false,
    },
  ].filter((item) => {
    // Always show items that don't require subscription
    if (!("requiresSubscription" in item) || !item.requiresSubscription)
      return true;
    // Only show subscription-required items if user has access
    return hasSubscriptionAccess;
  });

  if (isLoading || !sidebar) {
    return <SurfboardLoading />;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <SurfboardUserDashboardNavbar
        user={user}
        showSubscriptionBadge={!hasSubscriptionAccess}
        sidebar={sidebar}
      />
      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex overflow-hidden bg-background"
        )}
      >
        {/* Mobile Overlay - appears when sidebar is open */}
        {sidebar.isOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
            onClick={() => sidebar?.toggleOpen()}
            aria-label="Close sidebar"
          />
        )}

        <div
          className={cn(
            sidebar.isRailCollapsed ? RAIL_WIDTH_CLASS : sideBarWidthClass,
            "h-full max-h-full transition-[width] ease-in-out duration-300"
          )}
        >
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture}
            userName={user?.firstName || user?.given_name}
            userRole="Surveyor"
            colorPalette={SURFBOARD_COLORS}
            sideBarWidthClass={sideBarWidthClass}
            enableRailCollapse
            railBackground={SURFBOARD_GRADIENTS.hero}
            // /newplan stays subscription-gated (proxy.ts + createSurfPlan's
            // requireActiveSubscription) — hide the CTA rather than send an
            // unsubscribed user into a page that will just redirect them out.
            primaryAction={
              hasSubscriptionAccess
                ? {
                    label: "New Plan",
                    href: `${dashboardUrl}/newplan`,
                    icon: Plus,
                  }
                : undefined
            }
          />
        </div>
        <div className="relative flex-1 p-4 overflow-x-hidden overflow-y-auto">
          <VerificationNagBanner
            platform={Platform.SURFBOARD}
            verifyHref="/surfboard/verify-email"
          />
          {!hasSubscriptionAccess && (
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <div className="flex">
                <div className="shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Your subscription has expired. Please renew your
                    subscription to access all features.
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
      <AnnouncementModal />
    </div>
  );
}
