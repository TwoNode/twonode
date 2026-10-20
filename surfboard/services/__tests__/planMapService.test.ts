import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findMany: mocks.findMany, count: mocks.count } },
}));

const { getPlanMap, MAP_PLAN_LIMIT } =
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
  planNumber: "LA/2026/0412",
  surveyTitle: "Survey of land at Ajah",
  state: "Lagos",
  lga: "Eti-Osa",
  locality: "Ajah",
  geometry: SQUARE,
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
  it("asks for the caller's own plans that are not deleted, most recently changed first, up to the limit", async () => {
    await getPlanMap("owner-1");
    const call = mocks.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ userId: "owner-1", deleted: false });
    expect(call.orderBy).toEqual([{ updatedAt: "desc" }, { id: "asc" }]);
    expect(call.take).toBe(MAP_PLAN_LIMIT);
    // The total counts the same plans.
    expect(mocks.count).toHaveBeenCalledWith({
      where: { userId: "owner-1", deleted: false },
    });
  });

  it("reads exactly what the map needs: no pillars, file links, share list, comments or other people's details", async () => {
    await getPlanMap("owner-1");
    const { select } = mocks.findMany.mock.calls[0][0];
    expect(Object.keys(select).sort()).toEqual(
      [
        "id",
        "planNumber",
        "surveyTitle",
        "state",
        "lga",
        "locality",
        "geometry",
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
      simplifiedGeometry: SQUARE,
    });
    expect(plan.areaSqM).toBeGreaterThan(1090);
    expect(plan.areaSqM).toBeLessThan(1120);
    expect(plan.centroid.lat).toBeCloseTo(6.50015, 8);
    expect(plan.centroid.lng).toBeCloseTo(3.40015, 8);
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
