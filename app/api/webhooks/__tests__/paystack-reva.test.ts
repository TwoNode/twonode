import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * handleReva — the REVA branch of the shared multi-product Paystack
 * webhook, migrated off the dead revaActions2.ts in Phase 3. Weighted
 * toward the defensive behavior added during that migration (this file
 * processes Surfboard/REVA/GBC events, so a REVA-specific bug here has
 * historically been easy to introduce without anyone noticing): a missing
 * record returns cleanly rather than throwing, an already-Paid record is a
 * no-op (idempotency the source lacked), and the two services actually get
 * called with the row the update produced.
 */

const mockPrisma = vi.hoisted(() => ({
  property: { findUnique: vi.fn() },
  oneTimeUserProperty: { findUnique: vi.fn() },
}));

const mockUpdatePropertyTransactionStatus = vi.hoisted(() => vi.fn());
const mockUpdateOneTimeTransactionStatus = vi.hoisted(() => vi.fn());
const mockNotifyPaymentReceived = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/reva/services/propertyRequestService", () => ({
  updatePropertyTransactionStatus: mockUpdatePropertyTransactionStatus,
  updateOneTimeTransactionStatus: mockUpdateOneTimeTransactionStatus,
}));
vi.mock("@/reva/services/notificationService", () => ({
  notifyPaymentReceived: mockNotifyPaymentReceived,
}));
vi.mock("@/utils/email", () => ({}));
vi.mock("@/app/(projects)/(surfboard)/utils/computePeriod", () => ({ computePeriodPerTimestamp: vi.fn() }));

const { handleReva } = await import("@/app/api/webhooks/paystack/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleReva — guest (OneTimeUserProperty)", () => {
  it("updates status and notifies when a matching, unpaid record exists", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ reference: "REVA_1", totalCost: 500, paymentStatus: "Unpaid" });
    mockUpdateOneTimeTransactionStatus.mockResolvedValue({ reference: "REVA_1", totalCost: 500, paymentStatus: "Paid" });

    await handleReva("charge.success", { reference: "REVA_1", amount: 50000, metadata: {} } as any);

    expect(mockUpdateOneTimeTransactionStatus).toHaveBeenCalledWith("REVA_1", "Processing", "Paid", "Payment completed successfully", null);
    expect(mockNotifyPaymentReceived).toHaveBeenCalledWith({ reference: "REVA_1", totalCost: 500, paymentStatus: "Paid" }, undefined);
    expect(mockUpdatePropertyTransactionStatus).not.toHaveBeenCalled();
  });

  it("does nothing (no throw) when no record matches the reference — a permanent failure, not one Paystack retrying will fix", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue(null);

    await expect(handleReva("charge.success", { reference: "REVA_missing", amount: 50000, metadata: {} } as any)).resolves.toBeUndefined();
    expect(mockUpdateOneTimeTransactionStatus).not.toHaveBeenCalled();
    expect(mockNotifyPaymentReceived).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-Paid record is skipped entirely — the source had no such check", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ reference: "REVA_1", totalCost: 500, paymentStatus: "Paid" });

    await handleReva("charge.success", { reference: "REVA_1", amount: 50000, metadata: {} } as any);

    expect(mockUpdateOneTimeTransactionStatus).not.toHaveBeenCalled();
    expect(mockNotifyPaymentReceived).not.toHaveBeenCalled();
  });

  it("does nothing when the event has no reference anywhere (top-level, metadata, or custom_fields)", async () => {
    await handleReva("charge.success", { amount: 50000, metadata: {} } as any);
    expect(mockPrisma.oneTimeUserProperty.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.property.findUnique).not.toHaveBeenCalled();
  });

  it("ignores non-charge.success events", async () => {
    await handleReva("subscription.create", {} as any);
    expect(mockPrisma.oneTimeUserProperty.findUnique).not.toHaveBeenCalled();
  });
});

describe("handleReva — authenticated (Property)", () => {
  it("routes to the Property table and passes the row's userId to notifyPaymentReceived", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ reference: "REVA_2", totalCost: 1000, paymentStatus: "Unpaid", userId: "user-1" });
    mockUpdatePropertyTransactionStatus.mockResolvedValue({ reference: "REVA_2", totalCost: 1000, paymentStatus: "Paid", userId: "user-1" });

    await handleReva("charge.success", {
      reference: "REVA_2",
      amount: 100000,
      metadata: { isAuthenticated: true },
    } as any);

    expect(mockPrisma.property.findUnique).toHaveBeenCalledWith({ where: { reference: "REVA_2" } });
    expect(mockNotifyPaymentReceived).toHaveBeenCalledWith(expect.objectContaining({ reference: "REVA_2" }), "user-1");
  });

  it("reads a stringified metadata payload correctly — the resolved gap where the source read data.metadata raw instead of via normalizeMetadata", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ reference: "REVA_3", totalCost: 1000, paymentStatus: "Unpaid", userId: "user-1" });
    mockUpdatePropertyTransactionStatus.mockResolvedValue({ reference: "REVA_3", totalCost: 1000, paymentStatus: "Paid", userId: "user-1" });

    await handleReva("charge.success", {
      reference: "REVA_3",
      amount: 100000,
      metadata: JSON.stringify({ isAuthenticated: true }) as any,
    } as any);

    expect(mockPrisma.property.findUnique).toHaveBeenCalledWith({ where: { reference: "REVA_3" } });
  });
});

describe("handleReva — amount reconciliation", () => {
  it("still confirms payment on an amount mismatch, matching onCertificatePaymentSuccess's own logged-not-failed policy", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ reference: "REVA_4", totalCost: 50000, paymentStatus: "Unpaid" });
    mockUpdateOneTimeTransactionStatus.mockResolvedValue({ reference: "REVA_4", totalCost: 50000, paymentStatus: "Paid" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // totalCost 50000 naira => expected 5,000,000 kobo; paid only 100 kobo
    await handleReva("charge.success", { reference: "REVA_4", amount: 100, metadata: {} } as any);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("amount mismatch"), expect.anything());
    expect(mockUpdateOneTimeTransactionStatus).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
