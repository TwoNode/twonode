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

    let dbUser = await prisma.revaUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!dbUser) {
      const existingUser = await prisma.revaUser.findUnique({
        where: { email: user.email ?? "" },
      });

      if (
        existingUser &&
        existingUser.kindeId?.startsWith("REVA_ADMIN_KINDE_ID_")
      ) {
        dbUser = await prisma.revaUser.update({
          where: { id: existingUser.id },
          data: { kindeId: user.id },
        });
      } else {
        dbUser = await prisma.revaUser.create({
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
      platform: Platform.REVA,
      role: dbUser.role as RevaRole,
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
    const fallbackUrl = "/reva/dashboard";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/reva/dashboard")) {
        const url = new URL(postLoginRaw, process.env.BASE_URL);
        // return url.pathname + (url.search ? url.search : "");
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
    console.error("Error in GET /auth/success/reva:", error);
    return NextResponse.redirect(addBaseUrl("/reva/error-login"));
  }
}
