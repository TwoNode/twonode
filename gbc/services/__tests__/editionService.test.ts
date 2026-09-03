import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the exactly-one-ACTIVE invariant (this service's own
 * business rule) and the public/admin stats split (no revenue vs. revenue).
 * gbc_editions is a real table now (see prisma/schema/gbc.prisma's
 * GBCEdition model) — mocks prisma.gBCEdition directly rather than
 * settingsService, which no longer carries editions at all.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCEdition: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  gBCTicket: { count: vi.fn(), aggregate: vi.fn() },
  gBCSponsor: { findMany: vi.fn() },
  gBCSpeaker: { findMany: vi.fn() },
  gBCAuditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getActiveEdition, getEditionPublicRecap, getEditionAdminStats, createEdition, activateEdition, archiveEdition } =
  await import("@/gbc/services/editionService");

const row = (overrides: Partial<Record<string, unknown>> = {}) => ({
  key: "2.0",
  name: "GBC 2.0",
  theme: "T2",
  subTheme: "S2",
  venue: "V2",
  startDate: new Date("2026-03-15"),
  endDate: new Date("2026-03-15"),
  status: "ACTIVE",
  ticketPrefix: "GBC2",
  ...overrides,
});

const rows1_0 = row({ key: "1.0", name: "GBC 1.0", theme: "T1", subTheme: "S1", venue: "V1", startDate: new Date("2025-01-01"), endDate: new Date("2025-01-01"), status: "PAST", ticketPrefix: "GBC1" });
const rows2_0 = row();

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.gBCEdition.findMany.mockResolvedValue([rows2_0, rows1_0]);
  mockPrisma.gBCEdition.findFirst.mockImplementation(async ({ where }: any) =>
    where?.status === "ACTIVE" ? rows2_0 : null
  );
  mockPrisma.gBCEdition.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.key === "2.0") return rows2_0;
    if (where.key === "1.0") return rows1_0;
    return null;
  });
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
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
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
      createEdition({ key: "2.0", name: "n", theme: "t", subTheme: "s", venue: "v", startDate: "2026-01-01", endDate: "2026-01-01", ticketPrefix: "P" }, "u1")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("defaults status to UPCOMING and creates the row", async () => {
    mockPrisma.gBCEdition.findUnique.mockResolvedValueOnce(null);
    await createEdition(
      { key: "3.0", name: "n", theme: "t", subTheme: "s", venue: "v", startDate: "2026-01-01", endDate: "2026-01-01", ticketPrefix: "P" },
      "u1"
    );
    expect(mockPrisma.gBCEdition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ key: "3.0", status: "UPCOMING" }),
    });
  });
});

describe("activateEdition (exactly-one-ACTIVE invariant)", () => {
  it("throws NotFoundError for an unknown key", async () => {
    mockPrisma.gBCEdition.findUnique.mockResolvedValueOnce(null);
    await expect(activateEdition("9.0", "u1")).rejects.toMatchObject({ status: 404 });
  });

  it("refuses to activate a second edition while one is already ACTIVE", async () => {
    await expect(activateEdition("1.0", "u1")).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("is a no-op when the target is already ACTIVE", async () => {
    await activateEdition("2.0", "u1");
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("activates cleanly once no edition is currently ACTIVE", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    mockPrisma.gBCEdition.findUnique.mockImplementation(async ({ where }: any) =>
      where.key === "2.0" ? row({ status: "PAST" }) : null
    );
    await activateEdition("2.0", "u1");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "2.0" },
      data: { status: "ACTIVE" },
    });
  });
});

describe("archiveEdition", () => {
  it("throws NotFoundError for an unknown key", async () => {
    mockPrisma.gBCEdition.findUnique.mockResolvedValueOnce(null);
    await expect(archiveEdition("9.0", "u1")).rejects.toMatchObject({ status: 404 });
  });

  it("marks the target PAST without touching other editions", async () => {
    await archiveEdition("2.0", "u1");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "2.0" },
      data: { status: "PAST" },
    });
  });
});
