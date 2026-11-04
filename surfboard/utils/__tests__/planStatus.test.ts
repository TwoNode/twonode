import { describe, expect, it } from "vitest";
import {
  computeDisplayStatus,
  DISPLAY_STATUS_CODES,
  isDisplayStatusCode,
  isQueried,
  planQueries,
  queriedPlanWhere,
  readyForPhysicalSubmission,
  readyPlanWhere,
  stageStates,
  type ApprovalState,
  type BatchPaymentValue,
  type PlanQueryRow,
  type PlanStatusRow,
} from "@/surfboard/utils/planStatus";

/** A plan that was submitted in a paid batch and has not been reviewed yet. */
const plan = (over: Partial<PlanStatusRow> = {}): PlanStatusRow => ({
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "PENDING",
  chartingStatus: "PENDING",
  surconStatus: "PENDING",
  recordsIStatus: "PENDING",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
  batch: { paymentStatus: "LASG_PAID" },
  ...over,
});

const fourApproved = {
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
} as const;

const status = (row: PlanStatusRow) => computeDisplayStatus(row);

describe("computeDisplayStatus", () => {
  it("is Lodged first, even when the red copy was never submitted (plans lodged before Surfboard)", () => {
    expect(
      status(plan({ status: "LODGED", redCopyStatus: "NOT_SUBMITTED" }))
    ).toEqual({
      code: "LODGED",
      label: "Lodged",
    });
  });

  it("is Lodged even if a stale review column still says queried", () => {
    expect(
      status(plan({ status: "LODGED", chartingStatus: "QUERIED" })).code
    ).toBe("LODGED");
  });

  it("names the review that queried", () => {
    expect(status(plan({ chartingStatus: "QUERIED" }))).toEqual({
      code: "QUERIED",
      label: "Queried by Charting",
    });
  });

  it("lists several queriers in pipeline order, not the order they acted", () => {
    expect(
      status(
        plan({
          recordsIIStatus: "QUERIED",
          accountsStatus: "QUERIED",
          surconStatus: "QUERIED",
        })
      ).label
    ).toBe("Queried by Accounts, SURCON, Records II");
  });

  it("shows an Intake query, which the website's queried page does not", () => {
    expect(
      status(
        plan({
          ...fourApproved,
          physicalCopySubmitted: true,
          intakeStatus: "QUERIED",
          redCopyStatus: "QUERIED",
        })
      )
    ).toEqual({ code: "QUERIED", label: "Queried by Intake" });
  });

  it("is plain Queried when only the red copy or an admin flag says so", () => {
    expect(status(plan({ redCopyStatus: "QUERIED" })).label).toBe("Queried");
    expect(status(plan({ status: "QUERIED" })).label).toBe("Queried");
  });

  it("is Queried, not Physical copy submitted, when Records II queries after the physical copy went in", () => {
    expect(
      status(plan({ physicalCopySubmitted: true, recordsIIStatus: "QUERIED" }))
        .code
    ).toBe("QUERIED");
  });

  it("is Physical copy submitted once the copy is handed in", () => {
    expect(
      status(plan({ ...fourApproved, physicalCopySubmitted: true })).code
    ).toBe("PHYSICAL_SUBMITTED");
  });

  it("is Not submitted or Submission failed before the batch is submitted", () => {
    expect(
      status(plan({ redCopyStatus: "NOT_SUBMITTED", batch: null })).code
    ).toBe("NOT_SUBMITTED");
    expect(status(plan({ redCopyStatus: "FAILED" })).code).toBe(
      "SUBMISSION_FAILED"
    );
  });

  it.each<BatchPaymentValue>(["LASG_PAID", "ACCOUNTS_APPROVED", "COMPLETED"])(
    "is Ready for physical submission when the four reviews approved and the batch is %s",
    (paymentStatus) => {
      expect(
        status(plan({ ...fourApproved, batch: { paymentStatus } }))
      ).toEqual({
        code: "READY_FOR_PHYSICAL",
        label: "Ready for physical submission",
      });
    }
  );

  it("is Payment pending while the batch has not been paid", () => {
    expect(
      status(plan({ batch: { paymentStatus: "PENDING_USER_PAYMENT" } })).code
    ).toBe("PAYMENT_PENDING");
  });

  it("names the reviews that approved, in pipeline order, when only some have", () => {
    expect(
      status(plan({ surconStatus: "APPROVED", accountsStatus: "APPROVED" }))
    ).toEqual({
      code: "PARTLY_APPROVED",
      label: "Approved by Accounts, SURCON",
    });
  });

  it("is In review when nothing has approved yet, and treats a null review as pending", () => {
    expect(status(plan())).toEqual({ code: "IN_REVIEW", label: "In review" });
    expect(
      status(
        plan({
          accountsStatus: null,
          chartingStatus: null,
          surconStatus: null,
          recordsIStatus: null,
          intakeStatus: null,
          recordsIIStatus: null,
        })
      ).code
    ).toBe("IN_REVIEW");
  });

  it("keeps a plan with the older COMPLETED red copy status in the pipeline, but never ready (the website needs SUBMITTED)", () => {
    expect(status(plan({ redCopyStatus: "COMPLETED" })).code).toBe("IN_REVIEW");
    expect(
      status(plan({ redCopyStatus: "COMPLETED", ...fourApproved })).code
    ).toBe("IN_REVIEW");
  });

  it("falls back to In review when everything approved but the batch cannot be matched", () => {
    expect(status(plan({ ...fourApproved, batch: null })).code).toBe(
      "IN_REVIEW"
    );
  });

  it("always returns a known code", () => {
    for (const code of [status(plan()), status(plan({ status: "LODGED" }))].map(
      (s) => s.code
    )) {
      expect(isDisplayStatusCode(code)).toBe(true);
    }
    expect(isDisplayStatusCode("NOPE")).toBe(false);
    expect(DISPLAY_STATUS_CODES).toHaveLength(9);
  });
});

