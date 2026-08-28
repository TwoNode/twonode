import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward what changed: updateSettings' shallow per-section merge
 * (replacing the source's 4 wrappers around path-navigation logic) must
 * preserve untouched fields within a patched section and leave other
 * sections alone entirely, plus rollback's current<->previous swap.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCSettings: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  gBCAuditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getSettings, updateSettings, resetToDefaults, rollback, getPreviousSettings } = await import(
  "@/gbc/services/settingsService"
);
const { defaultSettings } = await import("@/app/(projects)/(GBC)/utils/settings");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSettings", () => {
  it("initializes defaults when no record exists yet", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue(null);
    mockPrisma.gBCSettings.create.mockResolvedValue({});
    const result = await getSettings();
    expect(result).toEqual(defaultSettings);
    expect(mockPrisma.gBCSettings.create).toHaveBeenCalled();
  });

  it("merges a saved record's fields over the defaults, filling in any missing ones", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({
      settings: { event: { name: "GBC 3.0" } },
    });
    const result = await getSettings();
    expect(result.event.name).toBe("GBC 3.0");
    expect(result.event.venue).toBe(defaultSettings.event.venue);
    expect(result.tickets).toEqual(defaultSettings.tickets);
  });
});

describe("updateSettings", () => {
  it("throws ValidationError for an unknown section", async () => {
    await expect(updateSettings({ bogus: { x: 1 } } as any, "u1")).rejects.toMatchObject({ status: 400 });
  });

  it("merges the patch into only the given section, leaving other fields and sections untouched", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({
      id: "s1",
      settings: { event: { name: "GBC 2.0", venue: "Lagos" }, tickets: { maxCapacity: 500 } },
    });
    mockPrisma.gBCSettings.update.mockResolvedValue({ settings: {} });

    await updateSettings({ event: { name: "GBC 3.0" } }, "u1");

    expect(mockPrisma.gBCSettings.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({
        settings: expect.objectContaining({
          event: expect.objectContaining({ name: "GBC 3.0", venue: "Lagos" }),
          tickets: expect.objectContaining({ maxCapacity: 500 }),
        }),
      }),
    });
  });

  it("audit-logs the update with the acting user's id", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({ id: "s1", settings: {} });
    mockPrisma.gBCSettings.update.mockResolvedValue({ id: "s1", settings: {} });

    await updateSettings({ event: { name: "GBC 3.0" } }, "admin-1");

    expect(mockPrisma.gBCAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "admin-1", action: "UPDATE_SETTINGS" }) })
    );
  });
});

describe("getPreviousSettings", () => {
  it("throws NotFoundError when no settings record exists at all", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue(null);
    await expect(getPreviousSettings()).rejects.toMatchObject({ status: 404 });
  });

  it("returns null (not an error) when a record exists but has never been updated", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({ previousSettings: null });
    await expect(getPreviousSettings()).resolves.toBeNull();
  });
});

describe("rollback", () => {
  it("throws ValidationError when there's nothing to roll back to", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({ previousSettings: null });
    await expect(rollback("u1")).rejects.toMatchObject({ status: 400 });
  });

  it("swaps current and previous settings", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({
      id: "s1",
      settings: { event: { name: "current" } },
      previousSettings: { event: { name: "previous" } },
    });
    mockPrisma.gBCSettings.update.mockResolvedValue({ settings: { event: { name: "previous" } } });

    await rollback("u1");

    expect(mockPrisma.gBCSettings.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: {
        settings: { event: { name: "previous" } },
        previousSettings: expect.objectContaining({ event: expect.objectContaining({ name: "current" }) }),
      },
    });
  });
});

describe("resetToDefaults", () => {
  it("writes the default settings and audit-logs a RESET_SETTINGS action", async () => {
    mockPrisma.gBCSettings.findFirst.mockResolvedValue({ id: "s1", settings: {} });
    mockPrisma.gBCSettings.update.mockResolvedValue({ id: "s1", settings: defaultSettings });

    await resetToDefaults("superadmin-1");

    expect(mockPrisma.gBCSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ settings: defaultSettings }) })
    );
    expect(mockPrisma.gBCAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "RESET_SETTINGS" }) })
    );
  });
});
