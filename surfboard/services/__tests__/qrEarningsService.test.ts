import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotFoundError,
  SubscriptionRequiredError,
  ValidationError,
} from "@/lib/api/errors";
import { Platform } from "@/utils/platform";

/**
 * Prisma, Paystack config, notifications, and email are all mocked — this
 * suite verifies qrEarningsService's own logic (fee math, access-state
 * transitions, and above all the Paystack payment-verification path that
 * was found unverified and fixed live, see out/progress.md's "Live
 * hotfixes" entry). It never touches a real database or Paystack.
 */

const mockPrisma = vi.hoisted(() => ({
  surfboardSettings: { findFirst: vi.fn() },
  surfboardPlan: { findFirst: vi.fn(), update: vi.fn() },
  qREarningsTransaction: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  surveyorWallet: {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  surveyorBankDetails: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  withdrawalRequest: { findMany: vi.fn(), create: vi.fn() },
  surfboardUser: { findUnique: vi.fn(), findMany: vi.fn() },
  subscription: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

const mockGetPaystackSecretForWebhook = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockSendNotificationMail = vi.hoisted(() => vi.fn());
const mockWriteAudit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/paystackConfig", () => ({
  getPaystackSecretForWebhook: mockGetPaystackSecretForWebhook,
}));
vi.mock("@/surfboard/services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));
vi.mock("@/lib/audit", () => ({ writeAudit: mockWriteAudit }));
vi.mock("@/utils/email", () => ({
  sendNotificationMail: mockSendNotificationMail,
}));

import {
  getPlanQRAccessState,
  getQREarningsSettings,
  incrementPlanQRScanCount,
  initiateQRServicePayment,
  requestWithdrawal,
  saveSurveyorBankDetails,
  toggleBankVerification,
  verifyQRServicePayment,
} from "@/surfboard/services/qrEarningsService";

const DEFAULT_SETTINGS = {
  freeScanLimit: 5,
  service1: { verificationFee: 1000, serviceFeePercent: 10 },
  service2: { verificationFee: 2500, serviceFeePercent: 10 },
  customFees: [],
};

function fetchJson(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPaystackSecretForWebhook.mockResolvedValue("sk_test_fixture");
  vi.stubGlobal("fetch", vi.fn());
});

describe("getQREarningsSettings", () => {
  it("returns the hardcoded defaults when no settings row exists", async () => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue(null);
    await expect(getQREarningsSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("merges stored qrCodeEarnings settings over the defaults", async () => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue({
      settings: { qrCodeEarnings: { freeScanLimit: 2 } },
    });
    const settings = await getQREarningsSettings();
    expect(settings.freeScanLimit).toBe(2);
    expect(settings.service1).toEqual(DEFAULT_SETTINGS.service1);
  });
});

describe("getPlanQRAccessState", () => {
  const plan = {
    id: "plan-1",
    planNumber: "NNN/1/A/1/2026/LA",
    surveyTitle: "Test",
    redCopyStatus: "PENDING",
    recordsIIStatus: "PENDING",
    qrScanCount: 0,
    certificateFilePaths: [],
  };

  beforeEach(() => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue(null);
  });

  it("throws NotFoundError when the plan does not exist", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue(null);
    await expect(getPlanQRAccessState("missing")).rejects.toThrow(
      NotFoundError
    );
  });

  it("is FREE while under the free scan limit", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      ...plan,
      qrScanCount: 4,
    });
    const state = await getPlanQRAccessState("plan-1");
    expect(state.accessState).toBe("FREE");
  });

  it("requires payment once the free scan limit is reached", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      ...plan,
      qrScanCount: 5,
    });
    const state = await getPlanQRAccessState("plan-1");
    expect(state.accessState).toBe("PAYWALL_REQUIRED");
  });

  it("grants PAID_ACTIVE for a valid unexpired access token", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      ...plan,
      qrScanCount: 10,
    });
    mockPrisma.qREarningsTransaction.findFirst.mockResolvedValue({
      serviceType: "LOCATION_AUTHENTICITY",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const state = await getPlanQRAccessState("plan-1", "tok-123");
    expect(state.accessState).toBe("PAID_ACTIVE");
  });

  it("reports EXPIRED once a paid access token's window has passed", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      ...plan,
      qrScanCount: 10,
    });
    mockPrisma.qREarningsTransaction.findFirst.mockResolvedValue({
      serviceType: "LOCATION_AUTHENTICITY",
      expiresAt: new Date(Date.now() - 60_000),
    });
    const state = await getPlanQRAccessState("plan-1", "tok-123");
    expect(state.accessState).toBe("EXPIRED");
  });

  it("only looks up transactions paid with SUCCESS status for the token", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      ...plan,
      qrScanCount: 10,
    });
    mockPrisma.qREarningsTransaction.findFirst.mockResolvedValue(null);
    const state = await getPlanQRAccessState("plan-1", "bad-token");
    expect(mockPrisma.qREarningsTransaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: "SUCCESS" }),
      })
    );
    expect(state.accessState).toBe("PAYWALL_REQUIRED");
  });
});

