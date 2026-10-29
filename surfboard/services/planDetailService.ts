import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import {
  SUMMARY_COLUMNS,
  toPlanSummary,
  type PlanSummary,
  type SummaryRow,
} from "@/surfboard/services/planSummaryService";
import { planFileDisplayName } from "@/surfboard/utils/planFileName";
import { boundaryFacts } from "@/surfboard/utils/planGeometry";
import {
  PLAN_QUERY_SELECT,
  STAGE_ORDER,
  type ApprovalState,
  type PlanQueryRow,
  type StageKey,
} from "@/surfboard/utils/planStatus";

/**
 * One plan for the mobile app's detail screen (TASK-0015 1D.4, 1D.7): the list
 * summary plus the key facts, when each step happened and the files, without
 * geometry, pillars or any other person's details. `GET plans/{id}` stays the
 * website's full row.
 *
 * What a viewer gets depends on whose plan it is. The owner sees everything
 * here. Someone the plan was shared with sees the plan and its files but never
 * the record copy (the Shared tab says "the file is not shared with you"),
 * reviewer comments, the batch or payment, or who else it is shared with.
 */

export type PlanFileKind =
  "RECORD_COPY" | "SURVEY_PLAN" | "DRAWING" | "CERTIFICATE";

export type PlanFile = {
  kind: PlanFileKind;
  /** What the website calls it: the plan number with `/` as `_`, then the extension. */
  name: string;
  /** Lower-case extension; empty when the stored name has none. */
  format: string;
  /** Opens on a phone (PDF and common images). Drawings do not. */
  viewable: boolean;
  /** The stored reference: pass it back, unchanged, to `files/view?url=`. Never show it. */
  ref: string;
};

export type PlanDetail = PlanSummary & {
  deededArea: string;
  pillarType: string;
  pillarCount: number;
  referencePlanNumber: string | null;
  /** Square metres, worked out from the boundary; null if the boundary is unusable. */
  areaSqM: number | null;
  centroid: { lat: number; lng: number } | null;
  /** When the record copy was submitted; null until then. */
  submittedAt: string | null;
  physicalCopySubmittedAt: string | null;
  archiveReceivedAt: string | null;
  /** When each review last acted (a query counts); null while it is pending. */
  stageDecidedAt: Record<StageKey, string | null>;
  files: PlanFile[];
  /** The batch the plan was submitted in. Only the owner gets it. */
  batch: { id: string; batchCode: string } | null;
};

const DETAIL_SELECT = {
  ...SUMMARY_COLUMNS,
  ...PLAN_QUERY_SELECT,
  userId: true,
  batch: { select: { id: true, batchCode: true, paymentStatus: true } },
  user: { select: { firstName: true, lastName: true } },
  deededArea: true,
  pillarType: true,
  referencePlanNumber: true,
  // Read to count the pillars and work out the area and centre; none of it is returned.
  pillars: true,
  geometry: true,
  redCopySubmittedAt: true,
  physicalCopySubmittedAt: true,
  archiveReceivedAt: true,
  pdfFilePaths: true,
  cadFilePaths: true,
  certificateFilePaths: true,
} as const satisfies Prisma.SurfboardPlanSelect;

/** `id` is a database uuid column: any other text would be a 500 instead of "not found". */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const iso = (date: Date | null | undefined) =>
  date ? date.toISOString() : null;

/** What a phone can show. DWG and DXF drawings cannot be opened on one. */
const VIEWABLE_FORMATS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "gif"]);

function formatOf(storedPath: string): string {
  const stored = storedPath.split(/[?#]/)[0].split("/").pop() || "";
  const dot = stored.lastIndexOf(".");
  return dot > 0 ? stored.slice(dot + 1).toLowerCase() : "";
}

export function planFiles(
  row: {
    planNumber: string;
    redCopyFileUrl: string | null;
    pdfFilePaths: string[];
    cadFilePaths: string[];
    certificateFilePaths: string[];
  },
  owner: boolean
): PlanFile[] {
  const files: PlanFile[] = [];
  const add = (kind: PlanFileKind, paths: string[]) =>
    paths
      .filter((ref) => !!ref)
      .forEach((ref, index) => {
        const format = formatOf(ref);
        files.push({
          kind,
          name: planFileDisplayName({
            planNumber: row.planNumber,
            filePath: ref,
            index,
          }),
          format,
          viewable: VIEWABLE_FORMATS.has(format),
          ref,
        });
      });

  // The record copy is the owner's: a shared viewer only learns that one exists.
  if (owner && row.redCopyFileUrl) add("RECORD_COPY", [row.redCopyFileUrl]);
  add("SURVEY_PLAN", row.pdfFilePaths);
  add("DRAWING", row.cadFilePaths);
  add("CERTIFICATE", row.certificateFilePaths);
  return files;
}

function decidedAt(
  row: PlanQueryRow,
  stages: Record<StageKey, ApprovalState>
): Record<StageKey, string | null> {
  const at: Record<StageKey, Date | null> = {
    accounts: row.accountsApprovedAt,
    charting: row.chartingApprovedAt,
    surcon: row.surconApprovedAt,
    recordsI: row.recordsIApprovedAt,
    intake: row.intakeApprovedAt,
    recordsII: row.recordsIIApprovedAt,
  };
  // A stage sent back to pending keeps its old date in the database; do not show it.
  return Object.fromEntries(
    STAGE_ORDER.map((stage) => [
      stage,
      stages[stage] === "PENDING" ? null : iso(at[stage]),
    ])
  ) as Record<StageKey, string | null>;
}

export async function getPlanDetail(
  userId: string,
  planId: string
): Promise<PlanDetail> {
  if (!UUID.test(planId)) throw new NotFoundError("Plan");

  const row = await prisma.surfboardPlan.findFirst({
    where: {
      id: planId,
      deleted: false,
      OR: [{ userId }, { sharedTo: { has: userId } }],
    },
    select: DETAIL_SELECT,
  });
  // Someone else's plan is the same answer as no plan.
  if (!row) throw new NotFoundError("Plan");

  const owner = row.userId === userId;
  // A shared viewer must not learn the owner's payment state, so no batch goes
  // into the status (the shared list does the same).
  const summary = toPlanSummary(
    (owner ? row : { ...row, batch: null }) as unknown as SummaryRow,
    owner ? "owner" : "shared"
  );
  const redCopySent =
    row.redCopyStatus !== "NOT_SUBMITTED" && row.redCopyStatus !== "FAILED";

  return {
    ...summary,
    deededArea: row.deededArea,
    pillarType: row.pillarType,
    pillarCount: Array.isArray(row.pillars) ? row.pillars.length : 0,
    referencePlanNumber: row.referencePlanNumber,
    ...boundaryFacts(row.geometry),
    submittedAt: redCopySent ? iso(row.redCopySubmittedAt) : null,
    physicalCopySubmittedAt: iso(row.physicalCopySubmittedAt),
    archiveReceivedAt: iso(row.archiveReceivedAt),
    stageDecidedAt: decidedAt(row, summary.stages),
    files: planFiles(row, owner),
    batch:
      owner && row.batch
        ? { id: row.batch.id, batchCode: row.batch.batchCode }
        : null,
  };
}
