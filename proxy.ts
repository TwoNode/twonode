import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { canAccessGBCSuperAdminPanel } from "@/permissions";
import {
  getAndRefreshUserSession,
  getUserActiveSubscription,
  SubscriptionData,
} from "@/utils/encryptedCookies";
import { Platform, SurfboardRole, RevaRole } from "@/utils/platform";
import { canAccessRoute as canAccessSurfboardRoute } from "@/surfboard/access/routes";
import { canAccessRoute as canAccessRevaRoute } from "@/reva/access/routes";
import { canAccessRoute as canAccessGBCRoute } from "@/gbc/access/routes";
import { getServerSession as getNativeSession } from "@/lib/auth/session";

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
  "/gbc-restricted",
];

// Define public routes that bypass authentication
const publicRoutes = [
  "/surfboardplan/", // This will match /surfboardplan/[id]
  // GBC's matcher/protectedRoutes below cover the whole "/gbc-restricted"
  // subtree (unlike REVA/Surfboard, which only gate their "/dashboard" and
  // "/superadmin" segments, leaving "/login" etc. outside the matcher
  // entirely). Without these, someone who isn't logged in — e.g. anyone
  // opening a password-reset link, by definition — got redirected straight
  // back to the login page instead of ever seeing these pages.
  "/gbc-restricted/login",
  "/gbc-restricted/reset-password",
  "/gbc-restricted/verify-email",
  // An invitee has no account (so no session) until they follow this link.
  "/gbc-restricted/accept-invite",
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

// Where an unauthenticated/unauthorized request for a given path gets sent.
// Shared by both the native-session fast path and the legacy Kinde flow so
// the two never drift out of sync.
function resolveLoginRedirect(pathname: string): string {
  if (pathname.startsWith("/reva-restricted")) return "/reva-restricted/login";
  if (pathname.startsWith("/reva")) return "/reva/login";
  if (pathname.startsWith("/surfboard-mda")) return "/surfboard-mda/login";
  if (pathname.startsWith("/surfboard-restricted"))
    return "/surfboard-restricted/login";
  if (pathname.startsWith("/surfboard")) return "/surfboard/login";
  if (pathname.startsWith("/gbc-restricted")) return "/gbc-restricted/login";
  if (pathname.startsWith("/gbc")) return "/gbc/login";
  return "/reva/login"; // Default fallback
}

// Where an *authenticated* request lands when the role check for a specific
// page fails (e.g. a non-superadmin hitting a superadmin-only route). Unlike
// resolveLoginRedirect, this only ever runs once a valid session is already
// confirmed, so sending the user back to a login page would be wrong — they
// land on their own dashboard home instead.
function resolveDashboardRedirect(pathname: string): string {
  if (pathname.startsWith("/reva-restricted")) return "/reva-restricted/dashboard";
  if (pathname.startsWith("/reva")) return "/reva/dashboard";
  if (pathname.startsWith("/surfboard-mda")) return "/surfboard-mda/dashboard";
  if (pathname.startsWith("/surfboard-restricted"))
    return "/surfboard-restricted/dashboard";
  if (pathname.startsWith("/surfboard")) return "/surfboard/dashboard";
  if (pathname.startsWith("/gbc-restricted")) return "/gbc-restricted";
  if (pathname.startsWith("/gbc")) return "/gbc";
  return "/reva/dashboard"; // Default fallback
}

// Given a role already resolved for the active platform (regardless of
// whether it came from a native JWT session or the legacy Kinde-derived
// encrypted cookie), decides whether this specific route is reachable.
// Extracted so the native-session fast path below and the legacy Kinde flow
// share one implementation instead of two copies that can drift.
function computeRouteAccess(
  pathname: string,
  role: string,
  subscription?: SubscriptionData | null
): { hasAccess: boolean; redirectPath?: string } {
  if (
    pathname.startsWith("/reva/dashboard") ||
    pathname.startsWith("/reva-restricted/dashboard")
  ) {
    // Nav/role access comes from reva/access/routes.ts (the same registry
    // the sidebar layouts read).
    return { hasAccess: canAccessRevaRoute(pathname, role) };
  }

  if (pathname.startsWith("/reva-restricted/superadmin")) {
    // Not a registry entry — no real page lives at this exact path (only
    // /reva-restricted/dashboard/superadmin does); kept as a direct role
    // check, same treatment as surfboard-restricted's analogous dead branch.
    return { hasAccess: role === RevaRole.SUPERADMIN };
  }

  if (pathname.startsWith("/surfboard/dashboard")) {
    // Nav/role access comes from surfboard/access/routes.ts (the same
    // registry DashboardShell reads) — subscription gating is separate.
    const hasRoleAccess = canAccessSurfboardRoute(pathname, role);
    const alwaysAllowedEvenUnsubscribed =
      pathname === "/surfboard/dashboard" ||
      pathname === "/surfboard/dashboard/settings" ||
      pathname === "/surfboard/dashboard/subscription";

    if (alwaysAllowedEvenUnsubscribed) {
      return { hasAccess: hasRoleAccess };
    }
    if (!hasRoleAccess) {
      return { hasAccess: false };
    }

    if (!subscription || subscription.status !== "active") {
      const isGracePeriod =
        subscription?.status === "canceled" &&
        subscription.expiresAt &&
        new Date(subscription.expiresAt) >= new Date();

      if (!isGracePeriod) {
        return { hasAccess: false, redirectPath: "/surfboard/dashboard/subscription" };
      }
    }
    return { hasAccess: true };
  }

  if (pathname.startsWith("/surfboard-restricted/dashboard")) {
    return { hasAccess: canAccessSurfboardRoute(pathname, role) };
  }

  if (pathname.startsWith("/surfboard-restricted/superadmin")) {
    // Not a registry entry — no real page lives at this exact path (only
    // /surfboard-restricted/dashboard/superadmin does); kept as a direct
    // role check since it's in the matcher/protectedRoutes list.
    return { hasAccess: role === SurfboardRole.SUPERADMIN };
  }

  if (pathname.startsWith("/surfboard-mda/dashboard")) {
    return { hasAccess: canAccessSurfboardRoute(pathname, role) };
  }

  if (pathname.startsWith("/gbc-restricted")) {
    if (pathname.startsWith("/gbc-restricted/superadmin")) {
      // Not a registry entry — no real page lives at this exact path;
      // kept as a direct role check, same treatment as REVA's and
      // Surfboard's equivalent dead branches.
      return { hasAccess: canAccessGBCSuperAdminPanel(role) };
    }
    return { hasAccess: canAccessGBCRoute(pathname, role) };
  }

  return { hasAccess: false };
}

/**
 * Native-JWT-session fast path, checked before Kinde's own `withAuth` gate
 * ever runs. Additive only — Kinde stays the primary flow for everyone who
 * hasn't touched the new email/password login; this only intercepts
 * requests that carry a *valid* access_token_<platform> cookie, so it can
 * never turn an already-working Kinde session into a redirect. Native auth
 * doesn't cover Platform.SCRAM, so that platform always falls through to
 * the legacy flow below.
 */
async function tryNativeSession(
  req: NextRequest,
  pathname: string,
  activePlatform: Platform | null
): Promise<NextResponse | null> {
  if (!activePlatform || activePlatform === Platform.SCRAM) return null;

  const nativeSession = await getNativeSession(activePlatform);
  if (!nativeSession) return null;

  const role = nativeSession.role;
  let subscription: SubscriptionData | null = null;
  if (activePlatform === Platform.SURFBOARD && pathname.startsWith("/surfboard/dashboard")) {
    subscription = (await getUserActiveSubscription(nativeSession.sub)) as SubscriptionData | null;
  }

  const { hasAccess, redirectPath } = computeRouteAccess(pathname, role, subscription);
  console.log(
    "🛡️ Proxy [native] - Access:",
    hasAccess,
    "role:", role,
    "platform:", activePlatform
  );

  if (redirectPath) return createRedirectResponse(req, redirectPath);
  if (!hasAccess) return createRedirectResponse(req, resolveDashboardRedirect(pathname));
  return NextResponse.next();
}

// 2. With additional proxy logic
const proxyWithLogic = withDynamicAuth(
  {
    loginPage: (req: NextRequest) => resolveLoginRedirect(req.nextUrl.pathname),
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
      const redirectPath = resolveLoginRedirect(pathname);
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

        const redirectPath = resolveLoginRedirect(pathname);
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
        const redirectPath = resolveLoginRedirect(pathname);
        console.log("🛡️ Proxy - Missing platform session, redirecting to:", redirectPath);
        return createRedirectResponse(req, redirectPath);
      }

      const role = platformSession.role;
      const { hasAccess, redirectPath: gatedRedirect } = computeRouteAccess(
        pathname,
        role,
        platformSession.subscription
      );

      if (gatedRedirect) {
        console.log("🛡️ Proxy - Subscription gate, redirecting to:", gatedRedirect);
        return createRedirectResponse(req, gatedRedirect);
      }

      console.log("🛡️ Proxy - Access granted:", hasAccess, "--", role, "in platform:", activePlatform);

      if (!hasAccess) {
        const redirectPath = resolveDashboardRedirect(pathname);
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

async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const activePlatform = getActivePlatform(pathname);

  // Try the new native JWT session first — never touches Kinde's own
  // withAuth gate, so it can't affect anyone still on Kinde-only auth.
  const nativeResult = await tryNativeSession(req, pathname, activePlatform);
  if (nativeResult) return nativeResult;

  // No valid native session for this platform — fall back to the existing,
  // unmodified Kinde flow.
  return proxyWithLogic(req);
}

export { proxy };
export default proxy;

export const config = {
  matcher: [
    "/reva/dashboard/:path*",
    "/reva-restricted/dashboard/:path*",
    "/reva-restricted/superadmin/:path*",
    "/surfboard/dashboard/:path*",
    "/surfboard-restricted/dashboard/:path*",
    "/surfboard-restricted/superadmin/:path*",
    "/surfboard-mda/dashboard/:path*",
    "/gbc-restricted/:path*",
  ],
};