describe("incrementPlanQRScanCount", () => {
  it("increments the scan count when the plan exists", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({ id: "plan-1" });
    await incrementPlanQRScanCount("plan-1");
    expect(mockPrisma.surfboardPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { qrScanCount: { increment: 1 } },
    });
  });

  it("silently no-ops when the plan does not exist", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue(null);
    await incrementPlanQRScanCount("missing");
    expect(mockPrisma.surfboardPlan.update).not.toHaveBeenCalled();
  });
});

describe("initiateQRServicePayment", () => {
  beforeEach(() => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue(null);
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue({
      id: "plan-1",
      planNumber: "NNN/1/A/1/2026/LA",
      userId: "surveyor-1",
    });
  });

  it("throws NotFoundError when the plan or its surveyor is missing", async () => {
    mockPrisma.surfboardPlan.findFirst.mockResolvedValue(null);
    await expect(
      initiateQRServicePayment("missing", "LOCATION_AUTHENTICITY")
    ).rejects.toThrow(NotFoundError);
  });

  it("computes total = verification fee + service fee% (no custom fees)", async () => {
    mockPrisma.qREarningsTransaction.create.mockImplementation(
      ({ data }: any) => data
    );
    const result = await initiateQRServicePayment(
      "plan-1",
      "LOCATION_AUTHENTICITY"
    );
    // service1: fee 1000, 10% service fee = 100, no MDA fees => 1100
    expect(result.amountInNaira).toBe(1100);
    expect(result.amountInKobo).toBe(110000);
  });

  it("layers flat and percentage custom (MDA) fees on top", async () => {
    mockPrisma.surfboardSettings.findFirst.mockResolvedValue({
      settings: {
        qrCodeEarnings: {
          customFees: [
            { name: "MDA flat", amount: 200, isPercentage: false },
            { name: "MDA percent", amount: 5, isPercentage: true },
          ],
        },
      },
    });
    mockPrisma.qREarningsTransaction.create.mockImplementation(
      ({ data }: any) => data
    );
    const result = await initiateQRServicePayment(
      "plan-1",
      "CERTIFICATE_OF_DEPOSIT"
    );
    // service2: fee 2500, 10% service fee = 250, MDA flat 200 + 5% of 2500 (125) = 325
    expect(result.amountInNaira).toBe(2500 + 250 + 325);
  });

  it("creates the transaction as PENDING, not SUCCESS", async () => {
    mockPrisma.qREarningsTransaction.create.mockImplementation(
      ({ data }: any) => data
    );
    await initiateQRServicePayment("plan-1", "LOCATION_AUTHENTICITY");
    expect(mockPrisma.qREarningsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "PENDING" }),
      })
    );
  });
});

