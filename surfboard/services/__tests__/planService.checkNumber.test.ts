import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findMany: mocks.findMany, findFirst: mocks.findFirst } },
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

const { checkPlanNumberExists } =
  await import("@/surfboard/services/planService");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([
    { planNumber: "AUO/4768/003/2022/LA_" },
    { planNumber: "D/012" },
  ]);
});

describe("checkPlanNumberExists", () => {
  it("catches case and trailing-underscore variants", async () => {
    expect(await checkPlanNumberExists("u1", "auo/4768/003/2022/la")).toBe(true);
  });
  it("does not treat D012 as D/012", async () => {
    expect(await checkPlanNumberExists("u1", "D012")).toBe(false);
  });
  it("ignores empty input without a query", async () => {
    expect(await checkPlanNumberExists("u1", "  ")).toBe(false);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("excludes the plan being edited", async () => {
    await checkPlanNumberExists("u1", "X", "plan-9");
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", id: { not: "plan-9" } },
      select: { planNumber: true },
    });
  });
});

describe("findPlanIdByNumber", () => {
  it("prefers the exact number, then the canonical key among live plans", async () => {
    const { findPlanIdByNumber } = await import("@/surfboard/services/planService");
    mocks.findFirst.mockReset();
    mocks.findFirst.mockResolvedValueOnce({ id: "exact" });
    expect(await findPlanIdByNumber("AUO/1/LA")).toBe("exact");
    expect(mocks.findFirst).toHaveBeenCalledTimes(1);

    mocks.findFirst.mockReset();
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "bykey" });
    expect(await findPlanIdByNumber("auo/1/la_")).toBe("bykey");
    expect(mocks.findFirst).toHaveBeenLastCalledWith({
      where: { planNumberKey: "AUO/1/LA", deleted: false },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  });
  it("returns null for empty input or no match", async () => {
    const { findPlanIdByNumber } = await import("@/surfboard/services/planService");
    mocks.findFirst.mockReset();
    mocks.findFirst.mockResolvedValue(null);
    expect(await findPlanIdByNumber("  ")).toBeNull();
    expect(await findPlanIdByNumber("X/1")).toBeNull();
  });
});
