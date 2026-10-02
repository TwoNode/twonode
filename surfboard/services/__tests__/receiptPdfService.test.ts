import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getBatchReceiptData weighted toward the two things that make this
 * different from a plain findFirst: batch.paymentStatus never reaches
 * BatchPaymentStatus.COMPLETED anywhere in the approval chain
 * (grep-confirmed), so ACCOUNTS_APPROVED is the real "receipt available"
 * gate — and staff roles (ADMIN/SUPERADMIN/ACCOUNTS) can pull any batch's
 * receipt, not just their own. generateBatchReceiptPdfBuffer mirrors
 * certificatePdfService.test.ts's execFile-mocking approach.
 */

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  default: { certificateOfDepositBatch: { findFirst: mockFindFirst } },
}));
vi.mock("child_process", () => ({ execFile: mockExecFile }));

const { getBatchReceiptData, generateBatchReceiptPdfBuffer } =
  await import("@/surfboard/services/receiptPdfService");
const { SurfboardRole } = await import("@/utils/platform");

const baseBatch = {
  batchCode: "SurfCoD_abc123",
  planCount: 2,
  totalFees: 100000,
  systemCharges: 10000,
  totalAmount: 110000,
  paymentStatus: "ACCOUNTS_APPROVED",
  userPaymentRef: "SurfCoDRef_xyz789",
  userPaymentDate: new Date("2026-03-01T00:00:00Z"),
  createdAt: new Date("2026-02-28T00:00:00Z"),
  submitter: { firstName: "Jane", lastName: "Doe", companyName: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBatchReceiptData", () => {
  it("throws NotFoundError when the batch doesn't exist (or isn't owned by this user)", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(
      getBatchReceiptData("user-1", SurfboardRole.USER, "b1")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("scopes the query to the requesting user's own batches for a plain USER", async () => {
    mockFindFirst.mockResolvedValue(baseBatch);
    await getBatchReceiptData("user-1", SurfboardRole.USER, "b1");

    expect(mockFindFirst.mock.calls[0][0].where).toEqual({
      id: "b1",
      submittedBy: "user-1",
    });
  });

  it("lets staff roles (ADMIN/SUPERADMIN/ACCOUNTS) fetch any batch, not just their own", async () => {
    mockFindFirst.mockResolvedValue(baseBatch);
    await getBatchReceiptData("staff-1", SurfboardRole.ACCOUNTS, "b1");

    expect(mockFindFirst.mock.calls[0][0].where).toEqual({ id: "b1" });
  });

  it("throws NotFoundError when payment hasn't been reviewed yet (still PENDING_USER_PAYMENT/LASG_PAID)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseBatch,
      paymentStatus: "LASG_PAID",
    });
    await expect(
      getBatchReceiptData("user-1", SurfboardRole.USER, "b1")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("allows ACCOUNTS_DISAPPROVED through too (batch was reviewed, just not approved)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseBatch,
      paymentStatus: "ACCOUNTS_DISAPPROVED",
    });
    const result = await getBatchReceiptData(
      "user-1",
      SurfboardRole.USER,
      "b1"
    );
    expect(result.paymentStatus).toBe("ACCOUNTS_DISAPPROVED");
  });
});

describe("generateBatchReceiptPdfBuffer", () => {
  it("resolves with the worker's stdout buffer, piping the batch as JSON on stdin", async () => {
    const expectedBuffer = Buffer.from("%PDF-fake");
    const stdinWrite = vi.fn();
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, expectedBuffer, Buffer.from(""));
      return { stdin: { write: stdinWrite, end: vi.fn() } };
    });

    const result = await generateBatchReceiptPdfBuffer(baseBatch as any);

    expect(result).toBe(expectedBuffer);
    const payload = JSON.parse(stdinWrite.mock.calls[0][0]);
    expect(payload.batch.batchCode).toBe("SurfCoD_abc123");
  });

  it("rejects with the worker's stderr when the process fails", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(
        new Error("exit 1"),
        Buffer.from(""),
        Buffer.from("font not found")
      );
      return { stdin: { write: vi.fn(), end: vi.fn() } };
    });

    await expect(
      generateBatchReceiptPdfBuffer(baseBatch as any)
    ).rejects.toThrow(/font not found/);
  });
});