describe("verifyQRServicePayment — payment-verification security path", () => {
  const baseTransaction = {
    reference: "QREarn_1",
    paymentStatus: "PENDING",
    totalAmount: 1100,
    surveyorId: "surveyor-1",
    surveyorEarned: 1000,
    serviceType: "LOCATION_AUTHENTICITY",
    payerEmail: null,
    accessToken: "existing-token",
    expiresAt: null,
    plan: { id: "plan-1", planNumber: "NNN/1/A/1/2026/LA" },
  };

  it("short-circuits and calls Paystack again for an already-SUCCESS transaction, without re-crediting the wallet", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue({
      ...baseTransaction,
      paymentStatus: "SUCCESS",
      expiresAt: new Date(),
    });

    const result = await verifyQRServicePayment("QREarn_1");

    expect(result.accessToken).toBe("existing-token");
    expect(fetch).not.toHaveBeenCalled();
    expect(mockPrisma.surveyorWallet.upsert).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a reference that doesn't exist", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue(null);
    await expect(verifyQRServicePayment("nonexistent")).rejects.toThrow(
      NotFoundError
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("regression: rejects and does NOT credit the wallet when Paystack has no successful transaction for the reference", async () => {
    // This is the exact exploit shape that was live: initiate a payment
    // (getting a free reference), then call verify without ever paying.
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue(
      baseTransaction
    );
    (fetch as any).mockResolvedValue(
      fetchJson({ status: true, data: { status: "abandoned", amount: 0 } })
    );

    await expect(verifyQRServicePayment("QREarn_1")).rejects.toThrow(
      ValidationError
    );

    expect(mockPrisma.qREarningsTransaction.update).not.toHaveBeenCalled();
    expect(mockPrisma.surveyorWallet.upsert).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("rejects when Paystack confirms success but the amount paid is less than what's owed", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue(
      baseTransaction
    );
    (fetch as any).mockResolvedValue(
      fetchJson({ status: true, data: { status: "success", amount: 50 } }) // expects 110000 kobo
    );

    await expect(verifyQRServicePayment("QREarn_1")).rejects.toThrow(
      ValidationError
    );
    expect(mockPrisma.surveyorWallet.upsert).not.toHaveBeenCalled();
  });

  it("rejects when the Paystack HTTP call itself fails", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue(
      baseTransaction
    );
    (fetch as any).mockResolvedValue(fetchJson({ status: false }, false));

    await expect(verifyQRServicePayment("QREarn_1")).rejects.toThrow(
      ValidationError
    );
    expect(mockPrisma.surveyorWallet.upsert).not.toHaveBeenCalled();
  });

  it("credits the wallet and marks SUCCESS only once Paystack confirms a matching, successful payment", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue(
      baseTransaction
    );
    mockPrisma.qREarningsTransaction.update.mockResolvedValue({
      ...baseTransaction,
      accessToken: "new-token",
      paymentStatus: "SUCCESS",
    });
    (fetch as any).mockResolvedValue(
      fetchJson({ status: true, data: { status: "success", amount: 110000 } })
    );

    const result = await verifyQRServicePayment("QREarn_1", "paystack-ref-xyz");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.paystack.co/transaction/verify/paystack-ref-xyz"
      ),
      expect.objectContaining({
        headers: { Authorization: "Bearer sk_test_fixture" },
      })
    );
    expect(mockPrisma.qREarningsTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: "QREarn_1" },
        data: expect.objectContaining({
          paymentStatus: "SUCCESS",
          paymentRef: "paystack-ref-xyz",
        }),
      })
    );
    expect(mockPrisma.surveyorWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "surveyor-1" },
        update: {
          availableBalance: { increment: 1000 },
          totalEarned: { increment: 1000 },
        },
      })
    );
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(result.accessToken).toBe("new-token");
  });

  it("sends the payer their access email but doesn't let a mail failure break verification", async () => {
    mockPrisma.qREarningsTransaction.findUnique.mockResolvedValue({
      ...baseTransaction,
      payerEmail: "payer@example.com",
    });
    mockPrisma.qREarningsTransaction.update.mockResolvedValue({
      ...baseTransaction,
      accessToken: "new-token",
    });
    (fetch as any).mockResolvedValue(
      fetchJson({ status: true, data: { status: "success", amount: 110000 } })
    );
    mockSendNotificationMail.mockRejectedValue(new Error("SMTP down"));

    await expect(verifyQRServicePayment("QREarn_1")).resolves.toEqual(
      expect.objectContaining({ accessToken: "new-token" })
    );
    expect(mockSendNotificationMail).toHaveBeenCalled();
  });
});

describe("saveSurveyorBankDetails", () => {
  it("rejects when Paystack can't resolve the account", async () => {
    (fetch as any).mockResolvedValue(
      fetchJson({ status: false, message: "Invalid account" }, false)
    );
    await expect(
      saveSurveyorBankDetails("surveyor-1", {
        bankCode: "058",
        bankName: "GTBank",
        accountNumber: "0123456789",
      })
    ).rejects.toThrow(ValidationError);
    expect(mockPrisma.surveyorBankDetails.upsert).not.toHaveBeenCalled();
  });

  it("saves the Paystack-resolved account name as verified", async () => {
    (fetch as any)
      .mockResolvedValueOnce(
        fetchJson({ status: true, data: { account_name: "Jane Surveyor" } })
      )
      .mockResolvedValueOnce(
        fetchJson({ status: true, data: { recipient_code: "RCP_123" } })
      );

    await saveSurveyorBankDetails("surveyor-1", {
      bankCode: "058",
      bankName: "GTBank",
      accountNumber: "0123456789",
    });

    expect(mockPrisma.surveyorBankDetails.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          accountName: "Jane Surveyor",
          recipientCode: "RCP_123",
          isVerified: true,
        }),
      })
    );
  });

  it("still saves verified bank details even if recipient creation fails", async () => {
    (fetch as any)
      .mockResolvedValueOnce(
        fetchJson({ status: true, data: { account_name: "Jane Surveyor" } })
      )
      .mockRejectedValueOnce(new Error("network error"));

    await saveSurveyorBankDetails("surveyor-1", {
      bankCode: "058",
      bankName: "GTBank",
      accountNumber: "0123456789",
    });

    expect(mockPrisma.surveyorBankDetails.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          accountName: "Jane Surveyor",
          recipientCode: null,
        }),
      })
    );
  });
});

