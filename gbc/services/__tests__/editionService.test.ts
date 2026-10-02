import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the exactly-one-ACTIVE invariant (this service's own
 * business rule) and the public/admin stats split (no revenue vs. revenue).
 * gbc_editions is a real table now (see prisma/schema/gbc.prisma's
 * GBCEdition model) — mocks prisma.gBCEdition directly rather than
 * settingsService, which no longer carries editions at all.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCEdition: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gBCTicket: { count: vi.fn(), aggregate: vi.fn() },
  gBCSponsor: { findMany: vi.fn(), count: vi.fn() },
  gBCSpeaker: { findMany: vi.fn(), count: vi.fn() },
  gBCPartner: { count: vi.fn() },
  gBCEventStats: { count: vi.fn() },
  gBCAuditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const {
  getEditions,
  getActiveEdition,
  getCurrentEdition,
  getEditionPublicRecap,
  getEditionAdminStats,
  createEdition,
  activateEdition,
  archiveEdition,
  getDeletedEditions,
  softDeleteEdition,
  restoreEdition,
  permanentlyDeleteEdition,
} = await import("@/gbc/services/editionService");

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

const rows1_0 = row({
  key: "1.0",
  name: "GBC 1.0",
  theme: "T1",
  subTheme: "S1",
  venue: "V1",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-01"),
  status: "PAST",
  ticketPrefix: "GBC1",
});
const rows2_0 = row();

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.gBCEdition.findMany.mockResolvedValue([rows2_0, rows1_0]);
  mockPrisma.gBCEdition.findFirst.mockImplementation(async ({ where }: any) =>
    where?.status === "ACTIVE" ? rows2_0 : null
  );
  mockPrisma.gBCEdition.findUnique.mockImplementation(
    async ({ where }: any) => {
      if (where.key === "2.0") return rows2_0;
      if (where.key === "1.0") return rows1_0;
      return null;
    }
  );
  mockPrisma.gBCTicket.count.mockResolvedValue(0);
  mockPrisma.gBCTicket.aggregate.mockResolvedValue({ _sum: { price: 0 } });
  mockPrisma.gBCSponsor.findMany.mockResolvedValue([]);
  mockPrisma.gBCSpeaker.findMany.mockResolvedValue([]);
  mockPrisma.gBCSponsor.count.mockResolvedValue(0);
  mockPrisma.gBCSpeaker.count.mockResolvedValue(0);
  mockPrisma.gBCPartner.count.mockResolvedValue(0);
  mockPrisma.gBCEventStats.count.mockResolvedValue(0);
});

describe("status self-heals from dates on every read (getEditions)", () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const yesterday = new Date(Date.now() - ONE_DAY);
  const tomorrow = new Date(Date.now() + ONE_DAY);

  it("flips a non-active edition whose endDate has passed to PAST, and persists it", async () => {
    const stale = row({
      key: "1.0",
      status: "UPCOMING",
      startDate: yesterday,
      endDate: yesterday,
    });
    mockPrisma.gBCEdition.findMany.mockResolvedValue([stale]);

    const result = await getEditions();

    expect(result[0].status).toBe("PAST");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "1.0" },
      data: { status: "PAST" },
    });
  });

  it("flips a non-active edition whose dates are in the future to UPCOMING", async () => {
    const stale = row({
      key: "3.0",
      status: "PAST",
      startDate: tomorrow,
      endDate: tomorrow,
    });
    mockPrisma.gBCEdition.findMany.mockResolvedValue([stale]);

    const result = await getEditions();

    expect(result[0].status).toBe("UPCOMING");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "3.0" },
      data: { status: "UPCOMING" },
    });
  });

  it("never auto-touches an ACTIVE edition, even once its dates have passed", async () => {
    const activeButOver = row({
      key: "2.0",
      status: "ACTIVE",
      startDate: yesterday,
      endDate: yesterday,
    });
    mockPrisma.gBCEdition.findMany.mockResolvedValue([activeButOver]);

    const result = await getEditions();

    expect(result[0].status).toBe("ACTIVE");
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("does not write when the stored status already matches the derived one", async () => {
    const alreadyCorrect = row({
      key: "1.0",
      status: "PAST",
      startDate: yesterday,
      endDate: yesterday,
    });
    mockPrisma.gBCEdition.findMany.mockResolvedValue([alreadyCorrect]);

    await getEditions();

    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });
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

describe("getCurrentEdition (the edition the public site is about)", () => {
  it("is the ACTIVE edition when there is one, serialized like every other edition", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValueOnce(
      row({ key: "3.0", name: "GBC 3.0", ticketPrefix: "GBC3" })
    );
    await expect(getCurrentEdition()).resolves.toMatchObject({
      key: "3.0",
      name: "GBC 3.0",
      status: "ACTIVE",
      startDate: "2026-03-15T00:00:00.000Z",
    });
  });

  it("with nothing ACTIVE (production today), is the most recent PAST edition — never blank", async () => {
    mockPrisma.gBCEdition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row({ status: "PAST" }));
    await expect(getCurrentEdition()).resolves.toMatchObject({
      key: "2.0",
      name: "GBC 2.0",
      status: "PAST",
    });
    expect(mockPrisma.gBCEdition.findFirst).toHaveBeenLastCalledWith({
      where: { status: "PAST", deletedAt: null },
      orderBy: { startDate: "desc" },
    });
  });

  it("is null when no edition exists at all", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    await expect(getCurrentEdition()).resolves.toBeNull();
  });
});

