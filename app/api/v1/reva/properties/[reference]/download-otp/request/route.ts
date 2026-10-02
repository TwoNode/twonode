import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { withAuth } from "@/lib/api/withAuth";
import { requestDownloadOtp } from "@/reva/services/downloadOtpService";
import { Platform, RevaRole } from "@/utils/platform";

const requestOtpSchema = z.object({ target: z.string().min(1) });

type RouteCtx = { params: Promise<{ reference: string }> };

/**
 * Authenticated counterpart of one-time-properties/download-otp/request —
 * reference comes from the URL, email/userId are always resolved from the
 * session, never a client-supplied value.
 */
export const POST = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    try {
      if (!validateCSRF(req)) {
        return NextResponse.json(
          { success: false, error: "Cross-origin request blocked" },
          { status: 403 }
        );
      }
      const { reference } = await routeCtx.params;
      const { target } = await validateBody(req, requestOtpSchema);
      const identifier = `download-otp:request:${ctx.session.sub}:${reference}:${target}`;

      if (!(await checkRateLimit(identifier))) {
        return NextResponse.json(
          { success: false, error: "Too many attempts. Try again later." },
          { status: 429 }
        );
      }
      await recordAttempt(identifier, ctx.session.sub);

      const data = await requestDownloadOtp({
        reference,
        target,
        userId: ctx.session.sub,
      });
      return NextResponse.json({ success: true, data });
    } catch (err) {
      return handleApiError(err, {
        route: req.nextUrl.pathname,
        method: req.method,
      });
    }
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
