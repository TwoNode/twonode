import type { Prisma } from "@/prisma/generated";

// One definition of "where is this plan?" for people (TASK-0015 1D.2). The
// stored state is spread over `status`, `redCopyStatus`, `physicalCopySubmitted`,
// six review columns and the batch's payment status; every list, count and
// batch view that tells a surveyor where a plan stands goes through this file,
// so the app, the lists and the counts cannot disagree.
//
// How a plan moves (read from batchApprovalService.ts and
// remitaVerificationService.ts):
//   1. The surveyor submits a batch: plans become `redCopyStatus = SUBMITTED`
//      and the batch is `PENDING_USER_PAYMENT`.
//   2. After the batch is paid (`LASG_PAID`), four reviews run in parallel:
//      Accounts (decided for the whole batch, it sets the batch to
//      `ACCOUNTS_APPROVED` or `ACCOUNTS_DISAPPROVED`), Charting, SURCON,
//      Records I. A query by any of them is announced once all four have acted.
//   3. When the four are approved the surveyor hands in the physical copy
//      (`physicalCopySubmitted`).
//   4. Intake, then Records II. Records II approving sets `status = LODGED`
//      and `redCopyStatus = APPROVED`; Archive only records receipt after that.
//   `status = LODGED` is also set when a plan is saved with certificate files
//   (plans lodged before Surfboard), so "lodged" is checked first.
// An Intake query sets `redCopyStatus = QUERIED`; a Records II query resets the
// other reviews to PENDING; an admin can also flag `status = QUERIED`.
// Review columns are nullable in the schema: null means PENDING.

export type ApprovalState = "PENDING" | "APPROVED" | "QUERIED";
export type StageKey =
  "accounts" | "charting" | "surcon" | "recordsI" | "intake" | "recordsII";

type PlanStatusValue = "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW";
type RedCopyStatusValue =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "COMPLETED"
  | "FAILED"
  | "APPROVED"
  | "QUERIED";
export type BatchPaymentValue =
  | "PENDING_USER_PAYMENT"
  | "LASG_PAID"
  | "ACCOUNTS_APPROVED"
  | "ACCOUNTS_DISAPPROVED"
  | "COMPLETED";

/** Pipeline order. Stage names are always listed in this order. */
export const STAGE_ORDER: readonly StageKey[] = [
  "accounts",
  "charting",
  "surcon",
  "recordsI",
  "intake",
  "recordsII",
];

export const STAGE_LABELS: Record<StageKey, string> = {
  accounts: "Accounts",
  charting: "Charting",
  surcon: "SURCON",
  recordsI: "Records I",
  intake: "Intake",
  recordsII: "Records II",
};

/** The four reviews that run in parallel; all must approve before the physical copy goes in. */
export const PARALLEL_REVIEWS: readonly StageKey[] = [
  "accounts",
  "charting",
  "surcon",
  "recordsI",
];

/**
 * A batch whose payment is in one of these states has been paid and accepted
 * for review. The website only offers "Physical copies submitted" for such a
 * batch (`canDownloadLetter`).
 */
export const READY_PAYMENT_STATUSES: readonly BatchPaymentValue[] = [
  "LASG_PAID",
  "ACCOUNTS_APPROVED",
  "COMPLETED",
];

export const DISPLAY_STATUS_CODES = [
  "QUERIED",
  "LODGED",
  "PHYSICAL_SUBMITTED",
  "READY_FOR_PHYSICAL",
  "PARTLY_APPROVED",
  "IN_REVIEW",
  "PAYMENT_PENDING",
  "NOT_SUBMITTED",
  "SUBMISSION_FAILED",
] as const;
export type DisplayStatusCode = (typeof DISPLAY_STATUS_CODES)[number];

export function isDisplayStatusCode(value: string): value is DisplayStatusCode {
  return (DISPLAY_STATUS_CODES as readonly string[]).includes(value);
}

/** What needs the surveyor's attention comes first; lodged plans last. Used to order status counts. */
export const DISPLAY_STATUS_RANK: Record<DisplayStatusCode, number> = {
  QUERIED: 0,
  READY_FOR_PHYSICAL: 1,
  SUBMISSION_FAILED: 2,
  PAYMENT_PENDING: 3,
  PARTLY_APPROVED: 4,
  IN_REVIEW: 5,
  PHYSICAL_SUBMITTED: 6,
  NOT_SUBMITTED: 7,
  LODGED: 8,
};

/** The batch payment wording the website already uses ("Payment Pending", "Processing", "Approved"). */
const PAYMENT_LABELS: Record<BatchPaymentValue, string> = {
  PENDING_USER_PAYMENT: "Payment pending",
  LASG_PAID: "Processing",
  ACCOUNTS_APPROVED: "Approved",
  ACCOUNTS_DISAPPROVED: "Payment queried",
  COMPLETED: "Completed",
};

