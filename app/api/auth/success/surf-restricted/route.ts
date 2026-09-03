import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { issueSession } from "@/lib/auth/session";
import { Platform, SurfboardRole } from "@/utils/platform";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    // Try to find admin user by kindeId OR email
    let dbUser = await prisma.surfboardUser.findFirst({
      where: {
        OR: [{ kindeId: user.id }, { email: user.email ?? "" }],
        role: {
          in: ["SUPERADMIN", "ADMIN"],
        },
      },
    });

    // If user was found by email but doesn't have kindeId, update it
    if (dbUser && (dbUser.kindeId !== user.id || dbUser.email !== user.email)) {
      dbUser = await prisma.surfboardUser.update({
        where: { id: dbUser.id },
        data: { kindeId: user.id, email: user.email ?? "" },
      });
    }

    // If still no user found, reject the login
    if (!dbUser) {
      console.error(
        `Admin login denied for ${user.email} - User not found or lacks admin privileges`
      );
      throw new Error(
        "Access denied: You must be registered as an admin to access this area"
      );
    }

    // Also mint a native session (additive; must never break the existing
    // Kinde login flow if it fails).
    try {
      await issueSession(dbUser.id, dbUser.role, Platform.SURFBOARD);
    } catch (err) {
      console.error("issueSession failed for surf-restricted callback:", err);
    }

    // Create encrypted user data
    const userData = {
      platform: Platform.SURFBOARD,
      role: dbUser.role as SurfboardRole,
      userId: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      kindeId: dbUser.kindeId,
      picture: user.picture,
    };

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      request.cookies.get("my_redirect_url")?.value;
    const fallbackUrl = "/surfboard-restricted/dashboard";

    const redirectUrl = (() => {
      if (
        postLoginRaw &&
        postLoginRaw.startsWith("/surfboard-restricted/dashboard")
      ) {
        const url = new URL(postLoginRaw, process.env.BASE_URL);
        return url.pathname + "?" + url.searchParams.toString();
      }
      return fallbackUrl;
    })();

    // Redirect to the beautiful redirect page with redirectionPage param
    const redirectPageUrl = addBaseUrl(
      `/redirect?redirectionPage=${encodeURIComponent(redirectUrl)}`
    );
    const response = NextResponse.redirect(redirectPageUrl);
    const responseWithCookie = await setEncryptedUserCookie(userData, response);
    return responseWithCookie;
  } catch (error) {
    console.error("Error in GET /auth/success/surfboard-restricted:", error);
    return NextResponse.redirect(addBaseUrl("/surfboard-restricted/error-login"));
  }
}
