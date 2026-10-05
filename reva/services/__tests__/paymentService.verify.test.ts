import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guest and signed-in REVA "verify after redirect" paths used to mark a
 * request Paid whenever Paystack's verify LOOKUP succeeded (`status: true`),
 * which Paystack also answers for a transaction that was never paid
 * (`data.status: "abandoned"`). They must require `data.status === "success"`
 * and an amount that covers the request.
 */

const mockPrisma = vi.hoisted(() => ({
  oneTimeUserProperty: { findUnique: vi.fn(), update: vi.fn() },
  property: { findFirst: vi.fn(), update: vi.fn() },
}));
const mockVerify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/app/(projects)/(reva)/reva/actions/paystackActions", () => ({
  verifyPaystackTransaction: mockVerify,
  initializePaystackTransaction: vi.fn(),
}));
vi.mock("@/reva/services/notificationService", () => ({
  notifyPaymentReceived: vi.fn(),
}));
vi.mock("@/reva/services/propertyRequestService", () => ({
  saveToOneTimeProperty: vi.fn(),
  saveToProperty: vi.fn(),
  updatePropertyTransactionStatus: vi.fn(),
  updateOneTimeTransactionStatus: vi.fn(),
}));
vi.mock("@/utils/email", () => ({ sendEmailToAdmin: vi.fn() }));
vi.mock("@/lib/storage", () => ({ uploadToS3FromServer: vi.fn() }));

const { checkPaymentSuccess, authPaymentSuccessful } =
  await import("@/reva/services/paymentService");

const REF = "REVA_REF_1";
const request = { reference: REF, totalCost: 500, paymentStatus: "Unpaid" };
const paystack = (data: Record<string, unknown>) => ({
  status: true,
  message: "Verification successful",
  data: { reference: REF, amount: 50_000, currency: "NGN", ...data },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue(request);
  mockPrisma.oneTimeUserProperty.update.mockResolvedValue({
    ...request,
    paymentStatus: "Paid",
  });
  mockPrisma.property.findFirst.mockResolvedValue({ ...request, userId: "u1" });
  mockPrisma.property.update.mockResolvedValue({
    ...request,
    paymentStatus: "Paid",
  });
});

describe.each([
  [
    "checkPaymentSuccess (guest)",
    () => checkPaymentSuccess(REF),
    "oneTimeUserProperty",
  ],
  [
    "authPaymentSuccessful (signed in)",
    () => authPaymentSuccessful(REF, "u1", "a@b.co"),
    "property",
  ],
] as const)("%s", (_name, call, table) => {
  it.each(["abandoned", "failed", "pending"])(
    "does not mark Paid when Paystack says the transaction is %s",
    async (status) => {
      mockVerify.mockResolvedValue(paystack({ status }));
      await expect(call()).rejects.toMatchObject({ status: 409 });
      expect(mockPrisma[table].update).not.toHaveBeenCalled();
    }
  );

  it("does not mark Paid when the lookup itself failed", async () => {
    mockVerify.mockResolvedValue({ status: false, message: "not found" });
    await expect(call()).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma[table].update).not.toHaveBeenCalled();
  });

  it("does not mark Paid for an underpayment or another transaction's reference", async () => {
    mockVerify.mockResolvedValue(paystack({ status: "success", amount: 100 }));
    await expect(call()).rejects.toMatchObject({ status: 409 });
    mockVerify.mockResolvedValue(
      paystack({ status: "success", reference: "SOMEONE_ELSES" })
    );
    await expect(call()).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma[table].update).not.toHaveBeenCalled();
  });

  it("marks Paid for a successful payment that covers the request", async () => {
    mockVerify.mockResolvedValue(paystack({ status: "success" }));
    await expect(call()).resolves.toMatchObject({ paymentStatus: "Paid" });
    expect(mockPrisma[table].update).toHaveBeenCalledTimes(1);
  });
});