export function batchPaymentLabel(status: BatchPaymentValue): string {
  return PAYMENT_LABELS[status] ?? status;
}

/** What the app shows: a code to colour and filter by, and the words. */
export type DisplayStatus = { code: DisplayStatusCode; label: string };

/** The columns the status is worked out from. A Prisma plan row with these selected fits. */
export type PlanStatusRow = {
  status: PlanStatusValue;
  redCopyStatus: RedCopyStatusValue;
  physicalCopySubmitted: boolean;
  accountsStatus: ApprovalState | null;
  chartingStatus: ApprovalState | null;
  surconStatus: ApprovalState | null;
  recordsIStatus: ApprovalState | null;
  intakeStatus: ApprovalState | null;
  recordsIIStatus: ApprovalState | null;
  batch?: { paymentStatus: BatchPaymentValue } | null;
};

/** The scalar columns `computeDisplayStatus` reads. For a viewer who must not learn the owner's payment state. */
export const PLAN_STATUS_COLUMNS = {
  status: true,
  redCopyStatus: true,
  physicalCopySubmitted: true,
  accountsStatus: true,
  chartingStatus: true,
  surconStatus: true,
  recordsIStatus: true,
  intakeStatus: true,
  recordsIIStatus: true,
} as const;

/** Spread into a Prisma `select` so a service reads exactly what `computeDisplayStatus` needs. */
export const PLAN_STATUS_SELECT = {
  ...PLAN_STATUS_COLUMNS,
  batch: { select: { paymentStatus: true } },
} as const;

/** The reviewers' comments and when each acted (their `...ApprovedAt` is set on a query too). */
export const PLAN_QUERY_SELECT = {
  accountsComment: true,
  accountsApprovedAt: true,
  chartingComment: true,
  chartingApprovedAt: true,
  surconComment: true,
  surconApprovedAt: true,
  recordsIComment: true,
  recordsIApprovedAt: true,
  intakeComment: true,
  intakeApprovedAt: true,
  recordsIIComment: true,
  recordsIIApprovedAt: true,
} as const;

export type PlanQueryRow = {
  accountsComment: string | null;
  accountsApprovedAt: Date | null;
  chartingComment: string | null;
  chartingApprovedAt: Date | null;
  surconComment: string | null;
  surconApprovedAt: Date | null;
  recordsIComment: string | null;
  recordsIApprovedAt: Date | null;
  intakeComment: string | null;
  intakeApprovedAt: Date | null;
  recordsIIComment: string | null;
  recordsIIApprovedAt: Date | null;
};

const stageColumn = {
  accounts: "accountsStatus",
  charting: "chartingStatus",
  surcon: "surconStatus",
  recordsI: "recordsIStatus",
  intake: "intakeStatus",
  recordsII: "recordsIIStatus",
} as const satisfies Record<StageKey, keyof PlanStatusRow>;

/** A review that has not been recorded counts as pending. */
export function stageState(row: PlanStatusRow, stage: StageKey): ApprovalState {
  return row[stageColumn[stage]] ?? "PENDING";
}

/** Every stage's state, with null as PENDING. */
export function stageStates(
  row: PlanStatusRow
): Record<StageKey, ApprovalState> {
  return {
    accounts: stageState(row, "accounts"),
    charting: stageState(row, "charting"),
    surcon: stageState(row, "surcon"),
    recordsI: stageState(row, "recordsI"),
    intake: stageState(row, "intake"),
    recordsII: stageState(row, "recordsII"),
  };
}

function stagesIn(
  row: PlanStatusRow,
  state: ApprovalState,
  among: readonly StageKey[]
): StageKey[] {
  return among.filter((stage) => stageState(row, stage) === state);
}

const names = (stages: readonly StageKey[]) =>
  stages.map((s) => STAGE_LABELS[s]).join(", ");

/**
 * Queried: an admin flagged it, the red copy was queried (Intake does this), or
 * any review is queried. A lodged plan is never queried, whatever a stale
 * review column says.
 */
export function isQueried(row: PlanStatusRow): boolean {
  if (row.status === "LODGED") return false;
  return (
    row.status === "QUERIED" ||
    row.redCopyStatus === "QUERIED" ||
    stagesIn(row, "QUERIED", STAGE_ORDER).length > 0
  );
}

/**
 * The surveyor can hand in the physical copy: red copy submitted, not handed in
 * yet, the four parallel reviews approved, nothing queried, and the batch paid
 * and accepted for review. This is the website's rule (PhysicalSubmissionModal
 * and SubmittedBatchesModal); the server does not enforce it on
 * `POST plans/physical-copy` yet (decision D16).
 */
