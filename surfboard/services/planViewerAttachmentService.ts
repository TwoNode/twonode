import prisma from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { getPresignedUploadUrl } from "@/surfboard/services/awsService";

/**
 * Private per-viewer attachments on a shared plan (Shared Access PRD):
 * fully private to the one recipient who added it — invisible to the
 * surveyor who owns the plan AND to every other recipient of the same
 * share. Every function here is scoped by BOTH planId and viewerId, never
 * planId alone, so there is no code path that can leak one viewer's
 * attachment to another.
 */

async function assertIsRecipient(planId: string, viewerId: string): Promise<void> {
  const plan = await prisma.surfboardPlan.findUnique({ where: { id: planId }, select: { sharedTo: true } });
  if (!plan) throw new NotFoundError("Plan");
  if (!(plan.sharedTo || []).includes(viewerId)) throw new ForbiddenError();
}

export async function getViewerAttachments(planId: string, viewerId: string) {
  await assertIsRecipient(planId, viewerId);
  return prisma.surfboardPlanViewerAttachment.findMany({
    where: { planId, viewerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Step 1 of the direct-to-S3 upload flow: a short-lived presigned PUT URL
 * the browser uses to send the file straight to S3, bypassing our own
 * route handler (and Vercel's ~4.5MB platform body-size cap on Route
 * Handlers, which broke uploads of real multi-MB survey report PDFs).
 */
export async function getViewerAttachmentUploadUrl(
  planId: string,
  viewerId: string,
  fileName: string,
  contentType: string
) {
  await assertIsRecipient(planId, viewerId);
  if (!fileName) throw new ValidationError({ file: "A file name is required" });
  return getPresignedUploadUrl("viewer-attachment", viewerId, fileName, contentType, planId);
}

/** Step 2: called after the browser's direct S3 PUT succeeds, to record the attachment. */
export async function finalizeViewerAttachment(
  planId: string,
  viewerId: string,
  fileName: string,
  key: string,
  fileUrl: string
) {
  await assertIsRecipient(planId, viewerId);
  // The key is server-generated in step 1 and scoped to this viewer/plan —
  // reject anything else so a client can't finalize an attachment record
  // pointing at an S3 object it was never issued a presigned URL for.
  if (!key.startsWith(`surfboard/${viewerId}/viewer-attachment/${planId}__`)) {
    throw new ForbiddenError();
  }

  return prisma.surfboardPlanViewerAttachment.create({
    data: { planId, viewerId, url: fileUrl, fileName },
  });
}

export async function deleteViewerAttachment(viewerId: string, attachmentId: string) {
  const attachment = await prisma.surfboardPlanViewerAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.viewerId !== viewerId) throw new NotFoundError("Attachment");
  await prisma.surfboardPlanViewerAttachment.delete({ where: { id: attachmentId } });
}
