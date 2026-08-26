import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { UnauthenticatedError } from "@/lib/api/errors";
import { searchUsers } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";
import { findUserById } from "@/lib/auth/userLookup";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const query = req.nextUrl.searchParams.get("query") ?? "";
    const caller = await findUserById(Platform.SURFBOARD, ctx.session.sub);
    if (!caller) throw new UnauthenticatedError();
    const data = await searchUsers(caller.email, query);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
