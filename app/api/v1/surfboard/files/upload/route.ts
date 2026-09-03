import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { uploadSurfboardFileToS3 } from "@/surfboard/services/awsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * The source's uploadSurfboardFileToS3 took a caller-supplied `userId`
 * string used purely as an S3 key namespace segment — every real caller
 * actually passes plan.planNumber there, not a real user id (consistent
 * across all 3 call sites). Preserved exactly here rather than "fixed" to
 * the session's real user id, to avoid changing the S3 key layout of
 * already-uploaded files.
 */
export const POST = withAuth<SurfboardRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as "pdf" | "cad" | "certificate" | "redcopy";
    const userId = formData.get("userId") as string;
    const planNumber = (formData.get("planNumber") as string) || undefined;
    const filename = (formData.get("filename") as string) || undefined;

    if (!file || !fileType || !userId) {
      return NextResponse.json({ success: false, error: "file, fileType, and userId are required" }, { status: 400 });
    }

    const data = await uploadSurfboardFileToS3(file, fileType, userId, planNumber, filename);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
