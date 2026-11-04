import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getWalletSummary is what the mobile app shows of a surveyor's wallet. The
 * rules worth pinning: a read never writes (no wallet means zeros, not a new
 * row), and nothing about the payer, the bank account or the access token is
 * ever selected, let alone returned.
 */

const mockPrisma = vi.hoisted(() => ({
  surveyorWallet: { findUnique: vi.fn(), create: vi.fn() },
  qREarningsTransaction: { findMany: vi.fn(), aggregate: vi.fn() },
  surveyorBankDetails: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/paystackConfig", () => ({
  getPaystackSecretForWebhook: vi.fn(),
}));
vi.mock("@/surfboard/services/notificationService", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/utils/email", () => ({ sendNotificationMail: vi.fn() }));

const { getWalletSummary } =
  await import("@/surfboard/services/qrEarningsService");

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.surveyorWallet.findUnique.mockResolvedValue(null);
  mockPrisma.qREarningsTransaction.findMany.mockResolvedValue([]);
  mockPrisma.qREarningsTransaction.aggregate.mockResolvedValue({
    _sum: { surveyorEarned: null },
  });
});

describe("getWalletSummary", () => {
  it("reads zeros for someone with no wallet, and does not create one", async () => {
    expect(await getWalletSummary("s1")).toEqual({
      currency: "NGN",
      availableBalance: 0,
      pendingWithdrawal: 0,
      totalWithdrawn: 0,
      totalEarned: 0,
      earnedThisMonth: 0,
      recent: [],
    });
    expect(mockPrisma.surveyorWallet.create).not.toHaveBeenCalled();
  });

  it("returns the four balances, this month's earnings and the latest earnings", async () => {
    mockPrisma.surveyorWallet.findUnique.mockResolvedValue({
      id: "w1",
      userId: "s1",
      availableBalance: 12500.5,
      pendingWithdrawal: 2000,
      totalWithdrawn: 30000,
      totalEarned: 44500.5,
    });
    mockPrisma.qREarningsTransaction.aggregate.mockResolvedValue({
      _sum: { surveyorEarned: 3500 },
    });
    mockPrisma.qREarningsTransaction.findMany.mockResolvedValue([
      {
        serviceType: "CERTIFICATE_OF_DEPOSIT",
        surveyorEarned: 2500,
        createdAt: new Date("2026-10-18T09:30:00Z"),
        plan: { planNumber: "LA/2026/0412" },
      },
      {
        serviceType: "LOCATION_AUTHENTICITY",
        surveyorEarned: 1000,
        createdAt: new Date("2026-10-02T14:00:00Z"),
        plan: { planNumber: "LA/2026/0101" },
      },
    ]);

    expect(await getWalletSummary("s1")).toEqual({
      currency: "NGN",
      availableBalance: 12500.5,
      pendingWithdrawal: 2000,
      totalWithdrawn: 30000,
      totalEarned: 44500.5,
      earnedThisMonth: 3500,
      recent: [
        {
          planNumber: "LA/2026/0412",
          service: "CERTIFICATE_OF_DEPOSIT",
          amount: 2500,
          at: "2026-10-18T09:30:00.000Z",
        },
        {
          planNumber: "LA/2026/0101",
          service: "LOCATION_AUTHENTICITY",
          amount: 1000,
          at: "2026-10-02T14:00:00.000Z",
        },
      ],
    });
  });

  it("selects only paid earnings, newest ten, and never the payer, the token or the bank account", async () => {
    await getWalletSummary("s1");

    const query = mockPrisma.qREarningsTransaction.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ surveyorId: "s1", paymentStatus: "SUCCESS" });
    expect(query.take).toBe(10);
    expect(query.orderBy).toEqual({ createdAt: "desc" });
    expect(Object.keys(query.select).sort()).toEqual([
      "createdAt",
      "plan",
      "serviceType",
      "surveyorEarned",
    ]);
    expect(query.select.plan).toEqual({ select: { planNumber: true } });
    expect(mockPrisma.surveyorBankDetails.findUnique).not.toHaveBeenCalled();
  });

  it("does not leak extra columns the database might return", async () => {
    mockPrisma.qREarningsTransaction.findMany.mockResolvedValue([
      {
        serviceType: "LOCATION_AUTHENTICITY",
        surveyorEarned: 1000,
        createdAt: new Date("2026-10-02T14:00:00Z"),
        plan: { planNumber: "LA/2026/0101" },
        payerEmail: "someone@example.com",
        payerName: "Someone",
        accessToken: "token-123",
      },
    ]);
    const json = JSON.stringify(await getWalletSummary("s1"));
    expect(json).not.toContain("someone@example.com");
    expect(json).not.toContain("Someone");
    expect(json).not.toContain("token-123");
  });
});
