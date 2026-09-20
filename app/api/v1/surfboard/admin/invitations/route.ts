import { adminInvitationRoutes } from "@/lib/api/adminInvitationRoutes";
import { Platform, SurfboardRole } from "@/utils/platform";

const invitations = adminInvitationRoutes(Platform.SURFBOARD, SurfboardRole.SUPERADMIN);

export const GET = invitations.list;
export const POST = invitations.create;
