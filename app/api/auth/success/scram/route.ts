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
      throw new Error("something went wrong with authentication: " + user);

    let dbUser = await prisma.revaUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!dbUser) {
      dbUser = await prisma.revaUser.create({
        data: {
          kindeId: user.id,
          firstName: user.given_name ?? "",
          lastName: user.family_name ?? "",
          email: user.email ?? "",
        },
      });
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
      await issueSession(dbUser.id, dbUser.role, Platform.SCRAM, undefined, dbUser);
    } catch (err) {
      console.error("issueSession failed for scram callback:", err);
    }

    // Create encrypted user data
    const userData = {
      platform: Platform.SCRAM,
      role: dbUser.role as RevaRole,
      userId: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      kindeId: dbUser.kindeId,
    };

    const redirectUrl = "/scram/dashboard";

    // Redirect to the beautiful redirect page with redirectionPage param
    const redirectPageUrl = new URL(
      `/redirect?redirectionPage=${encodeURIComponent(redirectUrl)}`,
      request.url
    );
    const response = NextResponse.redirect(redirectPageUrl);
    const responseWithCookie = await setEncryptedUserCookie(userData, response);
    return responseWithCookie;
  } catch (error) {
    console.error("Error in GET /auth/success/scram:", error);
    return NextResponse.json(
      { error: "Failed to authenticate user" },
      { status: 500 }
    );
  }
}
