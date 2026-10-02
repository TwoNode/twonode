import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ValidationError } from "@/lib/api/errors";
import { searchSurfUserByEmailOrSurconRegNumber } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const email = req.nextUrl.searchParams.get("email");
    const surconRegNumber = req.nextUrl.searchParams.get("surconRegNumber");
    if (!email || !surconRegNumber)
      throw new ValidationError({ query: "Missing email or surconRegNumber" });
    const data = await searchSurfUserByEmailOrSurconRegNumber(
      email,
      surconRegNumber
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
