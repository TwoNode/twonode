import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  batchCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findMany: mocks.findMany },
    certificateOfDepositBatch: { count: mocks.batchCount },
  },
}));

const { getPlanStats, BREAKDOWN_ROW_LIMIT } =
  await import("@/surfboard/services/planStatsService");
const { STATUS_FILTER_SCAN_LIMIT } =
  await import("@/surfboard/services/planSummaryService");
const { DISPLAY_STATUS_CODES } = await import("@/surfboard/utils/planStatus");
const { ValidationError } = await import("@/lib/api/errors");
const { parsePlanStatsQuery } =
  await import("@/surfboard/utils/planStatsQuery");

const noRange = {};

/** A plan as the stats query returns it: a submitted plan waiting on its reviews, unless overridden. */
const row = (over: Record<string, unknown> = {}) => ({
  planType: "APPROVED LAYOUT",
  facilitator: "Adeyemi & Partners",
  lga: "Eti-Osa",
  ward: "Ajah",
  lcda: "Ibeju",
  dateOnSurveyPlan: new Date("2026-09-12T00:00:00Z"),
  pillarType: "REGULAR",
  pillars: [{ pillarNumber: "PP1" }, { pillarNumber: "PP2" }],
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: null,
  chartingStatus: null,
  surconStatus: null,
  recordsIStatus: null,
  intakeStatus: null,
  recordsIIStatus: null,
  batch: { paymentStatus: "LASG_PAID" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMany.mockResolvedValue([]);
  mocks.batchCount.mockResolvedValue(0);
});

describe("getPlanStats", () => {
  it("reads the plans the Plans list would show, and the batches the Records tab calls Active", async () => {
    await getPlanStats("u1", {
      dateFrom: new Date("2026-01-01T00:00:00Z"),
      dateTo: new Date("2026-03-31T23:59:59.999Z"),
    });

    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      userId: "u1",
      deleted: false,
      AND: [
        {
          dateOnSurveyPlan: {
            gte: new Date("2026-01-01T00:00:00Z"),
            lte: new Date("2026-03-31T23:59:59.999Z"),
          },
        },
      ],
    });
    expect(query.take).toBe(STATUS_FILTER_SCAN_LIMIT + 1);
    expect(mocks.batchCount).toHaveBeenCalledWith({
      where: {
        submittedBy: "u1",
        plans: { some: { status: { not: "LODGED" } } },
      },
    });
  });

  it("asks only for the columns it counts: no geometry, parcels, file links or other people's details", async () => {
    await getPlanStats("u1", noRange);
    const select = mocks.findMany.mock.calls[0][0].select;
    expect(Object.keys(select).sort()).toEqual(
      [
        "accountsStatus",
        "batch",
        "chartingStatus",
        "dateOnSurveyPlan",
        "facilitator",
        "intakeStatus",
        "lcda",
        "lga",
        "physicalCopySubmitted",
        "pillarType",
        "pillars",
        "planType",
        "recordsIIStatus",
        "recordsIStatus",
        "redCopyStatus",
        "status",
        "surconStatus",
        "ward",
      ].sort()
    );
  });

  it("is all zeros, with every status present, for someone with no plans", async () => {
    const stats = await getPlanStats("u1", noRange);
    expect(stats).toMatchObject({
      total: 0,
      provisional: 0,
      undated: 0,
      pillars: { regular: 0, special: 0 },
      byMonth: [],
      activeBatches: 0,
    });
    expect(Object.keys(stats.byStatus).sort()).toEqual(
      [...DISPLAY_STATUS_CODES].sort()
    );
    expect(Object.values(stats.byStatus).every((n) => n === 0)).toBe(true);
    expect(stats.facilitators).toEqual({ rows: [], distinct: 0, missing: 0 });
  });

  it("counts provisional plans on their own, and leaves them out of everything else", async () => {
    mocks.findMany.mockResolvedValue([
      row(),
      row({ planType: "PROVISIONAL", facilitator: "Only Provisional Ltd" }),
      row({ planType: "PROVISIONAL LAYOUT", pillars: [{}, {}, {}] }),
    ]);
    const stats = await getPlanStats("u1", noRange);
    expect(stats.total).toBe(1);
    expect(stats.provisional).toBe(2);
    expect(stats.facilitators.rows.map((r) => r.key)).toEqual([
      "Adeyemi & Partners",
    ]);
    expect(stats.pillars).toEqual({ regular: 2, special: 0 });
    expect(stats.byMonth).toEqual([{ period: "2026-09", count: 1 }]);
  });

  it("gives one count per display status that adds up to the total", async () => {
    mocks.findMany.mockResolvedValue([
      row({ status: "LODGED" }),
      row({ status: "LODGED" }),
      row({ accountsStatus: "QUERIED" }),
      row({ redCopyStatus: "NOT_SUBMITTED", batch: null }),
      row({ physicalCopySubmitted: true }),
      row({ batch: { paymentStatus: "PENDING_USER_PAYMENT" } }),
      row({
        accountsStatus: "APPROVED",
        chartingStatus: "APPROVED",
        surconStatus: "APPROVED",
        recordsIStatus: "APPROVED",
      }),
      row(),
    ]);
    const { total, byStatus } = await getPlanStats("u1", noRange);
    expect(byStatus).toMatchObject({
      LODGED: 2,
      QUERIED: 1,
      NOT_SUBMITTED: 1,
      PHYSICAL_SUBMITTED: 1,
      PAYMENT_PENDING: 1,
      READY_FOR_PHYSICAL: 1,
      IN_REVIEW: 1,
      PARTLY_APPROVED: 0,
      SUBMISSION_FAILED: 0,
    });
    expect(Object.values(byStatus).reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(8);
  });

  it("groups places and facilitators ignoring capitals and spaces, under the most used spelling", async () => {
    mocks.findMany.mockResolvedValue([
      row({ facilitator: "Adeyemi & Partners", lga: "Eti-Osa" }),
      row({ facilitator: "ADEYEMI & PARTNERS", lga: "ETI-OSA" }),
      row({ facilitator: " Adeyemi & Partners ", lga: "Eti-Osa " }),
      row({ facilitator: "Bello Surveys", lga: "Ikeja" }),
      row({ facilitator: "Bello Surveys", lga: "Ikeja" }),
      row({ facilitator: "Bello Surveys", lga: "Ikeja" }),
      row({ facilitator: "Bello Surveys", lga: "Ikeja" }),
    ]);
    const stats = await getPlanStats("u1", noRange);
    expect(stats.facilitators.rows).toEqual([
      { key: "Bello Surveys", count: 4 },
      { key: "Adeyemi & Partners", count: 3 },
    ]);
    expect(stats.lgas.rows).toEqual([
      { key: "Ikeja", count: 4 },
      { key: "Eti-Osa", count: 3 },
    ]);
    expect(stats.lgas.distinct).toBe(2);
  });

  it("breaks a tie between spellings, and between rows, alphabetically", async () => {
    mocks.findMany.mockResolvedValue([
      row({ ward: "ajah" }),
      row({ ward: "Ajah" }),
      row({ ward: "Zango" }),
      row({ ward: "Abule" }),
    ]);
    const { wards } = await getPlanStats("u1", noRange);
    expect(wards.rows).toEqual([
      { key: "Ajah", count: 2 },
      { key: "Abule", count: 1 },
      { key: "Zango", count: 1 },
    ]);
  });

  it("counts plans with no value for a column as missing, not as a row", async () => {
    mocks.findMany.mockResolvedValue([
      row({ lcda: null }),
      row({ lcda: "" }),
      row({ lcda: "   " }),
      row({ lcda: "Ibeju" }),
    ]);
    const { lcdas } = await getPlanStats("u1", noRange);
    expect(lcdas).toEqual({
      rows: [{ key: "Ibeju", count: 1 }],
      distinct: 1,
      missing: 3,
    });
  });

  it("caps each breakdown but still says how many different values there are", async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: BREAKDOWN_ROW_LIMIT + 25 }, (_, i) =>
        row({ ward: `Ward ${String(i).padStart(3, "0")}` })
      )
    );
    const { wards } = await getPlanStats("u1", noRange);
    expect(wards.rows).toHaveLength(BREAKDOWN_ROW_LIMIT);
    expect(wards.distinct).toBe(BREAKDOWN_ROW_LIMIT + 25);
  });

  it("counts plans per month of the survey plan date (UTC), oldest first, and keeps undated plans out of the months", async () => {
    mocks.findMany.mockResolvedValue([
      row({ dateOnSurveyPlan: new Date("2026-10-01T00:00:00Z") }),
      row({ dateOnSurveyPlan: new Date("2026-09-30T23:59:59Z") }),
      row({ dateOnSurveyPlan: new Date("2026-09-01T00:00:00Z") }),
      row({ dateOnSurveyPlan: new Date("2025-12-31T00:00:00Z") }),
      row({ dateOnSurveyPlan: null }),
    ]);
    const stats = await getPlanStats("u1", noRange);
    expect(stats.byMonth).toEqual([
      { period: "2025-12", count: 1 },
      { period: "2026-09", count: 2 },
      { period: "2026-10", count: 1 },
    ]);
    expect(stats.undated).toBe(1);
    expect(stats.total).toBe(5);
  });

  it("counts pillars, not plans, and buckets them as the website does", async () => {
    mocks.findMany.mockResolvedValue([
      row({ pillarType: "REGULAR", pillars: [{}, {}, {}] }),
      row({ pillarType: "REGULAR + ADJOINING", pillars: [{}] }),
      row({ pillarType: "SPECIAL", pillars: [{}, {}] }),
      row({ pillarType: "RE-ESTABLISHMENT", pillars: [{}] }),
      row({ pillarType: "", pillars: [{}, {}] }),
      row({ pillarType: "REGULAR", pillars: null }),
    ]);
    expect((await getPlanStats("u1", noRange)).pillars).toEqual({
      regular: 4,
      special: 3,
    });
  });

  it("reports the active batch count whatever the date range", async () => {
    mocks.batchCount.mockResolvedValue(3);
    const stats = await getPlanStats("u1", {
      dateFrom: new Date("2020-01-01T00:00:00Z"),
    });
    expect(stats.activeBatches).toBe(3);
  });

  it("refuses to summarise a huge account instead of silently cutting it off", async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: STATUS_FILTER_SCAN_LIMIT + 1 }, () => row())
    );
    await expect(getPlanStats("u1", noRange)).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});

describe("parsePlanStatsQuery", () => {
  const parse = (query = "") => parsePlanStatsQuery(new URLSearchParams(query));

  it("has no range when none is asked for", () => {
    expect(parse()).toEqual({ dateFrom: undefined, dateTo: undefined });
  });

  it("reads a plain date as the whole day in UTC, as the plans list does", () => {
    expect(parse("dateFrom=2026-01-01&dateTo=2026-03-31")).toEqual({
      dateFrom: new Date("2026-01-01T00:00:00.000Z"),
      dateTo: new Date("2026-03-31T23:59:59.999Z"),
    });
  });

  it("accepts a start or an end on its own", () => {
    expect(parse("dateFrom=2026-01-01").dateTo).toBeUndefined();
    expect(parse("dateTo=2026-01-01").dateFrom).toBeUndefined();
  });

  it.each([
    "dateFrom=yesterday",
    "dateTo=2026-02-31",
    "dateFrom=2026-10-19&dateTo=2026-01-01",
  ])("refuses %s with a validation error", (query) => {
    expect(() => parse(query)).toThrow(ValidationError);
  });

  it("ignores everything but the range", () => {
    expect(parse("displayStatus=QUERIED&scope=shared-with-me")).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });
});
