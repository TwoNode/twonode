import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findMany: mocks.findMany, count: mocks.count },
    surfboardUser: { findMany: vi.fn(async () => []) },
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

const { getSharedWithMeSurfPlans, getAllSharedSurfPlans } =
  await import("@/surfboard/services/planService");

const plan = (redCopyFileUrl: string | null) => ({
  id: "p1",
  planNumber: "AAA/1",
  geometry: null,
  pillars: [],
  sharedTo: [],
  redCopyFileUrl,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(2);
});

describe("shared plan lists and the record copy", () => {
  it("shared with me: says a record copy exists but never sends its link", async () => {
    mocks.findMany.mockResolvedValue([plan("https://b/x/rc.pdf"), plan(null)]);
    const out = await getSharedWithMeSurfPlans("me");
    expect(out.plans[0].hasRecordCopy).toBe(true);
    expect(out.plans[1].hasRecordCopy).toBe(false);
    expect(JSON.stringify(out)).not.toContain("rc.pdf");
    expect("redCopyFileUrl" in out.plans[0]).toBe(false);
  });

  it("my shared plans: the owner gets the record copy link and state", async () => {
    mocks.findMany.mockResolvedValue([plan("https://b/x/rc.pdf")]);
    await getAllSharedSurfPlans("me");
    const select = mocks.findMany.mock.calls[0][0].select;
    expect(select.redCopyFileUrl).toBe(true);
    expect(select.redCopyStatus).toBe(true);
  });
});
