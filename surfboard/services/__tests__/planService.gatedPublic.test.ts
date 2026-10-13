import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  access: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findUnique: mocks.findUnique, update: vi.fn() },
    surfboardUser: { findMany: vi.fn() },
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
vi.mock("@/surfboard/services/qrEarningsService", async (orig) => ({
  ...(await orig<object>()),
  getPlanQRAccessState: mocks.access,
  incrementPlanQRScanCount: vi.fn().mockResolvedValue(undefined),
}));

const { getGatedPublicSurfPlan } =
  await import("@/surfboard/services/planService");

const plan = () => ({
  id: "p1",
  userId: "owner-1",
  geometry: null,
  pdfFilePaths: ["surfboard/owner-1/pdf/a.pdf"],
  cadFilePaths: ["surfboard/owner-1/cad/a.dwg"],
  certificateFilePaths: ["surfboard/owner-1/certificate/c.pdf"],
  redCopyFileUrl: "https://b.s3.amazonaws.com/surfboard/X/redcopy/r.pdf",
  user: { id: "owner-1" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(plan());
});

describe("getGatedPublicSurfPlan file links", () => {
  it("strips every file link while payment is required", async () => {
    mocks.access.mockResolvedValue({ accessState: "PAYWALL_REQUIRED" });
    const { plan: p } = await getGatedPublicSurfPlan("p1");
    expect(p.pdfFilePaths).toEqual([]);
    expect(p.cadFilePaths).toEqual([]);
    expect(p.certificateFilePaths).toEqual([]);
    expect(p.redCopyFileUrl).toBeNull();
    expect(p.user).toBeNull();
  });

  it("strips them when the paid access has expired", async () => {
    mocks.access.mockResolvedValue({ accessState: "EXPIRED" });
    const { plan: p } = await getGatedPublicSurfPlan("p1");
    expect(p.certificateFilePaths).toEqual([]);
  });

  it("keeps them for paid access", async () => {
    mocks.access.mockResolvedValue({ accessState: "PAID_ACTIVE" });
    const { plan: p } = await getGatedPublicSurfPlan("p1");
    expect(p.certificateFilePaths).toHaveLength(1);
  });
});
