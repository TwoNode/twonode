import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Certificate of Deposit payments: an underpaid charge must be rejected (and
 * leave the batch unpaid), not confirmed with a log line.
 */

const mockPrisma = vi.hoisted(() => ({
  certificateOfDepositBatch: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => ({}));
vi.mock("@/app/(projects)/(surfboard)/utils/computePeriod", () => ({
  computePeriodPerTimestamp: vi.fn(),
}));

const { onCertificatePaymentSuccess, WebhookRejection } =
  await import("@/app/api/webhooks/paystack/route");

const batch = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  batchCode: "CoD-1",
  totalAmount: 25000,
  paymentStatus: "PENDING",
  ...over,
});
const charge = (over: Record<string, unknown> = {}) =>
  ({
    reference: "COD_REF",
    amount: 2_500_000,
    currency: "NGN",
    paid_at: "2026-10-05T10:00:00Z",
    metadata: { reference: "COD_REF" },
    ...over,
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.certificateOfDepositBatch.findFirst.mockResolvedValue(batch());
});

describe("onCertificatePaymentSuccess — amount reconciliation", () => {
  it("rejects an underpayment and leaves the batch unpaid", async () => {
    await expect(
      onCertificatePaymentSuccess(charge({ amount: 100 }))
    ).rejects.toBeInstanceOf(WebhookRejection);
    expect(mockPrisma.certificateOfDepositBatch.update).not.toHaveBeenCalled();
  });

  it("rejects a non-NGN payment and a payment with no amount", async () => {
    await expect(
      onCertificatePaymentSuccess(charge({ currency: "USD" }))
    ).rejects.toBeInstanceOf(WebhookRejection);
    await expect(
      onCertificatePaymentSuccess(charge({ amount: undefined }))
    ).rejects.toBeInstanceOf(WebhookRejection);
    expect(mockPrisma.certificateOfDepositBatch.update).not.toHaveBeenCalled();
  });

  it("marks the batch paid for an exact payment or an overpayment", async () => {
    for (const amount of [2_500_000, 2_600_000]) {
      vi.clearAllMocks();
      mockPrisma.certificateOfDepositBatch.findFirst.mockResolvedValue(batch());
      await onCertificatePaymentSuccess(charge({ amount }));
      expect(mockPrisma.certificateOfDepositBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentStatus: "LASG_PAID" }),
        })
      );
    }
  });
});
