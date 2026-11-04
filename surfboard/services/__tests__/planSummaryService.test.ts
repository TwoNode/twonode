import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  pillarIds: vi.fn(),
  columnIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findMany: mocks.findMany, count: mocks.count } },
}));
vi.mock("@/surfboard/services/analyticsService", () => ({
  PROVISIONAL_TYPES: ["PROVISIONAL", "PROVISIONAL LAYOUT"],
}));
vi.mock("@/surfboard/services/planSearchService", () => ({
  findPillarMatchIds: mocks.pillarIds,
  findColumnMatchIds: mocks.columnIds,
}));

const {
  buildSummaryWhere,
  getPlanCounts,
  getPlanSummaries,
  STATUS_FILTER_SCAN_LIMIT,
  toPlanSummary,
} = await import("@/surfboard/services/planSummaryService");
const { ValidationError } = await import("@/lib/api/errors");
const { queriedPlanWhere, readyPlanWhere } =
  await import("@/surfboard/utils/planStatus");
const { parsePlanSummaryQuery } =
  await import("@/surfboard/utils/planSummaryQuery");

const params = (query = "") =>
  parsePlanSummaryQuery(new URLSearchParams(query));

const RECORD_COPY =
  "https://bucket.s3.amazonaws.com/surfboard/u1/red/LA_0412.pdf";

/** A plan as the database returns it for the owner's list. */
const row = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  planNumber: "LA/2026/0412",
  surveyTitle: "Survey of land at Ajah",
  planType: "APPROVED LAYOUT",
  facilitator: "Adeyemi & Partners",
  lga: "Eti-Osa",
  ward: "Ajah",
  lcda: null,
  locality: "Ajah",
  state: "Lagos",
  dateOnSurveyPlan: new Date("2026-09-12T00:00:00Z"),
  dateLodged: null,
  createdAt: new Date("2026-09-13T08:00:00Z"),
  updatedAt: new Date("2026-10-01T08:00:00Z"),
  redCopyFileUrl: RECORD_COPY,
  sharedTo: ["user-2", "user-3"],
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
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
  batch: { paymentStatus: "LASG_PAID" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pillarIds.mockResolvedValue([]);
  mocks.columnIds.mockResolvedValue([]);
});

describe("toPlanSummary", () => {
  it("gives the owner the plan, its status and review states, without the stored file link", () => {
    const s = toPlanSummary(row() as never, "owner");
    expect(s).toMatchObject({
      id: "p1",
      planNumber: "LA/2026/0412",
      displayStatus: { code: "READY_FOR_PHYSICAL" },
      physicalCopySubmitted: false,
      hasRecordCopy: true,
      isOwner: true,
      sharedCount: 2,
      ownerName: null,
      dateOnSurveyPlan: "2026-09-12T00:00:00.000Z",
      dateLodged: null,
      stages: {
        accounts: "APPROVED",
        charting: "APPROVED",
        surcon: "APPROVED",
        recordsI: "APPROVED",
        intake: "PENDING",
        recordsII: "PENDING",
      },
    });
    const json = JSON.stringify(s);
    expect(json).not.toContain(RECORD_COPY);
    expect(json).not.toContain("user-2");
    expect(json).not.toContain("redCopyFileUrl");
    expect(json).not.toContain("sharedTo");
  });

  it("says who queried and why, with when, for the owner", () => {
    const s = toPlanSummary(
      row({
        chartingStatus: "QUERIED",
        chartingComment: "Closure outside tolerance.",
        chartingApprovedAt: new Date("2026-10-14T09:00:00Z"),
      }) as never,
      "owner"
    );
    expect(s.displayStatus).toEqual({
      code: "QUERIED",
      label: "Queried by Charting",
    });
    expect(s.queries).toEqual([
      {
        stage: "charting",
        label: "Charting",
        comment: "Closure outside tolerance.",
        at: "2026-10-14T09:00:00.000Z",
      },
    ]);
  });

  it("shows a record copy as missing when there is none", () => {
    expect(
      toPlanSummary(row({ redCopyFileUrl: null }) as never, "owner")
        .hasRecordCopy
    ).toBe(false);
  });

  it("gives a person the plan was shared with the status and the owner's name, and nothing else about the owner", () => {
    const shared = row({
      chartingStatus: "QUERIED",
      chartingComment: "Private reviewer note",
      batch: undefined,
      user: { firstName: "Ngozi", lastName: "Eze" },
    });
    const s = toPlanSummary(shared as never, "shared");
    expect(s).toMatchObject({
      isOwner: false,
      ownerName: "Ngozi Eze",
      sharedCount: 0,
      queries: [],
      hasRecordCopy: true,
    });
    expect(s.displayStatus.label).toBe("Queried by Charting");
    const json = JSON.stringify(s);
    expect(json).not.toContain("Private reviewer note");
    expect(json).not.toContain(RECORD_COPY);
    expect(json).not.toContain("user-2");
  });

  it("does not tell a viewer about the owner's payment: with no batch, an approved plan is not 'ready' or 'payment pending'", () => {
    expect(
      toPlanSummary(row({ batch: undefined }) as never, "shared").displayStatus
        .code
    ).toBe("IN_REVIEW");
    expect(
      toPlanSummary(
        row({
          batch: undefined,
          accountsStatus: "PENDING",
          chartingStatus: "PENDING",
          surconStatus: "PENDING",
          recordsIStatus: "PENDING",
        }) as never,
        "shared"
      ).displayStatus.code
    ).toBe("IN_REVIEW");
  });

  it("has no owner name when the owner has none", () => {
    expect(
      toPlanSummary(
        row({ user: { firstName: "", lastName: "" } }) as never,
        "shared"
      ).ownerName
    ).toBeNull();
  });
});

