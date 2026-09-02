import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { recognizePersonCount } from "@/surfboard/services/aiExtractionService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({ surveyTitle: z.string().min(1) });

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    const { surveyTitle } = await validateBody(req, schema);
    const result = await recognizePersonCount(surveyTitle);
    return NextResponse.json(result);
  },
  { platform: Platform.SURFBOARD }
);
