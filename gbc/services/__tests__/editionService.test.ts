import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the exactly-one-ACTIVE invariant (new business rule this
 * service owns) and the public/admin stats split (no revenue vs. revenue).
 */

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: { count: vi.fn(), aggregate: vi.fn() },
  gBCSponsor: { findMany: vi.fn() },
  gBCSpeaker: { findMany: vi.fn() },
}));

const mockSettingsService = vi.hoisted(() => ({
  getSettings: vi.fn(),
  replaceEditions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/services/settingsService", () => mockSettingsService);

const { getActiveEdition, getEditionPublicRecap, getEditionAdminStats, createEdition, activateEdition, archiveEdition } =
  await import("@/gbc/services/editionService");

const editions = [
  { key: "1.0", name: "GBC 1.0", theme: "T1", subTheme: "S1", venue: "V1", startDate: "2025-01-01", endDate: "2025-01-01", status: "PAST", ticketPrefix: "GBC1" },
  { key: "2.0", name: "GBC 2.0", theme: "T2", subTheme: "S2", venue: "V2", startDate: "2026-03-15", endDate: "2026-03-15", status: "ACTIVE", ticketPrefix: "GBC2" },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mockSettingsService.getSettings.mockResolvedValue({ editions: [...editions] });
  mockPrisma.gBCTicket.count.mockResolvedValue(0);
  mockPrisma.gBCTicket.aggregate.mockResolvedValue({ _sum: { price: 0 } });
  mockPrisma.gBCSponsor.findMany.mockResolvedValue([]);
  mockPrisma.gBCSpeaker.findMany.mockResolvedValue([]);
});

describe("getActiveEdition", () => {
  it("returns the entry marked ACTIVE", async () => {
    const result = await getActiveEdition();
    expect(result?.key).toBe("2.0");
  });

  it("returns null when nothing is marked ACTIVE", async () => {
    mockSettingsService.getSettings.mockResolvedValue({ editions: [{ ...editions[0] }] });
    const result = await getActiveEdition();
    expect(result).toBeNull();
  });
});

describe("getEditionPublicRecap vs getEditionAdminStats", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(getEditionPublicRecap("9.0")).rejects.toMatchObject({ status: 404 });
  });

  it("public recap never includes revenue", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValue(42);
    mockPrisma.gBCTicket.aggregate.mockResolvedValue({ _sum: { price: 999999 } });
    const result = await getEditionPublicRecap("2.0");
    expect(result).not.toHaveProperty("revenue");
    expect(result.attendeeCount).toBe(42);
  });

  it("admin stats includes revenue", async () => {
    mockPrisma.gBCTicket.aggregate.mockResolvedValue({ _sum: { price: 500000 } });
    const result = await getEditionAdminStats("2.0");
    expect(result.revenue).toBe(500000);
  });
});

describe("createEdition", () => {
  it("throws ValidationError on a duplicate key", async () => {
    await expect(
      createEdition({ key: "2.0", name: "n", theme: "t", subTheme: "s", venue: "v", startDate: "d", endDate: "d", ticketPrefix: "P" }, "u1")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("defaults status to UPCOMING and appends to the existing list", async () => {
    mockSettingsService.replaceEditions.mockResolvedValue([]);
    await createEdition(
      { key: "3.0", name: "n", theme: "t", subTheme: "s", venue: "v", startDate: "d", endDate: "d", ticketPrefix: "P" },
      "u1"
    );
    expect(mockSettingsService.replaceEditions).toHaveBeenCalledWith(
      [...editions, expect.objectContaining({ key: "3.0", status: "UPCOMING" })],
      "u1",
      "CREATE_EDITION"
    );
  });
});

describe("activateEdition (exactly-one-ACTIVE invariant)", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(activateEdition("9.0", "u1")).rejects.toMatchObject({ status: 404 });
  });

  it("refuses to activate a second edition while one is already ACTIVE", async () => {
    await expect(activateEdition("1.0", "u1")).rejects.toMatchObject({ status: 409 });
    expect(mockSettingsService.replaceEditions).not.toHaveBeenCalled();
  });

  it("is a no-op when the target is already ACTIVE", async () => {
    await activateEdition("2.0", "u1");
    expect(mockSettingsService.replaceEditions).not.toHaveBeenCalled();
  });

  it("activates cleanly once no edition is currently ACTIVE", async () => {
    mockSettingsService.getSettings.mockResolvedValue({
      editions: [{ ...editions[0] }, { ...editions[1], status: "PAST" }],
    });
    mockSettingsService.replaceEditions.mockResolvedValue([]);
    await activateEdition("2.0", "u1");
    expect(mockSettingsService.replaceEditions).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ key: "2.0", status: "ACTIVE" })]),
      "u1",
      "ACTIVATE_EDITION"
    );
  });
});

describe("archiveEdition", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(archiveEdition("9.0", "u1")).rejects.toMatchObject({ status: 404 });
  });

  it("marks the target PAST without touching other editions", async () => {
    mockSettingsService.replaceEditions.mockResolvedValue([]);
    await archiveEdition("2.0", "u1");
    expect(mockSettingsService.replaceEditions).toHaveBeenCalledWith(
      [editions[0], { ...editions[1], status: "PAST" }],
      "u1",
      "ARCHIVE_EDITION"
    );
  });
});
