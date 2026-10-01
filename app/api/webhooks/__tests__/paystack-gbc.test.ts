import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * handleGBC — the GBC branch of the shared multi-product Paystack webhook,
 * wired onto ticketService.verifyPayment in Phase 4 step 11 (previously
 * GBC events just fell through to onUnhandled — no fallback at all if the
 * success page's client-side redirect never reached the browser). Weighted
 * toward the idempotency check this migration adds: skip the (external,
 * rate-limited) Paystack re-verify call entirely when every ticket for the
 * reference is already COMPLETED.
 */

const mockPrisma = vi.hoisted(() => ({ gBCTicket: { findMany: vi.fn() } }));
const mockVerifyPayment = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/services/ticketService", () => ({ verifyPayment: mockVerifyPayment }));
vi.mock("@/reva/services/propertyRequestService", () => ({
  updatePropertyTransactionStatus: vi.fn(),
  updateOneTimeTransactionStatus: vi.fn(),
}));
vi.mock("@/reva/services/notificationService", () => ({ notifyPaymentReceived: vi.fn() }));
vi.mock("@/utils/email", () => ({}));
vi.mock("@/app/(projects)/(surfboard)/utils/computePeriod", () => ({ computePeriodPerTimestamp: vi.fn() }));

const { handleGBC } = await import("@/app/api/webhooks/paystack/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleGBC", () => {
  it("ignores non-charge.success events", async () => {
    await handleGBC("subscription.create", {} as any);
    expect(mockPrisma.gBCTicket.findMany).not.toHaveBeenCalled();
  });

  it("does nothing when the event has no reference", async () => {
    await handleGBC("charge.success", { amount: 100000, metadata: {} } as any);
    expect(mockPrisma.gBCTicket.findMany).not.toHaveBeenCalled();
    expect(mockVerifyPayment).not.toHaveBeenCalled();
  });

  it("calls ticketService.verifyPayment for a reference with no matching tickets yet (first-ever webhook)", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    await handleGBC("charge.success", { reference: "EB_GBC2_abc123_REF", amount: 100000, metadata: {} } as any);
    expect(mockVerifyPayment).toHaveBeenCalledWith("EB_GBC2_abc123_REF");
  });

  it("is idempotent: skips the re-verify entirely when every ticket for the reference is already COMPLETED", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      { paymentStatus: "COMPLETED" },
      { paymentStatus: "COMPLETED" },
    ]);
    await handleGBC("charge.success", { reference: "GRP_GBC2_abc123_REF", amount: 250000, metadata: {} } as any);
    expect(mockVerifyPayment).not.toHaveBeenCalled();
  });

  it("still re-verifies when only some tickets in a group purchase are COMPLETED (a partial/retried write)", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      { paymentStatus: "COMPLETED" },
      { paymentStatus: "PENDING" },
    ]);
    await handleGBC("charge.success", { reference: "GRP_GBC2_abc123_REF", amount: 250000, metadata: {} } as any);
    expect(mockVerifyPayment).toHaveBeenCalledWith("GRP_GBC2_abc123_REF");
  });

  it("lets verifyPayment's error propagate so the outer handler fails the ledger entry and Paystack retries", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    mockVerifyPayment.mockRejectedValue(new Error("Payment verification failed"));
    await expect(
      handleGBC("charge.success", { reference: "EB_GBC2_bad_REF", amount: 100000, metadata: {} } as any)
    ).rejects.toThrow("Payment verification failed");
  });
});
