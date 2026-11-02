import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  users: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: mocks.queryRaw,
    surfboardPlan: { findMany: mocks.findMany, count: mocks.count },
    surfboardUser: { findMany: mocks.users },
  },
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  requireActiveSubscription: vi.fn(),
}));
vi.mock("@/surfboard/services/analyticsService", () => ({
  PROVISIONAL_TYPES: [],
}));
vi.mock("@/utils/email", () => ({ sendPlanShareInviteEmail: vi.fn() }));
vi.mock("@/lib/auth/userLookup", () => ({ emailInUse: vi.fn() }));

const {
  getPaginatedSurfPlans,
  getAllSharedSurfPlans,
  getSharedWithMeSurfPlans,
} = await import("@/surfboard/services/planService");

type Row = { id: string; userId: string; sharedTo: string[] };

/**
 * A stand-in for the plans table. Six hundred plans of other surveyors carry a
 * pillar that matches the search term and come first; the caller's own plan comes
 * last. A query that is not limited to the caller keeps only the first 500 rows,
 * as the website's old search did, so it never reaches the caller's plan.
 */
function fakeTable(owner: string) {
  const rows: Row[] = [
    ...Array.from({ length: 600 }, (_, i) => ({
      id: `other-${i}`,
      userId: "someone-else",
      sharedTo: i === 0 ? [owner] : [],
    })),
    { id: "mine-1", userId: owner, sharedTo: ["friend"] },
  ];
  mocks.queryRaw.mockImplementation(async (strings, ...values) => {
    const sql = (strings as TemplateStringsArray).join("?");
    const unlimited = !sql.includes(`"userId" =`) && !sql.includes("ANY(");
    let found = rows;
    if (sql.includes(`"userId" =`)) {
      found = rows.filter((r) => r.userId === values[0]);
    } else if (sql.includes("ANY(")) {
      found = rows.filter((r) => r.sharedTo.includes(values[0] as string));
    }
    return (unlimited ? found.slice(0, 500) : found).map((r) => ({ id: r.id }));
  });
}

/** The ids a list asked the plans table for through its pillar-number clause. */
function pillarIdsInWhere(): string[] {
  const where = mocks.findMany.mock.calls[0][0].where;
  const clause = (where.OR as { id?: { in: string[] } }[]).find((c) => c.id);
  return clause?.id?.in ?? [];
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
  mocks.users.mockResolvedValue([]);
});

describe("the website's plan lists search pillar numbers inside the caller's plans (I-045)", () => {
  it("finds the caller's own plan for a common term even when hundreds of other surveyors' plans match first", async () => {
    fakeTable("u1");
    await getPaginatedSurfPlans("u1", { filters: { search: "PP 1" } });
    expect(pillarIdsInWhere()).toEqual(["mine-1"]);
  });

  it("does the same for the plans the caller has shared with others", async () => {
    fakeTable("u1");
    await getAllSharedSurfPlans("u1", 1, 10, { search: "PP 1" });
    expect(pillarIdsInWhere()).toEqual(["mine-1"]);
  });

  it("searches the plans shared with the caller, not everyone's, for that list", async () => {
    fakeTable("u1");
    await getSharedWithMeSurfPlans("u1", 1, 10, { search: "PP 1" });
    expect(pillarIdsInWhere()).toEqual(["other-0"]);
  });

  it("never lets another surveyor's plan id into a list through the pillar clause", async () => {
    fakeTable("u1");
    await getPaginatedSurfPlans("u1", { filters: { search: "PP 1" } });
    expect(pillarIdsInWhere().some((id) => id.startsWith("other-"))).toBe(
      false
    );
    // The owner filter is still on the query itself.
    expect(mocks.findMany.mock.calls[0][0].where).toMatchObject({
      userId: "u1",
      deleted: false,
    });
  });

  it("makes no pillar query when there is no search term", async () => {
    fakeTable("u1");
    await getPaginatedSurfPlans("u1", {});
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });
});
