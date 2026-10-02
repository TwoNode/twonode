import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Settings are one row per edition. What matters: which edition a call means
 * (supplied → ACTIVE → most recent PAST → earliest UPCOMING), that reads never
 * write, that an edition with no row reads as defaults carrying its own event
 * details, that a save creates/updates only that edition's row, and that the
 * existing per-section merge and rollback semantics survive.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCEdition: { findFirst: vi.fn() },
  gBCSettings: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));
const mockAudit = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/audit", () => mockAudit);

const {
  getSettings,
  getEditionSettings,
  resolveSettingsEdition,
  updateSettings,
  resetToDefaults,
  rollback,
  getPreviousSettings,
} = await import("@/gbc/services/settingsService");
const { defaultSettings } = await import("@/gbc/utils/settings");

const edition = (key: string, over: Record<string, unknown> = {}) => ({
  key,
  name: `GBC ${key}`,
  theme: `Theme ${key}`,
  subTheme: `Sub ${key}`,
  venue: `Venue ${key}`,
  startDate: new Date("2027-05-20T00:00:00Z"),
  status: "ACTIVE",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: 2.0 is the edition every call resolves to.
  mockPrisma.gBCEdition.findFirst.mockResolvedValue(edition("2.0"));
  mockPrisma.gBCSettings.findUnique.mockResolvedValue(null);
});

describe("resolveSettingsEdition", () => {
  it("uses the supplied edition when it exists and isn't deleted", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(edition("1.0"));
    await expect(resolveSettingsEdition("1.0")).resolves.toMatchObject({
      key: "1.0",
    });
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenCalledWith({
      where: { key: "1.0", deletedAt: null },
    });
  });

  it("404s for an unknown or deleted supplied edition", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    await expect(resolveSettingsEdition("9.9")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("prefers the ACTIVE edition", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValueOnce(edition("3.0"));
    await expect(resolveSettingsEdition()).resolves.toMatchObject({
      key: "3.0",
    });
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenCalledWith({
      where: { status: "ACTIVE", deletedAt: null },
    });
  });

  it("with no ACTIVE edition, falls back to the most recent PAST one (production has none active)", async () => {
    mockPrisma.gBCEdition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(edition("2.0", { status: "PAST" }));
    await expect(resolveSettingsEdition()).resolves.toMatchObject({
      key: "2.0",
    });
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenLastCalledWith({
      where: { status: "PAST", deletedAt: null },
      orderBy: { startDate: "desc" },
    });
  });

  it("with neither, takes the earliest remaining edition, and null when none exist", async () => {
    mockPrisma.gBCEdition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(edition("4.0", { status: "UPCOMING" }));
    await expect(resolveSettingsEdition()).resolves.toMatchObject({
      key: "4.0",
    });
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenLastCalledWith({
      where: { deletedAt: null },
      orderBy: { startDate: "asc" },
    });

    mockPrisma.gBCEdition.findFirst.mockReset();
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    await expect(resolveSettingsEdition()).resolves.toBeNull();
  });
});

describe("getSettings / getEditionSettings", () => {
  it("never writes: an edition with no row reads as defaults and nothing is created", async () => {
    const result = await getEditionSettings();
    expect(result).toMatchObject({ edition: "2.0", saved: false });
    expect(mockPrisma.gBCSettings.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.gBCSettings.update).not.toHaveBeenCalled();
  });

  it("an unsaved edition's defaults carry that edition's own name, theme, venue and start date", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(edition("3.0"));
    const settings = await getSettings();
    expect(settings.event).toMatchObject({
      name: "GBC 3.0",
      theme: "Theme 3.0",
      subTheme: "Sub 3.0",
      venue: "Venue 3.0",
      date: "2027-05-20",
    });
    expect(settings.tickets).toEqual(defaultSettings.tickets);
    expect(settings.contact).toEqual(defaultSettings.contact);
  });

  it("looks up the row of the resolved edition only", async () => {
    await getSettings();
    expect(mockPrisma.gBCSettings.findUnique).toHaveBeenCalledWith({
      where: { edition: "2.0" },
    });
  });

  it("merges a saved row over the defaults, filling in any missing fields", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      settings: { event: { name: "Custom name" } },
    });
    const result = await getEditionSettings();
    expect(result.saved).toBe(true);
    expect(result.settings.event.name).toBe("Custom name");
    expect(result.settings.event.venue).toBe("Venue 2.0");
    expect(result.settings.tickets).toEqual(defaultSettings.tickets);
  });

  it("with no editions at all, returns the generic defaults tied to no edition", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    await expect(getEditionSettings()).resolves.toEqual({
      edition: null,
      settings: defaultSettings,
      saved: false,
    });
  });
});

