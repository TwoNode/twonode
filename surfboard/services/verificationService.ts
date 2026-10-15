import prisma from "@/lib/prisma";
import { NotFoundError, ApiError } from "@/lib/api/errors";
import { getPresignedDownloadUrl } from "@/surfboard/services/awsService";

/**
 * Migrated from app/(projects)/(surfboard)/actions/verificationActions.ts.
 * verifyPlanRecordCopy was NOT migrated — grep-confirmed dead: its one
 * apparent consumer, CertificateBatchSelection.tsx, imports it but never
 * calls it (that component runs its own client-side extraction via
 * utils/recordCopyVerification.ts instead, then only calls
 * downloadPlanPdfAsBase64/savePlanVerificationResult).
 */

export async function downloadPlanPdfAsBase64(planId: string): Promise<string> {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { id: true, redCopyFileUrl: true },
  });
  if (!plan || !plan.redCopyFileUrl) throw new NotFoundError("PDF URL");

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
  planId: string,
  verdict: string,
  score: number,
  verificationData: any
) {
  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      recordCopyVerifiedAt: new Date(),
      recordCopyVerdict: verdict,
      recordCopyVerificationData: verificationData as any,
    },
  });

  return { success: true };
}
