import { NextRequest, NextResponse } from "next/server";
import { getEncryptedUserData } from "@/utils/encryptedCookies";

export async function GET(request: NextRequest) {
  try {
    const userData = await getEncryptedUserData();

    if (!userData) {
      return NextResponse.json(
        { error: "No user data found" },
        { status: 401 }
      );
    }

    // Return only necessary data for client-side
    return NextResponse.json({
      platform: userData.platform,
      role: userData.role,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });
  } catch (error) {
    console.error("Error getting user data:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
