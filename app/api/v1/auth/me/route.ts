import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { getServerSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/userLookup";
import { handleApiError } from "@/lib/api/errors";
import { UnauthenticatedError } from "@/lib/api/errors";

const platformParam = z.nativeEnum(Platform);

export async function GET(req: NextRequest) {
  try {
    const parsedPlatform = platformParam.safeParse(req.nextUrl.searchParams.get("platform"));
    if (!parsedPlatform.success) {
      return NextResponse.json({ success: false, error: "Missing or invalid platform" }, { status: 400 });
    }
    const platform = parsedPlatform.data;

    const session = await getServerSession(platform);
    if (!session) throw new UnauthenticatedError();

    const user = await findUserById(platform, session.sub);
    if (!user || !user.isActive) throw new UnauthenticatedError();

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
