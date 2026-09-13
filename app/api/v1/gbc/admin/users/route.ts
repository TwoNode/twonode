import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { parsePagination } from "@/lib/api/pagination";
import { getAllAdmins, getAllAdminsPaginated, addAdmin } from "@/gbc/services/adminUserService";
import { Platform, GBCRole } from "@/utils/platform";

/** Opt-in: `?page=` switches to the paginated/searchable variant (the admin Users page) — omitting it keeps the original full-array shape. */
export const GET = withAuth<GBCRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    if (params.has("page")) {
      const pagination = parsePagination(params);
      const roles = params.get("roles")?.split(",").filter(Boolean) as ("ADMIN" | "SUPERADMIN")[] | undefined;
      const statuses = params.get("statuses")?.split(",").filter(Boolean).map((s) => s === "true");
      const data = await getAllAdminsPaginated({
        ...pagination,
        search: params.get("search") || undefined,
        roles: roles?.length ? roles : undefined,
        statuses: statuses?.length ? statuses : undefined,
      });
      return NextResponse.json({ success: true, data });
    }

    const data = await getAllAdmins();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

const bodySchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  role: z.enum(["ADMIN", "SUPERADMIN"]),
});

export const POST = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const data = await validateBody(req, bodySchema);
    const admin = await addAdmin(data, ctx.session.sub);
    return NextResponse.json({ success: true, data: admin });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
