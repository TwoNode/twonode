import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The factory binds one implementation to a platform + its SUPERADMIN role.
 * withAuth itself is exercised elsewhere; here it is replaced by a pass-through
 * that records the access options, so the tests can pin who is allowed in and
 * that a malformed date is a 400 rather than a Prisma error.
 */

const mockService = vi.hoisted(() => ({ listAuditLogs: vi.fn(), getAuditLogFilterOptions: vi.fn() }));
const withAuthOpts = vi.hoisted(() => [] as Array<{ platform: string; roles: string[] }>);

vi.mock("@/lib/auditLogs", () => mockService);
vi.mock("@/lib/api/withAuth", () => ({
  withAuth: (handler: (req: NextRequest) => Promise<Response>, opts: { platform: string; roles: string[] }) => {
    withAuthOpts.push(opts);
    return async (req: NextRequest) => {
      try {
        return await handler(req);
      } catch (err) {
        return Response.json({ status: (err as { status?: number }).status ?? 500 }, { status: (err as { status?: number }).status ?? 500 });
      }
    };
  },
}));

const { auditLogRoutes } = await import("@/lib/api/auditLogRoutes");
const { Platform, RevaRole } = await import("@/utils/platform");

const request = (qs = "") => new NextRequest(`http://localhost/api/v1/reva/admin/audit-logs${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  withAuthOpts.length = 0;
  mockService.listAuditLogs.mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
});

describe("auditLogRoutes", () => {
  it("lets only the product's SUPERADMIN in, on both endpoints", () => {
    auditLogRoutes(Platform.REVA, RevaRole.SUPERADMIN);

    expect(withAuthOpts).toEqual([
      { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] },
      { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] },
    ]);
  });

  it("passes the parsed query to the service for the bound platform", async () => {
    const { list } = auditLogRoutes(Platform.REVA, RevaRole.SUPERADMIN);

    await list(request("?page=3&pageSize=25&action=DELETE_USER&entity=RevaUser&userId=u1&search=ada&startDate=2026-09-01&endDate=2026-09-30"), {} as never);

    expect(mockService.listAuditLogs).toHaveBeenCalledWith(Platform.REVA, {
      page: 3,
      pageSize: 25,
      action: "DELETE_USER",
      entity: "RevaUser",
      userId: "u1",
      search: "ada",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
    });
  });

  it("treats absent filters as undefined, not empty strings", async () => {
    const { list } = auditLogRoutes(Platform.REVA, RevaRole.SUPERADMIN);

    await list(request(), {} as never);

    expect(mockService.listAuditLogs).toHaveBeenCalledWith(
      Platform.REVA,
      expect.objectContaining({ action: undefined, entity: undefined, userId: undefined, search: undefined, startDate: undefined, endDate: undefined })
    );
  });

  it("rejects a date that isn't one with a 400 and never queries", async () => {
    const { list } = auditLogRoutes(Platform.REVA, RevaRole.SUPERADMIN);

    const res = await list(request("?startDate=not-a-date"), {} as never);

    expect(res.status).toBe(400);
    expect(mockService.listAuditLogs).not.toHaveBeenCalled();
  });
});
