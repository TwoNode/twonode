import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || user == null || !user.id)
      throw new Error("something went wrong with authentication: " + user);

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

    return NextResponse.redirect("http://localhost:3000/dashboard");
  } catch (error) {
    console.error("Error in GET /auth/success/scram:", error);
    return NextResponse.json(
      { error: "Failed to authenticate user" },
      { status: 500 }
    );
  }
}
