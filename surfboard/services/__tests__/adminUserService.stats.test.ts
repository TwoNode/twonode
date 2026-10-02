import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getUserStats' "Active Subscriptions" count used to filter on a raw
 * status: "active" string, ignoring whether currentEnd had already
 * passed — a subscription whose payment provider webhook set status to
 * "active" once and was never updated after expiry stayed counted
 * forever. Fixed to reuse activeSubscriptionWhereClause, the same
 * "really active" rule getUserActiveSubscription (and therefore
 * proxy.ts's real subscription gate) already uses.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardUser: { count: vi.fn() },
  subscription: { count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getUserStats } = await import("@/surfboard/services/adminUserService");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.surfboardUser.count.mockResolvedValue(0);
  mockPrisma.subscription.count.mockResolvedValue(0);
});

describe("getUserStats — Active Subscriptions", () => {
  it("counts subscriptions using the shared activeSubscriptionWhereClause, not a raw status match", async () => {
    await getUserStats();

    // First subscription.count call is usersWithActiveSubscriptions.
    const [call] = mockPrisma.subscription.count.mock.calls;
    const where = call[0].where;

    expect(where).not.toEqual({ status: "active" });
    expect(where.status).toEqual({ in: ["active", "past_due", "canceled"] });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { currentEnd: null },
        expect.objectContaining({
          currentEnd: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      ])
    );
  });
});
