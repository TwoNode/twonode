import { adminInvitationRoutes } from "@/lib/api/adminInvitationRoutes";
import { Platform, GBCRole } from "@/utils/platform";

const invitations = adminInvitationRoutes(Platform.GBC, GBCRole.SUPERADMIN);

export const GET = invitations.list;
export const POST = invitations.create;
