import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAppReportFilterOptions } from "@/lib/diagnostics/appReports";
import { Platform, SurfboardRole } from "@/utils/platform";

/** GET /api/v1/surfboard/admin/app-reports/filters — what the App Reports page's drop-downs offer. Superadmin only. */
export const GET = withAuth<SurfboardRole>(
  async () =>
    NextResponse.json({
      success: true,
      data: await getAppReportFilterOptions(),
    }),
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
