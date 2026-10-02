import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { withAuth } from "@/lib/api/withAuth";
import { verifyDownloadOtpAndGetUrl } from "@/reva/services/downloadOtpService";
import { Platform, RevaRole } from "@/utils/platform";

const verifyOtpSchema = z.object({
  target: z.string().min(1),
  code: z.string().min(1),
});

type RouteCtx = { params: Promise<{ reference: string }> };

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
      const { target, code } = await validateBody(req, verifyOtpSchema);
      const identifier = `download-otp:verify:${ctx.session.sub}:${reference}:${target}`;

      if (!(await checkRateLimit(identifier))) {
        return NextResponse.json(
          { success: false, error: "Too many attempts. Try again later." },
          { status: 429 }
        );
      }
      await recordAttempt(identifier, ctx.session.sub);

      const data = await verifyDownloadOtpAndGetUrl({
        reference,
        target,
        code,
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
