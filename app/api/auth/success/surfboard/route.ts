import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setEncryptedUserCookie } from "@/utils/encryptedCookies";
import { issueSession } from "@/lib/auth/session";
import { Platform, SurfboardRole } from "@/utils/platform";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    // Prisma model is 'SurfboardUser', so the client property is 'surfboardUser'
    let dbUser = await prisma.surfboardUser.findUnique({
      where: { kindeId: user.id },
      include: {
        subscription: true,
      },
    });

    if (!dbUser) {
      const existingUser = await prisma.surfboardUser.findUnique({
        where: { email: user.email ?? "" },
        include: {
          subscription: true,
        },
      });

      if (existingUser) {
        dbUser = await prisma.surfboardUser.update({
          where: { id: existingUser.id },
          data: { kindeId: user.id },
          include: {
            subscription: true,
          },
        });
      } else {
        dbUser = await prisma.surfboardUser.create({
          data: {
            kindeId: user.id,
            firstName: user.given_name ?? "",
            lastName: user.family_name ?? "",
            email: user.email ?? "",
          },
          include: {
            subscription: true, // Will be empty for new users
          },
        });
      }
    }

    if (!dbUser) {
      throw new Error("Failed to create or find user in database");
    }

    // Also mint a native session (additive; must never break the existing
    // Kinde login flow if it fails).
    try {
      await issueSession(dbUser.id, dbUser.role, Platform.SURFBOARD);
    } catch (err) {
      console.error("issueSession failed for surfboard callback:", err);
    }

    // Create encrypted user data with subscription if it exists
    const userData = {
      platform: Platform.SURFBOARD,
      role: dbUser.role as SurfboardRole,
      userId: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      picture: user.picture,
      kindeId: dbUser.kindeId,
      ...(dbUser.subscription?.[0]
        ? {
            subscription: {
              status: dbUser.subscription[0].status as
                | "active"
                | "canceled"
                | "expired"
                | "past_due",
              interval: dbUser.subscription[0].interval as
                | "monthly"
                | "quarterly"
                | "annually",
              subCode: dbUser.subscription[0].subCode ?? "",
              planCode: dbUser.subscription[0].planCode ?? "",
              emailToken: dbUser.subscription[0].emailToken ?? "",
              expiresAt:
                dbUser.subscription[0].currentEnd ||
                dbUser.subscription[0].nextPaymentDate,
            },
          }
        : {}),
    };

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      request.cookies.get("my_redirect_url")?.value;
    const fallbackUrl = "/surfboard/dashboard";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/surfboard/dashboard")) {
        const url = new URL(postLoginRaw, process.env.BASE_URL);
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
    const responseWithCookie = await setEncryptedUserCookie(userData, response);
    return responseWithCookie;
  } catch (error) {
    console.error("Error in GET /auth/success/surfboard:", error);
    return NextResponse.redirect(new URL("/surfboard/error-login", request.url));
  }
}