describe("requestWithdrawal", () => {
  beforeEach(() => {
    // Withdrawal is a subscription-gated capability (per the Shared Access
    // vision) — an active subscription is the default here so the rest of
    // these tests keep exercising their original scenarios; the no-sub
    // case gets its own test below.
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "active",
      currentEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  it("rejects when the surveyor has no active subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    await expect(requestWithdrawal("surveyor-1", 500)).rejects.toThrow(
      SubscriptionRequiredError
    );
    expect(mockPrisma.surveyorBankDetails.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount before touching the database", async () => {
    await expect(requestWithdrawal("surveyor-1", 0)).rejects.toThrow(
      ValidationError
    );
    expect(mockPrisma.surveyorBankDetails.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the surveyor has no verified bank details", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      isVerified: false,
    });
    await expect(requestWithdrawal("surveyor-1", 500)).rejects.toThrow(
      ValidationError
    );
  });

  it("rejects a withdrawal larger than the available balance", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      isVerified: true,
    });
    mockPrisma.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 100,
    });
    await expect(requestWithdrawal("surveyor-1", 500)).rejects.toThrow(
      ValidationError
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("moves funds from available to pending and creates the withdrawal request", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      isVerified: true,
      bankName: "GTBank",
      accountNumber: "0123456789",
      accountName: "Jane Surveyor",
      recipientCode: "RCP_123",
    });
    mockPrisma.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 1000,
    });
    mockPrisma.$transaction.mockResolvedValue([
      {},
      { id: "wd-1", amount: 500 },
    ]);
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      firstName: "Jane",
      lastName: "S",
    });

    const result = await requestWithdrawal("surveyor-1", 500);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(result).toEqual({ id: "wd-1", amount: 500 });
  });
});

describe("toggleBankVerification", () => {
  it("throws NotFoundError when the surveyor has no bank details on file", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue(null);
    await expect(toggleBankVerification("surveyor-1", true)).rejects.toThrow(
      NotFoundError
    );
  });

  it("flips isVerified and stamps verifiedAt when approving", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      id: "bank-1",
      userId: "surveyor-1",
    });
    await toggleBankVerification("surveyor-1", true);
    expect(mockPrisma.surveyorBankDetails.update).toHaveBeenCalledWith({
      where: { userId: "surveyor-1" },
      data: { isVerified: true, verifiedAt: expect.any(Date) },
    });
  });

  it("clears verifiedAt when revoking", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      id: "bank-1",
      userId: "surveyor-1",
    });
    await toggleBankVerification("surveyor-1", false);
    expect(mockPrisma.surveyorBankDetails.update).toHaveBeenCalledWith({
      where: { userId: "surveyor-1" },
      data: { isVerified: false, verifiedAt: null },
    });
  });
  it("records who approved the account", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      id: "bank-1",
      userId: "surveyor-1",
    });
    await toggleBankVerification("surveyor-1", true, "admin-1");
    expect(mockWriteAudit).toHaveBeenCalledWith(
      Platform.SURFBOARD,
      expect.objectContaining({
        userId: "admin-1",
        action: "VERIFY_BANK_ACCOUNT",
        entity: "SurveyorBankDetails",
        entityId: "bank-1",
        changes: { surveyorId: "surveyor-1", isVerified: true },
      })
    );
  });

  it("records who revoked the account", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue({
      id: "bank-1",
      userId: "surveyor-1",
    });
    await toggleBankVerification("surveyor-1", false, "admin-1");
    expect(mockWriteAudit).toHaveBeenCalledWith(
      Platform.SURFBOARD,
      expect.objectContaining({
        userId: "admin-1",
        action: "REVOKE_BANK_ACCOUNT",
      })
    );
  });

  it("writes no audit entry when there is nothing to verify", async () => {
    mockPrisma.surveyorBankDetails.findUnique.mockResolvedValue(null);
    await expect(
      toggleBankVerification("surveyor-1", true, "admin-1")
    ).rejects.toThrow(NotFoundError);
    expect(mockWriteAudit).not.toHaveBeenCalled();
  });
});
