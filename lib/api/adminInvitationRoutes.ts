import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from "@/lib/auth/adminInvitations";
import type { Platform } from "@/utils/platform";

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().optional(),
  role: z.string().min(1),
});

type RouteCtx = { params: Promise<{ id: string }> };

const csrfBlocked = () =>
  NextResponse.json(
    { success: false, error: "Cross-origin request blocked" },
    { status: 403 }
  );

/**
 * The four superadmin-only invitation endpoints, identical across products —
 * each product's route files just bind this to its own platform and its own
 * SUPERADMIN role (withAuth's role type is per-product).
 */
export function adminInvitationRoutes<TRole extends string>(
  platform: Platform,
  superadminRole: TRole
) {
  const opts = { platform, roles: [superadminRole] };

  return {
    list: withAuth<TRole>(
      async () =>
        NextResponse.json({
          success: true,
          data: await listInvitations(platform),
        }),
      opts
    ),

    create: withAuth<TRole>(async (req, ctx) => {
      if (!validateCSRF(req)) return csrfBlocked();
      const body = await validateBody(req, inviteSchema);
      const data = await createInvitation(platform, body, ctx.session.sub);
      return NextResponse.json({ success: true, data });
    }, opts),

    resend: withAuth<TRole>(async (req, ctx, routeCtx: RouteCtx) => {
      if (!validateCSRF(req)) return csrfBlocked();
      const { id } = await routeCtx.params;
      const data = await resendInvitation(platform, id, ctx.session.sub);
      return NextResponse.json({ success: true, data });
    }, opts),

    revoke: withAuth<TRole>(async (req, ctx, routeCtx: RouteCtx) => {
      if (!validateCSRF(req)) return csrfBlocked();
      const { id } = await routeCtx.params;
      const data = await revokeInvitation(platform, id, ctx.session.sub);
      return NextResponse.json({ success: true, data });
    }, opts),
  };
}
