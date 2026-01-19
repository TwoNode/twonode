import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { Platform, SurfboardRole } from "@/utils/platform";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    console.log("🔑 Surf-MDA Auth - Starting authentication...");
    console.log("🔑 Surf-MDA Auth - Kinde user:", {
      id: user?.id,
      email: user?.email,
      firstName: user?.given_name,
      lastName: user?.family_name,
    });

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    // Try to find MDA user by kindeId OR email with MDA roles (including SUPERADMIN)
    console.log("🔑 Surf-MDA Auth - Looking up user in database...");
    let dbUser = await prisma.surfboardUser.findFirst({
      where: {
        OR: [{ kindeId: user.id }, { email: user.email ?? "" }],
        role: {
          in: [
            "RECORDS_I",
            "RECORDS_II",
            "ACCOUNTS",
            "CHARTING",
            "SURCON",
            "SUPERADMIN",
            "MDA_SUPERADMIN",
          ],
        },
      },
    });

    console.log(
      "🔑 Surf-MDA Auth - DB user found:",
      dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            kindeId: dbUser.kindeId,
          }
        : null
    );

    // If user was found by email but doesn't have kindeId, update it
    if (dbUser && (dbUser.kindeId !== user.id || dbUser.email !== user.email)) {
      console.log(
        "🔑 Surf-MDA Auth - Updating kindeId/email for existing user..."
      );
      dbUser = await prisma.surfboardUser.update({
        where: { id: dbUser.id },
        data: { kindeId: user.id, email: user.email ?? "" },
      });
    }

    // If still no user found, reject the login
    if (!dbUser) {
      console.error(
        `MDA login denied for ${user.email} - User not found or lacks MDA role`
      );
      throw new Error(
        "Access denied: You must be registered with an MDA role to access this portal"
      );
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
    const fallbackUrl = "/surf-mda/dashboard";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/surf-mda/dashboard")) {
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
    console.error("Error in GET /auth/success/surf-mda:", error);
    return NextResponse.redirect(addBaseUrl("/surf-mda/error-login"));
  }
}
