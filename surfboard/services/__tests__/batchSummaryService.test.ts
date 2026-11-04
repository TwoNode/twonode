import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    certificateOfDepositBatch: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      count: mocks.count,
    },
  },
}));

const { getBatchDetail, getBatchSummaries } =
  await import("@/surfboard/services/batchSummaryService");
const { NotFoundError } = await import("@/lib/api/errors");
const { parseBatchSummaryQuery } =
  await import("@/surfboard/utils/batchSummaryQuery");

const params = (query = "") =>
  parseBatchSummaryQuery(new URLSearchParams(query));

/** The review and payment columns of one plan inside a batch. */
const plan = (over: Record<string, unknown> = {}) => ({
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
  ...over,
});

const detailPlan = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  planNumber: `LA/2026/${id}`,
  surveyTitle: `Survey ${id}`,
  facilitator: "Adeyemi & Partners",
  physicalCopySubmittedAt: null,
  accountsComment: null,
  accountsApprovedAt: null,
  chartingComment: null,
  chartingApprovedAt: null,
  surconComment: null,
  surconApprovedAt: null,
  recordsIComment: null,
  recordsIApprovedAt: null,
  intakeComment: null,
  intakeApprovedAt: null,
  recordsIIComment: null,
  recordsIIApprovedAt: null,
  ...plan(),
  ...over,
});

