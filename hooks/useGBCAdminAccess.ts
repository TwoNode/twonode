"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { getUserData } from "@/app/(projects)/(surfboard)/actions/authActions";

interface UserData {
  platform: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useGBCAdminAccess() {
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
    const checkAdminAccess = async () => {
      if (!isMounted) return;

      if (isAdmin !== null && !isKindeLoading) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      if (isKindeLoading) {
        console.log("Kinde is still loading for GBC admin access...");
        return;
      }

      if (!isAuthenticated || !user) {
        console.log("❌ Not authenticated or no user, redirecting to login");
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
          router.push("/gbc/restricted/login");
        }
        return;
      }

      try {
        console.log("🔍 Checking GBC admin access & fetching user data...");
        const result = await getUserData();

        if (!result.success || !result.data) {
          console.log(
            "❌ Failed to get user data, redirecting to login",
            result.error
          );
          throw new Error(result.error || "Failed to fetch user data");
        }

        const fetchedUserData: UserData = result.data;
        console.log("👤 GBC User data:", fetchedUserData);

        if (!isMounted) return;

        setUserData(fetchedUserData);

        if (fetchedUserData.platform !== "gbc") {
          console.log("❌ Wrong platform, redirecting to login");
          if (isMounted) {
            setIsAdmin(false);
            router.push("/gbc/restricted/login");
          }
          return;
        }

        const hasAdminRole =
          fetchedUserData.role === "ADMIN" ||
          fetchedUserData.role === "SUPERADMIN";

        if (isMounted) {
          setIsAdmin(hasAdminRole);
        }

        if (!hasAdminRole) {
          console.log("❌ User does not have admin role, redirecting");
          router.push("/gbc");
        }
      } catch (error) {
        console.error("❌ Error checking GBC admin access:", error);
        if (isMounted) {
          setIsAdmin(false);
          router.push("/gbc/restricted/login");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, isKindeLoading, router, isAdmin]);

  return {
    isAdmin,
    isLoading,
    userData,
    user,
  };
}
