import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteFile, deleteFiles } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

const bodySchema = z.union([z.object({ key: z.string().min(1) }), z.object({ keys: z.array(z.string().min(1)).min(1) })]);

export const DELETE = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await validateBody(req, bodySchema);
    if ("key" in body) {
      await deleteFile(body.key);
    } else {
      await deleteFiles(body.keys);
    }
    return NextResponse.json({ success: true, message: "File(s) deleted successfully" });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
