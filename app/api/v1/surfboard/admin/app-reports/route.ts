import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { parsePagination } from "@/lib/api/pagination";
import { listAppReports } from "@/lib/diagnostics/appReports";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/admin/app-reports — the crash reports the Surfboard app posted
 * (ADR-0014 / TASK-0016), newest first, for the superadmin "App Reports" page. Filters: `kind`,
 * `platform`, `appVersion`, `search` (screen or error text). Read-only; no account is shown because
 * none is stored. Superadmin only.
 */
export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    const { page, pageSize } = parsePagination(params);
    const data = await listAppReports({
      page,
      pageSize,
      kind: params.get("kind") || undefined,
      platform: params.get("platform") || undefined,
      appVersion: params.get("appVersion") || undefined,
      search: params.get("search") || undefined,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
