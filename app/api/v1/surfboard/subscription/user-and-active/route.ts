import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUserAndActiveSub } from "@/surfboard/services/subscriptionService";
import { getProfile } from "@/surfboard/services/profileService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * Also returns the facilitator's profile (name/email/picture) for the
 * navbar avatar — sourced from SurfboardUser, not Kinde: Surfboard
 * facilitator sessions are native-JWT, so getKindeServerSession().getUser()
 * always resolves to null for this platform.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const { subscription } = await getUserAndActiveSub(ctx.session.sub);
    const profile = await getProfile(ctx.session.sub).catch(() => null);
    const user = profile
      ? {
          firstName: profile.firstName,
          family_name: profile.lastName,
          email: profile.email,
          picture: profile.logo,
        }
      : null;
    return NextResponse.json({ success: true, data: { subscription, user } });
  },
  { platform: Platform.SURFBOARD }
);
