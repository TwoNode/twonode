import prisma from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { uploadSurfboardFileToS3 } from "@/surfboard/services/awsService";

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

export async function addViewerAttachment(planId: string, viewerId: string, file: File) {
  await assertIsRecipient(planId, viewerId);
  if (!file || file.size === 0) throw new ValidationError({ file: "A file is required" });

  const uploadResult = await uploadSurfboardFileToS3(file, "viewer-attachment", viewerId, planId);
  if (!uploadResult.url) throw new ValidationError({ file: "Failed to upload attachment" });

  return prisma.surfboardPlanViewerAttachment.create({
    data: { planId, viewerId, url: uploadResult.url, fileName: file.name },
  });
}

export async function deleteViewerAttachment(viewerId: string, attachmentId: string) {
  const attachment = await prisma.surfboardPlanViewerAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.viewerId !== viewerId) throw new NotFoundError("Attachment");
  await prisma.surfboardPlanViewerAttachment.delete({ where: { id: attachmentId } });
}
