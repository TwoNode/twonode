import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { verifyQRCodeHash } from "@/gbc/services/qrCheckinService";
import { Platform, GBCRole } from "@/utils/platform";

const bodySchema = z.object({ qrDataString: z.string().min(1), maxAgeHours: z.number().optional() });

/** Server-side half of the QR scanner — admin only, not a public endpoint. */
export const POST = withAuth<GBCRole>(
  async (req) => {
    const { qrDataString, maxAgeHours } = await validateBody(req, bodySchema);
    const data = verifyQRCodeHash(qrDataString, maxAgeHours);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
