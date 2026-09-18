import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getTimeTrend regression coverage: the dashboard's date-range filter is
 * explicitly scoped to `dateOnSurveyPlan` (DateRangeFilter's "Survey plan
 * date" label), but this chart used to always bucket by `createdAt` over a
 * fixed trailing-12-months window regardless of any range passed in — so
 * filtering the rest of the dashboard down to zero left this one chart
 * still showing all-time data. See gbc/services/__tests__ for the same
 * mocked-prisma pattern used across this codebase.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardPlan: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getTimeTrend } = await import("@/surfboard/services/analyticsService");
const { SurfboardRole } = await import("@/utils/platform");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTimeTrend", () => {
  it("buckets by createdAt over a trailing 12 months when no range is given", async () => {
    mockPrisma.surfboardPlan.findMany.mockResolvedValue([
      { createdAt: new Date("2026-06-15"), dateOnSurveyPlan: new Date("2024-01-01") },
    ]);

    const result = await getTimeTrend({ role: SurfboardRole.USER, userId: "u1" });

    expect(result).toEqual([{ period: "2026-06", count: 1 }]);
    const where = mockPrisma.surfboardPlan.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();
    expect(where.dateOnSurveyPlan).toBeUndefined();
  });

  it("buckets by dateOnSurveyPlan and filters on it when a range is given", async () => {
    mockPrisma.surfboardPlan.findMany.mockResolvedValue([
      { createdAt: new Date("2026-09-01"), dateOnSurveyPlan: new Date("2024-03-20") },
    ]);

    const range = { from: new Date("2024-01-01"), to: new Date("2024-12-31") };
    const result = await getTimeTrend({ role: SurfboardRole.USER, userId: "u1" }, range);

    expect(result).toEqual([{ period: "2024-03", count: 1 }]);
    const where = mockPrisma.surfboardPlan.findMany.mock.calls[0][0].where;
    expect(where.dateOnSurveyPlan).toEqual({ gte: range.from, lte: range.to });
    expect(where.createdAt).toBeUndefined();
  });

  it("skips rows with no dateOnSurveyPlan when filtering by range, instead of throwing", async () => {
    mockPrisma.surfboardPlan.findMany.mockResolvedValue([
      { createdAt: new Date("2026-09-01"), dateOnSurveyPlan: null },
    ]);

    const result = await getTimeTrend({ role: SurfboardRole.USER, userId: "u1" }, { from: new Date("2024-01-01") });

    expect(result).toEqual([]);
  });

  it("returns an empty result set (not zero counts or an error) when the filtered range matches nothing", async () => {
    mockPrisma.surfboardPlan.findMany.mockResolvedValue([]);

    const result = await getTimeTrend(
      { role: SurfboardRole.USER, userId: "u1" },
      { from: new Date("2025-01-01"), to: new Date("2025-12-31") }
    );

    expect(result).toEqual([]);
  });
});
