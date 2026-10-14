import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { issueSession } from "@/lib/auth/session";
import { Platform, RevaRole } from "@/utils/platform";
import { markEmailVerified } from "@/lib/auth/userLookup";

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

    if (!dbUser.emailVerified) {
      await markEmailVerified(Platform.REVA, dbUser.id, "OAUTH");
      dbUser.emailVerified = true;
    }

    // Also mint a native session (additive; must never break the existing
    // Kinde login flow if it fails).
    try {
      await issueSession(
        dbUser.id,
        dbUser.role,
        Platform.REVA,
        undefined,
        dbUser
      );
    } catch (err) {
      console.error("issueSession failed for reva callback:", err);
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
    const redirectPageUrl = new URL(
      `/redirect?redirectionPage=${encodeURIComponent(redirectUrl)}`,
      request.url
    );
    const response = NextResponse.redirect(redirectPageUrl);
    // The return page is used once.
    response.cookies.delete("my_redirect_url");
    const responseWithCookie = await setEncryptedUserCookie(userData, response);
    return responseWithCookie;
  } catch (error) {
    console.error("Error in GET /auth/success/reva:", error);
    return NextResponse.redirect(new URL("/reva/error-login", request.url));
  }
}
