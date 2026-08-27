import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { updateOneTimeTransactionStatus } from "@/reva/services/propertyRequestService";

const statusSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(["Available", "Completed", "Processing"]),
  paymentStatus: z.enum(["Paid", "Unpaid"]),
  statusMessage: z.string(),
  error: z.string().nullable(),
});

/** Public — matches the source (no auth check on this path today). */
export async function PATCH(req: NextRequest) {
  try {
    const { reference, status, paymentStatus, statusMessage, error } = await validateBody(req, statusSchema);
    const data = await updateOneTimeTransactionStatus(reference, status, paymentStatus, statusMessage, error);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
