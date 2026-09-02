import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAuditLogActions, getAuditLogEntities } from "@/surfboard/services/auditLogService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** Combines the source's two separate getAuditLogActions/getAuditLogEntities calls — both are always fetched together by the one consumer. */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const [actions, entities] = await Promise.all([getAuditLogActions(), getAuditLogEntities()]);
    return NextResponse.json({ success: true, data: { actions, entities } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
