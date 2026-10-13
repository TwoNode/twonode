import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import prisma from "@/lib/prisma";
import {
  extractS3KeyFromUrl,
  getPresignedDownloadUrl,
} from "@/surfboard/services/awsService";
import { clampExpiresIn, isSafeStorageKey } from "@/surfboard/utils/fileAccess";
import { isRevaStorageKey, ownSitePhotoMatches } from "@/reva/utils/fileAccess";
import { Platform, RevaRole } from "@/utils/platform";

/**
 * Short-lived signed link to a REVA file (client documents, site photos,
 * reports). REVA admins may open any REVA file. A requester may open only the
 * site photos of their own requests: their documents and report stay behind
 * the emailed one-time code (downloadOtpService).
 */
export const GET = withAuth<RevaRole>(
  async (req: NextRequest, ctx) => {
    const params = req.nextUrl.searchParams;
    const target = params.get("url") || params.get("key");
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Missing required 'url' or 'key' parameter" },
        { status: 400 }
      );
    }

    let key: string;
    try {
      key = extractS3KeyFromUrl(target);
    } catch {
      key = "";
    }
    if (!isSafeStorageKey(key) || !isRevaStorageKey(key)) {
      return NextResponse.json(
        { success: false, error: "Invalid file reference" },
        { status: 400 }
      );
    }

    const isAdmin =
      ctx.session.role === RevaRole.ADMIN ||
      ctx.session.role === RevaRole.SUPERADMIN;

    if (!isAdmin) {
      const own = await prisma.property.findMany({
        where: { userId: ctx.session.sub, deleted: false },
        select: { site_images: true },
      });
      const ownedKeys = own
        .flatMap((p) => p.site_images)
        .map((url) => {
          try {
            return extractS3KeyFromUrl(url);
          } catch {
            return "";
          }
        })
        .filter(Boolean);
      if (!ownSitePhotoMatches(key, ownedKeys)) {
        return NextResponse.json(
          { success: false, error: "Access denied to requested file" },
          { status: 403 }
        );
      }
    }

    try {
      const expiresIn = clampExpiresIn(params.get("expiresIn"));
      const downloadName =
        params.get("download") === "1"
          ? params.get("name") || key.split("/").pop() || "download"
          : undefined;
      const signedUrl = await getPresignedDownloadUrl(key, expiresIn, {
        downloadName,
      });

      if (params.get("format") === "json") {
        return NextResponse.json({ success: true, url: signedUrl });
      }
      const response = NextResponse.redirect(signedUrl);
      response.headers.set(
        "Cache-Control",
        `private, max-age=${Math.max(0, Math.min(240, expiresIn - 60))}`
      );
      response.headers.set("Vary", "Cookie");
      return response;
    } catch (error) {
      console.error("Error generating REVA signed download URL:", error);
      return NextResponse.json(
        { success: false, error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
