import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the self-protection guards (real, preserved from the
 * source over its two dead duplicates that never had them) and the
 * DEV_EMAIL exclusion (replaces the source's hardcoded personal email).
 */

const mockPrisma = vi.hoisted(() => ({
  gBCUser: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gBCAuditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getAllAdmins, addAdmin, updateAdminRole, deleteAdmin, toggleAdminStatus } = await import(
  "@/gbc/services/adminUserService"
);

const ORIGINAL_DEV_EMAIL = process.env.DEV_EMAIL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEV_EMAIL = "dev@test.com";
});

afterEach(() => {
  process.env.DEV_EMAIL = ORIGINAL_DEV_EMAIL;
});

describe("getAllAdmins", () => {
  it("excludes the DEV_EMAIL account", async () => {
    mockPrisma.gBCUser.findMany.mockResolvedValue([]);
    await getAllAdmins();
    expect(mockPrisma.gBCUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { not: "dev@test.com" } } })
    );
  });
});

describe("addAdmin", () => {
  it("throws ForbiddenError when the email is the DEV_EMAIL account", async () => {
    await expect(
      addAdmin({ email: "dev@test.com", firstName: "A", lastName: "B", phone: "", role: "ADMIN" }, "actor1")
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws ConflictError when the email is already registered", async () => {
    mockPrisma.gBCUser.findUnique.mockResolvedValue({ id: "existing" });
    await expect(
      addAdmin({ email: "a@test.com", firstName: "A", lastName: "B", phone: "", role: "ADMIN" }, "actor1")
    ).rejects.toMatchObject({ status: 409 });
  });

  it("audit-logs the creation with the acting superadmin's id", async () => {
    mockPrisma.gBCUser.findUnique.mockResolvedValue(null);
    mockPrisma.gBCUser.create.mockResolvedValue({ id: "new1", email: "a@test.com" });
    await addAdmin({ email: "a@test.com", firstName: "A", lastName: "B", phone: "", role: "ADMIN" }, "actor1");
    expect(mockPrisma.gBCAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "actor1", action: "ADD_ADMIN" }) })
    );
  });
});

describe("updateAdminRole (self-demotion guard)", () => {
  it("throws ForbiddenError when demoting yourself", async () => {
    await expect(updateAdminRole("u1", "ADMIN", "u1")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.gBCUser.update).not.toHaveBeenCalled();
  });

  it("allows re-confirming your own SUPERADMIN role (not a demotion)", async () => {
    mockPrisma.gBCUser.update.mockResolvedValue({ id: "u1", role: "SUPERADMIN" });
    await expect(updateAdminRole("u1", "SUPERADMIN", "u1")).resolves.toBeDefined();
  });

  it("allows changing someone else's role", async () => {
    mockPrisma.gBCUser.update.mockResolvedValue({ id: "u2", role: "ADMIN" });
    await expect(updateAdminRole("u2", "ADMIN", "u1")).resolves.toBeDefined();
  });
});

describe("deleteAdmin (self-deletion guard)", () => {
  it("throws ForbiddenError when deleting yourself", async () => {
    await expect(deleteAdmin("u1", "u1")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.gBCUser.delete).not.toHaveBeenCalled();
  });

  it("allows deleting someone else", async () => {
    mockPrisma.gBCUser.delete.mockResolvedValue({});
    await expect(deleteAdmin("u2", "u1")).resolves.toBeUndefined();
  });
});

describe("toggleAdminStatus (self-deactivation guard)", () => {
  it("throws ForbiddenError when deactivating yourself", async () => {
    await expect(toggleAdminStatus("u1", false, "u1")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.gBCUser.update).not.toHaveBeenCalled();
  });

  it("allows reactivating yourself (only self-deactivation is blocked)", async () => {
    mockPrisma.gBCUser.update.mockResolvedValue({ id: "u1", isActive: true });
    await expect(toggleAdminStatus("u1", true, "u1")).resolves.toBeDefined();
  });

  it("allows deactivating someone else", async () => {
    mockPrisma.gBCUser.update.mockResolvedValue({ id: "u2", isActive: false });
    await expect(toggleAdminStatus("u2", false, "u1")).resolves.toBeDefined();
  });
});
