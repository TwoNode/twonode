import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));
// batchApprovalService imports these at load time; none is used by submitPhysicalCopies.
vi.mock("@/surfboard/utils/ossg", () => ({ transmitToOSSG: vi.fn() }));
vi.mock("@/surfboard/services/notificationService", () => ({
  notifyAccountsDisapproval: vi.fn(),
  notifyConsolidatedQueries: vi.fn(),
  notifyPlanApproved: vi.fn(),
  notifyPlanQueried: vi.fn(),
  notifyReadyForPhysicalSubmission: vi.fn(),
}));
vi.mock("@/app/(projects)/(surfboard)/utils/auditLogger", () => ({
  logAuditAction: vi.fn(),
  createChangeLog: vi.fn(),
}));
vi.mock("@/surfboard/services/remitaVerificationService", () => ({
  verifyQueryPaymentLinks: vi.fn(),
}));
vi.mock("@/surfboard/services/settingsService", () => ({
  getCodSubmissionSettings: vi.fn(),
}));

const { submitPhysicalCopies } =
  await import("@/surfboard/services/batchApprovalService");
const { ValidationError } = await import("@/lib/api/errors");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const E = "55555555-5555-4555-8555-555555555555";
const F = "66666666-6666-4666-8666-666666666666";
const GHOST = "99999999-9999-4999-8999-999999999999";

/** A plan the owner may hand in: red copy submitted, the four reviews approved, batch paid. */
const readyPlan = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
  batch: { paymentStatus: "LASG_PAID" },
  ...over,
});

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.updateMany.mockReset();
  mocks.updateMany.mockImplementation(
    async (args: { where: { id: { in: string[] } } }) => ({
      count: args.where.id.in.length,
    })
  );
});

describe("submitPhysicalCopies (D16: the server enforces the ready rule)", () => {
  it("hands in only the plans that are ready and says why each of the others was left out", async () => {
    mocks.findMany.mockResolvedValueOnce([
      readyPlan(A),
      readyPlan(B, { accountsStatus: "PENDING" }), // a review is still open
      readyPlan(C, { chartingStatus: "QUERIED" }), // queried
      readyPlan(D, { batch: { paymentStatus: "PENDING" } }), // batch not paid
      readyPlan(E, { physicalCopySubmitted: true }), // already handed in
      // F belongs to someone else or is deleted: the database never returns it.
    ]);

    const result = await submitPhysicalCopies("user-1", [A, B, C, D, E, F]);

    expect(result.count).toBe(1);
    expect(result.acceptedIds).toEqual([A]);
    expect(result.refused).toEqual([
      { id: B, reason: "NOT_READY", status: expect.any(String) },
      { id: C, reason: "NOT_READY", status: "Queried by Charting" },
      { id: D, reason: "NOT_READY", status: expect.any(String) },
      { id: E, reason: "ALREADY_SUBMITTED", status: expect.any(String) },
      { id: F, reason: "NOT_FOUND", status: null },
    ]);
    // Only the ready plan is written, scoped to the caller, and never twice.
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: [A] },
      userId: "user-1",
      physicalCopySubmitted: false,
    });
    expect(mocks.updateMany.mock.calls[0][0].data.physicalCopySubmitted).toBe(
      true
    );
  });

  it("reads only the caller's own, undeleted plans", async () => {
    mocks.findMany.mockResolvedValueOnce([readyPlan(A)]);
    await submitPhysicalCopies("user-1", [A, GHOST]);
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      id: { in: [A, GHOST] },
      userId: "user-1",
      deleted: false,
    });
  });

  it("refuses a plan whose batch is missing or whose red copy was never submitted", async () => {
    mocks.findMany.mockResolvedValueOnce([
      readyPlan(A),
      readyPlan(B, { batch: null }),
      readyPlan(C, { redCopyStatus: "NOT_SUBMITTED" }),
    ]);
    const result = await submitPhysicalCopies("user-1", [A, B, C]);
    expect(result.acceptedIds).toEqual([A]);
    expect(result.refused.map((r) => [r.id, r.reason])).toEqual([
      [B, "NOT_READY"],
      [C, "NOT_READY"],
    ]);
  });

  it("fails with a 400 and writes nothing when no plan qualifies", async () => {
    mocks.findMany.mockResolvedValueOnce([
      readyPlan(A, { accountsStatus: "PENDING" }),
    ]);
    await expect(submitPhysicalCopies("user-1", [A])).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("handing the same plan in twice is refused the second time, not counted twice", async () => {
    mocks.findMany
      .mockResolvedValueOnce([readyPlan(A)])
      .mockResolvedValueOnce([readyPlan(A, { physicalCopySubmitted: true })]);
    const first = await submitPhysicalCopies("user-1", [A]);
    expect(first.acceptedIds).toEqual([A]);
    await expect(submitPhysicalCopies("user-1", [A])).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("counts a repeated id once", async () => {
    mocks.findMany.mockResolvedValueOnce([readyPlan(A)]);
    const result = await submitPhysicalCopies("user-1", [A, A, A]);
    expect(result.count).toBe(1);
    expect(mocks.findMany.mock.calls[0][0].where.id).toEqual({ in: [A] });
  });

  it("when another request hands a plan in between the read and the write, reports it as already submitted", async () => {
    mocks.findMany
      .mockResolvedValueOnce([readyPlan(A), readyPlan(B)])
      // the re-read of "what did this request flip": only A carries our timestamp
      .mockResolvedValueOnce([{ id: A }]);
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await submitPhysicalCopies("user-1", [A, B]);

    expect(result.count).toBe(1);
    expect(result.acceptedIds).toEqual([A]);
    expect(result.refused).toEqual([
      { id: B, reason: "ALREADY_SUBMITTED", status: expect.any(String) },
    ]);
    const stamp =
      mocks.updateMany.mock.calls[0][0].data.physicalCopySubmittedAt;
    expect(mocks.findMany.mock.calls[1][0].where.physicalCopySubmittedAt).toBe(
      stamp
    );
  });
});
