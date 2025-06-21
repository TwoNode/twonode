"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

interface UserData {
  platform: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useRevaAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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

    // Wait for Kinde to finish loading before checking auth state
    if (isKindeLoading) return;

    const checkAdminAccess = async () => {
      try {
        setIsLoading(true);

        console.log("🔍 Checking admin access...");
        console.log("User:", user);
        console.log("Authenticated:", isAuthenticated);

        if (!isAuthenticated || !user) {
          console.log("❌ Not authenticated, redirecting to login");
          setIsAdmin(false);
          router.push("/reva-restricted/login");
          return;
        }

        // Get user data from API endpoint
        const response = await fetch("/api/auth/user-data");

        if (!response.ok) {
          console.log(
            "❌ Failed to get user data, redirecting to login",
            response
          );
          setIsAdmin(false);
          router.push("/reva-restricted/login");
          return;
        }

        const userData: UserData = await response.json();
        console.log("👤 User data:", userData);

        setUserData(userData);

        // Check platform
        if (userData.platform !== "reva") {
          console.log("❌ Wrong platform, redirecting to login");
          setIsAdmin(false);
          router.push("/reva-restricted/login");
          return;
        }

        // Check if user has admin role
        if (userData.role === "ADMIN" || userData.role === "SUPERADMIN") {
          console.log("✅ User has admin role, allowing access");
          setIsAdmin(true);
        } else {
          console.log("❌ User does not have admin role, redirecting");
          setIsAdmin(false);
          console.log("🔄 Redirecting to user dashboard");
          router.push("/reva/dashboard");
        }
      } catch (error) {
        console.error("❌ Error checking admin access:", error);
        setIsAdmin(false);
        router.push("/reva-restricted/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, isAuthenticated, router, isKindeLoading]);

  return {
    isAdmin,
    isLoading,
    userData,
    user,
  };
}
