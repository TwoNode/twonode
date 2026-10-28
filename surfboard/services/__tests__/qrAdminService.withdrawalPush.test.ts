import { beforeEach, describe, expect, it, vi } from "vitest";

// A paid or refused withdrawal pushes the surveyor (TASK-0015 1I.3). The words are fixed and carry
// no amount, bank or reason, so only the kind is asked for here; the push itself is tested in
// lib/push/__tests__/pushEvents.test.ts.
const mockPrisma = vi.hoisted(() => ({
  withdrawalRequest: { findUnique: vi.fn(), update: vi.fn() },
  surveyorWallet: { update: vi.fn() },
  $transaction: vi.fn(),
}));
const mockNotify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/notificationService", () => ({
  createNotification: mockNotify,
}));
vi.mock("@/utils/paystackConfig", () => ({
  getPaystackSecretForWebhook: () => "sk_test_unused",
}));

const { processAdminWithdrawalRequest } = await import(
  "@/surfboard/services/qrAdminService"
);

const PENDING = {
  id: "w1",
  userId: "u1",
  amount: 25000,
  status: "PENDING",
  bankName: "Example Bank",
  accountNumber: "0123456789",
  recipientCode: null,
  user: { id: "u1", email: "s@example.test", firstName: "S", lastName: "T" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.withdrawalRequest.findUnique.mockResolvedValue(PENDING);
  mockPrisma.$transaction.mockResolvedValue([]);
  mockNotify.mockResolvedValue({ id: "n1" });
});

describe("processAdminWithdrawalRequest pushes the surveyor", () => {
  it("when a withdrawal is paid", async () => {
    await processAdminWithdrawalRequest("admin1", "w1", "APPROVE_PAYOUT");

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      audience: "SPECIFIC_USERS",
      userIds: ["u1"],
      push: { kind: "WITHDRAWAL_UPDATED" },
    });
  });

  it("when a withdrawal is refused", async () => {
    await processAdminWithdrawalRequest(
      "admin1",
      "w1",
      "REJECT",
      "Account name does not match"
    );

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      audience: "SPECIFIC_USERS",
      userIds: ["u1"],
      push: { kind: "WITHDRAWAL_UPDATED" },
    });
  });

  it("with the kind alone: no amount, bank or reason travels", async () => {
    await processAdminWithdrawalRequest("admin1", "w1", "REJECT", "a reason");

    expect(mockNotify.mock.calls[0][0].push).toEqual({
      kind: "WITHDRAWAL_UPDATED",
    });
  });

  it("not at all when the request was already handled", async () => {
    mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
      ...PENDING,
      status: "PAID",
    });

    await expect(
      processAdminWithdrawalRequest("admin1", "w1", "APPROVE_PAYOUT")
    ).rejects.toThrow("already processed");
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
