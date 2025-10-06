import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  canAccessRevaAdminPanel,
  canAccessRevaUserPanel,
  canAccessRevaSuperAdminPanel,
  canAccessSurfAdminPanel,
  canAccessSurfUserPanel,
  canAccessSurfSuperAdminPanel,
} from "@/permissions";
import {
  getAndRefreshUserSession,
  getEncryptedUserDataFromRequest,
  isPlatformUser,
} from "@/utils/encryptedCookies";
import { Platform } from "@/utils/platform";

const ENTER_MSG = "\n\n\n ENTERING MIDDLEWARE \n";
const EXIT_MSG = "\n EXITING MIDDLEWARE..... \n\n\n";
// Define the paths that require authentication
const protectedRoutes = [
  "/reva/dashboard",
  "/reva-restricted/dashboard",
  "/reva-restricted/superadmin",
  "/surfboard/dashboard",
  "/surf-restricted/dashboard",
  "/surf-restricted/superadmin",
]; // Added Surfboard routes

// Define public routes that bypass authentication
const publicRoutes = [
  "/surfboardplan/", // This will match /surfboardplan/[id]
];

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

    console.log(ENTER_MSG);
    if (middlewareFn) {
      // Handle case where middleware function is provided
      return withAuth(
        req,
        resolvedOptions,
        async ({ token, user }: { token: string; user: any }) => {
          (req as any).kindeAuth = { token, user };
          const result = await middlewareFn(req);
          console.log(EXIT_MSG);
          return result;
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
      if (pathname.startsWith("/surf-restricted"))
        return "/surf-restricted/login";
      if (pathname.startsWith("/surfboard")) return "/surfboard/login";

      return "/reva/login"; // Default fallback
    },
    isReturnToCurrentPage: true,
  },
  async (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    console.log("🛡️ Middleware - Pathname:", pathname);

    // Skip middleware for public routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      console.log("🛡️ Middleware - Public route detected, skipping auth");

      return NextResponse.next();
    }

    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      console.log("🛡️ Middleware - Protected route detected");

      // Get the authenticated user from Kinde
      const { getUser } = getKindeServerSession();
      const kindeUser = await getUser();

      console.log("🛡️ Middleware - Kinde user:", kindeUser?.id);

      if (!kindeUser || !kindeUser.id) {
        let redirectPath = "/reva/login";
        if (pathname.startsWith("/reva-restricted"))
          redirectPath = "/reva-restricted/login";
        else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
        else if (pathname.startsWith("/surf-restricted"))
          redirectPath = "/surf-restricted/login";
        else if (pathname.startsWith("/surfboard"))
          redirectPath = "/surfboard/login";
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

          let redirectPath = "/reva/login";
          if (pathname.startsWith("/reva-restricted"))
            redirectPath = "/reva-restricted/login";
          else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
          else if (pathname.startsWith("/surf-restricted"))
            redirectPath = "/surf-restricted/login";
          else if (pathname.startsWith("/surfboard"))
            redirectPath = "/surfboard/login";
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
        let platformCheck = false;
        if (pathname.startsWith("/reva")) {
          platformCheck = isPlatformUser(userData, Platform.REVA);
        } else if (
          pathname.startsWith("/surfboard") ||
          pathname.startsWith("/surf-restricted")
        ) {
          platformCheck = isPlatformUser(userData, Platform.SURFBOARD);
        }

        if (!platformCheck) {
          let redirectPath = "/reva/login";
          if (pathname.startsWith("/reva-restricted"))
            redirectPath = "/reva-restricted/login";
          else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
          else if (pathname.startsWith("/surf-restricted"))
            redirectPath = "/surf-restricted/login";
          else if (pathname.startsWith("/surfboard"))
            redirectPath = "/surfboard/login";
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
        } else if (pathname.startsWith("/surfboard/dashboard")) {
          // Surfboard user dashboard - any authenticated Surfboard user can access
          console.log(
            "🛡️ Middleware - Checking Surfboard user dashboard access"
          );

          hasAccess = canAccessSurfUserPanel(userData.role);
          // if (
          //   pathname == "/surfboard/dashboard" ||
          //   pathname == "/surfboard/dashboard/settings" ||
          //   pathname == "/surfboard/dashboard/subscription"
          // ) {
          //   hasAccess = canAccessSurfUserPanel(userData.role);
          // } else {
          //   const hasRoleAccess = canAccessSurfUserPanel(userData.role);
          //   if (!hasRoleAccess) {
          //     hasAccess = false;
          //   } else {
          //     try {
          //       const sub = userData?.subscription;

          //       if (!sub) {
          //         hasAccess = false;
          //       } else {
          //         const now = new Date();
          //         hasAccess = now <= new Date(sub.expiresAt!);
          //         console.log(
          //           "🛡️ Middleware - Checking subscription access",
          //           now,
          //           sub.expiresAt,
          //           new Date(sub.expiresAt!).toString(),
          //           hasAccess
          //         );
          //       }

          //       if (!hasAccess) {
          //         console.log(
          //           "🛡️ Middleware - User is not subscribed, redirecting to:/surfboard/dashboard/subscription",
          //           sub,
          //           hasAccess,
          //           "\n\n\n\n"
          //         );
          //         return createRedirectResponse(
          //           req,
          //           "/surfboard/dashboard/subscription"
          //         );
          //       }
          //     } catch (error) {
          //       console.log("🛡️ Middleware - Error processing session:", error);
          //       hasAccess = false;

          //       return createRedirectResponse(
          //         req,
          //         "/surfboard/dashboard/subscription"
          //       );
          //     }
          //   }
          // }
        } else if (pathname.startsWith("/surf-restricted/dashboard")) {
          // Surfboard admin dashboard - only ADMIN and SUPERADMIN can access
          console.log(
            "🛡️ Middleware - Checking Surfboard admin dashboard access"
          );

          // Special check for superadmin routes within dashboard
          if (pathname.startsWith("/surf-restricted/dashboard/superadmin")) {
            console.log(
              "🛡️ Middleware - Checking Surfboard superadmin access within dashboard"
            );
            hasAccess = canAccessSurfSuperAdminPanel(userData.role);
          } else {
            hasAccess = canAccessSurfAdminPanel(userData.role);
          }
        } else if (pathname.startsWith("/surf-restricted/superadmin")) {
          // Surfboard superadmin dashboard - only SUPERADMIN can access
          console.log("🛡️ Middleware - Checking Surfboard superadmin access");
          hasAccess = canAccessSurfSuperAdminPanel(userData.role);
        }

        console.log("🛡️ Middleware - Access granted:", hasAccess);

        if (!hasAccess) {
          let redirectPath = "/reva/login";
          if (pathname.startsWith("/reva-restricted"))
            redirectPath = "/reva-restricted/login";
          else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
          else if (pathname.startsWith("/surf-restricted"))
            redirectPath = "/surf-restricted/login";
          else if (pathname.startsWith("/surfboard"))
            redirectPath = "/surfboard/login";
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

        let redirectPath = "/reva/login";
        if (pathname.startsWith("/reva-restricted"))
          redirectPath = "/reva-restricted/login";
        else if (pathname.startsWith("/reva")) redirectPath = "/reva/login";
        else if (pathname.startsWith("/surf-restricted"))
          redirectPath = "/surf-restricted/login";
        else if (pathname.startsWith("/surfboard"))
          redirectPath = "/surfboard/login";
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
    "/surfboard/dashboard/:path*",
    "/surf-restricted/dashboard/:path*",
    "/surf-restricted/superadmin/:path*",
  ],
};
