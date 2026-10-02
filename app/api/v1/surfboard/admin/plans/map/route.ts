import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAllSurfPlansForAdmin } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

const MAX_PAGE_SIZE = 500;

export const GET = withAuth<SurfboardRole>(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
    const take = Math.min(
      MAX_PAGE_SIZE,
      Number(searchParams.get("take")) || MAX_PAGE_SIZE
    );

    const { plans, total } = await getAllSurfPlansForAdmin({ skip, take });
    return NextResponse.json({
      success: true,
      data: { plans, total, skip, take },
    });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
