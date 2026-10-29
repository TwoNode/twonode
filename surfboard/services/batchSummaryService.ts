import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import { paginateQuery, type Paginated } from "@/lib/api/pagination";
import type { PlanSummaryQuery } from "@/surfboard/services/planSummaryService";
import { userBatchWhere } from "@/surfboard/utils/batchScope";
import type { BatchSummaryParams } from "@/surfboard/utils/batchSummaryQuery";
import {
  batchPaymentLabel,
  computeDisplayStatus,
  DISPLAY_STATUS_RANK,
  PLAN_QUERY_SELECT,
  PLAN_STATUS_COLUMNS,
  planQueries,
  type BatchPaymentValue,
  type DisplayStatus,
  type DisplayStatusCode,
  type PlanQueryRow,
  type PlanStatusRow,
} from "@/surfboard/utils/planStatus";

/**
 * The batch views behind the mobile app's Records tab (TASK-0015 1F.1, 1F.6).
 * `GET cod/batches` and `GET cod/batches/{id}` stay as they are for the website
 * (the second is the PDF data); these are purpose-built: each plan's one
 * `displayStatus`, the counts the cards show, and which plans can be handed in
 * now. They never return the submitter's contact details or payer id, receipt
 * links, or a stored file link.
 */

export type BatchStatusCount = {
  code: DisplayStatusCode;
  label: string;
  count: number;
};

export type BatchSummary = {
  id: string;
  batchCode: string;
  createdAt: string;
  paymentStatus: BatchPaymentValue;
  paymentLabel: string;
  /** Plans still in the batch (a deleted plan is not counted). */
  planCount: number;
  /** Plans that can be marked "physical copy submitted" now. */
  readyCount: number;
  /** One entry per distinct status, queried and ready first. */
  statusCounts: BatchStatusCount[];
};

export type BatchPlan = {
  id: string;
  planNumber: string;
  surveyTitle: string;
  facilitator: string;
  displayStatus: DisplayStatus;
  /** Can be marked "physical copy submitted" now. */
  ready: boolean;
  queries: PlanSummaryQuery[];
  physicalCopySubmittedAt: string | null;
};

export type BatchDetail = BatchSummary & { plans: BatchPlan[] };

const LIST_SELECT = {
  id: true,
  batchCode: true,
  createdAt: true,
  paymentStatus: true,
  plans: { where: { deleted: false }, select: PLAN_STATUS_COLUMNS },
} as const satisfies Prisma.CertificateOfDepositBatchSelect;

const DETAIL_SELECT = {
  id: true,
  batchCode: true,
  createdAt: true,
  paymentStatus: true,
  plans: {
    where: { deleted: false },
    select: {
      id: true,
      planNumber: true,
      surveyTitle: true,
      facilitator: true,
      physicalCopySubmittedAt: true,
      ...PLAN_STATUS_COLUMNS,
      ...PLAN_QUERY_SELECT,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.CertificateOfDepositBatchSelect;

type BatchHead = {
  id: string;
  batchCode: string;
  createdAt: Date;
  paymentStatus: BatchPaymentValue;
};

/** A plan's facts including the batch it sits in, which is where its payment state lives. */
const inBatch = <T extends Omit<PlanStatusRow, "batch">>(
  plan: T,
  paymentStatus: BatchPaymentValue
): T & Pick<PlanStatusRow, "batch"> => ({ ...plan, batch: { paymentStatus } });

function countStatuses(statuses: DisplayStatus[]): BatchStatusCount[] {
  const counts = new Map<string, BatchStatusCount>();
  for (const { code, label } of statuses) {
    const key = `${code}|${label}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { code, label, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) =>
      DISPLAY_STATUS_RANK[a.code] - DISPLAY_STATUS_RANK[b.code] ||
      a.label.localeCompare(b.label)
  );
}

function summarise(batch: BatchHead, statuses: DisplayStatus[]): BatchSummary {
  return {
    id: batch.id,
    batchCode: batch.batchCode,
    createdAt: batch.createdAt.toISOString(),
    paymentStatus: batch.paymentStatus,
    paymentLabel: batchPaymentLabel(batch.paymentStatus),
    planCount: statuses.length,
    readyCount: statuses.filter((s) => s.code === "READY_FOR_PHYSICAL").length,
    statusCounts: countStatuses(statuses),
  };
}

/** The surveyor's batches, Active or History, with the counts each card shows. */
export async function getBatchSummaries(
  userId: string,
  params: BatchSummaryParams
): Promise<Paginated<BatchSummary>> {
  const where = userBatchWhere(userId, params.scope, params.search);
  return paginateQuery(
    async (skip, take) => {
      const batches = await prisma.certificateOfDepositBatch.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take,
      });
      return batches.map((batch) =>
        summarise(
          batch,
          batch.plans.map((plan) =>
            computeDisplayStatus(inBatch(plan, batch.paymentStatus))
          )
        )
      );
    },
    () => prisma.certificateOfDepositBatch.count({ where }),
    params.page,
    params.pageSize
  );
}

/** One of the surveyor's batches with every plan in it. Someone else's batch is a 404. */
export async function getBatchDetail(
  userId: string,
  batchId: string
): Promise<BatchDetail> {
  const batch = await prisma.certificateOfDepositBatch.findFirst({
    where: { id: batchId, submittedBy: userId },
    select: DETAIL_SELECT,
  });
  if (!batch) throw new NotFoundError("Batch");

  const plans: BatchPlan[] = batch.plans.map((plan) => {
    const facts = inBatch(
      plan as typeof plan & PlanQueryRow,
      batch.paymentStatus
    );
    const displayStatus = computeDisplayStatus(facts);
    return {
      id: plan.id,
      planNumber: plan.planNumber,
      surveyTitle: plan.surveyTitle,
      facilitator: plan.facilitator,
      displayStatus,
      ready: displayStatus.code === "READY_FOR_PHYSICAL",
      queries: planQueries(facts).map((q) => ({
        ...q,
        at: q.at ? q.at.toISOString() : null,
      })),
      physicalCopySubmittedAt: plan.physicalCopySubmittedAt
        ? plan.physicalCopySubmittedAt.toISOString()
        : null,
    };
  });

  return {
    ...summarise(
      batch,
      plans.map((plan) => plan.displayStatus)
    ),
    plans,
  };
}
