import path from "path";
import { execFile } from "child_process";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api/errors";
import { SurfboardRole } from "@/utils/platform";

const WORKER_PATH = path.join(process.cwd(), "surfboard", "pdf-worker", "receipt.render.cjs");

// Tracing hint only — see gbc/services/certificatePdfService.ts's identical
// comment for the full explanation. This worker also renders via
// @react-pdf/renderer and is equally invisible to Next's automatic
// output-file-tracing.
void import("@react-pdf/renderer").catch(() => {});

/**
 * Batch payment never reaches `BatchPaymentStatus.COMPLETED` in the current
 * approval chain (grep-confirmed: no writer ever sets it) — Accounts
 * approval is the real terminal "payment confirmed" state
 * (`ACCOUNTS_APPROVED`, set in batchApprovalService.ts's
 * updateAccountsApproval), so the receipt is available from that point
 * onward rather than waiting on a status this app never reaches.
 */
const RECEIPT_ELIGIBLE_STATUSES = ["ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"];

/** Batch owner or an admin/superadmin — mirrors getBatchPDFData's ownership
 * check (remitaVerificationService.ts), extended so Accounts/admin staff can
 * also pull a payer's receipt on request. */
export async function getBatchReceiptData(userId: string, role: SurfboardRole, batchId: string) {
  const isStaff = role === SurfboardRole.ADMIN || role === SurfboardRole.SUPERADMIN || role === SurfboardRole.ACCOUNTS;

  const batch = await prisma.certificateOfDepositBatch.findFirst({
    where: isStaff ? { id: batchId } : { id: batchId, submittedBy: userId },
    select: {
      batchCode: true,
      planCount: true,
      totalFees: true,
      systemCharges: true,
      totalAmount: true,
      paymentStatus: true,
      userPaymentRef: true,
      userPaymentDate: true,
      createdAt: true,
      submitter: { select: { firstName: true, lastName: true, companyName: true } },
    },
  });
  if (!batch) throw new NotFoundError("Batch");
  if (!RECEIPT_ELIGIBLE_STATUSES.includes(batch.paymentStatus)) throw new NotFoundError("Receipt");

  return batch;
}

export async function generateBatchReceiptPdfBuffer(batch: Awaited<ReturnType<typeof getBatchReceiptData>>): Promise<Buffer> {
  const input = JSON.stringify({ batch });

  return new Promise<Buffer>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [WORKER_PATH],
      { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Receipt PDF render failed: ${stderr?.toString("utf8") || err.message}`));
          return;
        }
        resolve(stdout as unknown as Buffer);
      }
    );
    child.stdin!.write(input);
    child.stdin!.end();
  });
}
