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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkAdminAccess = async () => {
      try {
        if (!isMounted || isAdmin !== null) return;

        // Check for isNewLogin parameter
        const urlParams = new URLSearchParams(window.location.search);
        const isNewLogin = urlParams.get("isNewLogin");

        if (isNewLogin === "true") {
          const cleanUrl = window.location.pathname;
          router.replace(cleanUrl);
          return;
        }

        // Wait for Kinde to finish loading
        if (isKindeLoading) return;

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
          throw new Error("Failed to fetch user data");
        }

        const userData: UserData = await response.json();
        console.log("👤 User data:", userData);

        if (!isMounted) return;
        setUserData(userData);

        // Check platform
        if (userData.platform !== "reva") {
          console.log("❌ Wrong platform, redirecting to login");
          setIsAdmin(false);
          router.push("/reva-restricted/login");
          return;
        }

        // Check admin role
        const hasAdminRole =
          userData.role === "ADMIN" || userData.role === "SUPERADMIN";
        setIsAdmin(hasAdminRole);

        if (!hasAdminRole) {
          console.log("❌ User does not have admin role, redirecting");
          router.push("/reva/dashboard");
        }
      } catch (error) {
        console.error("❌ Error checking admin access:", error);
        if (isMounted) {
          setIsAdmin(false);
          router.push("/reva-restricted/login");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    // Only run check if we haven't determined admin status yet
    if (isAdmin === null) {
      checkAdminAccess();
    }

    // Fallback timeout
    timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("⚠️ Admin check timed out after 10 seconds");
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, isAuthenticated, router, isKindeLoading, isAdmin]); // Added isAdmin to deps

  return {
    isAdmin,
    isLoading,
    userData,
    user,
  };
}
