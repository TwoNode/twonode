import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  getPlanSummaries: vi.fn(),
  getPlanCounts: vi.fn(),
  getBatchSummaries: vi.fn(),
  getBatchDetail: vi.fn(),
  getPlanDetail: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerSession: mocks.session }));
vi.mock("@/surfboard/services/planSummaryService", () => ({
  getPlanSummaries: mocks.getPlanSummaries,
  getPlanCounts: mocks.getPlanCounts,
}));
vi.mock("@/surfboard/services/planDetailService", () => ({
  getPlanDetail: mocks.getPlanDetail,
}));
vi.mock("@/surfboard/services/batchSummaryService", () => ({
  getBatchSummaries: mocks.getBatchSummaries,
  getBatchDetail: mocks.getBatchDetail,
}));

const { GET: plansSummary } =
  await import("@/app/api/v1/surfboard/plans/summary/route");
const { GET: plansCounts } =
  await import("@/app/api/v1/surfboard/plans/counts/route");
const { GET: batchesSummary } =
  await import("@/app/api/v1/surfboard/cod/batches/summary/route");
const { GET: batchSummary } =
  await import("@/app/api/v1/surfboard/cod/batches/[batchId]/summary/route");
const { GET: planDetail } =
  await import("@/app/api/v1/surfboard/plans/[planId]/summary/route");
const { NotFoundError } = await import("@/lib/api/errors");

type Handler = (req: NextRequest, routeCtx?: unknown) => Promise<Response>;
const call = (handler: unknown, path: string, routeCtx?: unknown) =>
  (handler as Handler)(
    new NextRequest(`http://localhost/api/v1/surfboard/${path}`),
    routeCtx
  );

const session = (over: Record<string, unknown> = {}) => ({
  sub: "user-1",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const routes: [string, unknown, string][] = [
  ["plans/summary", plansSummary, "plans/summary"],
  ["plans/counts", plansCounts, "plans/counts"],
  ["plans/{id}/summary", planDetail, `plans/${PLAN_ID}/summary`],
  ["cod/batches/summary", batchesSummary, "cod/batches/summary"],
  ["cod/batches/{id}/summary", batchSummary, "cod/batches/b1/summary"],
];
const batchCtx = { params: Promise.resolve({ batchId: "b1" }) };
const planCtx = { params: Promise.resolve({ planId: PLAN_ID }) };
// Every route in the table gets both, so the shared checks need no per-route context.
const anyCtx = {
  params: Promise.resolve({ batchId: "b1", planId: PLAN_ID }),
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(session());
  mocks.getPlanSummaries.mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  });
  mocks.getPlanCounts.mockResolvedValue({
    mine: 1,
    sharedWithMe: 0,
    queried: 0,
    readyForPhysicalSubmission: 0,
  });
  mocks.getBatchSummaries.mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  });
  mocks.getBatchDetail.mockResolvedValue({ id: "b1", plans: [] });
  mocks.getPlanDetail.mockResolvedValue({ id: PLAN_ID, files: [] });
});

describe.each(routes)("GET %s", (_name, handler, path) => {
  it("needs a signed-in session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await call(handler, path, anyCtx)).status).toBe(401);
  });

  it.each([
    "ADMIN",
    "SUPERADMIN",
    "ACCOUNTS",
    "CHARTING",
    "SURCON",
    "RECORDS_I",
    "INTAKE",
    "RECORDS_II",
    "ARCHIVE",
    "MDA_SUPERADMIN",
  ])("is for surveyors only: %s is refused", async (role) => {
    mocks.session.mockResolvedValue(session({ role }));
    expect((await call(handler, path, anyCtx)).status).toBe(403);
  });

  it("waits for email verification when the platform enforces it", async () => {
    mocks.session.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );
    const res = await call(handler, path, anyCtx);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});

describe("GET plans/summary", () => {
  it("returns the service's page in the usual envelope, for the caller only", async () => {
    const res = await call(
      plansSummary,
      "plans/summary?displayStatus=QUERIED&pageSize=50"
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: {
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      },
    });
    const [userId, params] = mocks.getPlanSummaries.mock.calls[0];
    expect(userId).toBe("user-1");
    expect(params).toMatchObject({
      scope: "mine",
      displayStatus: ["QUERIED"],
      pageSize: 50,
    });
  });

  it("never reads a plan on a bad query: an unknown column, status, scope or date is a 400 naming the field", async () => {
    for (const query of [
      "sortField=geometry",
      "sortField=redCopyFileUrl",
      "displayStatus=DONE",
      "scope=all",
      "dateFrom=not-a-date",
      "dateFrom=2026-10-19&dateTo=2026-01-01",
    ]) {
      const res = await call(plansSummary, `plans/summary?${query}`);
      expect(res.status, query).toBe(400);
      expect((await res.json()).code).toBe("VALIDATION_ERROR");
    }
    expect(mocks.getPlanSummaries).not.toHaveBeenCalled();
  });

  it("caps the page size instead of returning everything", async () => {
    await call(plansSummary, "plans/summary?pageSize=100000&noPagination=true");
    expect(mocks.getPlanSummaries.mock.calls[0][1].pageSize).toBe(100);
  });
});

describe("GET plans/counts", () => {
  it("returns the four counts", async () => {
    const res = await call(plansCounts, "plans/counts");
    expect(await res.json()).toEqual({
      success: true,
      data: {
        mine: 1,
        sharedWithMe: 0,
        queried: 0,
        readyForPhysicalSubmission: 0,
      },
    });
    expect(mocks.getPlanCounts).toHaveBeenCalledWith("user-1");
  });
});

describe("GET cod/batches/summary", () => {
  it("reads the caller's batches for the scope asked for", async () => {
    const res = await call(
      batchesSummary,
      "cod/batches/summary?scope=history&search=ab"
    );
    expect(res.status).toBe(200);
    expect(mocks.getBatchSummaries).toHaveBeenCalledWith("user-1", {
      scope: "history",
      search: "ab",
      page: 1,
      pageSize: 20,
    });
  });

  it("refuses an unknown scope", async () => {
    expect(
      (await call(batchesSummary, "cod/batches/summary?scope=all")).status
    ).toBe(400);
  });
});

describe("GET cod/batches/{batchId}/summary", () => {
  it("reads one batch for the caller", async () => {
    const res = await call(batchSummary, "cod/batches/b1/summary", batchCtx);
    expect(await res.json()).toEqual({
      success: true,
      data: { id: "b1", plans: [] },
    });
    expect(mocks.getBatchDetail).toHaveBeenCalledWith("user-1", "b1");
  });

  it("answers 404 for a batch that is not the caller's", async () => {
    mocks.getBatchDetail.mockRejectedValue(new NotFoundError("Batch"));
    expect(
      (await call(batchSummary, "cod/batches/b1/summary", batchCtx)).status
    ).toBe(404);
  });
});

describe("GET plans/{planId}/summary", () => {
  it("reads one plan for the caller and returns it in the usual envelope", async () => {
    const res = await call(planDetail, `plans/${PLAN_ID}/summary`, planCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { id: PLAN_ID, files: [] },
    });
    expect(mocks.getPlanDetail).toHaveBeenCalledWith("user-1", PLAN_ID);
  });

  it("answers 404 for a plan that is not the caller's or not shared with them", async () => {
    mocks.getPlanDetail.mockRejectedValue(new NotFoundError("Plan"));
    const res = await call(planDetail, `plans/${PLAN_ID}/summary`, planCtx);
    expect(res.status).toBe(404);
  });
});
