import { auditLogRoutes } from "@/lib/api/auditLogRoutes";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = auditLogRoutes<SurfboardRole>(
  Platform.SURFBOARD,
  SurfboardRole.SUPERADMIN
).list;