describe("readyForPhysicalSubmission", () => {
  const ready = plan({ ...fourApproved });

  it("is true for the website's rule", () => {
    expect(readyForPhysicalSubmission(ready)).toBe(true);
  });

  it.each<[string, Partial<PlanStatusRow>]>([
    ["the red copy is not submitted", { redCopyStatus: "NOT_SUBMITTED" }],
    ["the red copy was queried", { redCopyStatus: "QUERIED" }],
    ["the physical copy is already in", { physicalCopySubmitted: true }],
    ["Accounts has not approved", { accountsStatus: "PENDING" }],
    ["Charting has not approved", { chartingStatus: null }],
    ["SURCON queried", { surconStatus: "QUERIED" }],
    ["Records I has not approved", { recordsIStatus: "PENDING" }],
    ["Intake queried", { intakeStatus: "QUERIED" }],
    ["Records II queried", { recordsIIStatus: "QUERIED" }],
    ["the plan is lodged", { status: "LODGED" }],
    ["an admin flagged it queried", { status: "QUERIED" }],
    [
      "the batch is not paid",
      { batch: { paymentStatus: "PENDING_USER_PAYMENT" } },
    ],
    [
      "Accounts disapproved the batch",
      { batch: { paymentStatus: "ACCOUNTS_DISAPPROVED" } },
    ],
    ["there is no batch", { batch: null }],
  ])("is false when %s", (_why, over) => {
    expect(readyForPhysicalSubmission({ ...ready, ...over })).toBe(false);
  });

  it("does not wait for Intake or Records II to be pending, only not queried", () => {
    expect(
      readyForPhysicalSubmission({
        ...ready,
        intakeStatus: null,
        recordsIIStatus: "APPROVED",
      })
    ).toBe(true);
  });
});

describe("isQueried", () => {
  it("is true for each of the eight ways a plan can be queried", () => {
    expect(isQueried(plan({ status: "QUERIED" }))).toBe(true);
    expect(isQueried(plan({ redCopyStatus: "QUERIED" }))).toBe(true);
    for (const column of [
      "accountsStatus",
      "chartingStatus",
      "surconStatus",
      "recordsIStatus",
      "intakeStatus",
      "recordsIIStatus",
    ] as const) {
      expect(isQueried(plan({ [column]: "QUERIED" }))).toBe(true);
    }
  });

  it("is false for a plan that is merely pending, approved or lodged", () => {
    expect(isQueried(plan())).toBe(false);
    expect(isQueried(plan(fourApproved))).toBe(false);
    expect(
      isQueried(plan({ status: "LODGED", accountsStatus: "QUERIED" }))
    ).toBe(false);
  });
});

