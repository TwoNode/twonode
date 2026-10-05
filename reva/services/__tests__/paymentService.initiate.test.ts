import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

/**
 * The REVA initiate functions must charge the SERVER's price for the request's
 * location. The form's `totalCost` is only a claim to compare against.
 */

const mocks = vi.hoisted(() => ({
  resolveRevaPrice: vi.fn(),
  saveToOneTimeProperty: vi.fn(),
  saveToPropertyTable: vi.fn(),
  initializePaystack: vi.fn(),
  upload: vi.fn(async () => []),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/reva/services/pricingService", () => ({
  resolveRevaPrice: mocks.resolveRevaPrice,
}));
vi.mock("@/app/(projects)/(reva)/reva/actions/paystackActions", () => ({
  initializePaystack: mocks.initializePaystack,
  verifyPaystackTransaction: vi.fn(),
}));
vi.mock("@/reva/services/propertyRequestService", () => ({
  saveToOneTimeProperty: mocks.saveToOneTimeProperty,
  saveToPropertyTable: mocks.saveToPropertyTable,
  updatePropertyTransactionStatus: vi.fn(),
  updateOneTimeTransactionStatus: vi.fn(),
}));
vi.mock("@/reva/services/notificationService", () => ({
  notifyPaymentReceived: vi.fn(),
}));
vi.mock("@/utils/email", () => ({ sendEmailToAdmin: vi.fn() }));
vi.mock("@/lib/storage", () => ({ uploadToS3FromServer: mocks.upload }));

const { saveFormDataAndInitiatePaystack, authSaveFormDataAndInitiatePaystack } =
  await import("@/reva/services/paymentService");

const form = (over: Record<string, string> = {}) => {
  const f = new FormData();
  const base: Record<string, string> = {
    email: "a@b.co",
    requester: "Ada",
    title: "Plot",
    address: "1 Test Rd",
    location: JSON.stringify({ lat: 6.6018, lng: 3.3515 }),
    lga: "FAKE-LGA",
    totalCost: "1", // what a tampering browser would claim
    comments: "",
    parcelId: "p1",
    ...over,
  };
  for (const [k, v] of Object.entries(base)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveRevaPrice.mockResolvedValue({ lga: "IKEJA", price: 50000 });
  mocks.saveToOneTimeProperty.mockResolvedValue({ reference: "reva_1" });
  mocks.saveToPropertyTable.mockResolvedValue({ reference: "REVA_1" });
  mocks.initializePaystack.mockResolvedValue({ status: true, data: {} });
});

describe.each([
  [
    "guest",
    () => saveFormDataAndInitiatePaystack(form()),
    "saveToOneTimeProperty",
  ],
  [
    "signed in",
    () =>
      authSaveFormDataAndInitiatePaystack(form(), {
        id: "u1",
        email: "a@b.co",
        firstName: "Ada",
      }),
    "saveToPropertyTable",
  ],
] as const)("%s initiate", (_n, call, saver) => {
  it("stores and charges the server's price and LGA, not the form's", async () => {
    await call();

    expect(mocks.resolveRevaPrice).toHaveBeenCalledWith(
      { lat: 6.6018, lng: 3.3515 },
      1
    );
    expect((mocks as any)[saver].mock.calls[0][0]).toMatchObject({
      totalCost: 50000,
      lga: "IKEJA",
    });
    expect(mocks.initializePaystack.mock.calls[0][0]).toMatchObject({
      amount: 5_000_000, // kobo
      lga: "IKEJA",
    });
  });

  it("refuses a mismatched price before uploading, saving or charging anything", async () => {
    mocks.resolveRevaPrice.mockRejectedValue(
      new ApiError(409, "PRICE_MISMATCH", "different price")
    );

    await expect(call()).rejects.toMatchObject({ status: 409 });

    expect(mocks.upload).not.toHaveBeenCalled();
    expect((mocks as any)[saver]).not.toHaveBeenCalled();
    expect(mocks.initializePaystack).not.toHaveBeenCalled();
  });
});
