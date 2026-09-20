import { adminInvitationRoutes } from "@/lib/api/adminInvitationRoutes";
import { Platform, GBCRole } from "@/utils/platform";

const invitations = adminInvitationRoutes(Platform.GBC, GBCRole.SUPERADMIN);

export const POST = invitations.resend;
