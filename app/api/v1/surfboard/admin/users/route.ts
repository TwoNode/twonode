import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getAllUsers, createAdmin } from "@/surfboard/services/adminUserService";
import { parsePagination } from "@/lib/api/pagination";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;
    const pagination = parsePagination(params);
    const data = await getAllUsers(ctx.session.role, {
      ...pagination,
      search: params.get("search") || undefined,
      roleGroup: params.get("roleGroup") === "mda" ? "mda" : "admins",
      role: params.get("role") || undefined,
      status: params.get("status") === "active" || params.get("status") === "inactive" ? params.get("status") as "active" | "inactive" : undefined,
      subscriptionStatus:
        params.get("subscriptionStatus") === "expired" || params.get("subscriptionStatus") === "expiring_soon"
          ? (params.get("subscriptionStatus") as "expired" | "expiring_soon")
          : undefined,
    });
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
