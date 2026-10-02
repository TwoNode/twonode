import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the dev-account guard (assertNotDevAccount) — every
 * mutation in the source individually checked `email === process.env.DEV_EMAIL`
 * before touching a RevaUser row, and that protection has to survive the
 * migration unchanged since it's the only thing stopping the seeded dev
 * account from being demoted/deactivated/deleted through the admin UI.
 *
 * Every privileged action also writes an audit entry naming the acting
 * superadmin (`userId`), with the affected account in `entityId`.
 */

const mockPrisma = vi.hoisted(() => ({
  revaUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  revaAuditLog: { create: vi.fn() },
}));

const mockNotify = vi.hoisted(() => ({ notifySystemAlert: vi.fn() }));
const mockEmail = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue({ success: true }),
  sendEmailToAllSuperAdmins: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/reva/services/notificationService", () => mockNotify);
vi.mock("@/utils/email", () => mockEmail);

const {
  announceAdminJoined,
  makeUserAdmin,
  removeAdminPrivileges,
  deactivateUser,
  reactivateUser,
  deleteUser,
} = await import("@/reva/services/adminUserService");

const auditCall = () => mockPrisma.revaAuditLog.create.mock.calls[0]?.[0]?.data;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEV_EMAIL = "dev@test.com";
});

describe("dev-account guard", () => {
  it("makeUserAdmin refuses to touch the dev account even if role checks would otherwise pass", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "dev@test.com",
      role: "USER",
    });
    await expect(makeUserAdmin("actor", "u1", "ADMIN")).rejects.toMatchObject({
      status: 403,
    });
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("deleteUser refuses to touch the dev account", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "dev@test.com",
      _count: { properties: 0 },
    });
    await expect(deleteUser("actor", "u1")).rejects.toMatchObject({
      status: 403,
    });
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });
});

describe("announceAdminJoined", () => {
  it("posts the alert and emails superadmins (the old 'admin created' notification, now on acceptance)", async () => {
    await announceAdminJoined({
      email: "new@test.com",
      firstName: "A",
      lastName: "B",
      role: "ADMIN",
    });
    expect(mockNotify.notifySystemAlert).toHaveBeenCalledWith(
      "Admin User Joined",
      expect.stringContaining("new@test.com")
    );
    expect(mockEmail.sendEmailToAllSuperAdmins).toHaveBeenCalledTimes(1);
  });

  it("escapes the name and email in the HTML body", async () => {
    await announceAdminJoined({
      email: "x@test.com",
      firstName: "<b>Evil</b>",
      lastName: "",
      role: "ADMIN",
    });
    const { html } = mockEmail.sendEmailToAllSuperAdmins.mock.calls[0][0];
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
  });

  it("never throws if the notification or email fails", async () => {
    mockNotify.notifySystemAlert.mockRejectedValueOnce(new Error("boom"));
    await expect(
      announceAdminJoined({
        email: "a@test.com",
        firstName: "A",
        lastName: "B",
        role: "ADMIN",
      })
    ).resolves.toBeUndefined();
  });
});

describe("makeUserAdmin", () => {
  it("throws ConflictError when the user is already an admin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "ADMIN",
    });
    await expect(
      makeUserAdmin("actor", "u1", "SUPERADMIN")
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(null);
    await expect(
      makeUserAdmin("actor", "missing", "ADMIN")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("audits the promotion with the acting superadmin and the before/after role", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      firstName: "A",
      lastName: "B",
      role: "USER",
    });
    mockPrisma.revaUser.update.mockResolvedValue({ id: "u1", role: "ADMIN" });

    await makeUserAdmin("actor", "u1", "ADMIN");

    expect(auditCall()).toMatchObject({
      userId: "actor",
      action: "PROMOTE_TO_ADMIN",
      entity: "RevaUser",
      entityId: "u1",
    });
    expect(JSON.parse(auditCall().changes)).toEqual({
      before: { role: "USER" },
      after: { role: "ADMIN" },
      userEmail: "a@test.com",
    });
  });
});

describe("removeAdminPrivileges", () => {
  it("throws ValidationError when the user isn't an admin to begin with", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "USER",
    });
    await expect(removeAdminPrivileges("actor", "u1")).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("audits the demotion with the acting superadmin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "ADMIN",
    });
    mockPrisma.revaUser.update.mockResolvedValue({ id: "u1", role: "USER" });

    await removeAdminPrivileges("actor", "u1");

    expect(auditCall()).toMatchObject({
      userId: "actor",
      action: "REMOVE_ADMIN_PRIVILEGES",
      entityId: "u1",
    });
    expect(JSON.parse(auditCall().changes).before).toEqual({ role: "ADMIN" });
  });
});

