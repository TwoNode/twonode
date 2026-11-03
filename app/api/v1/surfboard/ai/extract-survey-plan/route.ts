import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { extractSurveyPlanDataFromText } from "@/surfboard/services/aiExtractionService";
import {
  AI_EXTRACT_LIMIT,
  AI_EXTRACT_MAX_CHARS,
  AI_TOO_MANY_MESSAGE,
} from "@/surfboard/utils/aiLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({
  extractedText: z.string().min(1).max(AI_EXTRACT_MAX_CHARS),
});

/**
 * The service already returns {success, data, error} — passed straight through, no re-wrapping.
 * Each call is a paid model request, so the text is capped and an account may make
 * AI_EXTRACT_LIMIT of them an hour (I-055).
 */
export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { extractedText } = await validateBody(req, schema);
    if (
      !(await consumeRateLimit(
        `ai-extract:${ctx.session.sub}`,
        undefined,
        AI_EXTRACT_LIMIT
      ))
    ) {
      return NextResponse.json(
        { success: false, error: AI_TOO_MANY_MESSAGE },
        { status: 429 }
      );
    }
    const result = await extractSurveyPlanDataFromText(extractedText);
    return NextResponse.json(result);
  },
  { platform: Platform.SURFBOARD }
);
