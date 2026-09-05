import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getBatchReceiptData, generateBatchReceiptPdfBuffer } from "@/surfboard/services/receiptPdfService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ batchId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { batchId } = await routeCtx.params;
    const batch = await getBatchReceiptData(ctx.session.sub, ctx.session.role, batchId);
    const pdfBuffer = await generateBatchReceiptPdfBuffer(batch);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Surfboard-Receipt-${batch.batchCode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN, SurfboardRole.ACCOUNTS] }
);
