"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { canAccessGBCUserPanel } from "@/permissions";
import { Platform } from "@/utils/platform";
import { getUserData } from "@/app/(projects)/(surfboard)/actions/authActions";

interface UserData {
  platform: Platform;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useGBCUserAccess() {
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
        console.log("Kinde is still loading for GBC user access...");
        return;
      }

      if (!isAuthenticated || !user) {
        if (isMounted) {
          setIsUser(false);
          setIsLoading(false);
          router.push("/gbc/login");
        }
        return;
      }

      try {
        const result = await getUserData();
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to fetch user data");
        }

        const fullUserData = result.data;
        if (!isMounted) return;

        // Multi-platform awareness: Get specifically the GBC portal session
        const gbcSession = fullUserData.platforms?.[Platform.GBC] || 
                          (fullUserData.platform === Platform.GBC ? { role: fullUserData.role } : null);

        if (!gbcSession) {
          console.log("🛡️ GBC Portal access check failed: No active GBC session found");
          if (isMounted) {
            setIsUser(false);
            router.push("/gbc/login");
          }
          return;
        }

        // Set the active session role/data for this platform
        setUserData({
            ...fullUserData,
            platform: Platform.GBC,
            role: gbcSession.role
        });

        const canAccess = canAccessGBCUserPanel(gbcSession.role);
        if (isMounted) {
          setIsUser(canAccess);
        }

        if (!canAccess) {
          router.push("/gbc");
        }
      } catch (error) {
        console.error("Error checking GBC user access:", error);
        if (isMounted) {
          setIsUser(false);
          router.push("/gbc/login");
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
