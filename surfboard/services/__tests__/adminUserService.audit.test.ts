import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SurfboardAuditLog.userId is "user who performed the action" and the audit
 * page shows it as the performer. These admin actions used to pass the
 * *target's* id there (so "who added this admin?" was answered with the new
 * admin themselves), and promote/subscription changes weren't logged at all.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardUser: { findUnique: vi.fn(), update: vi.fn() },
  subscription: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
}));
const mockAudit = vi.hoisted(() => ({ logAuditAction: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock(
  "@/app/(projects)/(surfboard)/utils/auditLogger",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/app/(projects)/(surfboard)/utils/auditLogger")
    >()),
    logAuditAction: mockAudit.logAuditAction,
  })
);

const {
  updateUserRole,
  updateUserStatus,
  promoteToAdmin,
  updateUserSubscription,
  cancelUserSubscription,
} = await import("@/surfboard/services/adminUserService");

const superadmin = { id: "actor-1", role: "SUPERADMIN" } as const;
const admin = { id: "actor-2", role: "ADMIN" } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserRole", () => {
  it("logs the acting admin as the performer, the target as the entity, and before/after roles", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      role: "USER",
      email: "t@x.com",
    });
    mockPrisma.surfboardUser.update.mockResolvedValue({ id: "target-1" });

    await updateUserRole(superadmin, "target-1", "ADMIN");

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith({
      userId: "actor-1",
      action: "UPDATE_USER_ROLE",
      entity: "SurfboardUser",
      entityId: "target-1",
      changes: {
        before: { role: "USER" },
        after: { role: "ADMIN" },
        userEmail: "t@x.com",
      },
    });
  });

  it("refuses a non-superadmin without changing or logging anything", async () => {
    await expect(
      updateUserRole(admin, "target-1", "ADMIN")
    ).rejects.toMatchObject({ status: 403 });

    expect(mockPrisma.surfboardUser.update).not.toHaveBeenCalled();
    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});

describe("updateUserStatus", () => {
  it("logs the acting admin, not the target, when deactivating", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      role: "USER",
      email: "t@x.com",
    });
    mockPrisma.surfboardUser.update.mockResolvedValue({ id: "target-1" });

    await updateUserStatus(admin, "target-1", false);

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "actor-2",
        action: "DEACTIVATE_USER",
        entityId: "target-1",
      })
    );
  });

  it("names the action ACTIVATE_USER when reactivating", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      role: "USER",
      email: "t@x.com",
    });
    mockPrisma.surfboardUser.update.mockResolvedValue({ id: "target-1" });

    await updateUserStatus(superadmin, "target-1", true);

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "actor-1", action: "ACTIVATE_USER" })
    );
  });

  it("stops an ADMIN from changing another admin's status, with no audit entry", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      role: "ADMIN",
      email: "other@x.com",
    });

    await expect(
      updateUserStatus(admin, "target-1", false)
    ).rejects.toMatchObject({ status: 403 });

    expect(mockPrisma.surfboardUser.update).not.toHaveBeenCalled();
    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});

describe("promoteToAdmin", () => {
  it("logs PROMOTE_TO_ADMIN with the actor and the before/after role", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      role: "USER",
      email: "t@x.com",
    });
    mockPrisma.surfboardUser.update.mockResolvedValue({
      id: "target-1",
      role: "ADMIN",
    });

    await promoteToAdmin("actor-1", "target-1");

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith({
      userId: "actor-1",
      action: "PROMOTE_TO_ADMIN",
      entity: "SurfboardUser",
      entityId: "target-1",
      changes: {
        before: { role: "USER" },
        after: { role: "ADMIN" },
        userEmail: "t@x.com",
      },
    });
  });

  it("returns a 404 for an unknown user instead of a raw Prisma error, and logs nothing", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue(null);

    await expect(promoteToAdmin("actor-1", "nope")).rejects.toMatchObject({
      status: 404,
    });

    expect(mockPrisma.surfboardUser.update).not.toHaveBeenCalled();
    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});

describe("updateUserSubscription", () => {
  const input = {
    userId: "target-1",
    planCode: "PRO",
    planName: "Pro",
    amount: 5000,
    interval: "monthly",
    status: "active",
  };

  it("logs an existing subscription's before/after and who changed it", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      id: "target-1",
      email: "t@x.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      planCode: "BASIC",
      planName: "Basic",
      amount: 1000,
      interval: "monthly",
      status: "expired",
      currentEnd: null,
    });
    mockPrisma.subscription.update.mockResolvedValue({
      id: "sub-1",
      planCode: "PRO",
      planName: "Pro",
      amount: 5000,
      interval: "monthly",
      status: "active",
      currentEnd: null,
    });

    await updateUserSubscription("actor-1", input);

    const call = mockAudit.logAuditAction.mock.calls[0][0];
    expect(call).toMatchObject({
      userId: "actor-1",
      action: "UPDATE_USER_SUBSCRIPTION",
      entity: "Subscription",
      entityId: "sub-1",
    });
    expect(call.changes).toMatchObject({
      before: { planCode: "BASIC", status: "expired" },
      after: { planCode: "PRO", status: "active" },
      subscriberId: "target-1",
      userEmail: "t@x.com",
      created: false,
    });
  });

  it("marks a brand-new subscription as created, with no 'before'", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      id: "target-1",
      email: "t@x.com",
    });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.subscription.create.mockResolvedValue({
      id: "sub-9",
      planCode: "PRO",
      planName: "Pro",
      amount: 5000,
      interval: "monthly",
      status: "active",
      currentEnd: null,
    });

    await updateUserSubscription("actor-1", input);

    expect(mockAudit.logAuditAction.mock.calls[0][0].changes).toMatchObject({
      before: null,
      created: true,
    });
  });

  it("logs nothing for an unknown user", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue(null);

    await expect(
      updateUserSubscription("actor-1", input)
    ).rejects.toMatchObject({ status: 404 });

    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});

describe("cancelUserSubscription", () => {
  it("logs the cancellation with the previous status and the actor", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "active",
      email: "t@x.com",
    });
    mockPrisma.subscription.update.mockResolvedValue({
      id: "sub-1",
      status: "canceled",
    });

    await cancelUserSubscription("actor-1", "target-1");

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith({
      userId: "actor-1",
      action: "CANCEL_USER_SUBSCRIPTION",
      entity: "Subscription",
      entityId: "sub-1",
      changes: {
        before: { status: "active" },
        after: { status: "canceled" },
        subscriberId: "target-1",
        userEmail: "t@x.com",
      },
    });
  });

  it("logs nothing when there is no subscription to cancel", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(
      cancelUserSubscription("actor-1", "target-1")
    ).rejects.toMatchObject({ status: 404 });

    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});
