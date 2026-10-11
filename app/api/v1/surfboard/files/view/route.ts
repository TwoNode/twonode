import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPresignedDownloadUrl, extractS3KeyFromUrl } from "@/surfboard/services/awsService";
import { Platform, SurfboardRole } from "@/utils/platform";
import prisma from "@/lib/prisma";
import {
  clampExpiresIn,
  isSafeStorageKey,
  keyBelongsToAllowedUser,
} from "@/surfboard/utils/fileAccess";

export const GET = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    const searchParams = req.nextUrl.searchParams;
    const target = searchParams.get("url") || searchParams.get("key");
    const format = searchParams.get("format");
    const expiresIn = clampExpiresIn(searchParams.get("expiresIn"));

    if (!target) {
      return NextResponse.json(
        { success: false, error: "Missing required 'url' or 'key' parameter" },
        { status: 400 }
      );
    }

    const key = extractS3KeyFromUrl(target);
    if (!isSafeStorageKey(key)) {
      return NextResponse.json(
        { success: false, error: "Invalid file reference" },
        { status: 400 }
      );
    }
    const userId = ctx.session.sub;
    const userRole = ctx.session.role;

    // MDA staff & admins have broad review access
    const isMdaOrAdmin = [
      SurfboardRole.ACCOUNTS,
      SurfboardRole.CHARTING,
      SurfboardRole.SURCON,
      SurfboardRole.RECORDS_I,
      SurfboardRole.INTAKE,
      SurfboardRole.RECORDS_II,
      SurfboardRole.ADMIN,
      SurfboardRole.SUPERADMIN,
    ].includes(userRole);

    if (!isMdaOrAdmin) {
      // For surveyors (USER role), verify file ownership or shared access:
      // 1. Direct key match with user's ID
      const isUserOwnPrefix = key.startsWith(`surfboard/${userId}/`);

      if (!isUserOwnPrefix) {
        // 2. Check if the file is attached to a plan owned by or shared with the user
        const matchingPlan = await prisma.surfboardPlan.findFirst({
          where: {
            OR: [
              { userId },
              { sharedTo: { has: userId } },
            ],
            AND: [
              {
                OR: [
                  { redCopyFileUrl: { endsWith: key } },
                  { pdfFilePaths: { has: target } },
                  { cadFilePaths: { has: target } },
                  { certificateFilePaths: { has: target } },
                ],
              },
            ],
          },
          select: { id: true, userId: true },
        });

        // 3. Check viewer attachments
        const matchingAttachment = await prisma.surfboardPlanViewerAttachment.findFirst({
          where: {
            OR: [
              { viewerId: userId },
              { plan: { userId } },
            ],
            url: { endsWith: key },
          },
          select: { id: true, viewerId: true, plan: { select: { userId: true } } },
        });

        // Plan file fields are user-editable, so the key must also sit in the
        // owner's (or the attaching viewer's) own folder (ADR-0012).
        const planOk =
          !!matchingPlan &&
          keyBelongsToAllowedUser(key, [matchingPlan.userId ?? ""]);
        const attachmentOk =
          !!matchingAttachment &&
          keyBelongsToAllowedUser(key, [
            matchingAttachment.viewerId,
            matchingAttachment.plan.userId ?? "",
          ]);

        if (!planOk && !attachmentOk) {
          return NextResponse.json(
            { success: false, error: "Access denied to requested file" },
            { status: 403 }
          );
        }
      }
    }

    try {
      const signedUrl = await getPresignedDownloadUrl(target, expiresIn);

      if (format === "json") {
        return NextResponse.json({ success: true, url: signedUrl });
      }

      // Default: Redirect browser directly to the signed URL
      return NextResponse.redirect(signedUrl);
    } catch (error: any) {
      console.error("Error generating signed download URL:", error);
      return NextResponse.json(
        { success: false, error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.USER,
      SurfboardRole.ACCOUNTS,
      SurfboardRole.CHARTING,
      SurfboardRole.SURCON,
      SurfboardRole.RECORDS_I,
      SurfboardRole.INTAKE,
      SurfboardRole.RECORDS_II,
      SurfboardRole.ADMIN,
      SurfboardRole.SUPERADMIN,
    ],
  }
);
