import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id)
      throw new Error("something went wrong with authentication" + user);

    let dbUser = await prisma.user.findUnique({
      where: { kindeId: user.id },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
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
      value: "reva_user",
      httpOnly: true,
      path: "/",
    });

    const response = NextResponse.redirect(
      "http://localhost:3000/reva/dashboard?user_type=reva_user"
    );

    response.cookies.set("USER_TYPE", "reva_user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    response.headers.set("USER_TYPE", "reva_user");
    return response;
  } catch (error) {
    console.error("Error in GET /auth/success/reva:", error);
    return NextResponse.json(
      { error: "Failed to authenticate user" },
      { status: 500 }
    );
  }
}
