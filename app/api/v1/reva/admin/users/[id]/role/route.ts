import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import { makeUserAdmin, removeAdminPrivileges } from "@/reva/services/adminUserService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const roleActionSchema = z.object({
  action: z.enum(["promote", "demote"]),
  role: z.enum(["ADMIN", "SUPERADMIN"]).optional(),
});

export const PATCH = withAuth<RevaRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const { action, role } = await validateBody(req, roleActionSchema);

    if (action === "promote") {
      if (!role) throw new ValidationError({ role: "role is required to promote" });
      const data = await makeUserAdmin(id, role);
      return NextResponse.json({ success: true, data });
    }

    const data = await removeAdminPrivileges(id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] }
);
