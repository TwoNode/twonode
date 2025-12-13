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

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    let dbUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!dbUser) {
      const existingUser = await prisma.gBCUser.findUnique({
        where: { email: user.email ?? "" },
      });

      if (existingUser) {
        dbUser = await prisma.gBCUser.update({
          where: { id: existingUser.id },
          data: { kindeId: user.id },
        });
      } else {
        dbUser = await prisma.gBCUser.create({
          data: {
            kindeId: user.id,
            firstName: user.given_name ?? "",
            lastName: user.family_name ?? "",
            email: user.email ?? "",
          },
        });
      }
    }

    if (!dbUser) {
      throw new Error("Failed to create or find user in database");
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
    const fallbackUrl = "/gbc";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/gbc")) {
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
    console.error("Error in GET /auth/success/gbc:", error);
    return NextResponse.redirect(addBaseUrl("/gbc/error-login"));
  }
}
