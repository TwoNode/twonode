import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteSurfPlan, getSurfPlanById, getUserDisplayName, updateSurfPlan } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const forEdit = req.nextUrl.searchParams.get("forEdit") === "true";
    const data = await getSurfPlanById(ctx.session.sub, planId, { forEdit });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

const updatePlanBodySchema = z.object({
  id: z.string().min(1),
  planNumber: z.string().optional(),
  surveyTitle: z.string().optional(),
  planType: z.string().optional(),
  referencePlanNumber: z.string().optional().nullable(),
  deededArea: z.string().optional(),
  facilitator: z.string().optional(),
  pillarType: z.string().optional(),
  geometry: z.any().optional(),
  pillars: z.any().optional(),
  pdfFilePaths: z.array(z.string()).optional(),
  cadFilePaths: z.array(z.string()).optional(),
  certificateFilePaths: z.array(z.string()).optional(),
  dateOnSurveyPlan: z.string().optional(),
  dateLodged: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  lcda: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  personCount: z.number().int().min(1).optional(),
  reasonForWithdrawalAndResubmission: z.string().optional().nullable(),
  pillarTypeReferencePlanNumber: z.string().optional().nullable(),
  parcels: z.any().optional(),
  withdrawalAndResubmissionStatus: z.string().optional(),
});

export const PATCH = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const dto = await validateBody(req, updatePlanBodySchema);
    const user = await getUserDisplayName(ctx.session.sub);
    const data = await updateSurfPlan(ctx.session.sub, user, { ...dto, id: planId } as any);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const data = await deleteSurfPlan(ctx.session.sub, planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
