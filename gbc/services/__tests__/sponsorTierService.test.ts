import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { Platform } from "@/utils/platform";

const mockPrisma = vi.hoisted(() => ({
  gBCSponsorTier: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gBCSponsor: { count: vi.fn() },
  $transaction: vi.fn(),
}));
const mockWriteAudit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/audit", () => ({ writeAudit: mockWriteAudit }));

import {
  assertSponsorTierExists,
  createSponsorTier,
  deleteSponsorTier,
  getSponsorTiersWithCounts,
  reorderSponsorTiers,
  updateSponsorTier,
} from "@/gbc/services/sponsorTierService";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((ops: unknown[]) =>
    Promise.all(ops)
  );
});

describe("createSponsorTier", () => {
  it("derives a stable key from the name and puts the tier last", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue(null);
    mockPrisma.gBCSponsorTier.findFirst.mockResolvedValue({ order: 2 });
    mockPrisma.gBCSponsorTier.create.mockImplementation(
      async ({ data }) => data
    );

    const tier = await createSponsorTier(
      { name: "  Gold Partner ", description: " Thank you ", size: "FEATURED" },
      "admin-1"
    );

    expect(tier).toMatchObject({
      key: "GOLD_PARTNER",
      name: "Gold Partner",
      size: "FEATURED",
      description: "Thank you",
      order: 3,
    });
    expect(mockWriteAudit).toHaveBeenCalledWith(
      Platform.GBC,
      expect.objectContaining({
        userId: "admin-1",
        action: "CREATE_SPONSOR_TIER",
        entityId: "GOLD_PARTNER",
      })
    );
  });

  it("starts at order 0 when there are no tiers yet, and defaults to STANDARD", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue(null);
    mockPrisma.gBCSponsorTier.findFirst.mockResolvedValue(null);
    mockPrisma.gBCSponsorTier.create.mockImplementation(
      async ({ data }) => data
    );
    expect(await createSponsorTier({ name: "First" })).toMatchObject({
      order: 0,
      size: "STANDARD",
      description: null,
    });
  });

  it("refuses a name that maps to an existing tier", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue({ key: "GOLD" });
    await expect(createSponsorTier({ name: "gold" })).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(mockPrisma.gBCSponsorTier.create).not.toHaveBeenCalled();
  });

  it("rejects names that are too short, all symbols, or an unknown size", async () => {
    await expect(createSponsorTier({ name: "A" })).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(createSponsorTier({ name: "!!!" })).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(
      createSponsorTier({ name: "Gold", size: "HUGE" })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockPrisma.gBCSponsorTier.create).not.toHaveBeenCalled();
  });
});

describe("updateSponsorTier", () => {
  it("renames without touching the key", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue({ key: "GOLD" });
    mockPrisma.gBCSponsorTier.update.mockImplementation(
      async ({ data }) => data
    );
    await updateSponsorTier("GOLD", { name: " Platinum ", description: "" });
    expect(mockPrisma.gBCSponsorTier.update).toHaveBeenCalledWith({
      where: { key: "GOLD" },
      data: { name: "Platinum", description: null },
    });
  });

  it("404s for an unknown tier", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue(null);
    await expect(
      updateSponsorTier("NOPE", { name: "X Y" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("reorderSponsorTiers", () => {
  beforeEach(() => {
    mockPrisma.gBCSponsorTier.findMany.mockResolvedValue([
      { key: "A", name: "A", order: 0 },
      { key: "B", name: "B", order: 1 },
      { key: "C", name: "C", order: 2 },
    ]);
    mockPrisma.gBCSponsorTier.update.mockResolvedValue({});
  });

  it("writes each tier's position", async () => {
    await reorderSponsorTiers(["C", "A", "B"]);
    expect(
      mockPrisma.gBCSponsorTier.update.mock.calls.map((c) => [
        c[0].where.key,
        c[0].data.order,
      ])
    ).toEqual([
      ["C", 0],
      ["A", 1],
      ["B", 2],
    ]);
  });

  it("refuses a list that misses, repeats or invents a tier", async () => {
    await expect(reorderSponsorTiers(["A", "B"])).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(reorderSponsorTiers(["A", "A", "B"])).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(reorderSponsorTiers(["A", "B", "Z"])).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("deleteSponsorTier", () => {
  it("refuses while sponsors are in the tier, saying how many", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue({ key: "GOLD" });
    mockPrisma.gBCSponsor.count.mockResolvedValue(3);
    await expect(deleteSponsorTier("GOLD")).rejects.toThrow(
      /3 sponsors are still in this tier/
    );
    expect(mockPrisma.gBCSponsorTier.delete).not.toHaveBeenCalled();
  });

  it("uses singular wording for one sponsor", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue({ key: "GOLD" });
    mockPrisma.gBCSponsor.count.mockResolvedValue(1);
    await expect(deleteSponsorTier("GOLD")).rejects.toThrow(
      /1 sponsor is still in this tier/
    );
  });

  it("deletes an unused tier and audits it", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue({ key: "GOLD" });
    mockPrisma.gBCSponsor.count.mockResolvedValue(0);
    await deleteSponsorTier("GOLD", "admin-1");
    expect(mockPrisma.gBCSponsorTier.delete).toHaveBeenCalledWith({
      where: { key: "GOLD" },
    });
    expect(mockWriteAudit).toHaveBeenCalledWith(
      Platform.GBC,
      expect.objectContaining({
        action: "DELETE_SPONSOR_TIER",
        entityId: "GOLD",
      })
    );
  });

  it("404s for an unknown tier", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValue(null);
    await expect(deleteSponsorTier("NOPE")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("getSponsorTiersWithCounts", () => {
  it("returns tiers in display order with a sponsor count each", async () => {
    mockPrisma.gBCSponsorTier.findMany.mockResolvedValue([
      { key: "B", name: "Bravo", order: 1, _count: { sponsors: 4 } },
      { key: "A", name: "Alpha", order: 0, _count: { sponsors: 0 } },
    ]);
    expect(await getSponsorTiersWithCounts()).toEqual([
      { key: "A", name: "Alpha", order: 0, sponsorCount: 0 },
      { key: "B", name: "Bravo", order: 1, sponsorCount: 4 },
    ]);
  });
});

describe("assertSponsorTierExists", () => {
  it("passes for a real tier and gives a field error for an unknown one", async () => {
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValueOnce({ key: "GOLD" });
    await expect(assertSponsorTierExists("GOLD")).resolves.toBeUndefined();
    mockPrisma.gBCSponsorTier.findUnique.mockResolvedValueOnce(null);
    await expect(assertSponsorTierExists("NOPE")).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});
