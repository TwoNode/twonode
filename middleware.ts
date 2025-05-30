import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

// Define the paths that require authentication
const protectedRoutes = ["/reva/dashboard"];

// export default function middleware(req: NextRequest) {
//   console.log("isLoggedIn", "isLoggedIn");
//   const url = req.nextUrl.clone();
//   const pathname = url.pathname;

//   // Check if the request is for a protected route
//   if (protectedRoutes.some((route) => pathname.startsWith(route))) {
//     const isLoggedIn = req.cookies.get("isLoggedIn")?.value;

//     // Redirect to login if not logged in
//     if (!isLoggedIn || isLoggedIn !== "true") {
//       url.pathname = "/reva/login"; // Redirect to login page
//       return NextResponse.redirect(url);
//     }
//   }

//   return NextResponse.next(); // Allow access if the user is logged in
// }

export default withAuth(
  async function middleware(req: any) {
    // console.log("\n\n\n\n\n\n\n\nlook at me", req.kindeAuth, "\n\n\n\n\n");
    // const cookies = req.cookies.getAll();
    const userTypeCookie = req.cookies.get("USER_TYPE");
    const userTypeQueryParam = req.nextUrl.searchParams.get("user_type");

    const userType = userTypeCookie?.value || userTypeQueryParam;

    console.log("USER_TYPE Query Param:", userTypeQueryParam);
    console.log("USER_TYPE Cookie: ", userType);

    if (
      protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
    ) {
      if (userType !== "reva_user" && userType !== "reva_admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/reva/login"; // Redirect to login page
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
        value: "reva_user",
        path: "/",
        httpOnly: true,
      });
      return res;
    }

    return NextResponse.next(); // Allow access if the user type is valid
  },
  {
    isReturnToCurrentPage: true,
    loginPage: "/reva/login",
    // publicPaths: ["/public", "/more"],
    // isAuthorized: ({ token }: { token: any }) => {
    //   // The user will be considered authorized if they have the permission 'eat:chips'
    //   return token.permissions.includes("eat:chips");
    // },
  }
);

export const config = {
  matcher: [
    "/reva/dashboard/:path*",
    "/reva-restricted/:path*",
    // "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
