import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import { submitRedCopy } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/** multipart/form-data — the red-copy file itself, not a JSON body. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError({ file: "Missing file" });

    const data = await submitRedCopy(ctx.session.sub, planId, file);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
