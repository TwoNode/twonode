import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { getAdminBoundaries } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bodySchema = z.object({ geometry: z.any() });

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest) => {
    const { geometry } = await validateBody(req, bodySchema);
    const data = await getAdminBoundaries(geometry);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
