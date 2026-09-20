import { adminInvitationRoutes } from "@/lib/api/adminInvitationRoutes";
import { Platform, RevaRole } from "@/utils/platform";

const invitations = adminInvitationRoutes(Platform.REVA, RevaRole.SUPERADMIN);

export const POST = invitations.resend;
