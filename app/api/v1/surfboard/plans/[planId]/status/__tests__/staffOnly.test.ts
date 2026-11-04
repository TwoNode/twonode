import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn() }));

vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => false,
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/surfboard/services/planService", () => ({
  updateSurfPlanStatus: mocks.update,
}));

const { PATCH } =
  await import("@/app/api/v1/surfboard/plans/[planId]/status/route");
const { SurfboardRole } = await import("@/utils/platform");

/**
 * Setting a plan's status by hand is for ADMIN and SUPERADMIN only (I-043). A surveyor could
 * otherwise put their own plan into LODGED, QUERIED or UNDER_REVIEW, which skews the counts.
 */
const routeCtx = { params: Promise.resolve({ planId: "plan-1" }) };

const as = (role: string) => ({
  sub: "u1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});

const patch = (body: unknown = { status: "LODGED" }) =>
  new NextRequest("http://localhost/api/v1/surfboard/plans/plan-1/status", {
    method: "PATCH",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as(SurfboardRole.ADMIN));
  mocks.update.mockResolvedValue({ id: "plan-1", status: "LODGED" });
});

describe("PATCH plans/{planId}/status", () => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await PATCH(patch(), routeCtx)).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    SurfboardRole.USER,
    SurfboardRole.CHARTING,
    SurfboardRole.ACCOUNTS,
    SurfboardRole.SURCON,
    SurfboardRole.RECORDS_I,
    SurfboardRole.INTAKE,
    SurfboardRole.RECORDS_II,
    SurfboardRole.MDA_SUPERADMIN,
    SurfboardRole.ARCHIVE,
  ])("is not for a %s account", async (role) => {
    mocks.session.mockResolvedValue(as(role));
    expect((await PATCH(patch(), routeCtx)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "lets a %s set the status",
    async (role) => {
      mocks.session.mockResolvedValue(as(role));
      const res = await PATCH(patch({ status: "QUERIED" }), routeCtx);
      expect(res.status).toBe(200);
      expect(mocks.update).toHaveBeenCalledWith(role, "plan-1", "QUERIED");
    }
  );

  it("refuses a status that does not exist", async () => {
    const res = await PATCH(patch({ status: "APPROVED" }), routeCtx);
    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
