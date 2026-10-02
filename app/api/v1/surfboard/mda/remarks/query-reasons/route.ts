import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUniqueQueryReasons } from "@/surfboard/services/mdaRemarkService";
import { Platform, SurfboardRole } from "@/utils/platform";
import { ValidationError } from "@/lib/api/errors";

export const GET = withAuth<SurfboardRole>(
  async (req: NextRequest) => {
    const role = req.nextUrl.searchParams.get("role") as
      | "accounts"
      | "charting"
      | "surcon"
      | "records-i"
      | "records-ii"
      | "intake"
      | null;
    if (!role)
      throw new ValidationError({ role: "role query param is required" });
    const data = await getUniqueQueryReasons(role);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
