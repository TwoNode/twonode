import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { recognizePersonCount } from "@/surfboard/services/aiExtractionService";
import {
  AI_COUNT_LIMIT,
  AI_SURVEY_TITLE_MAX_CHARS,
  AI_TOO_MANY_MESSAGE,
} from "@/surfboard/utils/aiLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({
  surveyTitle: z.string().min(1).max(AI_SURVEY_TITLE_MAX_CHARS),
});

/** A paid model request per call: the title is capped and an account may make AI_COUNT_LIMIT an hour (I-055). */
export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { surveyTitle } = await validateBody(req, schema);
    if (
      !(await consumeRateLimit(
        `ai-count:${ctx.session.sub}`,
        undefined,
        AI_COUNT_LIMIT
      ))
    ) {
      return NextResponse.json(
        { success: false, error: AI_TOO_MANY_MESSAGE },
        { status: 429 }
      );
    }
    const result = await recognizePersonCount(surveyTitle);
    return NextResponse.json(result);
  },
  { platform: Platform.SURFBOARD }
);
