import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findMany: mocks.findMany, count: mocks.count } },
}));

const { getPlanMap, getMapPillars, readPillars, MAP_PLAN_LIMIT } =
  await import("@/surfboard/services/planMapService");

// About 33 m by 33 m near Lagos, so roughly 1,100 square metres.
const SQUARE = {
  type: "Polygon",
  coordinates: [
    [
      [3.4, 6.5],
      [3.4003, 6.5],
      [3.4003, 6.5003],
      [3.4, 6.5003],
      [3.4, 6.5],
    ],
  ],
};

/** A plan as the database returns it for the map's select. */
const row = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  // The caller's own plan unless a test says another surveyor owns it.
  userId: "owner-1",
  user: { firstName: "Ada", lastName: "Owner" },
  planNumber: "LA/2026/0412",
  surveyTitle: "Survey of land at Ajah",
  state: "Lagos",
  lga: "Eti-Osa",
  locality: "Ajah",
  geometry: SQUARE,
  dateOnSurveyPlan: new Date("2026-09-12T00:00:00Z"),
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
  batch: { paymentStatus: "LASG_PAID" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMany.mockResolvedValue([row()]);
  mocks.count.mockResolvedValue(1);
});

describe("getPlanMap: what is read", () => {
  it("asks for the caller's own plans and the ones shared with them that are not deleted, most recently changed first, up to the limit", async () => {
    await getPlanMap("owner-1");
    const call = mocks.findMany.mock.calls[0][0];
    const where = {
      OR: [{ userId: "owner-1" }, { sharedTo: { has: "owner-1" } }],
      deleted: false,
    };
    expect(call.where).toEqual(where);
    expect(call.orderBy).toEqual([{ updatedAt: "desc" }, { id: "asc" }]);
    expect(call.take).toBe(MAP_PLAN_LIMIT);
    // The total counts the same plans.
    expect(mocks.count).toHaveBeenCalledWith({ where });
  });

  it("reads exactly what the map needs: no pillars, file links, share list, comments or other people's details", async () => {
    await getPlanMap("owner-1");
    const { select } = mocks.findMany.mock.calls[0][0];
    expect(Object.keys(select).sort()).toEqual(
      [
        "id",
        // Who owns it, and the owner's name for a plan seen through a share.
        "userId",
        "user",
        "planNumber",
        "surveyTitle",
        "state",
        "lga",
        "locality",
        "geometry",
        "dateOnSurveyPlan",
        // What the status is worked out from, with the owner's own batch.
        "status",
        "redCopyStatus",
        "physicalCopySubmitted",
        "accountsStatus",
        "chartingStatus",
        "surconStatus",
        "recordsIStatus",
        "intakeStatus",
        "recordsIIStatus",
        "batch",
      ].sort()
    );
    expect(select.batch).toEqual({ select: { paymentStatus: true } });
    // The owner's name and nothing else about them.
    expect(select.user).toEqual({
      select: { firstName: true, lastName: true },
    });
  });
});