describe("planQueries", () => {
  const queryColumns: PlanQueryRow = {
    accountsComment: null,
    accountsApprovedAt: null,
    chartingComment: "  Closure is outside tolerance.  ",
    chartingApprovedAt: new Date("2026-10-14T09:00:00Z"),
    surconComment: null,
    surconApprovedAt: null,
    recordsIComment: null,
    recordsIApprovedAt: null,
    intakeComment: "   ",
    intakeApprovedAt: new Date("2026-10-15T09:00:00Z"),
    recordsIIComment: null,
    recordsIIApprovedAt: null,
  };

  it("says who queried, why and when, in pipeline order, with comments trimmed", () => {
    const queries = planQueries({
      ...plan({ chartingStatus: "QUERIED", intakeStatus: "QUERIED" }),
      ...queryColumns,
    });
    expect(queries).toEqual([
      {
        stage: "charting",
        label: "Charting",
        comment: "Closure is outside tolerance.",
        at: new Date("2026-10-14T09:00:00Z"),
      },
      {
        stage: "intake",
        label: "Intake",
        comment: null,
        at: new Date("2026-10-15T09:00:00Z"),
      },
    ]);
  });

  it("is empty when the plan is not queried, or only flagged without a querying review", () => {
    expect(planQueries({ ...plan(), ...queryColumns })).toEqual([]);
    expect(
      planQueries({ ...plan({ status: "QUERIED" }), ...queryColumns })
    ).toEqual([]);
    expect(
      planQueries({
        ...plan({ status: "LODGED", chartingStatus: "QUERIED" }),
        ...queryColumns,
      })
    ).toEqual([]);
  });
});

describe("stageStates", () => {
  it("reads a null review as pending", () => {
    expect(
      stageStates(plan({ accountsStatus: null, chartingStatus: "APPROVED" }))
    ).toEqual({
      accounts: "PENDING",
      charting: "APPROVED",
      surcon: "PENDING",
      recordsI: "PENDING",
      intake: "PENDING",
      recordsII: "PENDING",
    });
  });
});

// ---------------------------------------------------------------------------
// The Prisma filters must select exactly the plans the functions describe.
// This evaluates the filter objects the way SQL would (a comparison with null
// is unknown, and only a true row is returned), over many generated plans.
// ---------------------------------------------------------------------------

type Tri = true | false | null;
const and = (xs: Tri[]): Tri =>
  xs.includes(false) ? false : xs.includes(null) ? null : true;
const or = (xs: Tri[]): Tri =>
  xs.includes(true) ? true : xs.includes(null) ? null : false;

function compare(value: unknown, filter: unknown): Tri {
  if (filter === null) return value === null || value === undefined;
  if (typeof filter !== "object")
    return value == null ? null : value === filter;
  const f = filter as Record<string, unknown>;
  const parts: Tri[] = [];
  if ("not" in f) parts.push(value == null ? null : value !== f.not);
  if ("in" in f)
    parts.push(value == null ? null : (f.in as unknown[]).includes(value));
  if ("notIn" in f)
    parts.push(value == null ? null : !(f.notIn as unknown[]).includes(value));
  return and(parts);
}

function evaluate(
  where: Record<string, unknown>,
  row: Record<string, unknown>
): Tri {
  const parts: Tri[] = [];
  for (const [key, filter] of Object.entries(where)) {
    if (key === "OR")
      parts.push(
        or((filter as Record<string, unknown>[]).map((w) => evaluate(w, row)))
      );
    else if (key === "AND")
      parts.push(
        and((filter as Record<string, unknown>[]).map((w) => evaluate(w, row)))
      );
    else if (key === "batch") {
      // A relation filter only matches when the related row exists.
      const batch = row.batch as Record<string, unknown> | null | undefined;
      parts.push(
        batch ? evaluate(filter as Record<string, unknown>, batch) : false
      );
    } else parts.push(compare(row[key], filter));
  }
  return and(parts);
}