describe("deactivateUser / reactivateUser", () => {
  it("throws ConflictError deactivating an already-inactive user", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      is_active: false,
    });
    await expect(deactivateUser("actor", "u1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("throws ConflictError reactivating an already-active user", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      is_active: true,
    });
    await expect(reactivateUser("actor", "u1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("audits deactivation and reactivation with the acting superadmin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "a@test.com",
      is_active: true,
    });
    mockPrisma.revaUser.update.mockResolvedValue({ id: "u1" });
    await deactivateUser("actor", "u1");
    expect(auditCall()).toMatchObject({
      userId: "actor",
      action: "DEACTIVATE_USER",
      entityId: "u1",
    });

    mockPrisma.revaAuditLog.create.mockClear();
    mockPrisma.revaUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "a@test.com",
      is_active: false,
    });
    await reactivateUser("actor", "u1");
    expect(auditCall()).toMatchObject({
      userId: "actor",
      action: "ACTIVATE_USER",
      entityId: "u1",
    });
  });
});

describe("deleteUser", () => {
  it("refuses to delete a user with associated properties", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      _count: { properties: 2 },
    });
    await expect(deleteUser("actor", "u1")).rejects.toMatchObject({
      status: 409,
    });
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("audits the deletion with the acting superadmin and who was removed", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "ADMIN",
      _count: { properties: 0 },
    });
    mockPrisma.revaUser.delete.mockResolvedValue({});

    await deleteUser("actor", "u1");

    expect(auditCall()).toMatchObject({
      userId: "actor",
      action: "DELETE_USER",
      entityId: "u1",
    });
    expect(JSON.parse(auditCall().changes)).toEqual({
      userEmail: "a@test.com",
      role: "ADMIN",
    });
  });
});

describe("a superadmin can't act on their own account", () => {
  const me = {
    id: "me",
    email: "me@test.com",
    role: "SUPERADMIN",
    is_active: true,
    _count: { properties: 0 },
  };

  it("can't remove their own admin privileges", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(me);
    await expect(removeAdminPrivileges("me", "me")).rejects.toMatchObject({
      status: 403,
      code: "SELF_ACTION_FORBIDDEN",
    });
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("can't deactivate their own account", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(me);
    await expect(deactivateUser("me", "me")).rejects.toMatchObject({
      status: 403,
      code: "SELF_ACTION_FORBIDDEN",
    });
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
  });

  it("can't delete their own account", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(me);
    await expect(deleteUser("me", "me")).rejects.toMatchObject({
      status: 403,
      code: "SELF_ACTION_FORBIDDEN",
    });
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("says who can: the message points at another superadmin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(me);
    await expect(deleteUser("me", "me")).rejects.toThrow(/another superadmin/);
  });

  it("is still allowed to reactivate themselves — that is harmless", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      ...me,
      is_active: false,
    });
    mockPrisma.revaUser.update.mockResolvedValue({ id: "me" });
    await expect(reactivateUser("me", "me")).resolves.toBeDefined();
  });
});

describe("never leave the platform without an active superadmin", () => {
  const lastSuper = {
    id: "s1",
    email: "s1@test.com",
    role: "SUPERADMIN",
    is_active: true,
    _count: { properties: 0 },
  };

  it("refuses to demote, deactivate or delete the only active superadmin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(lastSuper);
    mockPrisma.revaUser.count.mockResolvedValue(0);

    await expect(removeAdminPrivileges("other", "s1")).rejects.toMatchObject({
      status: 409,
    });
    await expect(deactivateUser("other", "s1")).rejects.toMatchObject({
      status: 409,
    });
    await expect(deleteUser("other", "s1")).rejects.toMatchObject({
      status: 409,
    });

    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
    expect(mockPrisma.revaAuditLog.create).not.toHaveBeenCalled();
  });

  it("counts only OTHER active superadmins", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(lastSuper);
    mockPrisma.revaUser.count.mockResolvedValue(0);
    await expect(deactivateUser("other", "s1")).rejects.toBeDefined();
    expect(mockPrisma.revaUser.count).toHaveBeenCalledWith({
      where: { role: "SUPERADMIN", is_active: true, id: { not: "s1" } },
    });
  });

  it("allows it when another active superadmin exists", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(lastSuper);
    mockPrisma.revaUser.count.mockResolvedValue(1);
    mockPrisma.revaUser.update.mockResolvedValue({ id: "s1" });

    await expect(deactivateUser("other", "s1")).resolves.toBeDefined();
    expect(auditCall()).toMatchObject({
      userId: "other",
      action: "DEACTIVATE_USER",
      entityId: "s1",
    });
  });

  it("doesn't bother counting when the target isn't an active superadmin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValueOnce({
      id: "a1",
      email: "a@test.com",
      role: "ADMIN",
      is_active: true,
    });
    mockPrisma.revaUser.update.mockResolvedValue({ id: "a1" });
    await deactivateUser("other", "a1");

    mockPrisma.revaUser.findUnique.mockResolvedValueOnce({
      ...lastSuper,
      is_active: false,
    });
    mockPrisma.revaUser.delete.mockResolvedValue({});
    await deleteUser("other", "s1");

    expect(mockPrisma.revaUser.count).not.toHaveBeenCalled();
  });
});
