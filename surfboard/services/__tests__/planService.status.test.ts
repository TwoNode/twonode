import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findUnique: mocks.findUnique, update: mocks.update },
  },
}));
vi.mock("@/surfboard/services/notificationService", () => ({
  notifyPlanCreated: vi.fn(),
  notifyPlanShared: vi.fn(),
  notifyPlanUpdate: mocks.notify,
  notifyPlanUpdated: vi.fn(),
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

const { updateSurfPlanStatus } =
  await import("@/surfboard/services/planService");
const { SurfboardRole } = await import("@/utils/platform");

const PLAN = { userId: "owner-1", planNumber: "AAA/1", status: "PENDING" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(PLAN);
  mocks.update.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));
});

describe("updateSurfPlanStatus is for staff only (I-043)", () => {
  it("refuses the surveyor who owns the plan, and changes nothing", async () => {
    await expect(
      updateSurfPlanStatus(SurfboardRole.USER, "p1", "LODGED")
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it.each([
    SurfboardRole.CHARTING,
    SurfboardRole.ACCOUNTS,
    SurfboardRole.SURCON,
    SurfboardRole.RECORDS_I,
    SurfboardRole.INTAKE,
    SurfboardRole.RECORDS_II,
    SurfboardRole.MDA_SUPERADMIN,
    SurfboardRole.ARCHIVE,
  ])("refuses a %s account too", async (role) => {
    await expect(
      updateSurfPlanStatus(role, "p1", "QUERIED")
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "lets a %s set the status and tells the plan's owner",
    async (role) => {
      const plan = await updateSurfPlanStatus(role, "p1", "QUERIED");
      expect(plan).toMatchObject({ status: "QUERIED" });
      expect(mocks.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { status: "QUERIED" },
      });
      expect(mocks.notify).toHaveBeenCalledTimes(1);
      expect(mocks.notify.mock.calls[0][0]).toMatchObject({
        planId: "p1",
        userIds: ["owner-1"],
        type: "WARNING",
        sendEmail: true,
      });
    }
  );

  it("says nothing to the owner when the status did not change", async () => {
    await updateSurfPlanStatus(SurfboardRole.ADMIN, "p1", "PENDING");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("answers 404 for a plan that does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(
      updateSurfPlanStatus(SurfboardRole.ADMIN, "nope", "LODGED")
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
