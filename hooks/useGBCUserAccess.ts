"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { canAccessGBCUserPanel } from "@/permissions";
import { Platform } from "@/utils/platform";

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
          router.push("/gbc2/login");
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/user-data");
        if (!response.ok) throw new Error("Failed to fetch user data");

        const fetchedUserData: UserData = await response.json();
        if (!isMounted) return;
        setUserData(fetchedUserData);

        if (fetchedUserData.platform !== "gbc") {
          if (isMounted) {
            setIsUser(false);
            router.push("/gbc2/login");
          }
          return;
        }

        const canAccess = canAccessGBCUserPanel(fetchedUserData.role);
        if (isMounted) {
          setIsUser(canAccess);
        }

        if (!canAccess) {
          router.push("/gbc2");
        }
      } catch (error) {
        console.error("Error checking GBC user access:", error);
        if (isMounted) {
          setIsUser(false);
          router.push("/gbc2/login");
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
