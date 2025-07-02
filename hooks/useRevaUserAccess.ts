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
    let isMounted = true;
    const checkUserAccess = async () => {
      if (!isMounted) return;

      if (isUser !== null && !isKindeLoading) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const urlParams = new URLSearchParams(window.location.search);
      const isNewLogin = urlParams.get("isNewLogin");

      if (isNewLogin === "true") {
        const cleanUrl = window.location.pathname;
        router.replace(cleanUrl);
        return;
      }

      if (isKindeLoading) {
        console.log("Kinde is still loading for user access...");
        return;
      }

      if (!isAuthenticated || !user) {
        if (isMounted) {
          setIsUser(false);
          setIsLoading(false);
          router.push("/reva/login");
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/user-data");
        if (!response.ok) throw new Error("Failed to fetch user data");

        const fetchedUserData: UserData = await response.json();
        if (!isMounted) return;
        setUserData(fetchedUserData);

        if (fetchedUserData.platform !== "reva") {
          // Assuming Platform.REVA is "reva" string
          if (isMounted) {
            setIsUser(false);
            router.push("/reva/login");
          }
          return;
        }

        const canAccess = canAccessRevaUserPanel(fetchedUserData.role);
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
