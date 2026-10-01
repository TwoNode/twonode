import prisma from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Per-plan Comments — a shared discussion thread, visible to the plan's
 * owner and everyone in `sharedTo`. Unlike SurfboardPlanViewerAttachment
 * (private per-viewer), comments are deliberately shared: the point is a
 * conversation everyone on the share can see, not a private note. No
 * subscription gating — this is an access-not-capability feature, same
 * principle as read access to a shared plan itself.
 */

export interface PlanCommentWithAuthor {
  id: string;
  planId: string;
  authorId: string;
  authorName: string;
  isOwner: boolean;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

async function assertCanAccessComments(planId: string, userId: string): Promise<{ ownerId: string | null }> {
  const plan = await prisma.surfboardPlan.findUnique({ where: { id: planId }, select: { userId: true, sharedTo: true } });
  if (!plan) throw new NotFoundError("Plan");
  const isOwner = plan.userId === userId;
  const isRecipient = (plan.sharedTo || []).includes(userId);
  if (!isOwner && !isRecipient) throw new ForbiddenError();
  return { ownerId: plan.userId };
}

async function withAuthorNames(planOwnerId: string | null, comments: { authorId: string }[]): Promise<Map<string, string>> {
  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  if (!authorIds.length) return new Map();
  const authors = await prisma.surfboardUser.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(authors.map((a) => [a.id, [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unknown user"]));
}

export async function getPlanComments(userId: string, planId: string): Promise<PlanCommentWithAuthor[]> {
  const { ownerId } = await assertCanAccessComments(planId, userId);
  const comments = await prisma.surfboardPlanComment.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
  });
  const names = await withAuthorNames(ownerId, comments);
  return comments.map((c) => ({
    id: c.id,
    planId: c.planId,
    authorId: c.authorId,
    authorName: names.get(c.authorId) ?? "Unknown user",
    isOwner: c.authorId === ownerId,
    body: c.body,
    createdAt: c.createdAt,
    editedAt: c.editedAt,
  }));
}

export async function addPlanComment(userId: string, planId: string, body: string): Promise<PlanCommentWithAuthor> {
  const { ownerId } = await assertCanAccessComments(planId, userId);
  const trimmed = body.trim();
  if (!trimmed) throw new ValidationError({ body: "Comment can't be empty" });
  if (trimmed.length > 2000) throw new ValidationError({ body: "Comment is too long (max 2000 characters)" });

  const comment = await prisma.surfboardPlanComment.create({ data: { planId, authorId: userId, body: trimmed } });
  const names = await withAuthorNames(ownerId, [comment]);
  return {
    id: comment.id,
    planId: comment.planId,
    authorId: comment.authorId,
    authorName: names.get(comment.authorId) ?? "Unknown user",
    isOwner: comment.authorId === ownerId,
    body: comment.body,
    createdAt: comment.createdAt,
    editedAt: comment.editedAt,
  };
}

export async function deletePlanComment(userId: string, commentId: string): Promise<void> {
  const comment = await prisma.surfboardPlanComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== userId) throw new NotFoundError("Comment");
  await prisma.surfboardPlanComment.delete({ where: { id: commentId } });
}
