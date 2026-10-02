import { beforeEach, describe, expect, it, vi } from "vitest";

/** getTopSurveyors: ranking by plan count, counted like the Total Plans card, admin-only. */

const mockPrisma = vi.hoisted(() => ({
  surfboardPlan: { groupBy: vi.fn() },
  surfboardUser: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getTopSurveyors } =
  await import("@/surfboard/services/analyticsService");
const { SurfboardRole } = await import("@/utils/platform");
const { ForbiddenError } = await import("@/lib/api/errors");

const admin = { role: SurfboardRole.ADMIN, userId: "admin-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTopSurveyors", () => {
  it("refuses a surveyor — the ranking is whole-platform", async () => {
    await expect(
      getTopSurveyors({ role: SurfboardRole.USER, userId: "u1" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockPrisma.surfboardPlan.groupBy).not.toHaveBeenCalled();
  });

  it("counts like the Total Plans card: no deleted plans, no provisional types, no unowned plans", async () => {
    mockPrisma.surfboardPlan.groupBy.mockResolvedValue([]);
    await getTopSurveyors(admin);
    const args = mockPrisma.surfboardPlan.groupBy.mock.calls[0][0];
    expect(args.by).toEqual(["userId"]);
    expect(args.where).toMatchObject({
      deleted: false,
      userId: { not: null },
      planType: { notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"] },
    });
    expect(mockPrisma.surfboardUser.findMany).not.toHaveBeenCalled();
  });

  it("filters on the survey-plan date when a range is given", async () => {
    mockPrisma.surfboardPlan.groupBy.mockResolvedValue([]);
    const from = new Date("2026-01-01");
    await getTopSurveyors(admin, 5, { from });
    expect(
      mockPrisma.surfboardPlan.groupBy.mock.calls[0][0].where.dateOnSurveyPlan
    ).toEqual({ gte: from });
  });

  it("returns names with counts, most plans first, capped at the limit, ties by name", async () => {
    mockPrisma.surfboardPlan.groupBy.mockResolvedValue([
      { userId: "b", _count: { id: 7 } },
      { userId: "a", _count: { id: 7 } },
      { userId: "c", _count: { id: 12 } },
      { userId: "d", _count: { id: 1 } },
    ]);
    mockPrisma.surfboardUser.findMany.mockResolvedValue([
      {
        id: "a",
        firstName: "Ada",
        lastName: "Okoro",
        companyName: "Okoro Surveys",
      },
      { id: "b", firstName: "Bayo", lastName: "Ade", companyName: null },
      { id: "c", firstName: "Chi", lastName: "Eze", companyName: "Eze & Co" },
      { id: "d", firstName: "Dee", lastName: "Ola", companyName: null },
    ]);

    const rows = await getTopSurveyors(admin, 3);

    expect(rows).toEqual([
      { userId: "c", name: "Chi Eze", companyName: "Eze & Co", count: 12 },
      {
        userId: "a",
        name: "Ada Okoro",
        companyName: "Okoro Surveys",
        count: 7,
      },
      { userId: "b", name: "Bayo Ade", companyName: null, count: 7 },
    ]);
  });

  it("does not drop a surveyor whose account is gone — it shows as unknown", async () => {
    mockPrisma.surfboardPlan.groupBy.mockResolvedValue([
      { userId: "ghost", _count: { id: 2 } },
    ]);
    mockPrisma.surfboardUser.findMany.mockResolvedValue([]);
    expect(await getTopSurveyors(admin)).toEqual([
      {
        userId: "ghost",
        name: "Unknown surveyor",
        companyName: null,
        count: 2,
      },
    ]);
  });
});
