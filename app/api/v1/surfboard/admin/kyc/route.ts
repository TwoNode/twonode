import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getSurveyorsForKyc, toggleBankVerification } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getSurveyorsForKyc();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);

const toggleSchema = z.object({ userId: z.string().min(1), status: z.boolean() });

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { userId, status } = await validateBody(req, toggleSchema);
    const data = await toggleBankVerification(userId, status);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
