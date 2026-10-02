"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { canAccessRoute } from "@/reva/access/routes";
import { Platform } from "@/utils/platform";
import { revaApi } from "@/reva/apiClient";

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
    let isMounted = true;
    const checkUserAccess = async () => {
      if (!isMounted) return;

      if (isUser !== null && !isKindeLoading) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      if (isKindeLoading) {
        console.log("Kinde is still loading for user access...");
        return;
      }

      // Don't redirect on Kinde alone: a natively-logged-in user (email +
      // password, no Kinde session at all) is still a real session — the
      // session fetch below resolves either kind, so it's the sole source
      // of truth for whether this user is actually signed in.
      try {
        console.log("🔍 Checking admin access & fetching user data...");
        const result = await revaApi.session.get();
        if (!result.success)
          throw new Error(result.error || "Failed to fetch user data");

        const fullUserData = result.data;
        if (!isMounted) return;

        // Multi-platform awareness: Get specifically the Reva portal session
        // Fallback to legacy fields if necessary
        const revaSession =
          fullUserData.platforms?.[Platform.REVA] ||
          (fullUserData.platform === Platform.REVA
            ? {
                role: fullUserData.role,
                subscription: fullUserData.subscription,
              }
            : null);

        if (!revaSession || !revaSession.role) {
          console.log(
            "🛡️ Reva Portal access check failed: No active Reva session found in current login."
          );
          if (isMounted) {
            setIsUser(false);
            router.push("/reva/login");
          }
          return;
        }

        // Set the active session role/data for this platform
        setUserData({
          ...fullUserData,
          platform: Platform.REVA,
          role: revaSession.role,
        });

        // reva/access/routes.ts is the single source of truth for who can
        // reach the user panel, same registry proxy.ts and the layout's
        // nav now read from.
        const canAccess = canAccessRoute("/reva/dashboard", revaSession.role);
        if (isMounted) {
          setIsUser(canAccess);
        }

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
        }
      }
    };

    checkUserAccess();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, isKindeLoading, isUser, router]);

  return {
    isUser,
    isLoading,
    userData,
    user,
  };
}
