import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

// Define the paths that require authentication
const protectedRoutes = ["/reva/dashboard", "reva-restricted/dashboard"];

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

    console.log(
      "\n\n\n\n\n\n\n\n",
      resolvedOptions?.loginPage,
      "\n\n\n\n\n\n\n\n"
    );

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
    // console.log("\n\n\n\n\n\n\n\nlook at me", req.kindeAuth, "\n\n\n\n\n");
    // const cookies = req.cookies.getAll();
    const userTypeCookie = req.cookies.get("USER_TYPE");
    const userTypeQueryParam = req.nextUrl.searchParams.get("user_type");

    const userType = userTypeCookie?.value || userTypeQueryParam;

    console.log("USER_TYPE Query Param:", userTypeQueryParam);
    console.log("USER_TYPE Cookie: ", userType);

    const pathname = req.nextUrl.pathname;

    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      if (
        (pathname.startsWith("/reva/dashboard") && userType !== "reva_user") ||
        (pathname.startsWith("/reva-restricted/dashboard") &&
          userType !== "reva_admin")
      ) {
        const url = req.nextUrl.clone();
        url.pathname = pathname.startsWith("/reva-restricted/dashboard")
          ? "/reva-restricted/login"
          : "/reva/login";
        url.searchParams.delete("user_type");
        console.log("Redirecting to login page");
        return NextResponse.redirect(url);
      }
    }

    if (userTypeQueryParam) {
      const url = req.nextUrl.clone();
      url.searchParams.delete("user_type");

      const res = NextResponse.redirect(url);
      res.cookies.set({
        name: "USER_TYPE",
        value: userTypeQueryParam,
        path: "/",
        httpOnly: true,
      });
      return res;
    }

    return NextResponse.next();
  }
);

export default middlewareWithLogic;

export const config = {
  matcher: [
    "/reva/dashboard/:path*",
    "/reva-restricted/dashboard/:path*",
    // "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
