import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { saveSurveyorBankDetails } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bankDetailsSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
});

export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const input = await validateBody(req, bankDetailsSchema);
    const data = await saveSurveyorBankDetails(session.sub, input);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