describe("buildSummaryWhere", () => {
  it("is just the caller's live plans when nothing is asked for", async () => {
    expect(await buildSummaryWhere("u1", params())).toEqual({
      userId: "u1",
      deleted: false,
    });
  });

  it("looks in plans shared with the caller for that scope", async () => {
    expect(
      await buildSummaryWhere("u1", params("scope=shared-with-me"))
    ).toEqual({
      sharedTo: { has: "u1" },
      deleted: false,
    });
  });

  it("searches number, title, facilitator, place and pillar numbers, within the caller's own plans", async () => {
    mocks.pillarIds.mockResolvedValue(["pa", "pb"]);
    const where = (await buildSummaryWhere("u1", params("search=Ajah"))) as {
      AND: { OR: Record<string, unknown>[] }[];
    };
    expect(mocks.pillarIds).toHaveBeenCalledWith("Ajah", "u1", "mine");
    const clauses = where.AND[0].OR;
    const like = { contains: "Ajah", mode: "insensitive" };
    expect(clauses).toEqual(
      expect.arrayContaining([
        { planNumber: like },
        { surveyTitle: like },
        { facilitator: like },
        { lga: like },
        { ward: like },
        { lcda: like },
        { locality: like },
        { id: { in: ["pa", "pb"] } },
      ])
    );
  });

  it("does not add a pillar clause when no pillar matched, and asks the shared scope for shared plans", async () => {
    const where = (await buildSummaryWhere(
      "u1",
      params("scope=shared-with-me&search=PP12")
    )) as { AND: { OR: Record<string, unknown>[] }[] };
    expect(mocks.pillarIds).toHaveBeenCalledWith(
      "PP12",
      "u1",
      "shared-with-me"
    );
    expect(where.AND[0].OR.some((c) => "id" in c)).toBe(false);
  });

  it("filters by type, provisional, facilitator, place and survey date", async () => {
    mocks.columnIds.mockImplementation(async (column: string) => [
      `${column}-1`,
      `${column}-2`,
    ]);
    const where = (await buildSummaryWhere(
      "u1",
      params(
        "planType=DEED&provisional=exclude&facilitator=Adeyemi&lga=Eti-Osa&ward=Ajah&lcda=Ibeju&dateFrom=2026-01-01&dateTo=2026-10-19"
      )
    )) as { AND: unknown[] };
    expect(where.AND).toEqual([
      { planType: { in: ["DEED"] } },
      { planType: { notIn: ["PROVISIONAL", "PROVISIONAL LAYOUT"] } },
      { id: { in: ["facilitator-1", "facilitator-2"] } },
      { id: { in: ["lga-1", "lga-2"] } },
      { id: { in: ["ward-1", "ward-2"] } },
      { id: { in: ["lcda-1", "lcda-2"] } },
      {
        dateOnSurveyPlan: {
          gte: new Date("2026-01-01T00:00:00.000Z"),
          lte: new Date("2026-10-19T23:59:59.999Z"),
        },
      },
    ]);
  });

  it("matches a facilitator or place exactly, ignoring capitals and spaces, within the same scope", async () => {
    await buildSummaryWhere("u1", params("facilitator=Adeyemi&ward=Ajah"));
    expect(mocks.columnIds).toHaveBeenCalledWith(
      "facilitator",
      "Adeyemi",
      "u1",
      "mine"
    );
    expect(mocks.columnIds).toHaveBeenCalledWith("ward", "Ajah", "u1", "mine");
    expect(mocks.columnIds).toHaveBeenCalledTimes(2);

    mocks.columnIds.mockClear();
    await buildSummaryWhere("u1", params("scope=shared-with-me&lga=Eti-Osa"));
    expect(mocks.columnIds).toHaveBeenCalledWith(
      "lga",
      "Eti-Osa",
      "u1",
      "shared-with-me"
    );
  });

  it("matches nothing, rather than everything, when no plan has that value", async () => {
    mocks.columnIds.mockResolvedValue([]);
    const where = (await buildSummaryWhere("u1", params("lga=Nowhere"))) as {
      AND: unknown[];
    };
    expect(where.AND).toEqual([{ id: { in: [] } }]);
  });

  it("does not look anything up when no exact filter is asked for", async () => {
    await buildSummaryWhere("u1", params("planType=DEED"));
    expect(mocks.columnIds).not.toHaveBeenCalled();
  });

  it("can ask for provisional plans only", async () => {
    const where = (await buildSummaryWhere(
      "u1",
      params("provisional=only")
    )) as {
      AND: unknown[];
    };
    expect(where.AND).toEqual([
      { planType: { in: ["PROVISIONAL", "PROVISIONAL LAYOUT"] } },
    ]);
  });
});

