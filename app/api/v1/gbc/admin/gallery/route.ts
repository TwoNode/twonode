import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { gallerySchema } from "@/app/(projects)/(GBC)/utils/validations";
import { getAllGalleryItems, createGalleryItem } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
    const data = await getAllGalleryItems();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const data = await validateBody(req, gallerySchema);
    const item = await createGalleryItem(data);
    return NextResponse.json({ success: true, data: item });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
