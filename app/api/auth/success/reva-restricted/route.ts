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

    const response = NextResponse.redirect(
      addBaseUrl("/reva-restricted/dashboard?user_type=reva_admin")
    );

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
