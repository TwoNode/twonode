"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { canAccessRevaUserPanel } from "@/permissions";
import { Platform } from "@/utils/platform";

interface UserData {
  platform: Platform;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useRevaUserAccess() {
  const [isUser, setIsUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: isKindeLoading,
  } = useKindeBrowserClient();

  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    let timeoutId: NodeJS.Timeout | null = null;

    const checkUserAccess = async () => {
      try {
        if (!isMounted) return;

        // Check for isNewLogin parameter
        const urlParams = new URLSearchParams(window.location.search);
        const isNewLogin = urlParams.get("isNewLogin");

        if (isNewLogin === "true") {
          // Remove isNewLogin parameter and redirect to clean URL
          const cleanUrl = window.location.pathname;
          router.replace(cleanUrl);
          return;
        }

        // Wait for Kinde to finish loading
        if (isKindeLoading) return;

        setIsLoading(true);

        if (!isAuthenticated || !user) {
          setIsUser(false);
          router.push("/reva/login");
          return;
        }

        // Get user data from API endpoint
        const response = await fetch("/api/auth/user-data");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const userData: UserData = await response.json();

        if (!isMounted) return;
        setUserData(userData);

        // Check platform
        if (userData.platform !== Platform.REVA) {
          setIsUser(false);
          router.push("/reva/login");
          return;
        }

        // Check if user has access to user panel
        const canAccess = canAccessRevaUserPanel(userData.role);
        setIsUser(canAccess);

        if (!canAccess) {
          router.push("/reva/dashboard");
        }
      } catch (error) {
        console.error("Error checking user access:", error);
        if (isMounted) {
          setIsUser(false);
          router.push("/reva/login");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    checkUserAccess();

    // Add a timeout fallback for loading state
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 10000); // 10 seconds

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, isAuthenticated, router, isKindeLoading, isLoading]);

  return {
    isUser,
    isLoading,
    userData,
    user,
  };
}
