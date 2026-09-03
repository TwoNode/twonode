import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getAllUsers, createAdmin } from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getAllUsers(ctx.session.role);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);

const createAdminSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(SurfboardRole),
});

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await validateBody(req, createAdminSchema);
    const data = await createAdmin(body as any);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
