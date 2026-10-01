import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { NotFoundError } from "@/lib/api/errors";
import { initiateOneTimeSubscription } from "@/surfboard/services/paystackSubscriptionService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({ planId: z.string().min(1) });

export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await validateBody(req, schema);
    const user = await prisma.surfboardUser.findUnique({ where: { id: ctx.session.sub }, select: { email: true } });
    if (!user) throw new NotFoundError("User");

    const data = await initiateOneTimeSubscription(ctx.session.sub, user.email, planId as any);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
