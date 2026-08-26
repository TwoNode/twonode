import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  canAccessRevaAdminPanel,
  canAccessRevaUserPanel,
  canAccessRevaSuperAdminPanel,
  canAccessGBCAdminPanel,
  canAccessGBCUserPanel,
  canAccessGBCSuperAdminPanel,
} from "@/permissions";
import {
  getAndRefreshUserSession,
} from "@/utils/encryptedCookies";
import { Platform, SurfboardRole } from "@/utils/platform";
import { getUserAndActiveSub } from "./app/(projects)/(surfboard)/actions/subscriptionActions";
import { canAccessRoute as canAccessSurfboardRoute } from "@/surfboard/access/routes";

const ENTER_MSG = "\n\n\n ENTERING PROXY \n";
const EXIT_MSG = "\n EXITING PROXY..... \n\n\n";

// Define the paths that require authentication
const protectedRoutes = [
  "/reva/dashboard",
  "/reva-restricted/dashboard",
  "/reva-restricted/superadmin",
  "/surfboard/dashboard",
  "/surfboard-restricted/dashboard",
  "/surfboard-restricted/superadmin",
  "/surfboard-mda/dashboard",
  "/gbc/restricted",
]; 

// Define public routes that bypass authentication
const publicRoutes = [
  "/surfboardplan/", // This will match /surfboardplan/[id]
];

type DynamicAuthOptions = any & {
  loginPage?: string | ((req: NextRequest) => string);
  isReturnToCurrentPage?: boolean | ((req: NextRequest) => boolean);
};

function withDynamicAuth(options?: DynamicAuthOptions, proxyFn?: any) {
  return async (req: NextRequest) => {
    // Resolve dynamic login page if provided as a function
    const resolvedOptions: any = {
      ...options,
      loginPage:
        typeof options?.loginPage === "function"
          ? options.loginPage(req)
          : options?.loginPage,
    };

    console.log(ENTER_MSG);
    if (proxyFn) {
      // Handle case where proxy function is provided
      return withAuth(
        req,
        resolvedOptions,
        async ({ token, user }: { token: string; user: any }) => {
          (req as any).kindeAuth = { token, user };
          const result = await proxyFn(req);
          console.log(EXIT_MSG);
          return result;
        }
      );
    }

    // Basic auth handling without proxy function
    return withAuth(req, resolvedOptions);
  };
}

// Create redirect helper function
function createRedirectResponse(
  req: NextRequest,
  pathname: string
): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

// Helper to identify which platform is being accessed
function getActivePlatform(pathname: string): Platform | null {
  if (pathname.startsWith("/reva")) return Platform.REVA;
  if (
    pathname.startsWith("/surfboard") ||
    pathname.startsWith("/surfboard-restricted") ||
    pathname.startsWith("/surfboard-mda")
  ) return Platform.SURFBOARD;
  if (pathname.startsWith("/gbc")) return Platform.GBC;
  if (pathname.startsWith("/scram")) return Platform.SCRAM;
  return null;
}