describe("updateSettings", () => {
  beforeEach(() => {
    mockPrisma.gBCSettings.upsert.mockImplementation(
      async ({ create, update }: any) => ({
        id: "row-1",
        settings: (update ?? create).settings,
      })
    );
  });

  it("throws ValidationError for an unknown section", async () => {
    await expect(
      updateSettings({ bogus: { x: 1 } } as any, "u1")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("merges the patch into only the given section, leaving other fields and sections untouched", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      id: "row-1",
      settings: {
        event: { name: "GBC 2.0", venue: "Lagos" },
        tickets: { maxCapacity: 500 },
      },
    });

    await updateSettings({ event: { name: "GBC 3.0" } }, "u1");

    const written =
      mockPrisma.gBCSettings.upsert.mock.calls[0][0].update.settings;
    expect(written.event.name).toBe("GBC 3.0");
    expect(written.event.venue).toBe("Lagos");
    expect(written.tickets.maxCapacity).toBe(500);
  });

  it("writes only the target edition's row, keeping the old value as previousSettings", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      id: "row-1",
      settings: { event: { name: "Old" } },
    });

    await updateSettings({ event: { name: "New" } }, "u1", "2.0");

    const args = mockPrisma.gBCSettings.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ edition: "2.0" });
    expect(args.update.previousSettings).toEqual({ event: { name: "Old" } });
  });

  it("the first save for an edition creates its row, from that edition's defaults plus the patch", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(edition("3.0"));

    await updateSettings({ tickets: { maxCapacity: 250 } }, "u1", "3.0");

    const args = mockPrisma.gBCSettings.upsert.mock.calls[0][0];
    expect(args.create.edition).toBe("3.0");
    expect(args.create.settings.tickets.maxCapacity).toBe(250);
    expect(args.create.settings.event.name).toBe("GBC 3.0");
    // and there is no "previous" to keep yet
    expect(args.update.previousSettings).toBeDefined();
    expect(args.update.previousSettings).not.toEqual(
      expect.objectContaining({ event: expect.anything() })
    );
  });

  it("refuses to save when there is no edition to attach the settings to", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    await expect(
      updateSettings({ event: { name: "X" } }, "u1")
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.gBCSettings.upsert).not.toHaveBeenCalled();
  });

  it("audit-logs the update with the acting user's id and the edition", async () => {
    await updateSettings({ event: { name: "New" } }, "user-42");
    expect(mockAudit.writeAudit).toHaveBeenCalledWith(
      "gbc",
      expect.objectContaining({
        userId: "user-42",
        action: "UPDATE_SETTINGS",
        entity: "GBCSettings",
        entityId: "row-1",
        changes: expect.objectContaining({ edition: "2.0" }),
      })
    );
  });
});

describe("getPreviousSettings", () => {
  it("returns null when the edition has no row yet", async () => {
    await expect(getPreviousSettings()).resolves.toBeNull();
  });

  it("returns null when the row has never been changed", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      settings: {},
      previousSettings: null,
    });
    await expect(getPreviousSettings()).resolves.toBeNull();
  });

  it("returns the previous settings of that edition", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      previousSettings: { event: { name: "Before" } },
    });
    await expect(getPreviousSettings("2.0")).resolves.toEqual({
      event: { name: "Before" },
    });
    expect(mockPrisma.gBCSettings.findUnique).toHaveBeenCalledWith({
      where: { edition: "2.0" },
    });
  });
});

describe("rollback", () => {
  it("throws ValidationError when there's nothing to roll back to", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      id: "row-1",
      settings: {},
      previousSettings: null,
    });
    await expect(rollback("u1")).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.gBCSettings.update).not.toHaveBeenCalled();
  });

  it("swaps current and previous for that edition's row, and audits it", async () => {
    mockPrisma.gBCSettings.findUnique.mockResolvedValue({
      id: "row-1",
      settings: { event: { name: "Current" } },
      previousSettings: { event: { name: "Previous" } },
    });
    mockPrisma.gBCSettings.update.mockResolvedValue({
      id: "row-1",
      settings: { event: { name: "Previous" } },
    });

    const result = await rollback("u1", "2.0");

    const args = mockPrisma.gBCSettings.update.mock.calls[0][0];
    expect(args.where).toEqual({ edition: "2.0" });
    expect(args.data.settings).toEqual({ event: { name: "Previous" } });
    expect(args.data.previousSettings.event.name).toBe("Current");
    expect(result).toEqual({ event: { name: "Previous" } });
    expect(mockAudit.writeAudit).toHaveBeenCalledWith(
      "gbc",
      expect.objectContaining({
        action: "ROLLBACK_SETTINGS",
        changes: expect.objectContaining({ edition: "2.0" }),
      })
    );
  });
});

describe("resetToDefaults", () => {
  it("resets that edition to defaults carrying its own event details, and audits RESET_SETTINGS", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(edition("3.0"));
    mockPrisma.gBCSettings.upsert.mockImplementation(
      async ({ update }: any) => ({ id: "row-1", settings: update.settings })
    );

    await resetToDefaults("u1", "3.0");

    const args = mockPrisma.gBCSettings.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ edition: "3.0" });
    expect(args.update.settings.event.name).toBe("GBC 3.0");
    expect(args.update.settings.tickets).toEqual(defaultSettings.tickets);
    expect(mockAudit.writeAudit).toHaveBeenCalledWith(
      "gbc",
      expect.objectContaining({ action: "RESET_SETTINGS" })
    );
  });
});
