import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { addBaseUrl } from "@/utils/addBaseUrl";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const user_type = "reva_user";

    if (!user || user == null || !user.id)
      throw new Error("Auth User is " + user);

    let dbUser = await prisma.revaUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!dbUser) {
      dbUser = await prisma.revaUser.create({
        data: {
          kindeId: user.id,
          firstName: user.given_name ?? "",
          lastName: user.family_name ?? "",
          email: user.email ?? "", // Using nullish coalescing operator to provide a default empty string value
        },
      });
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

    cookieStore.set("USER_TYPE", user_type, { httpOnly: true, path: "/" });
    cookieStore.set("USER_ROLE", dbUser.role, { httpOnly: true, path: "/" });

    const postLoginRaw =
      request.nextUrl.searchParams.get("post_login_redirect_url") ||
      cookieStore.get("my_redirect_url")?.value;
    const fallbackUrl = "/reva/dashboard?user_type=reva_user";

    const redirectUrl = (() => {
      if (postLoginRaw && postLoginRaw.startsWith("/reva/dashboard")) {
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