// 2. With additional proxy logic
const proxyWithLogic = withDynamicAuth(
  {
    loginPage: (req: NextRequest) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/reva-restricted"))
        return "/reva-restricted/login";
      if (pathname.startsWith("/reva")) return "/reva/login";
      if (pathname.startsWith("/surfboard-mda")) return "/surfboard-mda/login";
      if (pathname.startsWith("/surfboard-restricted"))
        return "/surfboard-restricted/login";
      if (pathname.startsWith("/surfboard")) return "/surfboard/login";
      if (pathname.startsWith("/gbc/restricted"))
        return "/gbc/restricted-login";
      if (pathname.startsWith("/gbc")) return "/gbc/login";

      return "/reva/login"; // Default fallback
    },
    isReturnToCurrentPage: true,
  },
  async (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    console.log("🛡️ Proxy - Pathname:", pathname);

    // Skip proxy for public routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      console.log("🛡️ Proxy - Public route detected, skipping auth");
      return NextResponse.next();
    }

    const activePlatform = getActivePlatform(pathname);

    // If not a platform route we care about, skip
    if (!activePlatform && !protectedRoutes.some((route) => pathname.startsWith(route))) {
       return NextResponse.next();
    }

    // Get the authenticated user from Kinde
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    console.log("🛡️ Proxy - Kinde user:", kindeUser?.id);

    if (!kindeUser || !kindeUser.id) {
      let redirectPath = "/reva/login";
      if (pathname.startsWith("/reva-restricted"))
        redirectPath = "/reva-restricted/login";
      else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
      else if (pathname.startsWith("/surfboard-mda"))
        redirectPath = "/surfboard-mda/login";
      else if (pathname.startsWith("/surfboard-restricted"))
        redirectPath = "/surfboard-restricted/login";
      else if (pathname.startsWith("/surfboard"))
        redirectPath = "/surfboard/login";
      else if (pathname.startsWith("/gbc/restricted"))
        redirectPath = "/gbc/restricted-login";
      else if (pathname.startsWith("/gbc")) redirectPath = "/gbc/login";
      console.log(
        "🛡️ Proxy - User not authenticated, redirecting to:",
        redirectPath
      );
      return createRedirectResponse(req, redirectPath);
    }

    try {
      const sessionData = await getAndRefreshUserSession(req);

      if (!sessionData) {
        // If no session data, check if we're coming from the success route
        if (pathname.includes("/api/auth/success")) {
          console.log("🛡️ Proxy - Auth success route, allowing cookie setup");
          return NextResponse.next();
        }

        let redirectPath = "/reva/login";
        if (pathname.startsWith("/reva-restricted"))
          redirectPath = "/reva-restricted/login";
        else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
        else if (pathname.startsWith("/surfboard-mda"))
          redirectPath = "/surfboard-mda/login";
        else if (pathname.startsWith("/surfboard-restricted"))
          redirectPath = "/surfboard-restricted/login";
        else if (pathname.startsWith("/surfboard"))
          redirectPath = "/surfboard/login";
        else if (pathname.startsWith("/gbc/restricted"))
          redirectPath = "/gbc/restricted-login";
        else if (pathname.startsWith("/gbc")) redirectPath = "/gbc/login";
        console.log("🛡️ Proxy - No session data found, redirecting to:", redirectPath);
        return createRedirectResponse(req, redirectPath);
      }

      const { userData, response: refreshedResponse } = sessionData;

      // Identify active platform session
      if (!activePlatform) return refreshedResponse;
      
      const platformSession = userData.platforms[activePlatform];

      console.log("🛡️ Proxy - Multi-Platform Session:", {
          activePlatform,
          hasSession: !!platformSession,
          role: platformSession?.role,
          allPlatforms: Object.keys(userData.platforms)
      });

      if (!platformSession) {
        let redirectPath = "/reva/login";
        if (pathname.startsWith("/reva-restricted"))
          redirectPath = "/reva-restricted/login";
        else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
        else if (pathname.startsWith("/surfboard-mda"))
          redirectPath = "/surfboard-mda/login";
        else if (pathname.startsWith("/surfboard-restricted"))
          redirectPath = "/surfboard-restricted/login";
        else if (pathname.startsWith("/surfboard"))
          redirectPath = "/surfboard/login";
        else if (pathname.startsWith("/gbc/restricted"))
          redirectPath = "/gbc/restricted-login";
        else if (pathname.startsWith("/gbc")) redirectPath = "/gbc/login";
        console.log("🛡️ Proxy - Missing platform session, redirecting to:", redirectPath);
        return createRedirectResponse(req, redirectPath);
      }

      const role = platformSession.role;

      // Check route-specific permissions
      let hasAccess = false;

      if (pathname.startsWith("/reva/dashboard")) {
        hasAccess = canAccessRevaUserPanel(role);
      } else if (pathname.startsWith("/reva-restricted/dashboard")) {
        if (pathname.startsWith("/reva-restricted/dashboard/superadmin")) {
          hasAccess = canAccessRevaSuperAdminPanel(role);
        } else {
          hasAccess = canAccessRevaAdminPanel(role);
        }
      } else if (pathname.startsWith("/reva-restricted/superadmin")) {
        hasAccess = canAccessRevaSuperAdminPanel(role);
      } else if (pathname.startsWith("/surfboard/dashboard")) {
        // Nav/role access now comes from surfboard/access/routes.ts (the
        // same registry DashboardShell reads) instead of a single blanket
        // canAccessSurfUserPanel check repeated per-branch — subscription
        // gating (unrelated to role/nav) stays its own step below.
        const hasRoleAccess = canAccessSurfboardRoute(pathname, role);
        if (
          pathname == "/surfboard/dashboard" ||
          pathname == "/surfboard/dashboard/settings" ||
          pathname == "/surfboard/dashboard/subscription"
        ) {
          hasAccess = hasRoleAccess;
        } else if (!hasRoleAccess) {
          hasAccess = false;
        } else {
          try {
            // Note: getUserAndActiveSub uses cookies() which is fine in middleware context if handled correctly,
            // but we should ideally use the subscription data from the cookie if available
            const subData = platformSession.subscription;

            if (!subData || subData.status !== "active") {
              // Check if it's canceled but still valid
              const isGracePeriod = subData?.status === "canceled" && subData.expiresAt && new Date(subData.expiresAt) >= new Date();

              if (!isGracePeriod) {
                  console.log("🛡️ Proxy - No valid subscription in cookie, redirecting to sub page");
                  return createRedirectResponse(req, "/surfboard/dashboard/subscription");
              }
            }
            hasAccess = true;
          } catch (error) {
            console.log("🛡️ Proxy - Error processing sub in proxy:", error);
            hasAccess = false;
            return createRedirectResponse(req, "/surfboard/dashboard/subscription");
          }
        }
      } else if (pathname.startsWith("/surfboard-restricted/dashboard")) {
        hasAccess = canAccessSurfboardRoute(pathname, role);
      } else if (pathname.startsWith("/surfboard-restricted/superadmin")) {
        // Not a registry entry — no real page lives at this exact path
        // (only /surfboard-restricted/dashboard/superadmin does); kept as a
        // direct role check since it's in the matcher/protectedRoutes list
        // and this migration isn't the place to decide it's dead.
        hasAccess = role === SurfboardRole.SUPERADMIN;
      } else if (pathname.startsWith("/surfboard-mda/dashboard")) {
        // Real gap closed here: the source's hand-rolled `pathname.includes`
        // checks are replaced by the same registry — every MDA stage role
        // now maps to exactly the pages its `roles` array in
        // surfboard/access/routes.ts allows, instead of a parallel,
        // easy-to-drift string-matching table.
        hasAccess = canAccessSurfboardRoute(pathname, role);
      } else if (pathname.startsWith("/gbc/restricted")) {
        if (pathname.startsWith("/gbc/restricted/superadmin")) {
          hasAccess = canAccessGBCSuperAdminPanel(role);
        } else {
          hasAccess = canAccessGBCAdminPanel(role);
        }
      }

      console.log("🛡️ Proxy - Access granted:", hasAccess, "--", role, "in platform:", activePlatform);

      if (!hasAccess) {
        let redirectPath = "/reva/login";
        if (pathname.startsWith("/reva-restricted"))
          redirectPath = "/reva-restricted/login";
        else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
        else if (pathname.startsWith("/surfboard-mda"))
          redirectPath = "/surfboard-mda/login";
        else if (pathname.startsWith("/surfboard-restricted"))
          redirectPath = "/surfboard-restricted/login";
        else if (pathname.startsWith("/surfboard"))
          redirectPath = "/surfboard/login";
        else if (pathname.startsWith("/gbc/restricted"))
          redirectPath = "/gbc/restricted-login";
        else if (pathname.startsWith("/gbc")) redirectPath = "/gbc/login";
        console.log("🛡️ Proxy - User does not have required role, redirecting to:", redirectPath);
        return createRedirectResponse(req, redirectPath);
      }

      return refreshedResponse;
    } catch (error) {
      console.error("🛡️ Proxy - Error processing session:", error);
      return createRedirectResponse(req, "/reva/login");
    }
  }
);

export const proxy = proxyWithLogic;
export default proxyWithLogic;

export const config = {
  matcher: [
    "/reva/dashboard/:path*",
    "/reva-restricted/dashboard/:path*",
    "/reva-restricted/superadmin/:path*",
    "/surfboard/dashboard/:path*",
    "/surfboard-restricted/dashboard/:path*",
    "/surfboard-restricted/superadmin/:path*",
    "/surfboard-mda/dashboard/:path*",
    "/gbc/restricted/:path*",
  ],
};
