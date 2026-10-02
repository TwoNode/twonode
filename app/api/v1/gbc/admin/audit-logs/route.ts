import { auditLogRoutes } from "@/lib/api/auditLogRoutes";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = auditLogRoutes<GBCRole>(
  Platform.GBC,
  GBCRole.SUPERADMIN
).list;
