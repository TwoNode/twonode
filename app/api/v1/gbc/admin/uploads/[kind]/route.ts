import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import {
  uploadSponsorLogo,
  uploadPartnerLogo,
  uploadSpeakerPhotoFile,
  uploadGalleryMedia,
} from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ kind: string }> };

const UPLOADERS: Record<string, typeof uploadSponsorLogo> = {
  "sponsor-logo": uploadSponsorLogo,
  "partner-logo": uploadPartnerLogo,
  "speaker-photo": uploadSpeakerPhotoFile,
  "gallery-media": uploadGalleryMedia,
};

export const POST = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { kind } = await routeCtx.params;
    const uploader = UPLOADERS[kind];
    if (!uploader) throw new ValidationError({ kind: "Unknown upload kind" });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File))
      throw new ValidationError({ file: "No file provided" });

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await uploader(buffer, file.name, file.type, file.size);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