export function readyForPhysicalSubmission(row: PlanStatusRow): boolean {
  return (
    row.status !== "LODGED" &&
    !isQueried(row) &&
    row.redCopyStatus === "SUBMITTED" &&
    !row.physicalCopySubmitted &&
    PARALLEL_REVIEWS.every((stage) => stageState(row, stage) === "APPROVED") &&
    !!row.batch &&
    READY_PAYMENT_STATUSES.includes(row.batch.paymentStatus)
  );
}

/** First match wins; see the header for the pipeline. */
export function computeDisplayStatus(row: PlanStatusRow): DisplayStatus {
  if (row.status === "LODGED") return { code: "LODGED", label: "Lodged" };

  if (isQueried(row)) {
    const by = stagesIn(row, "QUERIED", STAGE_ORDER);
    return {
      code: "QUERIED",
      label: by.length > 0 ? `Queried by ${names(by)}` : "Queried",
    };
  }

  if (row.physicalCopySubmitted) {
    return { code: "PHYSICAL_SUBMITTED", label: "Physical copy submitted" };
  }
  if (row.redCopyStatus === "NOT_SUBMITTED") {
    return { code: "NOT_SUBMITTED", label: "Not submitted" };
  }
  if (row.redCopyStatus === "FAILED") {
    return { code: "SUBMISSION_FAILED", label: "Submission failed" };
  }
  if (readyForPhysicalSubmission(row)) {
    return {
      code: "READY_FOR_PHYSICAL",
      label: "Ready for physical submission",
    };
  }
  if (row.batch?.paymentStatus === "PENDING_USER_PAYMENT") {
    return { code: "PAYMENT_PENDING", label: "Payment pending" };
  }

  const approved = stagesIn(row, "APPROVED", PARALLEL_REVIEWS);
  if (approved.length > 0 && approved.length < PARALLEL_REVIEWS.length) {
    return { code: "PARTLY_APPROVED", label: `Approved by ${names(approved)}` };
  }
  return { code: "IN_REVIEW", label: "In review" };
}

export type PlanQuery = {
  stage: StageKey;
  label: string;
  comment: string | null;
  at: Date | null;
};

const commentColumn = {
  accounts: ["accountsComment", "accountsApprovedAt"],
  charting: ["chartingComment", "chartingApprovedAt"],
  surcon: ["surconComment", "surconApprovedAt"],
  recordsI: ["recordsIComment", "recordsIApprovedAt"],
  intake: ["intakeComment", "intakeApprovedAt"],
  recordsII: ["recordsIIComment", "recordsIIApprovedAt"],
} as const satisfies Record<StageKey, readonly (keyof PlanQueryRow)[]>;

/** Who queried the plan, why and when, in pipeline order. Empty when nothing is queried. */
export function planQueries(row: PlanStatusRow & PlanQueryRow): PlanQuery[] {
  if (!isQueried(row)) return [];
  return stagesIn(row, "QUERIED", STAGE_ORDER).map((stage) => {
    const [commentKey, atKey] = commentColumn[stage];
    return {
      stage,
      label: STAGE_LABELS[stage],
      comment: row[commentKey]?.trim() || null,
      at: row[atKey] ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// The same two rules as database filters, for counts and lists that must not
// load every row. They are written with positive comparisons only (a review
// column can be null, and `NOT (null = x)` would drop the row), and a test
// seeds a plan of every kind and checks they agree with the functions above.
// ---------------------------------------------------------------------------

/** `isQueried` as a Prisma filter. */
export const queriedPlanWhere = {
  status: { not: "LODGED" },
  OR: [
    { status: "QUERIED" },
    { redCopyStatus: "QUERIED" },
    { accountsStatus: "QUERIED" },
    { chartingStatus: "QUERIED" },
    { surconStatus: "QUERIED" },
    { recordsIStatus: "QUERIED" },
    { intakeStatus: "QUERIED" },
    { recordsIIStatus: "QUERIED" },
  ],
} satisfies Prisma.SurfboardPlanWhereInput;

/** `readyForPhysicalSubmission` as a Prisma filter. */
export const readyPlanWhere = {
  status: { notIn: ["LODGED", "QUERIED"] },
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  AND: [
    { OR: [{ intakeStatus: null }, { intakeStatus: { not: "QUERIED" } }] },
    {
      OR: [{ recordsIIStatus: null }, { recordsIIStatus: { not: "QUERIED" } }],
    },
  ],
  batch: { paymentStatus: { in: [...READY_PAYMENT_STATUSES] } },
} satisfies Prisma.SurfboardPlanWhereInput;
