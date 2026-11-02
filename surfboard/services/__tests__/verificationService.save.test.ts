import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { updateMany: mocks.updateMany } },
}));

vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: vi.fn(),
}));

const { savePlanVerificationResult } =
  await import("@/surfboard/services/verificationService");
const { SurfboardRole } = await import("@/utils/platform");

const result = { pages: 2, found: ["plan number"] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("savePlanVerificationResult (I-047)", () => {
  it("writes the verdict on a surveyor's own plan, in the one statement that checks the owner", async () => {
    const answer = await savePlanVerificationResult(
      "u1",
      SurfboardRole.USER,
      "plan-1",
      "MATCH",
      0.97,
      result
    );

    expect(answer).toEqual({ success: true });
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    const call = mocks.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "plan-1", userId: "u1" });
    expect(call.data).toMatchObject({
      recordCopyVerdict: "MATCH",
      recordCopyVerificationData: result,
    });
    expect(call.data.recordCopyVerifiedAt).toBeInstanceOf(Date);
  });

  it("writes nothing and answers 404 for a plan that is not the caller's", async () => {
    // The owner filter matched no row, so nothing was written.
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      savePlanVerificationResult(
        "stranger",
        SurfboardRole.USER,
        "plan-1",
        "MATCH",
        1,
        result
      )
    ).rejects.toMatchObject({
      status: 404,
      message: "Plan (or access denied) not found",
    });
  });

  it.each([SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "lets a %s write on any plan",
    async (role) => {
      await savePlanVerificationResult(
        "staff-1",
        role,
        "plan-1",
        "MISMATCH",
        0.1,
        result
      );
      expect(mocks.updateMany.mock.calls[0][0].where).toEqual({
        id: "plan-1",
      });
    }
  );

  it("keeps a pipeline role to plans of its own", async () => {
    await savePlanVerificationResult(
      "u9",
      SurfboardRole.CHARTING,
      "plan-1",
      "MATCH",
      1,
      result
    );
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({
      id: "plan-1",
      userId: "u9",
    });
  });
});
