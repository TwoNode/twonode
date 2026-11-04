import prisma from "@/lib/prisma";
import { ApiError, NotFoundError } from "@/lib/api/errors";
import {
  extractS3KeyFromUrl,
  getPresignedDownloadUrl,
} from "@/surfboard/services/awsService";
import { planFiles, UUID } from "@/surfboard/services/planDetailService";
import {
  DEFAULT_SIGNED_URL_SECONDS,
  isRedCopyKeyOfPlan,
  isSafeStorageKey,
  keyBelongsToAllowedUser,
} from "@/surfboard/utils/fileAccess";

/**
 * A short-lived address for one of a plan's files, for the mobile app
 * (TASK-0015 1G.5). The app asks for "file n of plan p", where n is the file's
 * place in the `files` list of `GET plans/{planId}/summary`, so it never holds
 * a stored reference or hands one to the gateway, and the rules for who may
 * open what live here and in `planFiles` (the record copy is the owner's alone,
 * I-037) instead of in every client. The website keeps using `files/view`.
 */

export type PlanFileLink = {
  /** A signed address that works for `expiresAt` and no longer. Never store or show it. */
  url: string;
  expiresAt: string;
  /** What the website calls the file: the plan number with `/` as `_`, then the extension. */
  name: string;
  /** Lower-case extension, as in the plan's `files` list. */
  format: string;
};

/** How long the address lives. The gateway's default, and plenty to open a file. */
export const FILE_LINK_SECONDS = DEFAULT_SIGNED_URL_SECONDS;

const INDEX = /^\d{1,4}$/;

export async function getPlanFileLink(
  userId: string,
  planId: string,
  position: string
): Promise<PlanFileLink> {
  // Anything that cannot be a file of a plan is the same answer as a file that is not there.
  if (!UUID.test(planId) || !INDEX.test(position)) throw new NotFoundError("File");

  const row = await prisma.surfboardPlan.findFirst({
    where: {
      id: planId,
      deleted: false,
      OR: [{ userId }, { sharedTo: { has: userId } }],
    },
    select: {
      userId: true,
      planNumber: true,
      redCopyFileUrl: true,
      pdfFilePaths: true,
      cadFilePaths: true,
      certificateFilePaths: true,
    },
  });
  // Someone else's plan is the same answer as no plan.
  if (!row) throw new NotFoundError("File");

  const owner = row.userId === userId;
  const file = planFiles(row, owner)[Number(position)];
  if (!file) throw new NotFoundError("File");

  if (!file.viewable) {
    throw new ApiError(
      422,
      "FILE_NOT_VIEWABLE",
      "This kind of file can't be opened on a phone"
    );
  }

  // A plan's file fields are editable by its owner, so being listed on the plan
  // proves nothing (ADR-0012): the key must be well formed and sit in the
  // owner's own folder, or be the plan's own record copy.
  const key = extractS3KeyFromUrl(file.ref);
  const inOwnerFolder =
    keyBelongsToAllowedUser(key, [row.userId ?? ""]) ||
    (file.kind === "RECORD_COPY" && isRedCopyKeyOfPlan(key, row.planNumber));
  if (!isSafeStorageKey(key) || !inOwnerFolder) throw new NotFoundError("File");

  const url = await getPresignedDownloadUrl(file.ref, FILE_LINK_SECONDS);
  return {
    url,
    expiresAt: new Date(Date.now() + FILE_LINK_SECONDS * 1000).toISOString(),
    name: file.name,
    format: file.format,
  };
}
