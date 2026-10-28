import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The mobile app's controls live inside the Surfboard settings row (TASK-0015
 * 1B, 1J.3). What matters here is that they change in one place only: saving,
 * resetting or reverting the other settings must leave a forced update and the
 * emergency switch exactly as they are.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardSettings: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));
const mockAudit = vi.hoisted(() => ({
  logAuditAction: vi.fn(),
  createChangeLog: vi.fn((changes: Record<string, unknown>) => changes),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/app/(projects)/(surfboard)/utils/auditLogger", () => mockAudit);
vi.mock("@/utils/email", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));

const {
  DEFAULT_MOBILE_APP_SETTINGS,
  getMobileAppSettings,
  normalizeMobileAppSettings,
  resetToDefaultSettings,
  revertToPreviousSettings,
  updateMobileAppSettings,
  updateSettings,
} = await import("@/surfboard/services/settingsService");

const forcedUpdate = {
  minimumAndroidVersion: "1.2.0",
  minimumIosVersion: "",
  androidStoreUrl: "https://play.example/x",
  iosStoreUrl: "",
  signInEnabled: false,
};

const storedRow = (settings: Record<string, unknown>) => ({
  id: "s1",
  settings,
  updatedAt: new Date("2026-10-25T10:00:00Z"),
});

/** What the last settings version written to the database holds. */
const written = () => {
  const call = mockPrisma.surfboardSettings.create.mock.calls.at(-1)![0];
  return call.data as {
    settings: Record<string, unknown>;
    previousSettings: Record<string, unknown>;
    updatedById: string;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.surfboardSettings.findFirst.mockResolvedValue(
    storedRow({ systemChargePercent: 12, mobileApp: forcedUpdate })
  );
  mockPrisma.surfboardSettings.create.mockResolvedValue({ id: "s2" });
});

describe("normalizeMobileAppSettings", () => {
  it.each([undefined, null, "text", 5, [], true])(
    "gives the no-op defaults for %j",
    (raw) => {
      expect(normalizeMobileAppSettings(raw)).toEqual(
        DEFAULT_MOBILE_APP_SETTINGS
      );
    }
  );

  it("defaults mean no minimum and sign-in on", () => {
    expect(DEFAULT_MOBILE_APP_SETTINGS).toEqual({
      minimumAndroidVersion: "",
      minimumIosVersion: "",
      androidStoreUrl: "",
      iosStoreUrl: "",
      signInEnabled: true,
    });
  });

  it("keeps good values, trimmed", () => {
    expect(
      normalizeMobileAppSettings({
        ...forcedUpdate,
        minimumIosVersion: " 2.0.0 ",
      })
    ).toEqual({ ...forcedUpdate, minimumIosVersion: "2.0.0" });
  });

  it("never lets a wrong type turn the gate on or sign-in off", () => {
    expect(
      normalizeMobileAppSettings({
        minimumAndroidVersion: 5,
        minimumIosVersion: { a: 1 },
        androidStoreUrl: null,
        iosStoreUrl: ["x"],
        signInEnabled: "false",
      })
    ).toEqual(DEFAULT_MOBILE_APP_SETTINGS);
  });
});

describe("getMobileAppSettings", () => {
  it("reads the stored controls", async () => {
    expect(await getMobileAppSettings()).toEqual(forcedUpdate);
  });

  it("is the no-op defaults when nothing is stored, or the row predates the controls", async () => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValueOnce(null);
    expect(await getMobileAppSettings()).toEqual(DEFAULT_MOBILE_APP_SETTINGS);

    mockPrisma.surfboardSettings.findFirst.mockResolvedValueOnce(
      storedRow({ systemChargePercent: 12 })
    );
    expect(await getMobileAppSettings()).toEqual(DEFAULT_MOBILE_APP_SETTINGS);
  });
});

describe("updateMobileAppSettings", () => {
  it("changes only what is sent and keeps the rest, as a new version", async () => {
    const result = await updateMobileAppSettings("admin-1", {
      minimumIosVersion: "2.0.0",
    });

    expect(result).toEqual({ ...forcedUpdate, minimumIosVersion: "2.0.0" });
    const data = written();
    expect(data.settings.mobileApp).toEqual(result);
    expect(data.settings.systemChargePercent).toBe(12);
    expect(data.previousSettings).toEqual(
      storedRow({ systemChargePercent: 12, mobileApp: forcedUpdate }).settings
    );
    expect(data.updatedById).toBe("admin-1");
  });

  it("can switch sign-in back on and clear a minimum", async () => {
    const result = await updateMobileAppSettings("admin-1", {
      signInEnabled: true,
      minimumAndroidVersion: "",
    });

    expect(result).toMatchObject({
      signInEnabled: true,
      minimumAndroidVersion: "",
    });
  });

  it("writes an audit entry that names the change and the admin", async () => {
    await updateMobileAppSettings("admin-1", { signInEnabled: true });

    expect(mockAudit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        action: "UPDATE_MOBILE_APP_SETTINGS",
        entity: "SurfboardSettings",
        entityId: "s2",
        changes: {
          minimumAndroidVersion: "1.2.0",
          minimumIosVersion: "none",
          signInEnabled: true,
        },
      })
    );
  });

  it("starts from the defaults when nothing is stored", async () => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue(null);

    expect(
      await updateMobileAppSettings("admin-1", { minimumAndroidVersion: "1.0" })
    ).toEqual({ ...DEFAULT_MOBILE_APP_SETTINGS, minimumAndroidVersion: "1.0" });
    expect(written().previousSettings).toEqual({});
  });
});

describe("the other settings actions leave the mobile controls alone", () => {
  it("saving the settings page keeps the stored controls, whatever the page sends", async () => {
    const page = { zoneFees: [], systemChargePercent: 15 } as never;
    await updateSettings("admin-1", page);
    expect(written().settings.mobileApp).toEqual(forcedUpdate);

    await updateSettings("admin-1", {
      zoneFees: [],
      systemChargePercent: 15,
      mobileApp: DEFAULT_MOBILE_APP_SETTINGS,
    } as never);
    expect(written().settings.mobileApp).toEqual(forcedUpdate);
    expect(written().settings.systemChargePercent).toBe(15);
  });

  it("resetting to default keeps the stored controls", async () => {
    await resetToDefaultSettings("admin-1");

    const data = written();
    expect(data.settings.mobileApp).toEqual(forcedUpdate);
    expect(data.settings.systemChargePercent).toBe(10);
  });

  it("reverting to an earlier version keeps the current controls", async () => {
    mockPrisma.surfboardSettings.findUnique.mockResolvedValue({
      id: "old",
      settings: { systemChargePercent: 99, mobileApp: forcedUpdate },
      previousSettings: {
        systemChargePercent: 8,
        mobileApp: { ...forcedUpdate, minimumAndroidVersion: "0.5.0" },
      },
    });

    await revertToPreviousSettings("admin-1", "old");

    const data = written();
    expect(data.settings.systemChargePercent).toBe(8);
    expect(data.settings.mobileApp).toEqual(forcedUpdate);
  });

  it("reverting to a version from before the controls existed keeps them too", async () => {
    mockPrisma.surfboardSettings.findUnique.mockResolvedValue({
      id: "old",
      settings: { systemChargePercent: 99 },
      previousSettings: null,
    });

    await revertToPreviousSettings("admin-1", "old");

    expect(written().settings).toEqual({ mobileApp: forcedUpdate });
  });
});
