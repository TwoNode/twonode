import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Interim security hotfix (2026-08-28): requireAuth()/requireAdmin() used
 * to be hardcoded stubs — requireAdmin() unconditionally returned a fake
 * ADMIN with zero check at all, meaning every admin mutation across the
 * app (tickets, sponsors, speakers, gallery, settings, ...) was callable
 * by anyone who could reach the server action reference, no session
 * required. These cases assert the real check this fix restores, ahead of
 * Phase 4's full migration to typed withAuth<GBCRole> routes.
 */

const mockKindeSession = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  getUser: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  gBCUser: { findUnique: vi.fn(), update: vi.fn() },
}));

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: () => mockKindeSession,
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

const { requireAuth, requireAdmin } = await import("@/gbc/utils/auth");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("throws when there is neither a Kinde nor a native session", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(false);
    mockGetServerSession.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("falls back to the native session when there is no Kinde session (a natively-authenticated admin has no Kinde session at all)", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(false);
    mockGetServerSession.mockResolvedValue({
      sub: "native-user-1",
      role: "SUPERADMIN",
      platform: "gbc",
    });
    await expect(requireAuth()).resolves.toEqual({
      id: "native-user-1",
      email: undefined,
    });
  });

  it("returns the real Kinde user when authenticated", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({
      id: "kinde-1",
      email: "a@test.com",
    });
    await expect(requireAuth()).resolves.toEqual({
      id: "kinde-1",
      email: "a@test.com",
    });
  });
});

describe("requireAdmin", () => {
  it("throws when authenticated but no matching GBCUser exists at all", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({
      id: "kinde-1",
      email: "stranger@test.com",
    });
    mockPrisma.gBCUser.findUnique.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("not a registered GBC user");
  });

  it("throws when the matched user's role is plain USER, not ADMIN/SUPERADMIN", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({ id: "kinde-1" });
    mockPrisma.gBCUser.findUnique.mockResolvedValue({
      id: "u1",
      kindeId: "kinde-1",
      role: "USER",
      isActive: true,
    });

    await expect(requireAdmin()).rejects.toThrow("admin access required");
  });

  it("throws when the matched admin account is deactivated", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({ id: "kinde-1" });
    mockPrisma.gBCUser.findUnique.mockResolvedValue({
      id: "u1",
      kindeId: "kinde-1",
      role: "ADMIN",
      isActive: false,
    });

    await expect(requireAdmin()).rejects.toThrow("deactivated");
  });

  it("returns the real GBCUser row for an active ADMIN", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({ id: "kinde-1" });
    const admin = {
      id: "u1",
      kindeId: "kinde-1",
      email: "admin@test.com",
      role: "ADMIN",
      isActive: true,
    };
    mockPrisma.gBCUser.findUnique.mockResolvedValue(admin);

    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("reconciles a pre-provisioned account (placeholder kindeId, created by email via addNewAdmin) with the real Kinde id on first login", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(true);
    mockKindeSession.getUser.mockResolvedValue({
      id: "real-kinde-id",
      email: "preprovisioned@test.com",
    });

    mockPrisma.gBCUser.findUnique
      .mockResolvedValueOnce(null) // no match by kindeId
      .mockResolvedValueOnce({
        id: "u1",
        kindeId: "temp_1234",
        email: "preprovisioned@test.com",
        role: "SUPERADMIN",
        isActive: true,
      }); // match by email

    mockPrisma.gBCUser.update.mockResolvedValue({
      id: "u1",
      kindeId: "real-kinde-id",
      email: "preprovisioned@test.com",
      role: "SUPERADMIN",
      isActive: true,
    });

    const result = await requireAdmin();

    expect(mockPrisma.gBCUser.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { kindeId: "real-kinde-id" },
    });
    expect(result.kindeId).toBe("real-kinde-id");
  });

  it("looks up a natively-authenticated admin by internal id, not kindeId, since the native session has no Kinde id to match", async () => {
    mockKindeSession.isAuthenticated.mockResolvedValue(false);
    mockGetServerSession.mockResolvedValue({
      sub: "native-user-1",
      role: "SUPERADMIN",
      platform: "gbc",
    });

    const admin = {
      id: "native-user-1",
      kindeId: null,
      email: "native-admin@test.com",
      role: "SUPERADMIN",
      isActive: true,
    };
    mockPrisma.gBCUser.findUnique
      .mockResolvedValueOnce(null) // no match by kindeId (undefined for a native session)
      .mockResolvedValueOnce(admin); // match by internal id

    const result = await requireAdmin();

    expect(mockPrisma.gBCUser.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: "native-user-1" },
    });
    expect(result).toEqual(admin);
  });
});
