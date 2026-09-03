import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { extractSurveyPlanDataFromText } from "@/surfboard/services/aiExtractionService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({ extractedText: z.string().min(1) });

/** The service already returns {success, data, error} — passed straight through, no re-wrapping. */
export const POST = withAuth<SurfboardRole>(
  async (req) => {
    const { extractedText } = await validateBody(req, schema);
    const result = await extractSurveyPlanDataFromText(extractedText);
    return NextResponse.json(result);
  },
  { platform: Platform.SURFBOARD }
);
