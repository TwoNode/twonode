import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { authPaymentSuccessful } from "@/reva/services/paymentService";
import { getUserContact } from "@/reva/services/propertyRequestService";
import { Platform, RevaRole } from "@/utils/platform";

const verifySchema = z.object({ reference: z.string().min(1) });

export const POST = withAuth<RevaRole>(
  async (req, ctx) => {
    const { reference } = await validateBody(req, verifySchema);
    const user = await getUserContact(ctx.session.sub);
    const data = await authPaymentSuccessful(
      reference,
      ctx.session.sub,
      user.email
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
