import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  ApiError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@/lib/api/errors";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import {
  appReportSchema,
  appReportsEnabled,
  storeAppReport,
} from "@/lib/diagnostics/appReports";
import { APP_REPORT_LIMITS as L } from "@/lib/diagnostics/appReportTypes";
import { Platform, SurfboardRole } from "@/utils/platform";

const tooLarge = () =>
  new ApiError(413, "PAYLOAD_TOO_LARGE", "Report is too large");

/**
 * POST /api/v1/surfboard/diagnostics/reports — the app posts ONE small crash report after it closed
 * unexpectedly (or, in a test build, automatically) (ADR-0014 / TASK-0016). Words and counts only:
 * the body is strict (an unknown key is a 400), capped at 8 KB (413), rate-limited to 10 an hour per
 * account (429), scrubbed again here, then stored in `surfboard_app_reports` (kept 30 days) and
 * logged as `app-report`. The caller's id is used for the sign-in check and the rate limit and is
 * NEVER stored with the report. Off unless `APP_REPORTS_ENABLED=1`: a 404, and the app stops sending
 * for that run. Answers `{}`; nothing is echoed. Unverified accounts may post (a crash on the
 * verification screen is worth knowing about).
 */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, { session }) => {
    if (!appReportsEnabled()) throw new NotFoundError("Reports");
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    // Refuse a declared size over the cap before reading anything.
    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > L.maxBodyBytes)
      throw tooLarge();

    const allowed = await consumeRateLimit(
      `app-report:${session.sub}`,
      session.sub,
      { max: L.perHour, windowMs: L.hourMs }
    );
    if (!allowed) throw new RateLimitError();

    // The declared size can lie (or be missing): measure what was actually sent.
    const text = await req.text();
    if (Buffer.byteLength(text, "utf8") > L.maxBodyBytes) throw tooLarge();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const parsed = appReportSchema.safeParse(json);
    if (!parsed.success) throw new ValidationError(parsed.error.format());

    await storeAppReport(parsed.data);
    return NextResponse.json({ success: true, data: {} });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