const batch = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  batchCode: "SurfCoD_ab12cd34",
  createdAt: new Date("2026-10-08T10:00:00Z"),
  paymentStatus: "ACCOUNTS_APPROVED",
  plans: [],
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe("getBatchSummaries", () => {
  it("counts each status once, queried and ready first, and says how many can be handed in", async () => {
    mocks.findMany.mockResolvedValue([
      batch({
        plans: [
          plan(), // ready
          plan(), // ready
          plan({ chartingStatus: "QUERIED" }),
          plan({ status: "LODGED" }),
          plan({ accountsStatus: "PENDING", chartingStatus: "PENDING" }), // partly (SURCON, Records I)
          plan({ accountsStatus: "PENDING", chartingStatus: "PENDING" }),
        ],
      }),
    ]);
    mocks.count.mockResolvedValue(1);

    const out = await getBatchSummaries("u1", params());

    expect(out.data).toHaveLength(1);
    expect(out.data[0]).toEqual({
      id: "b1",
      batchCode: "SurfCoD_ab12cd34",
      createdAt: "2026-10-08T10:00:00.000Z",
      paymentStatus: "ACCOUNTS_APPROVED",
      paymentLabel: "Approved",
      planCount: 6,
      readyCount: 2,
      statusCounts: [
        { code: "QUERIED", label: "Queried by Charting", count: 1 },
        {
          code: "READY_FOR_PHYSICAL",
          label: "Ready for physical submission",
          count: 2,
        },
        {
          code: "PARTLY_APPROVED",
          label: "Approved by SURCON, Records I",
          count: 2,
        },
        { code: "LODGED", label: "Lodged", count: 1 },
      ],
    });
    expect(out.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("shows plans in an unpaid batch as Payment pending, and nothing as ready", async () => {
    mocks.findMany.mockResolvedValue([
      batch({ paymentStatus: "PENDING_USER_PAYMENT", plans: [plan(), plan()] }),
    ]);
    mocks.count.mockResolvedValue(1);
    const [summary] = (await getBatchSummaries("u1", params())).data;
    expect(summary.paymentLabel).toBe("Payment pending");
    expect(summary.readyCount).toBe(0);
    expect(summary.statusCounts).toEqual([
      { code: "PAYMENT_PENDING", label: "Payment pending", count: 2 },
    ]);
  });

  it("reads only the caller's batches for the scope and search asked for, a page at a time", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await getBatchSummaries(
      "u1",
      params("scope=history&search=ajah&page=2&pageSize=10")
    );
    const call = mocks.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({
      submittedBy: "u1",
      plans: { some: {}, every: { status: "LODGED" } },
    });
    expect(call.where.OR).toBeDefined();
    expect(call).toMatchObject({ skip: 10, take: 10 });
    expect(call.orderBy).toEqual([{ createdAt: "desc" }, { id: "asc" }]);
  });

  it("selects none of the submitter's details, receipts or file links, and skips deleted plans", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await getBatchSummaries("u1", params());
    const select = mocks.findMany.mock.calls[0][0].select;
    for (const banned of [
      "submitter",
      "lasgReceiptUrl",
      "remitaReceiptUrl",
      "userPaymentRef",
      "totalAmount",
    ]) {
      expect(select).not.toHaveProperty(banned);
    }
    expect(select.plans.where).toEqual({ deleted: false });
    expect(select.plans.select).not.toHaveProperty("redCopyFileUrl");
    expect(select.plans.select).not.toHaveProperty("pillars");
  });

  it("shows a batch with no plans left as empty, not broken", async () => {
    mocks.findMany.mockResolvedValue([batch({ plans: [] })]);
    mocks.count.mockResolvedValue(1);
    const [summary] = (await getBatchSummaries("u1", params())).data;
    expect(summary).toMatchObject({
      planCount: 0,
      readyCount: 0,
      statusCounts: [],
    });
  });
});

describe("getBatchDetail", () => {
  it("lists each plan with its status, whether it can be handed in, and any queries", async () => {
    mocks.findFirst.mockResolvedValue(
      batch({
        plans: [
          detailPlan("0412"),
          detailPlan("0377", {
            chartingStatus: "QUERIED",
            chartingComment: "Closure outside tolerance.",
            chartingApprovedAt: new Date("2026-10-14T09:00:00Z"),
          }),
          detailPlan("0301", {
            status: "LODGED",
            physicalCopySubmitted: true,
            physicalCopySubmittedAt: new Date("2026-10-10T09:00:00Z"),
          }),
        ],
      })
    );

    const out = await getBatchDetail("u1", "b1");

    expect(out).toMatchObject({
      id: "b1",
      paymentLabel: "Approved",
      planCount: 3,
      readyCount: 1,
    });
    expect(
      out.plans.map((p) => [p.planNumber, p.displayStatus.code, p.ready])
    ).toEqual([
      ["LA/2026/0412", "READY_FOR_PHYSICAL", true],
      ["LA/2026/0377", "QUERIED", false],
      ["LA/2026/0301", "LODGED", false],
    ]);
    expect(out.plans[1].queries).toEqual([
      {
        stage: "charting",
        label: "Charting",
        comment: "Closure outside tolerance.",
        at: "2026-10-14T09:00:00.000Z",
      },
    ]);
    expect(out.plans[2].physicalCopySubmittedAt).toBe(
      "2026-10-10T09:00:00.000Z"
    );
    expect(out.plans[0].physicalCopySubmittedAt).toBeNull();
  });

  it("keeps the counts and the rows in agreement", async () => {
    mocks.findFirst.mockResolvedValue(
      batch({
        plans: [
          detailPlan("a"),
          detailPlan("b", { status: "LODGED" }),
          detailPlan("c"),
        ],
      })
    );
    const out = await getBatchDetail("u1", "b1");
    const fromRows = out.plans.filter(
      (p) => p.displayStatus.code === "READY_FOR_PHYSICAL"
    ).length;
    expect(out.readyCount).toBe(fromRows);
    expect(out.statusCounts.reduce((n, s) => n + s.count, 0)).toBe(
      out.planCount
    );
  });

  it("only finds the caller's own batch: someone else's is a 404", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getBatchDetail("u1", "b-other")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: "b-other",
      submittedBy: "u1",
    });
  });

  it("returns no personal details, receipts or stored file links", async () => {
    mocks.findFirst.mockResolvedValue(batch({ plans: [detailPlan("0412")] }));
    const out = await getBatchDetail("u1", "b1");
    const json = JSON.stringify(out);
    for (const banned of [
      "submitter",
      "email",
      "phone",
      "payer",
      "Receipt",
      "redCopyFileUrl",
      "http",
    ]) {
      expect(json).not.toContain(banned);
    }
    const select = mocks.findFirst.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("submitter");
    expect(select.plans.select).not.toHaveProperty("redCopyFileUrl");
  });
});
