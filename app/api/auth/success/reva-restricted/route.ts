import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { Platform, RevaRole } from "@/utils/platform";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    let dbUser = await prisma.revaUser.findFirst({
      where: {
        kindeId: user.id,
        OR: [{ role: "SUPERADMIN" }, { role: "ADMIN" }],
      },
    });

    if (!dbUser) {
      throw new Error("Admin User not found!");
    }

    // Create encrypted user data
    const userData = {
      platform: Platform.REVA,
      role: dbUser.role as RevaRole,
      userId: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      kindeId: dbUser.kindeId,
    };

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      request.cookies.get("my_redirect_url")?.value;
    const fallbackUrl = "/reva-restricted/dashboard";

    const redirectUrl = (() => {
      if (
        postLoginRaw &&
        postLoginRaw.startsWith("/reva-restricted/dashboard")
      ) {
        const url = new URL(postLoginRaw, process.env.BASE_URL);
        return url.pathname + "?" + url.searchParams.toString();
      }
      return fallbackUrl;
    })();

    // Parse existing URL and params
    const existingUrl = new URL(redirectUrl, process.env.BASE_URL);
    const existingParams = existingUrl.searchParams;

    // Create final URL with all params
    const finalUrl = new URL(redirectUrl, process.env.BASE_URL);

    // Copy over existing params
    existingParams.forEach((value, key) => {
      finalUrl.searchParams.set(key, value);
    });

    // Add isNewLogin parameter
    finalUrl.searchParams.set("isNewLogin", "true");

    // Create single response with final redirect URL
    const response = NextResponse.redirect(
      addBaseUrl(finalUrl.pathname + "?" + finalUrl.searchParams.toString())
    );

    // Set encrypted user cookie on the response and return it
    const responseWithCookie = await setEncryptedUserCookie(userData, response);
    return responseWithCookie;
  } catch (error) {
    console.error("Error in GET /auth/success/reva:", error);
    return NextResponse.redirect(addBaseUrl("/reva/error-login"));
  }
}
