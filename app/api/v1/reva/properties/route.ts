import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  getUserProperties,
  getUserContact,
} from "@/reva/services/propertyRequestService";
import { authSaveFormDataAndInitiatePaystack } from "@/reva/services/paymentService";
import { Platform, RevaRole } from "@/utils/platform";

export const GET = withAuth<RevaRole>(
  async (_req, ctx) => {
    const data = await getUserProperties(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);

/** Submit + initiate Paystack in one call, matching the source's authSaveFormDataAndInitiatePaystack — multipart, not JSON, so no Zod validateBody here. */
export const POST = withAuth<RevaRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const user = await getUserContact(ctx.session.sub);
    const formData = await req.formData();
    const data = await authSaveFormDataAndInitiatePaystack(formData, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    });
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
