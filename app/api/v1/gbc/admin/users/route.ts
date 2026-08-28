import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getAllAdmins, addAdmin } from "@/gbc/services/adminUserService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
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
