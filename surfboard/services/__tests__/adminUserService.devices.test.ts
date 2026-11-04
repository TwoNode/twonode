import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * An admin ending a person's app sign-ins (TASK-0015 1J.3): who may, what is
 * shown, and that each action is audited with the admin as the performer.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardUser: { findUnique: vi.fn() },
}));
const mockDevices = vi.hoisted(() => ({
  listDeviceSessions: vi.fn(),
  revokeDeviceSession: vi.fn(),
  revokeAllDeviceSessions: vi.fn(),
}));
const mockAudit = vi.hoisted(() => ({ logAuditAction: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/deviceSessions", () => mockDevices);
vi.mock(
  "@/app/(projects)/(surfboard)/utils/auditLogger",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/app/(projects)/(surfboard)/utils/auditLogger")
    >()),
    logAuditAction: mockAudit.logAuditAction,
  })
);

const { listUserDevices, revokeUserDevice, revokeAllUserDevices } =
  await import("@/surfboard/services/adminUserService");
const { ForbiddenError, NotFoundError } = await import("@/lib/api/errors");

const superadmin = { id: "actor-1", role: "SUPERADMIN" } as const;
const admin = { id: "actor-2", role: "ADMIN" } as const;

const asRole = (role: string) =>
  mockPrisma.surfboardUser.findUnique.mockResolvedValue({
    role,
    email: "t@x.com",
  });

beforeEach(() => {
  vi.resetAllMocks();
  asRole("USER");
});

describe("listUserDevices", () => {
  it("shows what an admin needs to pick one and never the device id", async () => {
    mockDevices.listDeviceSessions.mockResolvedValue([
      {
        id: "fam1",
        deviceId: "device-secret-id",
        deviceLabel: "Pixel 8",
        appVersion: "1.4.2",
        lastUsedAt: new Date("2026-10-28T10:00:00Z"),
        signedInAt: new Date("2026-10-01T08:00:00Z"),
      },
    ]);

    const list = await listUserDevices(admin, "target-1");

    expect(list).toEqual([
      {
        id: "fam1",
        deviceLabel: "Pixel 8",
        appVersion: "1.4.2",
        lastUsedAt: new Date("2026-10-28T10:00:00Z"),
        signedInAt: new Date("2026-10-01T08:00:00Z"),
      },
    ]);
    expect(JSON.stringify(list)).not.toContain("device-secret-id");
    expect(mockDevices.listDeviceSessions).toHaveBeenCalledWith(
      "target-1",
      "surfboard"
    );
  });

  it("is a 404 for a person who does not exist", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue(null);
    await expect(listUserDevices(admin, "nobody")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("who may act on whom", () => {
  it.each(["ADMIN", "SUPERADMIN"])(
    "an ADMIN may not touch a %s's devices, and nothing is read or changed",
    async (role) => {
      asRole(role);
      for (const act of [
        () => listUserDevices(admin, "t"),
        () => revokeUserDevice(admin, "t", "fam1"),
        () => revokeAllUserDevices(admin, "t"),
      ]) {
        await expect(act()).rejects.toBeInstanceOf(ForbiddenError);
      }
      expect(mockDevices.listDeviceSessions).not.toHaveBeenCalled();
      expect(mockDevices.revokeDeviceSession).not.toHaveBeenCalled();
      expect(mockDevices.revokeAllDeviceSessions).not.toHaveBeenCalled();
      expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
    }
  );

  it("a SUPERADMIN may act on an ADMIN", async () => {
    asRole("ADMIN");
    mockDevices.listDeviceSessions.mockResolvedValue([]);
    await expect(listUserDevices(superadmin, "t")).resolves.toEqual([]);
  });
});

describe("revokeUserDevice", () => {
  it("ends that sign-in for that person only, and audits the admin as the performer", async () => {
    mockDevices.revokeDeviceSession.mockResolvedValue(1);

    const result = await revokeUserDevice(admin, "target-1", "fam1");

    expect(result).toEqual({ ended: 1 });
    expect(mockDevices.revokeDeviceSession).toHaveBeenCalledWith(
      "target-1",
      "surfboard",
      "fam1"
    );
    expect(mockAudit.logAuditAction).toHaveBeenCalledWith({
      userId: "actor-2",
      action: "REVOKE_DEVICE_SESSION",
      entity: "SurfboardUser",
      entityId: "target-1",
      changes: { familyId: "fam1", userEmail: "t@x.com" },
    });
  });

  it("is a 404 and writes no audit entry when that person has no such live sign-in", async () => {
    mockDevices.revokeDeviceSession.mockResolvedValue(0);

    await expect(
      revokeUserDevice(admin, "target-1", "someone-elses-family")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockAudit.logAuditAction).not.toHaveBeenCalled();
  });
});

describe("revokeAllUserDevices", () => {
  it("ends every sign-in and audits how many", async () => {
    mockDevices.revokeAllDeviceSessions.mockResolvedValue(3);

    expect(await revokeAllUserDevices(superadmin, "target-1")).toEqual({
      ended: 3,
    });
    expect(mockAudit.logAuditAction).toHaveBeenCalledWith({
      userId: "actor-1",
      action: "REVOKE_ALL_DEVICE_SESSIONS",
      entity: "SurfboardUser",
      entityId: "target-1",
      changes: { ended: 3, userEmail: "t@x.com" },
    });
  });
});
