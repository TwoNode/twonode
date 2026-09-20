import { adminInvitationRoutes } from "@/lib/api/adminInvitationRoutes";
import { Platform, SurfboardRole } from "@/utils/platform";

const invitations = adminInvitationRoutes(Platform.SURFBOARD, SurfboardRole.SUPERADMIN);

export const POST = invitations.resend;
