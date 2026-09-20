import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One implementation reads all three products' audit tables. What matters:
 * each platform hits its own log AND user table (an actor id from one product
 * must never be looked up in another's), the filters reach the query, and an
 * entry whose actor no longer exists still comes back.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCAuditLog: { count: vi.fn(), findMany: vi.fn() },
  surfboardAuditLog: { count: vi.fn(), findMany: vi.fn() },
  revaAuditLog: { count: vi.fn(), findMany: vi.fn() },
  gBCUser: { findMany: vi.fn() },
  surfboardUser: { findMany: vi.fn() },
  revaUser: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { listAuditLogs, getAuditLogFilterOptions } = await import("@/lib/auditLogs");
const { Platform } = await import("@/utils/platform");

const row = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "actor-1",
  action: "INVITE_ADMIN",
  entity: "AdminInvitation",
  entityId: "inv-1",
  changes: null,
  ipAddress: "10.0.0.1",
  userAgent: null,
  createdAt: new Date("2026-09-20T10:00:00Z"),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAuditLogs — which tables each platform reads", () => {
  it.each([
    [Platform.GBC, "gBCAuditLog", "gBCUser"],
    [Platform.SURFBOARD, "surfboardAuditLog", "surfboardUser"],
    [Platform.REVA, "revaAuditLog", "revaUser"],
  ] as const)("%s reads %s and looks actors up in %s", async (platform, logTable, userTable) => {
    mockPrisma[logTable].count.mockResolvedValue(1);
    mockPrisma[logTable].findMany.mockResolvedValue([row()]);
    mockPrisma[userTable].findMany.mockResolvedValue([
      { id: "actor-1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
    ]);

    const result = await listAuditLogs(platform);

    expect(result.data[0].user).toEqual({ firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" });
    for (const other of ["gBCAuditLog", "surfboardAuditLog", "revaAuditLog"] as const) {
      if (other !== logTable) expect(mockPrisma[other].findMany).not.toHaveBeenCalled();
    }
    for (const other of ["gBCUser", "surfboardUser", "revaUser"] as const) {
      if (other !== userTable) expect(mockPrisma[other].findMany).not.toHaveBeenCalled();
    }
  });
});

describe("listAuditLogs — results", () => {
  it("returns newest first, paginated, with the pagination envelope", async () => {
    mockPrisma.revaAuditLog.count.mockResolvedValue(25);
    mockPrisma.revaAuditLog.findMany.mockResolvedValue([row()]);
    mockPrisma.revaUser.findMany.mockResolvedValue([]);

    const result = await listAuditLogs(Platform.REVA, { page: 2, pageSize: 10 });

    expect(mockPrisma.revaAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, skip: 10, take: 10 })
    );
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
  });

  it("still returns an entry whose actor account is gone, with user null and the id kept", async () => {
    mockPrisma.gBCAuditLog.count.mockResolvedValue(1);
    mockPrisma.gBCAuditLog.findMany.mockResolvedValue([row({ userId: "deleted-1" })]);
    mockPrisma.gBCUser.findMany.mockResolvedValue([]);

    const [entry] = (await listAuditLogs(Platform.GBC)).data;

    expect(entry.user).toBeNull();
    expect(entry.userId).toBe("deleted-1");
  });

  it("does not query users at all when no entry has an actor", async () => {
    mockPrisma.gBCAuditLog.count.mockResolvedValue(1);
    mockPrisma.gBCAuditLog.findMany.mockResolvedValue([row({ userId: null })]);

    await listAuditLogs(Platform.GBC);

    expect(mockPrisma.gBCUser.findMany).not.toHaveBeenCalled();
  });

  it("turns a null name (GBC users may have none) into empty strings", async () => {
    mockPrisma.gBCAuditLog.count.mockResolvedValue(1);
    mockPrisma.gBCAuditLog.findMany.mockResolvedValue([row()]);
    mockPrisma.gBCUser.findMany.mockResolvedValue([{ id: "actor-1", firstName: null, lastName: null, email: "n@x.com" }]);

    expect((await listAuditLogs(Platform.GBC)).data[0].user).toEqual({ firstName: "", lastName: "", email: "n@x.com" });
  });
});

describe("listAuditLogs — filters", () => {
  beforeEach(() => {
    mockPrisma.surfboardAuditLog.count.mockResolvedValue(0);
    mockPrisma.surfboardAuditLog.findMany.mockResolvedValue([]);
  });

  it("passes action, entity, actor and the date range into the query", async () => {
    const startDate = new Date("2026-09-01");
    const endDate = new Date("2026-09-30");

    await listAuditLogs(Platform.SURFBOARD, { action: "PROMOTE_TO_ADMIN", entity: "SurfboardUser", userId: "u1", startDate, endDate });

    expect(mockPrisma.surfboardAuditLog.count).toHaveBeenCalledWith({
      where: { action: "PROMOTE_TO_ADMIN", entity: "SurfboardUser", userId: "u1", createdAt: { gte: startDate, lte: endDate } },
    });
  });

  it("search matches entity id, IP, and the actors whose name or email matches", async () => {
    mockPrisma.surfboardUser.findMany.mockResolvedValue([{ id: "u9" }]);

    await listAuditLogs(Platform.SURFBOARD, { search: "ada" });

    expect(mockPrisma.surfboardAuditLog.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { entityId: { contains: "ada", mode: "insensitive" } },
          { ipAddress: { contains: "ada", mode: "insensitive" } },
          { userId: { in: ["u9"] } },
        ],
      },
    });
  });

  it("search with no matching actor still searches entity id and IP", async () => {
    mockPrisma.surfboardUser.findMany.mockResolvedValue([]);

    await listAuditLogs(Platform.SURFBOARD, { search: "zzz" });

    const where = mockPrisma.surfboardAuditLog.count.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(2);
  });
});

describe("getAuditLogFilterOptions", () => {
  it("lists the distinct actions and entities of that platform's log only", async () => {
    mockPrisma.revaAuditLog.findMany
      .mockResolvedValueOnce([{ action: "DELETE_USER" }, { action: "INVITE_ADMIN" }])
      .mockResolvedValueOnce([{ entity: "AdminInvitation" }, { entity: "RevaUser" }]);

    const result = await getAuditLogFilterOptions(Platform.REVA);

    expect(result).toEqual({ actions: ["DELETE_USER", "INVITE_ADMIN"], entities: ["AdminInvitation", "RevaUser"] });
    expect(mockPrisma.gBCAuditLog.findMany).not.toHaveBeenCalled();
  });
});
