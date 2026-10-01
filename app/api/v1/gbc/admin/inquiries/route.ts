import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getInquiries } from "@/gbc/services/contactService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (req) => {
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const edition = req.nextUrl.searchParams.get("edition") ?? undefined;
    const data = await getInquiries({ status, type, edition });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
