import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { parsePagination } from "@/lib/api/pagination";
import {
  getBatchesByStatus,
  getBatchesByStatusPaginated,
  getUserBatches,
  getUserBatchesPaginated,
  submitRedCopyBatch,
} from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET returns the caller's own batches for USER; ADMIN/SUPERADMIN instead
 * get every batch (optionally filtered by ?status=), matching the source's
 * two separate getUserBatches()/getBatchesByStatus() actions collapsed into
 * one route since they're the same resource at different scopes.
 *
 * Opt-in: passing `page` switches to the paginated envelope shape — for
 * ADMIN/SUPERADMIN that's the admin Batch Management page; for USER it's
 * the surveyor-facing "My Batches" modal's Active/History tabs (`scope`).
 * Omitting `page` keeps the original plain-array shape for both roles
 * (e.g. dashboard stat tiles that still want everything in one shot).
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;
    if (
      ctx.session.role === SurfboardRole.ADMIN ||
      ctx.session.role === SurfboardRole.SUPERADMIN
    ) {
      const status = params.get("status") ?? undefined;
      if (params.has("page")) {
        const pagination = parsePagination(params);
        const data = await getBatchesByStatusPaginated(ctx.session.role, {
          ...pagination,
          status,
          search: params.get("search") || undefined,
        });
        return NextResponse.json({ success: true, data });
      }
      const data = await getBatchesByStatus(status, ctx.session.role);
      return NextResponse.json({ success: true, data });
    }
    if (params.has("page")) {
      const pagination = parsePagination(params);
      const scope = params.get("scope") === "history" ? "history" : "active";
      const data = await getUserBatchesPaginated(ctx.session.sub, {
        ...pagination,
        scope,
        search: params.get("search") || undefined,
      });
      return NextResponse.json({ success: true, data });
    }
    const data = await getUserBatches(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);

const submitSchema = z.object({
  planIds: z.array(z.string().uuid()).min(1),
  acceptanceAcknowledged: z.literal(true),
});

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { planIds, acceptanceAcknowledged } = await validateBody(
      req,
      submitSchema
    );
    const data = await submitRedCopyBatch(
      ctx.session.sub,
      planIds,
      acceptanceAcknowledged
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
