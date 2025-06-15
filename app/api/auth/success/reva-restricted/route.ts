import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const user_type = "reva_admin";

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

    const cookieStore = await cookies();

    cookieStore.set({
      name: "USER_TYPE",
      value: user_type,
      httpOnly: true,
      path: "/",
    });

    cookieStore.set({
      name: "USER_ROLE",
      value: dbUser.role,
      httpOnly: true,
      path: "/",
    });

    cookieStore.set("USER_TYPE", "reva_user", { httpOnly: true, path: "/" });
    cookieStore.set("USER_ROLE", dbUser.role, { httpOnly: true, path: "/" });

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      cookieStore.get("my_redirect_url")?.value;
    const fallbackUrl = "/reva-restricted/dashboard?user_type=reva_admin";

    const redirectUrl = (() => {
      if (
        postLoginRaw &&
        postLoginRaw.startsWith("/reva-restricted/dashboard")
      ) {
        const url = new URL(postLoginRaw, process.env.BASE_URL);
        url.searchParams.set("user_type", user_type);

        cookieStore.set("my_redirect_url", "", { maxAge: 0 });
        cookieStore.delete("my_redirect_url");

        return url.pathname + "?" + url.searchParams.toString();
      }

      return fallbackUrl;
    })();

    const response = NextResponse.redirect(addBaseUrl(redirectUrl));

    response.cookies.set("USER_TYPE", user_type, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    response.cookies.set("USER_ROLE", dbUser.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    response.headers.set("USER_TYPE", user_type);
    return response;
  } catch (error) {
    console.error("Error in GET /auth/success/reva:", error);

    return NextResponse.redirect(addBaseUrl("/reva/error-login"));
  }
}
