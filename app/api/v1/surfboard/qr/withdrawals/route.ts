import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { requestWithdrawal } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const withdrawalSchema = z.object({ amount: z.number().positive() });

export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { amount } = await validateBody(req, withdrawalSchema);
    const data = await requestWithdrawal(session.sub, amount);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
