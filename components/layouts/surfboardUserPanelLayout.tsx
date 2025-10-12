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
} from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { SURFBOARD_COLORS } from "@/surfboard-colors";
import { sideBarWidthClass } from "./revaAdminPanelLayout";
import Link from "next/link";
import { Button } from "../ui/button";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";

// Surfboard dashboard navbar with logo and username
function SurfboardUserDashboardNavbar({
  user,
  showSubscriptionBadge = false,
}: {
  user?: { picture?: string; firstName?: string; id?: string } | any;
  showSubscriptionBadge?: boolean;
}) {
  return (
    <header
      className="w-full h-[80px] flex items-center px-6 shadow bg-white border-b border-blue-100 relative"
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
      {showSubscriptionBadge ? (
        <Link href="/surfboard/dashboard/subscription" className="pointer">
          <div className="flex items-center mr-4 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Subscription Required
          </div>
        </Link>
      ) : (
        <Link href="/surfboard/dashboard/newplan" className="pointer">
          <Button variant="outline" className="mr-4">
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

      {!user?.picture ? (
        <img
          src={user.picture}
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
  const sidebar = useStore(useSidebar, (x) => x);
  const dashboardUrl = "/surfboard/dashboard";

  async function isUserSubscribed(): Promise<boolean> {
    try {
      const session = await getAuthenticatedSurfUserFromCookie();
      const userData = session || null;
      setUser(userData);
      if (userData && userData?.subscription?.status === "active") return true;
      if (userData && userData?.subscription?.status === "past_due")
        return true;

      if (!userData) {
        console.log("No subscription found for user");
        return false;
      }
      // Visible if we are still in the current usage period
      const now = new Date();
      console.log("Subscription found for user", userData.subscription);
      return now <= new Date(userData.subscription?.expiresAt!);
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
      requiresSubscription: false,
    },
    {
      icon: ListChecks,
      label: "All Plans",
      url: `${dashboardUrl}/plans`,
      requiresSubscription: true,
    },
    {
      icon: ListChecks,
      label: "Shared Plans",
      url: `${dashboardUrl}/shared`,
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
      icon: Settings,
      label: "Settings",
      url: `${dashboardUrl}/settings`,
      requiresSubscription: false,
    },
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
            src="/surfboard/surf_logo.png"
            alt="Surfboard Logo"
            className="w-8/12 h-8/12 m-auto object-contain absolute inset-0"
          />
          <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh_-_80px)]">
      <SurfboardUserDashboardNavbar
        user={user}
        showSubscriptionBadge={!hasSubscriptionAccess}
      />
      <div
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
            colorPalette={SURFBOARD_COLORS}
            sideBarWidthClass={sideBarWidthClass}
          />
        </div>
        <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {!hasSubscriptionAccess && (
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
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
