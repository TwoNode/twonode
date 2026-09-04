import { isPlatformUser } from "@/utils/encryptedCookies";
import { getEffectiveUserData } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Platform } from "@/utils/platform";
import { canAccessRevaAdminPanel } from "@/permissions";

interface ServerProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default async function ServerProtectedAdminRoute({
  children,
}: ServerProtectedAdminRouteProps) {
  try {
    // Native session first, legacy Kinde cookie as fallback — a legacy-only
    // read here locked natively-authenticated REVA admins out entirely
    // (redirected to login regardless of their real role). See
    // lib/auth/session.ts's getEffectiveUserData doc comment.
    const userData = await getEffectiveUserData(Platform.REVA);

    if (!userData) {
      redirect("/reva-restricted/login");
    }

    // Check platform
    if (!isPlatformUser(userData, Platform.REVA)) {
      redirect("/reva-restricted/login");
    }

    // Check admin access
    if (!canAccessRevaAdminPanel(userData.role)) {
      redirect("/reva/dashboard");
    }

    return <>{children}</>;
  } catch (error) {
    console.error("Error in server-side admin route protection:", error);
    redirect("/reva-restricted/login");
  }
}
