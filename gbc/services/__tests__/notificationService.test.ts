import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GBC's in-app admin notification inbox — new this PR, mirroring
 * Surfboard's notificationService.ts. Weighted toward the two things that
 * differ from a copy-paste: getAdminNotifications' role-based audience OR
 * conditions (SUPERADMIN sees one more clause than ADMIN) and the
 * isRead/isDismissed computation from the raw readBy/dismissedBy arrays.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCUserNotification: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const {
  createGBCNotification,
  getAdminNotifications,
  markGBCNotificationAsRead,
  dismissGBCNotification,
  getUnreadGBCNotificationCount,
  deleteGBCNotification,
} = await import("@/gbc/services/notificationService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createGBCNotification", () => {
  it("defaults userIds to an empty array when none are given", async () => {
    mockPrisma.gBCUserNotification.create.mockResolvedValue({ id: "n1" });
    const result = await createGBCNotification({ type: "INFO", title: "t", message: "m", audience: "ALL_USERS" });

    expect(result).toEqual({ id: "n1" });
    expect(mockPrisma.gBCUserNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userIds: [] }),
    });
  });
});

describe("getAdminNotifications", () => {
  it("includes the SUPERADMIN audience clause only for superadmins", async () => {
    mockPrisma.gBCUserNotification.findMany.mockResolvedValue([]);

    await getAdminNotifications("admin-1", "ADMIN");
    const adminWhere = mockPrisma.gBCUserNotification.findMany.mock.calls[0][0].where;
    expect(adminWhere.OR).not.toContainEqual({ audience: "SUPERADMIN" });

    await getAdminNotifications("super-1", "SUPERADMIN");
    const superWhere = mockPrisma.gBCUserNotification.findMany.mock.calls[1][0].where;
    expect(superWhere.OR).toContainEqual({ audience: "SUPERADMIN" });
  });

  it("computes isRead/isDismissed from the requesting admin's own id, not the raw arrays", async () => {
    mockPrisma.gBCUserNotification.findMany.mockResolvedValue([
      { id: "n1", type: "INFO", title: "t", message: "m", audience: "ALL_USERS", link: null, createdAt: new Date(), readBy: ["admin-1"], dismissedBy: [] },
      { id: "n2", type: "INFO", title: "t2", message: "m2", audience: "ALL_USERS", link: null, createdAt: new Date(), readBy: [], dismissedBy: [] },
    ]);

    const result = await getAdminNotifications("admin-1", "ADMIN");
    expect(result).toEqual([
      expect.objectContaining({ id: "n1", isRead: true, isDismissed: false }),
      expect.objectContaining({ id: "n2", isRead: false, isDismissed: false }),
    ]);
  });

  it("filters out already-read notifications when includeRead is false", async () => {
    mockPrisma.gBCUserNotification.findMany.mockResolvedValue([
      { id: "n1", type: "INFO", title: "t", message: "m", audience: "ALL_USERS", link: null, createdAt: new Date(), readBy: ["admin-1"], dismissedBy: [] },
    ]);

    const result = await getAdminNotifications("admin-1", "ADMIN", { includeRead: false });
    expect(result).toEqual([]);
  });
});

describe("markGBCNotificationAsRead", () => {
  it("throws NotFoundError when the notification doesn't exist", async () => {
    mockPrisma.gBCUserNotification.findUnique.mockResolvedValue(null);
    await expect(markGBCNotificationAsRead("admin-1", "nope")).rejects.toMatchObject({ status: 404 });
  });

  it("adds the userId to readBy without duplicating an existing entry", async () => {
    mockPrisma.gBCUserNotification.findUnique.mockResolvedValue({ id: "n1", readBy: ["admin-1"], dismissedBy: [] });
    await markGBCNotificationAsRead("admin-1", "n1");

    expect(mockPrisma.gBCUserNotification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { readBy: ["admin-1"] },
    });
  });
});

describe("dismissGBCNotification", () => {
  it("throws NotFoundError when the notification doesn't exist", async () => {
    mockPrisma.gBCUserNotification.findUnique.mockResolvedValue(null);
    await expect(dismissGBCNotification("admin-1", "nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("getUnreadGBCNotificationCount", () => {
  it("excludes notifications already read or dismissed by this admin", async () => {
    mockPrisma.gBCUserNotification.count.mockResolvedValue(3);
    const result = await getUnreadGBCNotificationCount("admin-1", "ADMIN");

    expect(result).toEqual({ count: 3 });
    const where = mockPrisma.gBCUserNotification.count.mock.calls[0][0].where;
    expect(where.NOT).toEqual([{ readBy: { has: "admin-1" } }, { dismissedBy: { has: "admin-1" } }]);
  });
});

describe("deleteGBCNotification", () => {
  it("permanently removes the notification record", async () => {
    mockPrisma.gBCUserNotification.delete.mockResolvedValue({});
    const result = await deleteGBCNotification("n1");

    expect(result).toEqual({ success: true });
    expect(mockPrisma.gBCUserNotification.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
  });
});
