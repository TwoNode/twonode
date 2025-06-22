import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  canAccessRevaAdminPanel,
  canAccessRevaUserPanel,
  canAccessRevaSuperAdminPanel,
} from "@/permissions";
import {
  getAndRefreshUserSession,
  getEncryptedUserDataFromRequest,
  isPlatformUser,
} from "@/utils/encryptedCookies";
import { Platform } from "@/utils/platform";

// Define the paths that require authentication
const protectedRoutes = [
  "/reva/dashboard",
  "/reva-restricted/dashboard",
  "/reva-restricted/superadmin",
]; // Fixed: added missing slash

type DynamicAuthOptions = any & {
  loginPage?: string | ((req: NextRequest) => string);
  isReturnToCurrentPage?: boolean | ((req: NextRequest) => boolean);
};

function withDynamicAuth(options?: DynamicAuthOptions, middlewareFn?: any) {
  return async (req: NextRequest) => {
    // Resolve dynamic login page if provided as a function
    const resolvedOptions: any = {
      ...options,
      loginPage:
        typeof options?.loginPage === "function"
          ? options.loginPage(req)
          : options?.loginPage,
    };

    if (middlewareFn) {
      // Handle case where middleware function is provided
      return withAuth(
        req,
        resolvedOptions,
        async ({ token, user }: { token: string; user: any }) => {
          (req as any).kindeAuth = { token, user };
          return await middlewareFn(req);
        }
      );
    }

    // Basic auth handling without middleware function
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

// 2. With additional middleware logic
const middlewareWithLogic = withDynamicAuth(
  {
    loginPage: (req: NextRequest) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/reva-restricted"))
        return "/reva-restricted/login";
      if (pathname.startsWith("/reva")) return "/reva/login";

      return "/reva/login"; // Default fallback
    },
    isReturnToCurrentPage: true,
  },
  async (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    console.log("🛡️ Middleware - Pathname:", pathname);

    // Check for isNewLogin parameter
    const isNewLogin = req.nextUrl.searchParams.get("isNewLogin");
    if (isNewLogin === "true") {
      console.log("🛡️ Middleware - Fresh login detected, allowing access");
      return NextResponse.next();
    }

    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      console.log("🛡️ Middleware - Protected route detected");

      // Get the authenticated user from Kinde
      const { getUser } = getKindeServerSession();
      const kindeUser = await getUser();

      console.log("🛡️ Middleware - Kinde user:", kindeUser?.id);

      if (!kindeUser || !kindeUser.id) {
        const redirectPath = pathname.startsWith("/reva-restricted")
          ? "/reva-restricted/login"
          : "/reva/login";
        console.log(
          "🛡️ Middleware - User not authenticated, redirecting to:",
          redirectPath
        );
        return createRedirectResponse(req, redirectPath);
      }

      try {
        // Option 1: Get and refresh user session (recommended)
        // This automatically updates the last activity and refreshes the cookie
        const sessionData = await getAndRefreshUserSession(req);

        if (!sessionData) {
          // If no session data, check if we're coming from the success route
          if (pathname.includes("/api/auth/success")) {
            // Allow the request to continue to set the cookie
            console.log(
              "🛡️ Middleware - Auth success route, allowing cookie setup"
            );
            return NextResponse.next();
          }

          const redirectPath = pathname.startsWith("/reva-restricted")
            ? "/reva-restricted/login"
            : "/reva/login";
          console.log(
            "🛡️ Middleware - No session data found, redirecting to:",
            redirectPath
          );
          return createRedirectResponse(req, redirectPath);
        }

        const { userData, response: refreshedResponse } = sessionData;

        console.log(
          "🛡️ Middleware - User data:",
          userData
            ? {
                platform: userData.platform,
                role: userData.role,
                email: userData.email,
                sessionId: userData.sessionId,
              }
            : null
        );

        // Check platform access
        if (!isPlatformUser(userData, Platform.REVA)) {
          const redirectPath = pathname.startsWith("/reva-restricted")
            ? "/reva-restricted/login"
            : "/reva/login";
          console.log(
            "🛡️ Middleware - Wrong platform, redirecting to:",
            redirectPath
          );
          return createRedirectResponse(req, redirectPath);
        }

        // Check route-specific permissions
        let hasAccess = false;

        if (pathname.startsWith("/reva/dashboard")) {
          // Regular user dashboard - any authenticated REVA user can access
          console.log("🛡️ Middleware - Checking user dashboard access");
          hasAccess = canAccessRevaUserPanel(userData.role);
        } else if (pathname.startsWith("/reva-restricted/dashboard")) {
          // Admin dashboard - only ADMIN and SUPERADMIN can access
          console.log("🛡️ Middleware - Checking admin dashboard access");

          // Special check for superadmin routes within dashboard
          if (pathname.startsWith("/reva-restricted/dashboard/superadmin")) {
            console.log(
              "🛡️ Middleware - Checking superadmin access within dashboard"
            );
            hasAccess = canAccessRevaSuperAdminPanel(userData.role);
          } else {
            hasAccess = canAccessRevaAdminPanel(userData.role);
          }
        } else if (pathname.startsWith("/reva-restricted/superadmin")) {
          // Superadmin dashboard - only SUPERADMIN can access
          console.log("🛡️ Middleware - Checking superadmin access");
          hasAccess = canAccessRevaSuperAdminPanel(userData.role);
        }

        console.log("🛡️ Middleware - Access granted:", hasAccess);

        if (!hasAccess) {
          const redirectPath = pathname.startsWith("/reva-restricted")
            ? "/reva-restricted/login"
            : "/reva/login";
          console.log(
            "🛡️ Middleware - User does not have required role, redirecting to:",
            redirectPath
          );
          return createRedirectResponse(req, redirectPath);
        }

        // Return the refreshed response to update the cookie
        console.log("🛡️ Middleware - Proceeding with refreshed session");
        return refreshedResponse;

        // Option 2: Alternative approach without auto-refresh
        // Uncomment this block and comment out the above if you don't want auto-refresh
        /*
        const userData = await getEncryptedUserDataFromRequest(req);
        
        if (!userData) {
          const redirectPath = pathname.startsWith("/reva-restricted/dashboard")
            ? "/reva-restricted/login"
            : "/reva/login";
          console.log(
            "🛡️ Middleware - No user data found, redirecting to:",
            redirectPath
          );
          return createRedirectResponse(req, redirectPath);
        }

        // ... rest of the permission checks ...
        
        console.log("🛡️ Middleware - Proceeding to next");
        return NextResponse.next();
        */
      } catch (error) {
        console.error("🛡️ Middleware - Error processing session:", error);

        const redirectPath = pathname.startsWith("/reva-restricted")
          ? "/reva-restricted/login"
          : "/reva/login";
        console.log(
          "🛡️ Middleware - Session error, redirecting to:",
          redirectPath
        );
        return createRedirectResponse(req, redirectPath);
      }
    }

    console.log("🛡️ Middleware - Proceeding to next (unprotected route)");
    return NextResponse.next();
  }
);

export default middlewareWithLogic;

export const config = {
  matcher: [
    "/reva/dashboard/:path*",
    "/reva-restricted/dashboard/:path*",
    "/reva-restricted/superadmin/:path*",
  ],
};
