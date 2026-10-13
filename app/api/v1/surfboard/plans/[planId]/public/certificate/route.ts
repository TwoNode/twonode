import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getPaidCertificateKey } from "@/surfboard/services/qrEarningsService";
import { getPresignedDownloadUrl } from "@/surfboard/services/awsService";
import { clampExpiresIn, isSafeStorageKey } from "@/surfboard/utils/fileAccess";

type RouteCtx = { params: Promise<{ planId: string }> };

/**
 * Public, but only for a paid and still active Certificate of Deposit QR
 * session (`?token=`): signs a short-lived link to one certificate file
 * (`?index=`). Replaces the permanent public file link (I-026), so the bucket
 * can be made private. Same options as the file gateway: `format=json`,
 * `download=1&name=`, `expiresIn=`.
 */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { planId } = await routeCtx.params;
    const params = req.nextUrl.searchParams;
    const index = Number(params.get("index") ?? "0");
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid index" },
        { status: 400 }
      );
    }
    const key = await getPaidCertificateKey(
      planId,
      params.get("token") ?? undefined,
      index
    );
    if (!isSafeStorageKey(key.replace(/^https?:\/\/[^/]+\//, ""))) {
      return NextResponse.json(
        { success: false, error: "Invalid file reference" },
        { status: 400 }
      );
    }
    const expiresIn = clampExpiresIn(params.get("expiresIn"));
    const downloadName =
      params.get("download") === "1"
        ? params.get("name") || "certificate.pdf"
        : undefined;
    const signed = await getPresignedDownloadUrl(key, expiresIn, {
      downloadName,
    });
    if (params.get("format") === "json") {
      return NextResponse.json({ success: true, url: signed });
    }
    const res = NextResponse.redirect(signed);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
