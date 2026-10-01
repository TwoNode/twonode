import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { getZoneFromGeometry } from "@/surfboard/services/codFeeService";
import { Platform, SurfboardRole } from "@/utils/platform";

const zoneSchema = z.object({ geometry: z.any() });

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    const { geometry } = await validateBody(req, zoneSchema);
    const zone = await getZoneFromGeometry(geometry);
    return NextResponse.json({ success: true, data: { zone } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
