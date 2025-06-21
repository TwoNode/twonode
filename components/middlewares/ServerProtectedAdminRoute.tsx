import {
  getEncryptedUserData,
  canAccessRevaAdminPanel,
  isPlatformUser,
} from "@/utils/encryptedCookies";
import { redirect } from "next/navigation";
import { Platform } from "@/utils/platform";

interface ServerProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default async function ServerProtectedAdminRoute({
  children,
}: ServerProtectedAdminRouteProps) {
  try {
    const userData = await getEncryptedUserData();

    if (!userData) {
      redirect("/reva-restricted/login");
    }

    // Check platform
    if (!isPlatformUser(userData, Platform.REVA)) {
      redirect("/reva-restricted/login");
    }

    // Check admin access
    if (!canAccessRevaAdminPanel(userData)) {
      redirect("/reva/dashboard");
    }

    return <>{children}</>;
  } catch (error) {
    console.error("Error in server-side admin route protection:", error);
    redirect("/reva-restricted/login");
  }
}
