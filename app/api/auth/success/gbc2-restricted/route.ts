import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { Platform, GBCRole } from "@/utils/platform";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id) {
      throw new Error("No authenticated user from Kinde");
    }

    // ADMIN LOGIN - Only existing admin users can login, no account creation
    // Try to find admin user by kindeId OR email
    let dbUser = await prisma.gBCUser.findFirst({
      where: {
        OR: [{ kindeId: user.id }, { email: user.email ?? "" }],
        role: {
          in: ["SUPERADMIN", "ADMIN"],
        },
      },
    });

    // If user was found by email but doesn't have kindeId, update it
    if (dbUser && dbUser.kindeId !== user.id && dbUser.email !== user.email) {
      dbUser = await prisma.gBCUser.update({
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

    // Check if admin account is active
    if (!dbUser.isActive) {
      console.error(
        `Admin login denied for ${user.email} - Account is deactivated`
      );
      throw new Error(
        "Access denied: Your admin account has been deactivated. Please contact a super admin."
      );
    }

    // Create encrypted user data
    const userData = {
      platform: Platform.GBC,
      role: dbUser.role as GBCRole,
      userId: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName || "",
      lastName: dbUser.lastName || "",
      kindeId: dbUser.kindeId,
      picture: user.picture,
    };

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      request.cookies.get("my_redirect_url")?.value;
    const fallbackUrl = "/gbc2/restricted";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/gbc2/restricted")) {
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
    console.error("Error in GET /auth/success/gbc2-restricted:", error);
    return NextResponse.redirect(addBaseUrl("/gbc2/error-login"));
  }
}
