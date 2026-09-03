import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUserAndActiveSub } from "@/surfboard/services/subscriptionService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * Also returns the Kinde profile (picture/given_name/family_name) — the one
 * consumer (surfboardUserPanelLayout.tsx) uses it for the sidebar avatar,
 * data the native JWT session doesn't carry.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const { subscription } = await getUserAndActiveSub(ctx.session.sub);
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser().catch(() => null);
    return NextResponse.json({ success: true, data: { subscription, user: kindeUser } });
  },
  { platform: Platform.SURFBOARD }
);