/** A small deterministic generator, so a failure can be reproduced. */
function generator(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function randomPlans(count: number): PlanStatusRow[] {
  const next = generator(20261019);
  const pick = <T>(values: readonly T[]): T =>
    values[Math.floor(next() * values.length)];
  const approval = (): ApprovalState | null =>
    pick([
      null,
      "PENDING",
      "APPROVED",
      "APPROVED",
      "APPROVED",
      "APPROVED",
      "QUERIED",
    ]);
  return Array.from({ length: count }, () => ({
    status: pick([
      "PENDING",
      "PENDING",
      "LODGED",
      "QUERIED",
      "UNDER_REVIEW",
    ] as const),
    redCopyStatus: pick([
      "NOT_SUBMITTED",
      "SUBMITTED",
      "SUBMITTED",
      "SUBMITTED",
      "COMPLETED",
      "FAILED",
      "APPROVED",
      "QUERIED",
    ] as const),
    physicalCopySubmitted: next() < 0.25,
    accountsStatus: approval(),
    chartingStatus: approval(),
    surconStatus: approval(),
    recordsIStatus: approval(),
    intakeStatus: approval(),
    recordsIIStatus: approval(),
    batch: pick([
      null,
      { paymentStatus: "PENDING_USER_PAYMENT" },
      { paymentStatus: "LASG_PAID" },
      { paymentStatus: "LASG_PAID" },
      { paymentStatus: "ACCOUNTS_APPROVED" },
      { paymentStatus: "ACCOUNTS_DISAPPROVED" },
      { paymentStatus: "COMPLETED" },
    ] as const) as PlanStatusRow["batch"],
  }));
}

describe("the database filters agree with the functions", () => {
  const rows = randomPlans(30000);
  const asRecord = (row: PlanStatusRow) =>
    row as unknown as Record<string, unknown>;

  it("queriedPlanWhere selects exactly the queried plans, including those with null review columns", () => {
    let queried = 0;
    let withNull = 0;
    for (const row of rows) {
      const selected = evaluate(queriedPlanWhere, asRecord(row)) === true;
      if (selected !== isQueried(row)) {
        throw new Error(
          `filter and isQueried disagree for ${JSON.stringify(row)}`
        );
      }
      if (selected) queried++;
      if (
        stageStates(row) &&
        [row.accountsStatus, row.chartingStatus, row.intakeStatus].includes(
          null
        )
      )
        withNull++;
    }
    // The sample really exercises both outcomes and the null case.
    expect(queried).toBeGreaterThan(1000);
    expect(queried).toBeLessThan(rows.length - 1000);
    expect(withNull).toBeGreaterThan(1000);
  });

  it("readyPlanWhere selects exactly the plans readyForPhysicalSubmission accepts", () => {
    let ready = 0;
    for (const row of rows) {
      const selected = evaluate(readyPlanWhere, asRecord(row)) === true;
      if (selected !== readyForPhysicalSubmission(row)) {
        throw new Error(
          `filter and readyForPhysicalSubmission disagree for ${JSON.stringify(row)}`
        );
      }
      if (selected) ready++;
    }
    expect(ready).toBeGreaterThan(100);
  });

  it("the Queried and Ready counts match what the chips say", () => {
    const mismatches = rows.filter((row) => {
      const code = computeDisplayStatus(row).code;
      return (
        (evaluate(queriedPlanWhere, asRecord(row)) === true) !==
          (code === "QUERIED") ||
        (evaluate(readyPlanWhere, asRecord(row)) === true) !==
          (code === "READY_FOR_PHYSICAL")
      );
    });
    expect(mismatches).toEqual([]);
  });

  it("every code can occur, so the sample is not hiding a rule", () => {
    const seen = new Set(rows.map((row) => computeDisplayStatus(row).code));
    expect([...seen].sort()).toEqual([...DISPLAY_STATUS_CODES].sort());
  });
});
