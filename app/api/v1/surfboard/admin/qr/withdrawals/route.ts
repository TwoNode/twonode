import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { parsePagination } from "@/lib/api/pagination";
import { getAdminPendingWithdrawals } from "@/surfboard/services/qrAdminService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    const pagination = parsePagination(params);
    const data = await getAdminPendingWithdrawals({ ...pagination, search: params.get("search") || undefined });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
