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
    // Check for isNewLogin parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isNewLogin = urlParams.get("isNewLogin");

    if (isNewLogin === "true") {
      console.log("🔄 Fresh login detected, redirecting to clean URL");
      // Remove isNewLogin parameter and redirect to clean URL
      const cleanUrl = window.location.pathname;
      router.replace(cleanUrl);
      return;
    }

    if (isKindeLoading) return;

    const checkUserAccess = async () => {
      try {
        setIsLoading(true);

        if (!isAuthenticated || !user) {
          setIsUser(false);
          router.push("/reva/login");
          return;
        }

        // Get user data from API endpoint
        const response = await fetch("/api/auth/user-data");
        if (!response.ok) {
          setIsUser(false);
          router.push("/reva/login");
          return;
        }

        const userData: UserData = await response.json();
        setUserData(userData);

        // Check platform
        if (userData.platform !== Platform.REVA) {
          setIsUser(false);
          router.push("/reva/login");
          return;
        }

        // Check if user has access to user panel
        const canAccess = canAccessRevaUserPanel(userData.role);
        if (canAccess) {
          setIsUser(true);
        } else {
          setIsUser(false);
          router.push("/reva/dashboard");
        }
      } catch (error) {
        setIsUser(false);
        router.push("/reva/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAccess();
  }, [user, isAuthenticated, router, isKindeLoading]);

  return {
    isUser,
    isLoading,
    userData,
    user,
  };
}