describe("getPlanSummaries without a status filter", () => {
  it("lets the database page the list, newest first with a stable tie-break", async () => {
    mocks.findMany.mockResolvedValue([row({ id: "a" }), row({ id: "b" })]);
    mocks.count.mockResolvedValue(45);

    const out = await getPlanSummaries("u1", params("page=2&pageSize=20"));

    const call = mocks.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ userId: "u1", deleted: false });
    expect(call.orderBy).toEqual([{ createdAt: "desc" }, { id: "asc" }]);
    expect(call).toMatchObject({ skip: 20, take: 20 });
    expect(out.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
    expect(out.data.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("selects only what the summary needs: no geometry, pillars, parcels or file arrays", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await getPlanSummaries("u1", params());
    const select = mocks.findMany.mock.calls[0][0].select;
    for (const heavy of [
      "geometry",
      "pillars",
      "parcels",
      "pdfFilePaths",
      "cadFilePaths",
      "certificateFilePaths",
    ]) {
      expect(select).not.toHaveProperty(heavy);
    }
    expect(select).toHaveProperty("batch");
  });

  it("sorts plans with no survey date last", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await getPlanSummaries(
      "u1",
      params("sortField=dateOnSurveyPlan&sortOrder=desc")
    );
    expect(mocks.findMany.mock.calls[0][0].orderBy[0]).toEqual({
      dateOnSurveyPlan: { sort: "desc", nulls: "last" },
    });
  });

  it("reads shared plans without the batch and with the owner's name", async () => {
    mocks.findMany.mockResolvedValue([
      row({
        id: "s1",
        batch: undefined,
        user: { firstName: "Ngozi", lastName: "Eze" },
      }),
    ]);
    mocks.count.mockResolvedValue(1);
    const out = await getPlanSummaries("u1", params("scope=shared-with-me"));
    const call = mocks.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ sharedTo: { has: "u1" }, deleted: false });
    expect(call.select).not.toHaveProperty("batch");
    expect(call.select.user).toEqual({
      select: { firstName: true, lastName: true },
    });
    expect(out.data[0]).toMatchObject({
      isOwner: false,
      ownerName: "Ngozi Eze",
    });
  });
});