describe("getPlanMap: what is returned", () => {
  it("gives each plan its status, place, area, centre and outline, and nothing else", async () => {
    const { plans } = await getPlanMap("owner-1");
    expect(plans).toHaveLength(1);
    const plan = plans[0];
    expect(Object.keys(plan).sort()).toEqual(
      [
        "id",
        "planNumber",
        "surveyTitle",
        "displayStatus",
        "state",
        "lga",
        "locality",
        "areaSqM",
        "isOwner",
        "ownerName",
        "dateOnSurveyPlan",
        "centroid",
        "simplifiedGeometry",
      ].sort()
    );
    expect(plan).toMatchObject({
      id: "p1",
      planNumber: "LA/2026/0412",
      surveyTitle: "Survey of land at Ajah",
      displayStatus: {
        code: "READY_FOR_PHYSICAL",
        label: "Ready for physical submission",
      },
      state: "Lagos",
      lga: "Eti-Osa",
      locality: "Ajah",
      dateOnSurveyPlan: "2026-09-12T00:00:00.000Z",
      simplifiedGeometry: SQUARE,
    });
    expect(plan.areaSqM).toBeGreaterThan(1090);
    expect(plan.areaSqM).toBeLessThan(1120);
    expect(plan.centroid.lat).toBeCloseTo(6.50015, 8);
    expect(plan.centroid.lng).toBeCloseTo(3.40015, 8);
  });

  it("says null for a plan with no survey plan date, so the card can put it last", async () => {
    mocks.findMany.mockResolvedValue([row({ dateOnSurveyPlan: null })]);
    const { plans } = await getPlanMap("owner-1");
    expect(plans[0].dateOnSurveyPlan).toBeNull();
  });

  it("gives the coordinates as stored: the display correction is the map's job", async () => {
    const { plans } = await getPlanMap("owner-1");
    // The stored square, not moved by the seven metres Lagos is drawn off by.
    expect(plans[0].simplifiedGeometry).toEqual(SQUARE);
  });

  it("works each status out with the owner's own batch", async () => {
    mocks.findMany.mockResolvedValue([
      row({ id: "paid" }),
      row({
        id: "unpaid",
        batch: { paymentStatus: "PENDING_USER_PAYMENT" },
      }),
      row({
        id: "queried",
        chartingStatus: "QUERIED",
        accountsStatus: "PENDING",
      }),
      row({ id: "lodged", status: "LODGED", redCopyStatus: "APPROVED" }),
      row({ id: "draft", redCopyStatus: "NOT_SUBMITTED", batch: null }),
    ]);
    mocks.count.mockResolvedValue(5);
    const { plans } = await getPlanMap("owner-1");
    expect(plans.map((p) => [p.id, p.displayStatus.code])).toEqual([
      ["paid", "READY_FOR_PHYSICAL"],
      ["unpaid", "PAYMENT_PENDING"],
      ["queried", "QUERIED"],
      ["lodged", "LODGED"],
      ["draft", "NOT_SUBMITTED"],
    ]);
  });

  it("says a plan is the caller's own, and names nobody for it", async () => {
    const { plans } = await getPlanMap("owner-1");
    expect(plans[0]).toMatchObject({ isOwner: true, ownerName: null });
    // Not even the caller's own name is sent back as a "shared by".
    expect(JSON.stringify(plans)).not.toContain("Ada");
  });

  it("includes a plan shared with the caller, says so, and says who shared it", async () => {
    mocks.findMany.mockResolvedValue([
      row({ id: "mine" }),
      row({
        id: "theirs",
        userId: "owner-2",
        user: { firstName: "Tunde", lastName: "Okafor" },
      }),
    ]);
    mocks.count.mockResolvedValue(2);
    const { plans, total } = await getPlanMap("owner-1");
    expect(total).toBe(2);
    expect(plans.map((p) => [p.id, p.isOwner, p.ownerName])).toEqual([
      ["mine", true, null],
      ["theirs", false, "Tunde Okafor"],
    ]);
  });

  it("names a shared plan's owner by what is known of them, or says null", async () => {
    mocks.findMany.mockResolvedValue([
      row({
        id: "first",
        userId: "o2",
        user: { firstName: "Tunde", lastName: null },
      }),
      row({ id: "none", userId: "o3", user: { firstName: "", lastName: "" } }),
      row({ id: "gone", userId: "o4", user: null }),
    ]);
    mocks.count.mockResolvedValue(3);
    const { plans } = await getPlanMap("owner-1");
    expect(plans.map((p) => p.ownerName)).toEqual(["Tunde", null, null]);
    expect(plans.every((p) => !p.isOwner)).toBe(true);
  });

  it("works a shared plan's status out without the owner's batch, so the owner's payment state is not learned", async () => {
    mocks.findMany.mockResolvedValue([
      // Unpaid: the owner sees "payment pending"; a shared viewer must not.
      row({ id: "own", batch: { paymentStatus: "PENDING_USER_PAYMENT" } }),
      row({
        id: "shared",
        userId: "owner-2",
        batch: { paymentStatus: "PENDING_USER_PAYMENT" },
      }),
      // The same plan with no batch at all, which is how a shared one is read.
      row({ id: "nobatch", userId: "owner-2", batch: null }),
    ]);
    mocks.count.mockResolvedValue(3);
    const { plans } = await getPlanMap("owner-1");
    const code = (id: string) =>
      plans.find((p) => p.id === id)?.displayStatus.code;
    expect(code("own")).toBe("PAYMENT_PENDING");
    expect(code("shared")).not.toBe("PAYMENT_PENDING");
    expect(code("shared")).toBe(code("nobatch"));
  });

  it("keeps a place that is missing as null", async () => {
    mocks.findMany.mockResolvedValue([
      row({ state: null, lga: null, locality: null }),
    ]);
    const { plans } = await getPlanMap("owner-1");
    expect(plans[0]).toMatchObject({ state: null, lga: null, locality: null });
  });

  it("reads a boundary kept as JSON text", async () => {
    mocks.findMany.mockResolvedValue([
      row({ geometry: JSON.stringify(SQUARE) }),
    ]);
    const { plans, withoutOutline } = await getPlanMap("owner-1");
    expect(withoutOutline).toBe(0);
    expect(plans[0].simplifiedGeometry).toEqual(SQUARE);
  });

  it("draws a plan made of several polygons, with its centre", async () => {
    mocks.findMany.mockResolvedValue([
      row({
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            SQUARE.coordinates,
            [
              [
                [3.401, 6.5],
                [3.4013, 6.5],
                [3.4013, 6.5003],
                [3.401, 6.5],
              ],
            ],
          ],
        },
      }),
    ]);
    const { plans } = await getPlanMap("owner-1");
    expect(plans[0].simplifiedGeometry.type).toBe("MultiPolygon");
    expect(plans[0].centroid.lng).toBeGreaterThan(3.4);
  });
});

