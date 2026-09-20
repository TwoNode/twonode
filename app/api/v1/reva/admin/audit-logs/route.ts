import { auditLogRoutes } from "@/lib/api/auditLogRoutes";
import { Platform, RevaRole } from "@/utils/platform";

export const GET = auditLogRoutes<RevaRole>(Platform.REVA, RevaRole.SUPERADMIN).list;