describe("getPlanSummaries with a status filter", () => {
  /** The cheap columns of one plan, as the first query returns them. */
  const candidate = (id: string, over: Record<string, unknown> = {}) => ({
    id,
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

  it("keeps the plans whose status matches, in the requested order, and loads only the page", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        candidate("a", { status: "LODGED" }),
        candidate("b", { chartingStatus: "QUERIED" }),
        candidate("c"),
        candidate("d", { surconStatus: "QUERIED" }),
        candidate("e", { intakeStatus: "QUERIED", redCopyStatus: "QUERIED" }),
      ])
      .mockResolvedValueOnce([
        // The database does not promise the order of an `in` query.
        row({ id: "e", intakeStatus: "QUERIED", redCopyStatus: "QUERIED" }),
        row({ id: "b", chartingStatus: "QUERIED" }),
      ]);

    const out = await getPlanSummaries(
      "u1",
      params("displayStatus=QUERIED&pageSize=2&page=2")
    );

    // b, d, e are queried; page 2 of size 2 is just e.
    expect(out.pagination).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(out.data.map((p) => p.id)).toEqual(["e"]);
    expect(mocks.findMany.mock.calls[1][0].where).toEqual({
      id: { in: ["e"] },
    });
    // No separate count query: the total is what matched.
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("returns the page in the order of the first query, not the second", async () => {
    mocks.findMany
      .mockResolvedValueOnce([candidate("x"), candidate("y"), candidate("z")])
      .mockResolvedValueOnce([
        row({ id: "z" }),
        row({ id: "x" }),
        row({ id: "y" }),
      ]);
    const out = await getPlanSummaries("u1", params("displayStatus=IN_REVIEW"));
    expect(out.data.map((p) => p.id)).toEqual(["x", "y", "z"]);
  });

  it("accepts several statuses", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        candidate("a", { status: "LODGED" }),
        candidate("b"),
        candidate("c", { physicalCopySubmitted: true }),
      ])
      .mockResolvedValueOnce([row({ id: "a" }), row({ id: "c" })]);
    const out = await getPlanSummaries(
      "u1",
      params("displayStatus=LODGED,PHYSICAL_SUBMITTED")
    );
    expect(out.pagination.total).toBe(2);
    expect(mocks.findMany.mock.calls[1][0].where).toEqual({
      id: { in: ["a", "c"] },
    });
  });

  it("returns an empty page without a second query when nothing matches", async () => {
    mocks.findMany.mockResolvedValueOnce([candidate("a"), candidate("b")]);
    const out = await getPlanSummaries("u1", params("displayStatus=QUERIED"));
    expect(out.data).toEqual([]);
    expect(out.pagination).toMatchObject({ total: 0, page: 1, totalPages: 1 });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last page when the requested page is past the end", async () => {
    mocks.findMany
      .mockResolvedValueOnce([candidate("a"), candidate("b"), candidate("c")])
      .mockResolvedValueOnce([row({ id: "c" })]);
    const out = await getPlanSummaries(
      "u1",
      params("displayStatus=IN_REVIEW&pageSize=2&page=9")
    );
    expect(out.pagination).toMatchObject({ page: 2, total: 3 });
    expect(out.data.map((p) => p.id)).toEqual(["c"]);
  });

  it("reads each plan's status including the batch for the owner, and without it for a share", async () => {
    mocks.findMany.mockResolvedValue([]);
    await getPlanSummaries("u1", params("displayStatus=QUERIED"));
    expect(mocks.findMany.mock.calls[0][0].select).toHaveProperty("batch");
    mocks.findMany.mockClear();
    mocks.findMany.mockResolvedValue([]);
    await getPlanSummaries(
      "u1",
      params("displayStatus=QUERIED&scope=shared-with-me")
    );
    expect(mocks.findMany.mock.calls[0][0].select).not.toHaveProperty("batch");
  });

  it("refuses to scan a huge account instead of silently cutting the list", async () => {
    mocks.findMany.mockResolvedValueOnce(
      Array.from({ length: STATUS_FILTER_SCAN_LIMIT + 1 }, (_, i) =>
        candidate(`p${i}`)
      )
    );
    await expect(
      getPlanSummaries("u1", params("displayStatus=QUERIED"))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.findMany.mock.calls[0][0].take).toBe(
      STATUS_FILTER_SCAN_LIMIT + 1
    );
  });
});

describe("getPlanCounts", () => {
  it("counts own, shared, queried and ready plans with the shared rules", async () => {
    mocks.count
      .mockResolvedValueOnce(128)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(3);

    expect(await getPlanCounts("u1")).toEqual({
      mine: 128,
      sharedWithMe: 4,
      queried: 6,
      readyForPhysicalSubmission: 3,
    });

    const wheres = mocks.count.mock.calls.map((c) => c[0].where);
    expect(wheres[0]).toEqual({ userId: "u1", deleted: false });
    expect(wheres[1]).toEqual({ sharedTo: { has: "u1" }, deleted: false });
    expect(wheres[2]).toEqual({
      userId: "u1",
      deleted: false,
      ...queriedPlanWhere,
    });
    expect(wheres[3]).toEqual({
      userId: "u1",
      deleted: false,
      ...readyPlanWhere,
    });
  });
});
