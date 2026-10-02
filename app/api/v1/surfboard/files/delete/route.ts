import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteSurfboardFileFromS3 } from "@/surfboard/services/awsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({
  key: z.string().optional(),
  url: z.string().optional(),
});

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const body = await validateBody(req, schema);
    await deleteSurfboardFileFromS3(body);
    return NextResponse.json({ success: true, data: { success: true } });
  },
  { platform: Platform.SURFBOARD }
);
