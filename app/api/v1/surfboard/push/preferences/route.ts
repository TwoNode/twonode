import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  getPushPreferences,
  pushPreferencesPatch,
  updatePushPreferences,
} from "@/lib/push/preferences";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/push/preferences — what this person wants pushed to the
 * app (TASK-0015 1I.5): `{ categories: { PLANS_NEED_YOU, PLAN_LODGED,
 * PLAN_SHARED, SUBSCRIPTION, WITHDRAWALS }, quietHours: { enabled, start, end,
 * timeZone } }`. A person who never changed anything gets the defaults
 * (everything on, quiet hours off, 22:00 to 07:00 in Africa/Lagos). It is the
 * account's choice, the same on every phone.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, { session }) => {
    const data = await getPushPreferences(session.sub, Platform.SURFBOARD);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

/**
 * PATCH /api/v1/surfboard/push/preferences — changes only what is sent
 * (`categories` and/or `quietHours`, each with any of its fields) and answers
 * with everything as it now stands. Quiet hours that start and end at the
 * same time are refused (400). The time zone is the phone's, an IANA name.
 */
export const PATCH = withAuth<SurfboardRole>(
  async (req: NextRequest, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const patch = await validateBody(req, pushPreferencesPatch);
    const data = await updatePushPreferences(
      session.sub,
      Platform.SURFBOARD,
      patch
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
