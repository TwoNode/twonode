import prisma from "@/lib/prisma";
import { NotFoundError, ApiError } from "@/lib/api/errors";
import { getPresignedDownloadUrl } from "@/surfboard/services/awsService";
import { SurfboardRole } from "@/utils/platform";

/**
 * Migrated from app/(projects)/(surfboard)/actions/verificationActions.ts.
 * verifyPlanRecordCopy was NOT migrated — grep-confirmed dead: its one
 * apparent consumer, CertificateBatchSelection.tsx, imports it but never
 * calls it (that component runs its own client-side extraction via
 * utils/recordCopyVerification.ts instead, then only calls
 * downloadPlanPdfAsBase64/savePlanVerificationResult).
 */

/**
 * Who may read or change a plan's record copy (I-046, I-047): the plan's owner,
 * or an admin or superadmin (the staff the plan routes already let see any
 * plan). A plan id is not secret, because it is in the plan's public page
 * address, which its QR code carries, so holding one proves nothing. Anyone
 * else gets the same 404 as for a plan that does not exist, which also stops
 * ids being probed.
 */
const canSeeAnyPlan = (role: SurfboardRole) =>
  role === SurfboardRole.ADMIN || role === SurfboardRole.SUPERADMIN;

const recordCopyScope = (
  userId: string,
  role: SurfboardRole,
  planId: string
) => (canSeeAnyPlan(role) ? { id: planId } : { id: planId, userId });

export async function downloadPlanPdfAsBase64(
  userId: string,
  role: SurfboardRole,
  planId: string
): Promise<string> {
  const plan = await prisma.surfboardPlan.findFirst({
    where: recordCopyScope(userId, role, planId),
    select: { id: true, redCopyFileUrl: true },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");
  if (!plan.redCopyFileUrl) throw new NotFoundError("PDF URL");

  let lastError = "Failed to download PDF";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const downloadUrl = await getPresignedDownloadUrl(
        plan.redCopyFileUrl,
        300
      );
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        lastError = `Failed to fetch PDF: ${res.statusText || res.status}`;
        throw new Error(lastError);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      lastError = error.message || "Failed to download PDF";
      if (attempt === 3) {
        throw new ApiError(502, "UPSTREAM_FILE_ERROR", lastError, {
          pdf: lastError,
        });
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  throw new ApiError(502, "UPSTREAM_FILE_ERROR", lastError, {
    pdf: lastError,
  });
}

export async function savePlanVerificationResult(
  userId: string,
  role: SurfboardRole,
  planId: string,
  verdict: string,
  score: number,
  verificationData: any
) {
  // One statement that both checks who is asking and writes, so nothing can change between the two.
  const { count } = await prisma.surfboardPlan.updateMany({
    where: recordCopyScope(userId, role, planId),
    data: {
      recordCopyVerifiedAt: new Date(),
      recordCopyVerdict: verdict,
      recordCopyVerificationData: verificationData as any,
    },
  });
  if (count === 0) throw new NotFoundError("Plan (or access denied)");

  return { success: true };
}
