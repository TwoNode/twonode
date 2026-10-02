import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updatePropertyTransactionStatus } from "@/reva/services/propertyRequestService";
import { Platform, RevaRole } from "@/utils/platform";

const statusSchema = z.object({
  status: z.enum(["Available", "Completed", "Processing"]),
  paymentStatus: z.enum(["Paid", "Unpaid"]),
  statusMessage: z.string(),
  error: z.string().nullable(),
});

type RouteCtx = { params: Promise<{ reference: string }> };

export const PATCH = withAuth<RevaRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { reference } = await routeCtx.params;
    const { status, paymentStatus, statusMessage, error } = await validateBody(
      req,
      statusSchema
    );
    const data = await updatePropertyTransactionStatus(
      reference,
      status,
      paymentStatus,
      statusMessage,
      error
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
