import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { uploadSurfboardFileWithAuth } from "@/surfboard/services/awsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** userId resolved from the native session, not client-supplied — matches the source's cookie-auto-detect behavior. */
export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as
      "pdf" | "cad" | "certificate" | "redcopy";
    const planNumber = (formData.get("planNumber") as string) || undefined;

    if (!file || !fileType) {
      return NextResponse.json(
        { success: false, error: "file and fileType are required" },
        { status: 400 }
      );
    }

    const data = await uploadSurfboardFileWithAuth(
      ctx.session.sub,
      file,
      fileType,
      planNumber
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
