import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  users: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findUnique: mocks.findUnique },
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

const { getSurfPlanById } = await import("@/surfboard/services/planService");

const RECORD_COPY =
  "https://bucket.s3.amazonaws.com/surfboard/AAA/1/redcopy/rc.pdf";

const plan = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  userId: "owner-1",
  planNumber: "AAA/1",
  geometry: null,
  redCopyFileUrl: RECORD_COPY,
  sharedTo: ["viewer-1", "viewer-2"],
  user: {
    id: "owner-1",
    firstName: "Ada",
    lastName: "Obi",
    email: "ada@example.com",
  },
  ...over,
});

const OTHER_VIEWERS = [
  {
    id: "viewer-2",
    firstName: "Chidi",
    lastName: "Eze",
    email: "chidi@example.com",
    surconRegNumber: "S/123",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(plan());
  mocks.users.mockResolvedValue(OTHER_VIEWERS);
});

describe("getSurfPlanById: the owner (the website's plan page)", () => {
  it("still gets the whole row: the record copy link and who it is shared with", async () => {
    const out = await getSurfPlanById("owner-1", "p1");
    expect(out.isOwner).toBe(true);
    expect((out as { redCopyFileUrl?: string }).redCopyFileUrl).toBe(
      RECORD_COPY
    );
    expect(out.sharedToUsers).toEqual(OTHER_VIEWERS);
    expect(mocks.users).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["viewer-1", "viewer-2"] } },
      })
    );
  });
});

describe("getSurfPlanById: someone the plan was shared with (I-037)", () => {
  it("is told a record copy exists but never given its link", async () => {
    const out = await getSurfPlanById("viewer-1", "p1");
    expect(out.isOwner).toBe(false);
    expect((out as { hasRecordCopy?: boolean }).hasRecordCopy).toBe(true);
    expect("redCopyFileUrl" in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain("rc.pdf");
  });

  it("says no record copy when there is none", async () => {
    mocks.findUnique.mockResolvedValue(plan({ redCopyFileUrl: null }));
    const out = await getSurfPlanById("viewer-1", "p1");
    expect((out as { hasRecordCopy?: boolean }).hasRecordCopy).toBe(false);
  });

  it("does not look up, or list, the other people it is shared with", async () => {
    const out = await getSurfPlanById("viewer-1", "p1");
    expect(mocks.users).not.toHaveBeenCalled();
    expect(out.sharedToUsers).toEqual([]);
    expect(out.sharedTo).toEqual(["viewer-1"]);
    const json = JSON.stringify(out);
    expect(json).not.toContain("viewer-2");
    expect(json).not.toContain("chidi@example.com");
    expect(json).not.toContain("S/123");
  });

  it("names the owner without their email", async () => {
    const out = await getSurfPlanById("viewer-1", "p1");
    expect(out.user).toEqual({
      id: "owner-1",
      firstName: "Ada",
      lastName: "Obi",
    });
    expect(JSON.stringify(out)).not.toContain("ada@example.com");
  });

  it("keeps the rest of the plan the page needs", async () => {
    const out = await getSurfPlanById("viewer-1", "p1");
    expect(out).toMatchObject({
      id: "p1",
      planNumber: "AAA/1",
      areaSqM: 0,
      centroid: null,
    });
  });
});
