import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findMany: mocks.findMany, findFirst: mocks.findFirst },
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

const { findPlanNumberMatches, findPlanIdByNumber } = await import(
  "@/surfboard/services/planService"
);

const row = (over: Record<string, unknown>) => ({
  id: "p",
  planNumber: "X",
  surveyTitle: "T",
  status: "PENDING",
  createdAt: new Date("2026-01-01"),
  userId: "me",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findFirst.mockResolvedValue(null);
  mocks.findMany.mockResolvedValue([]);
});

describe("findPlanNumberMatches", () => {
  it("compares in capitals", async () => {
    await findPlanNumberMatches("me", "auo/1/la");
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { planNumber: "AUO/1/LA" } })
    );
  });

  it("describes an exact match on the caller's own plan, without the owner id", async () => {
    mocks.findFirst.mockResolvedValue(row({ id: "mine", planNumber: "AUO/1/LA" }));
    const res = await findPlanNumberMatches("me", "AUO/1/LA");
    expect(res.exists).toBe(true);
    expect(res.taken).toBe(false);
    expect(res.own).toMatchObject({ id: "mine", planNumber: "AUO/1/LA" });
    expect(res.own).not.toHaveProperty("userId");
  });

  it("says only 'taken' for an exact match on someone else's plan", async () => {
    mocks.findFirst.mockResolvedValue(row({ id: "theirs", userId: "other" }));
    const res = await findPlanNumberMatches("me", "X");
    expect(res).toMatchObject({ exists: true, taken: true, own: null, similar: [] });
  });

  it("lists the caller's own similar plans, never an exact one, never someone else's", async () => {
    mocks.findMany.mockResolvedValue([
      row({ id: "a", planNumber: "AUO/1/LA_" }),
      row({ id: "b", planNumber: "AUO/1/LA" }),
      row({ id: "c", planNumber: "AUO/2/LA" }),
    ]);
    const res = await findPlanNumberMatches("me", "AUO/1/LA");
    expect(res.similar.map((p) => p.id)).toEqual(["a"]);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "me", deleted: false } })
    );
  });

  it("excludes the plan being edited", async () => {
    await findPlanNumberMatches("me", "X", "plan-9");
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { planNumber: "X", id: { not: "plan-9" } } })
    );
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "me", deleted: false, id: { not: "plan-9" } } })
    );
  });

  it("ignores empty input without a query", async () => {
    expect(await findPlanNumberMatches("me", "  ")).toEqual({
      exists: false, taken: false, own: null, similar: [],
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});

describe("findPlanIdByNumber", () => {
  it("prefers the exact number, then the canonical key among live plans", async () => {
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
    mocks.findFirst.mockReset();
    mocks.findFirst.mockResolvedValue(null);
    expect(await findPlanIdByNumber("  ")).toBeNull();
    expect(await findPlanIdByNumber("X/1")).toBeNull();
  });
});