describe("getPlanMap: plans that cannot be drawn", () => {
  it("leaves them out and says how many, so the map cannot look complete when it is not", async () => {
    mocks.findMany.mockResolvedValue([
      row({ id: "ok" }),
      row({ id: "text", geometry: "not geometry" }),
      row({
        id: "point",
        geometry: { type: "Point", coordinates: [3.4, 6.5] },
      }),
      row({
        id: "line",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [3.4, 6.5],
              [3.5, 6.5],
              [3.4, 6.5],
            ],
          ],
        },
      }),
    ]);
    mocks.count.mockResolvedValue(4);
    const result = await getPlanMap("owner-1");
    expect(result.plans.map((p) => p.id)).toEqual(["ok"]);
    expect(result.withoutOutline).toBe(3);
    expect(result.total).toBe(4);
    expect(result.truncated).toBe(false);
  });

  it("does not write a word to the log for a bad boundary", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findMany.mockResolvedValue([row({ geometry: "garbage" })]);
    await getPlanMap("owner-1");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("getPlanMap: totals", () => {
  it("is an empty map for someone with no plans", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    expect(await getPlanMap("owner-1")).toEqual({
      plans: [],
      total: 0,
      withoutOutline: 0,
      truncated: false,
    });
  });

  it("says when there are more plans than were read", async () => {
    mocks.count.mockResolvedValue(MAP_PLAN_LIMIT + 5);
    const result = await getPlanMap("owner-1");
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(MAP_PLAN_LIMIT + 5);
  });

  it("is not cut when the account has exactly as many plans as the limit", async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: MAP_PLAN_LIMIT }, (_, i) => row({ id: `p${i}` }))
    );
    mocks.count.mockResolvedValue(MAP_PLAN_LIMIT);
    const result = await getPlanMap("owner-1");
    expect(result.plans).toHaveLength(MAP_PLAN_LIMIT);
    expect(result.truncated).toBe(false);
  });
});

describe("readPillars", () => {
  it("keeps a pillar with a number and finite coordinates, and says which polygon it is in", () => {
    expect(
      readPillars([
        {
          pillarNumber: "PBN 1",
          easting: 549432.5,
          northing: 710699.25,
          polygonIndex: 1,
        },
        { pillarNumber: 7, easting: "549433", northing: "710700" },
      ])
    ).toEqual([
      {
        pillarNumber: "PBN 1",
        easting: 549432.5,
        northing: 710699.25,
        polygonIndex: 1,
      },
      { pillarNumber: "7", easting: 549433, northing: 710700, polygonIndex: 0 },
    ]);
  });

  it("drops what cannot be drawn instead of passing it on", () => {
    expect(
      readPillars([
        null,
        "PP1",
        { easting: 1, northing: 2 },
        { pillarNumber: "  ", easting: 1, northing: 2 },
        { pillarNumber: "PP2", easting: "x", northing: 2 },
        { pillarNumber: "PP3", easting: 1 },
        { pillarNumber: "PP4", easting: Infinity, northing: 2 },
        { pillarNumber: "PP5", easting: 5, northing: 6, polygonIndex: -1 },
        { pillarNumber: "PP6", easting: 5, northing: 6, polygonIndex: 1.5 },
      ])
    ).toEqual([
      { pillarNumber: "PP5", easting: 5, northing: 6, polygonIndex: 0 },
      { pillarNumber: "PP6", easting: 5, northing: 6, polygonIndex: 0 },
    ]);
  });

  it("is empty for a column that is not an array", () => {
    expect(readPillars(null)).toEqual([]);
    expect(readPillars({ pillarNumber: "PP1" })).toEqual([]);
  });
});

describe("getMapPillars", () => {
  const pillarRow = (id: string, count = 3) => ({
    id,
    pillars: Array.from({ length: count }, (_, i) => ({
      pillarNumber: `PP${i + 1}`,
      easting: 549000 + i,
      northing: 710000 + i,
    })),
  });

  it("asks for the caller's own plans and the ones shared with them that are not deleted, and only for what it sends", async () => {
    mocks.findMany.mockResolvedValue([]);
    await getMapPillars("owner-1", ["a", "b"]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userId: "owner-1" }, { sharedTo: { has: "owner-1" } }],
        deleted: false,
        id: { in: ["a", "b"] },
      },
      select: { id: true, pillars: true },
    });
  });

  it("answers in the order the ids were asked for", async () => {
    mocks.findMany.mockResolvedValue([pillarRow("b"), pillarRow("a")]);
    const { plans } = await getMapPillars("owner-1", ["a", "b"]);
    expect(plans.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("leaves out a plan with no usable pillar, as it does a plan that is not the caller's", async () => {
    mocks.findMany.mockResolvedValue([
      pillarRow("a"),
      { id: "b", pillars: [] },
      { id: "c", pillars: [{ nonsense: true }] },
    ]);
    const { plans } = await getMapPillars("owner-1", [
      "a",
      "b",
      "c",
      "mine-not",
    ]);
    expect(plans.map((p) => p.id)).toEqual(["a"]);
  });

  it("does not read the database for no ids", async () => {
    expect(await getMapPillars("owner-1", [])).toEqual({ plans: [] });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
