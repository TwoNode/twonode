"use client";

import React, { useEffect, useState } from "react";
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
  CreditCard,
  AlertTriangle,
  Plus,
  Bell,
  Menu,
  QrCode,
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { SURFBOARD_COLORS } from "@/surfboard/colors";
import { sideBarWidthClass } from "@/reva/layouts/revaAdminPanelLayout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { surfboardApi } from "@/surfboard/apiClient";

// Surfboard dashboard navbar with logo and username
function SurfboardUserDashboardNavbar({
  user,
  showSubscriptionBadge = false,
  sidebar,
  unreadCount = 0,
}: {
  user?: { picture?: string; firstName?: string; id?: string } | any;
  showSubscriptionBadge?: boolean;
  sidebar?: any;
  unreadCount?: number;
}) {
  return (
    <header
      className="w-full h-20 flex items-center px-6 shadow bg-white border-b border-blue-100 relative"
      style={{
        background: `linear-gradient(90deg, ${SURFBOARD_COLORS.primary.main} 60%, ${SURFBOARD_COLORS.secondary.main} 100%)`,
      }}
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
          className="w-12 h-12 rounded-full shadow border-2 border-blue-100 bg-white object-contain"
        />
        <span className="hidden lg:inline text-xl font-bold text-white tracking-wide drop-shadow">
          Surfboard
        </span>
      </div>
      <div className="flex-1" />

      {showSubscriptionBadge ? (
        <Link href="/surfboard/dashboard/subscription" className="pointer">
          <div className="flex items-center mr-4 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Subscription Required
          </div>
        </Link>
      ) : (
        <Link href="/surfboard/dashboard/newplan" className="pointer">
          <Button
            variant="default"
            className="mr-4 bg-blue-300 text-blue-900 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Plan</span>
            </div>
          </Button>
        </Link>
      )}

      {/* {user?.firstName ||
        (user?.given_name && (
          <span className="text-base font-medium text-white bg-blue-900/60 px-4 py-2 rounded-lg shadow ml-2">
            {user?.firstName || user?.given_name}
          </span>
        ))} */}

      {/* Notification Bell */}
      <Link
        href="/surfboard/dashboard/notifications"
        className="relative p-2 mr-2 rounded-lg hover:bg-white/10 transition-all duration-200"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>

      {!user?.picture ? (
        <img
          src={user?.picture || "#"}
          alt="Profile"
          className="w-12 h-12 rounded-full shadow border-2 border-blue-100 bg-white object-contain"
        />
      ) : (
        <div className="flex items-center gap-1 rounded-lg bg-blue-900/60 px-2.5 py-1 shadow ml-2">
          <div className="bg-white text-blue-900 font-bold text-lg rounded-full w-10 h-10 flex justify-center items-center">
            {(user?.firstName || user?.given_name)?.charAt(0)}
          </div>
        </div>
      )}
    </header>
  );
}

export default function SurfboardUserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasSubscriptionAccess, setHasSubscriptionAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebar = useStore(useSidebar, (x) => x);
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

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const result = await surfboardApi.notifications.unreadCount();
        if (result.success) {
          setUnreadCount(result.data.count);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuList = [
    {
      icon: Home,
      label: "Home",
      url: dashboardUrl,
      requiresSubscription: false,
    },
    {
      icon: ListChecks,
      label: "Plans",
      url: `${dashboardUrl}/plans`,
      requiresSubscription: true,
    },
    {
      icon: Map,
      label: "Map Viewer",
      url: `${dashboardUrl}/map`,
      requiresSubscription: true,
    },
    {
      icon: FilePlus,
      label: "New Plan",
      url: `${dashboardUrl}/newplan`,
      requiresSubscription: true,
    },
    {
      icon: CreditCard,
      label: "Subscription",
      url: "/surfboard/dashboard/subscription",
      requiresSubscription: false,
    },
    {
      icon: Bell,
      label: "Notifications",
      url: "/surfboard/dashboard/notifications",
      requiresSubscription: false,
    },
    {
      icon: QrCode,
      label: "QR Earnings",
      url: `${dashboardUrl}/qr-earnings`,
      requiresSubscription: false,
    },
    {
      icon: Settings,
      label: "Settings",
      url: `${dashboardUrl}/settings`,
      requiresSubscription: false,
    },
    {
      element: (
        <LogoutLink
          key={"logout"}
          postLogoutRedirectURL="/api/auth/logout_redirect"
          className="group flex flex-col items-center justify-center gap-2.5 w-full h-15 rounded-xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm"
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
    return (
      <div className="flex items-center justify-center h-screen bg-blue-200">
        <div className="h-20 w-20 relative">
          <img
            src="/surfboard/surf_logo.svg"
            alt="Surfboard Logo"
            className="w-8/12 h-8/12 m-auto object-contain absolute inset-0"
          />
          <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh-80px)]">
      <SurfboardUserDashboardNavbar
        user={user}
        showSubscriptionBadge={!hasSubscriptionAccess}
        sidebar={sidebar}
        unreadCount={unreadCount}
      />
      <div
        className={cn(
          "relative min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
        style={{ background: SURFBOARD_COLORS.background.default }}
      >
        {/* Mobile Overlay - appears when sidebar is open */}
        {sidebar.isOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
            onClick={() => sidebar?.toggleOpen()}
            aria-label="Close sidebar"
          />
        )}

        <div className={sideBarWidthClass + "h-full max-h-full"}>
          <Sidebar
            items={menuList}
            userImageUrl={user?.picture}
            colorPalette={SURFBOARD_COLORS}
            sideBarWidthClass={sideBarWidthClass}
          />
        </div>
        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
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
    </div>
  );
}
