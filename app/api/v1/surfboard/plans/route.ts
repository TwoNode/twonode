import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  createSurfPlan,
  getPaginatedSurfPlans,
  getUserDisplayName,
} from "@/surfboard/services/planService";
import { parsePlanListQuery } from "@/surfboard/utils/planListQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { page, pageSize, noPagination, filters, sort } = parsePlanListQuery(
      req.nextUrl.searchParams
    );

    const data = await getPaginatedSurfPlans(ctx.session.sub, {
      page,
      pageSize,
      filters,
      sort,
      noPagination,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

const geometrySchema = z.any();
const pillarSchema = z
  .object({
    pillarNumber: z.union([z.string(), z.number()]),
    easting: z.number(),
    northing: z.number(),
  })
  .passthrough();

const createPlanBodySchema = z.object({
  planNumber: z.string().min(1),
  surveyTitle: z.string().min(1),
  planType: z.string().min(1),
  referencePlanNumber: z.string().optional().nullable(),
  deededArea: z.string().min(1),
  facilitator: z.string().min(1),
  pillarType: z.string().min(1),
  geometry: geometrySchema,
  pillars: z.array(pillarSchema).min(3),
  pdfFilePaths: z.array(z.string()).min(1),
  cadFilePaths: z.array(z.string()).min(1),
  certificateFilePaths: z.array(z.string()).optional().default([]),
  dateOnSurveyPlan: z.string().min(1),
  dateLodged: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  lcda: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  isLive: z.boolean().optional(),
  personCount: z.number().int().min(1).optional(),
  reasonForWithdrawalAndResubmission: z.string().optional().nullable(),
  pillarTypeReferencePlanNumber: z.string().optional().nullable(),
  parcels: z.any().optional(),
  withdrawalAndResubmissionStatus: z.string().optional(),
});

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const dto = await validateBody(req, createPlanBodySchema);
    const user = await getUserDisplayName(ctx.session.sub);
    const data = await createSurfPlan(ctx.session.sub, user, dto as any);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
