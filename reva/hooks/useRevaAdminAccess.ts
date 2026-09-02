"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { revaApi } from "@/reva/apiClient";
import { Platform } from "@/utils/platform";
import { canAccessRoute } from "@/reva/access/routes";

interface UserData {
  platform: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useRevaAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: isKindeLoading,
  } = useKindeBrowserClient();

  useEffect(() => {
    let isMounted = true;
    const checkAdminAccess = async () => {
      // 1. Initial Loading State & Cleanup
      if (!isMounted) return;

      // Reset state on re-run, unless we already determined it and are not re-authenticating
      if (isAdmin !== null && !isKindeLoading) {
        setIsLoading(false); // If already determined and Kinde isn't loading, we're done
        return;
      }

      setIsLoading(true); // Ensure loading is true at the start of the check

      // 2. Wait for Kinde to Load
      if (isKindeLoading) {
        console.log("Kinde is still loading...");
        return; // Kinde is still loading, wait for it to complete
      }

      // 4. Authentication Check
      if (!isAuthenticated || !user) {
        console.log("❌ Not authenticated or no user, redirecting to login");
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
          router.push("/reva-restricted/login");
        }
        return;
      }

      // 5. Fetch User Data
      try {
        console.log("🔍 Checking admin access & fetching user data...");
        const result = await revaApi.session.get();

        if (!result.success) {
          console.log(
            "❌ Failed to get user data, redirecting to login",
            result.error
          );
          throw new Error(result.error || "Failed to fetch user data");
        }

        const fullUserData = result.data;
        console.log("👤 Full User data received:", fullUserData);

        if (!isMounted) return;

        // Multi-platform awareness: Get specifically the Reva portal session
        const revaSession = fullUserData.platforms?.[Platform.REVA] || 
                          (fullUserData.platform === Platform.REVA ? { role: fullUserData.role } : null);

        if (!revaSession || !revaSession.role) {
          console.log("❌ No active Reva session found in current multi-platform login");
          if (isMounted) {
            setIsAdmin(false);
            router.push("/reva-restricted/login");
          }
          return;
        }

        // Set the active session role/data for this platform
        setUserData({
            ...fullUserData,
            platform: Platform.REVA,
            role: revaSession.role
        });

        // 7. Admin Role Check — reva/access/routes.ts is the single source
        // of truth for who can reach the admin panel, same registry
        // proxy.ts and the layout's nav now read from.
        const hasAdminRole = canAccessRoute("/reva-restricted/dashboard", revaSession.role);

        if (isMounted) {
          setIsAdmin(hasAdminRole);
        }

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
        }
      }
    };

    checkAdminAccess(); // Always call the async function

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, isKindeLoading, router, isAdmin]); // Keep isAdmin in deps for explicit re-evaluation

  // Removed the timeout logic. If isLoading is properly handled by consuming components,
  // a timeout for loading state isn't typically needed and can mask underlying issues.

  return {
    isAdmin,
    isLoading,
    userData,
    user,
  };
}
