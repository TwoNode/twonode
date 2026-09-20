import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { parsePagination } from "@/lib/api/pagination";
import { ValidationError } from "@/lib/api/errors";
import { getAuditLogFilterOptions, listAuditLogs } from "@/lib/auditLogs";
import type { Platform } from "@/utils/platform";

/** An absent param is fine; a present one that isn't a date is a 400, not a Prisma error. */
function dateParam(params: URLSearchParams, name: string): Date | undefined {
  const raw = params.get(name);
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ValidationError({ [name]: "Must be a valid date" });
  return date;
}

/**
 * The two superadmin-only audit-log endpoints, identical across products —
 * each product's route files just bind this to its own platform and its own
 * SUPERADMIN role (withAuth's role type is per-product).
 */
export function auditLogRoutes<TRole extends string>(platform: Platform, superadminRole: TRole) {
  const opts = { platform, roles: [superadminRole] };

  return {
    list: withAuth<TRole>(async (req) => {
      const params = req.nextUrl.searchParams;
      const { page, pageSize } = parsePagination(params);
      const data = await listAuditLogs(platform, {
        page,
        pageSize,
        action: params.get("action") || undefined,
        entity: params.get("entity") || undefined,
        userId: params.get("userId") || undefined,
        search: params.get("search") || undefined,
        startDate: dateParam(params, "startDate"),
        endDate: dateParam(params, "endDate"),
      });
      return NextResponse.json({ success: true, data });
    }, opts),

    filters: withAuth<TRole>(
      async () => NextResponse.json({ success: true, data: await getAuditLogFilterOptions(platform) }),
      opts
    ),
  };
}
