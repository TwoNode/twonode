import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the dev-account guard (assertNotDevAccount) — every
 * mutation in the source individually checked `email === process.env.DEV_EMAIL`
 * before touching a RevaUser row, and that protection has to survive the
 * migration unchanged since it's the only thing stopping the seeded dev
 * account from being demoted/deactivated/deleted through the admin UI.
 */

const mockPrisma = vi.hoisted(() => ({
  revaUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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
  createAdminUser,
  makeUserAdmin,
  removeAdminPrivileges,
  deactivateUser,
  reactivateUser,
  deleteUser,
} = await import("@/reva/services/adminUserService");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEV_EMAIL = "dev@test.com";
});

describe("dev-account guard", () => {
  it("createAdminUser refuses to create the dev email", async () => {
    await expect(
      createAdminUser({ email: "dev@test.com", firstName: "D", lastName: "E", role: "ADMIN" })
    ).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.revaUser.create).not.toHaveBeenCalled();
  });

  it("makeUserAdmin refuses to touch the dev account even if role checks would otherwise pass", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "u1", email: "dev@test.com", role: "USER" });
    await expect(makeUserAdmin("u1", "ADMIN")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
  });

  it("deleteUser refuses to touch the dev account", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "dev@test.com",
      _count: { properties: 0 },
    });
    await expect(deleteUser("u1")).rejects.toMatchObject({ status: 403 });
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
  });
});

describe("createAdminUser", () => {
  it("throws ConflictError when the email is already registered", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "existing" });
    await expect(
      createAdminUser({ email: "new@test.com", firstName: "A", lastName: "B", role: "ADMIN" })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("makeUserAdmin", () => {
  it("throws ConflictError when the user is already an admin", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "u1", email: "a@test.com", role: "ADMIN" });
    await expect(makeUserAdmin("u1", "SUPERADMIN")).rejects.toMatchObject({ status: 409 });
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(null);
    await expect(makeUserAdmin("missing", "ADMIN")).rejects.toMatchObject({ status: 404 });
  });
});

describe("removeAdminPrivileges", () => {
  it("throws ValidationError when the user isn't an admin to begin with", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "u1", email: "a@test.com", role: "USER" });
    await expect(removeAdminPrivileges("u1")).rejects.toMatchObject({ status: 400 });
  });
});

describe("deactivateUser / reactivateUser", () => {
  it("throws ConflictError deactivating an already-inactive user", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "u1", email: "a@test.com", is_active: false });
    await expect(deactivateUser("u1")).rejects.toMatchObject({ status: 409 });
  });

  it("throws ConflictError reactivating an already-active user", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({ id: "u1", email: "a@test.com", is_active: true });
    await expect(reactivateUser("u1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("deleteUser", () => {
  it("refuses to delete a user with associated properties", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      _count: { properties: 2 },
    });
    await expect(deleteUser("u1")).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.revaUser.delete).not.toHaveBeenCalled();
  });
});
