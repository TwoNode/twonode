import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findUnique: mocks.findUnique },
    surfboardUser: { findMany: mocks.findMany },
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

const { getFullSurfPlanForViewer } =
  await import("@/surfboard/services/planService");
const { SurfboardRole } = await import("@/utils/platform");

const plan = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  userId: "owner-1",
  sharedTo: [],
  geometry: null,
  user: { id: "owner-1" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([]);
});

describe("getFullSurfPlanForViewer", () => {
  it("lets staff read any plan, with no owner filter", async () => {
    mocks.findUnique.mockResolvedValue(plan());
    const res = await getFullSurfPlanForViewer(
      "staff-1",
      SurfboardRole.RECORDS_II,
      "p1"
    );
    expect(res.id).toBe("p1");
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({ id: "p1" });
  });

  it("limits a surveyor to their own or a shared plan", async () => {
    mocks.findUnique.mockResolvedValue(plan());
    await getFullSurfPlanForViewer("owner-1", SurfboardRole.USER, "p1");
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({
      id: "p1",
      OR: [{ userId: "owner-1" }, { sharedTo: { has: "owner-1" } }],
    });
  });

  it("throws not found when the plan does not exist or is not the surveyor's", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(
      getFullSurfPlanForViewer("u2", SurfboardRole.USER, "p1")
    ).rejects.toThrow(/Plan/);
    await expect(
      getFullSurfPlanForViewer("staff-1", SurfboardRole.ADMIN, "missing")
    ).rejects.toThrow(/Plan/);
  });
});
