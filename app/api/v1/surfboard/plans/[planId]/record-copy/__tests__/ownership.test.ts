import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  download: vi.fn(),
  save: vi.fn(),
}));

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
vi.mock("@/surfboard/services/verificationService", () => ({
  downloadPlanPdfAsBase64: mocks.download,
  savePlanVerificationResult: mocks.save,
}));

const { GET: download } =
  await import("@/app/api/v1/surfboard/plans/[planId]/record-copy/download/route");
const { POST: verify } =
  await import("@/app/api/v1/surfboard/plans/[planId]/record-copy/verification/route");
const { NotFoundError } = await import("@/lib/api/errors");
const { SurfboardRole } = await import("@/utils/platform");

/**
 * Who may read a plan's record copy or write its verification result (I-046, I-047). A plan id is
 * in the plan's public QR address, so every route here must pass the caller to the service, which
 * only finds a plan the caller owns (or any plan, for an admin or superadmin).
 */
const routeCtx = { params: Promise.resolve({ planId: "plan-1" }) };

const as = (role: string, sub = "u1") => ({
  sub,
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});

const getRequest = () =>
  new NextRequest(
    "http://localhost/api/v1/surfboard/plans/plan-1/record-copy/download"
  );

const postRequest = (
  body: unknown = { verdict: "MATCH", score: 0.9, verificationData: { a: 1 } }
) =>
  new NextRequest(
    "http://localhost/api/v1/surfboard/plans/plan-1/record-copy/verification",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as(SurfboardRole.USER));
  mocks.download.mockResolvedValue("JVBERi0=");
  mocks.save.mockResolvedValue({ success: true });
});

describe("GET record-copy/download", () => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    const res = await download(getRequest(), routeCtx);
    expect(res.status).toBe(401);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it.each([
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
    const res = await download(getRequest(), routeCtx);
    expect(res.status).toBe(403);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "hands the caller's id and role to the service for a %s",
    async (role) => {
      mocks.session.mockResolvedValue(as(role, "caller-7"));
      const res = await download(getRequest(), routeCtx);
      expect(res.status).toBe(200);
      expect(mocks.download).toHaveBeenCalledWith("caller-7", role, "plan-1");
      expect(await res.json()).toEqual({ success: true, data: "JVBERi0=" });
    }
  );

  it("answers 404 for a plan that is not the caller's, and sends nothing", async () => {
    mocks.download.mockRejectedValue(
      new NotFoundError("Plan (or access denied)")
    );
    const res = await download(getRequest(), routeCtx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain("JVBERi0=");
  });
});

describe("POST record-copy/verification", () => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    const res = await verify(postRequest(), routeCtx);
    expect(res.status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each([
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
    const res = await verify(postRequest(), routeCtx);
    expect(res.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "hands the caller's id and role to the service for a %s",
    async (role) => {
      mocks.session.mockResolvedValue(as(role, "caller-7"));
      const res = await verify(postRequest(), routeCtx);
      expect(res.status).toBe(200);
      expect(mocks.save).toHaveBeenCalledWith(
        "caller-7",
        role,
        "plan-1",
        "MATCH",
        0.9,
        { a: 1 }
      );
    }
  );

  it("answers 404 for a plan that is not the caller's", async () => {
    mocks.save.mockRejectedValue(new NotFoundError("Plan (or access denied)"));
    const res = await verify(postRequest(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("still refuses a body without a verdict", async () => {
    const res = await verify(postRequest({ score: 1 }), routeCtx);
    expect(res.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