describe("getEditionPublicRecap vs getEditionAdminStats", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(getEditionPublicRecap("9.0")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("public recap never includes revenue", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValue(42);
    mockPrisma.gBCTicket.aggregate.mockResolvedValue({
      _sum: { price: 999999 },
    });
    const result = await getEditionPublicRecap("2.0");
    expect(result).not.toHaveProperty("revenue");
    expect(result.attendeeCount).toBe(42);
  });

  it("admin stats includes revenue", async () => {
    mockPrisma.gBCTicket.aggregate.mockResolvedValue({
      _sum: { price: 500000 },
    });
    const result = await getEditionAdminStats("2.0");
    expect(result.revenue).toBe(500000);
  });
});

describe("createEdition", () => {
  it("throws ValidationError on a duplicate key", async () => {
    await expect(
      createEdition(
        {
          key: "2.0",
          name: "n",
          theme: "t",
          subTheme: "s",
          venue: "v",
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          ticketPrefix: "P",
        },
        "u1"
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("defaults status to UPCOMING and creates the row", async () => {
    mockPrisma.gBCEdition.findUnique.mockResolvedValueOnce(null);
    await createEdition(
      {
        key: "3.0",
        name: "n",
        theme: "t",
        subTheme: "s",
        venue: "v",
        startDate: "2026-01-01",
        endDate: "2026-01-01",
        ticketPrefix: "P",
      },
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
    await expect(activateEdition("9.0", "u1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("refuses to activate a second edition while one is already ACTIVE", async () => {
    await expect(activateEdition("1.0", "u1")).rejects.toMatchObject({
      status: 409,
    });
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("is a no-op when the target is already ACTIVE", async () => {
    await activateEdition("2.0", "u1");
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("activates cleanly once no edition is currently ACTIVE", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
    mockPrisma.gBCEdition.findUnique.mockImplementation(
      async ({ where }: any) =>
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
    await expect(archiveEdition("9.0", "u1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("marks the target PAST without touching other editions", async () => {
    await archiveEdition("2.0", "u1");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "2.0" },
      data: { status: "PAST" },
    });
  });
});

describe("softDeleteEdition", () => {
  it("throws NotFoundError for an unknown key", async () => {
    mockPrisma.gBCEdition.findUnique.mockResolvedValueOnce(null);
    await expect(softDeleteEdition("9.0", "u1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("refuses to delete the currently ACTIVE edition", async () => {
    await expect(softDeleteEdition("2.0", "u1")).rejects.toMatchObject({
      status: 409,
    });
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("sets deletedAt on a non-active edition", async () => {
    await softDeleteEdition("1.0", "u1");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "1.0" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("restoreEdition", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(restoreEdition("9.0", "u1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ValidationError when the edition isn't in the recycle bin", async () => {
    await expect(restoreEdition("1.0", "u1")).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.gBCEdition.update).not.toHaveBeenCalled();
  });

  it("clears deletedAt on a soft-deleted edition", async () => {
    mockPrisma.gBCEdition.findUnique.mockImplementation(
      async ({ where }: any) =>
        where.key === "1.0" ? { ...rows1_0, deletedAt: new Date() } : null
    );
    await restoreEdition("1.0", "u1");
    expect(mockPrisma.gBCEdition.update).toHaveBeenCalledWith({
      where: { key: "1.0" },
      data: { deletedAt: null },
    });
  });
});

describe("permanentlyDeleteEdition (blocked while anything still references it)", () => {
  it("throws NotFoundError for an unknown key", async () => {
    await expect(permanentlyDeleteEdition("9.0", "u1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ValidationError when the edition hasn't been soft-deleted first", async () => {
    await expect(permanentlyDeleteEdition("1.0", "u1")).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.gBCEdition.delete).not.toHaveBeenCalled();
  });

  it("refuses to purge a soft-deleted edition that still has tickets attached", async () => {
    mockPrisma.gBCEdition.findUnique.mockImplementation(
      async ({ where }: any) =>
        where.key === "1.0" ? { ...rows1_0, deletedAt: new Date() } : null
    );
    mockPrisma.gBCTicket.count.mockResolvedValue(3);
    await expect(permanentlyDeleteEdition("1.0", "u1")).rejects.toMatchObject({
      status: 409,
    });
    expect(mockPrisma.gBCEdition.delete).not.toHaveBeenCalled();
  });

  it("purges a soft-deleted edition once nothing references it", async () => {
    mockPrisma.gBCEdition.findUnique.mockImplementation(
      async ({ where }: any) =>
        where.key === "1.0" ? { ...rows1_0, deletedAt: new Date() } : null
    );
    mockPrisma.gBCEdition.findMany.mockResolvedValue([]);
    await permanentlyDeleteEdition("1.0", "u1");
    expect(mockPrisma.gBCEdition.delete).toHaveBeenCalledWith({
      where: { key: "1.0" },
    });
  });
});

describe("getDeletedEditions", () => {
  it("only returns rows with a deletedAt set", async () => {
    mockPrisma.gBCEdition.findMany.mockResolvedValue([
      { ...rows1_0, deletedAt: new Date("2026-01-01") },
    ]);
    const result = await getDeletedEditions();
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("1.0");
    expect(mockPrisma.gBCEdition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: { not: null } } })
    );
  });
});
