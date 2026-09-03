import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/(surfboard)/actions/verificationActions.ts.
 * verifyPlanRecordCopy was NOT migrated — grep-confirmed dead: its one
 * apparent consumer, CertificateBatchSelection.tsx, imports it but never
 * calls it (that component runs its own client-side extraction via
 * utils/recordCopyVerification.ts instead, then only calls
 * downloadPlanPdfAsBase64/savePlanVerificationResult).
 */

export async function downloadPlanPdfAsBase64(planId: string): Promise<string> {
  let lastError = "Failed to download PDF";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const plan = await prisma.surfboardPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.redCopyFileUrl) throw new NotFoundError("PDF URL");

      const res = await fetch(plan.redCopyFileUrl);
      if (!res.ok) {
        lastError = `Failed to fetch PDF: ${res.statusText}`;
        throw new Error(lastError);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      lastError = error.message || "Failed to download PDF";
      if (attempt === 3) throw new ValidationError({ pdf: lastError });
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  throw new ValidationError({ pdf: lastError });
}

export async function savePlanVerificationResult(planId: string, verdict: string, score: number, verificationData: any) {
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
