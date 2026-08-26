import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { calculatePlanFeeByZone } from "@/surfboard/services/codFeeService";
import { Platform, SurfboardRole } from "@/utils/platform";

const zoneFeeRowSchema = z.object({
  range: z.string(),
  start: z.number(),
  end: z.number(),
  lagosZoneA: z.number(),
  lagosZoneB: z.number(),
  lagosZoneC: z.number(),
  lagosZoneD: z.number(),
});

const feePreviewSchema = z.object({
  zone: z.string().min(1),
  areaSqM: z.number().positive(),
  surveyTitle: z.string().min(1),
  zoneFees: z.array(zoneFeeRowSchema).min(1),
  ethnicity: z.string().optional(),
});

/** Client-side fee preview before batch submit — same calculation submitRedCopyBatch uses internally. */
export const POST = withAuth<SurfboardRole>(
  async (req) => {
    const { zone, areaSqM, surveyTitle, zoneFees, ethnicity } = await validateBody(req, feePreviewSchema);
    const data = await calculatePlanFeeByZone(zone, areaSqM, surveyTitle, zoneFees, ethnicity);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
