import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  });
  const names = [
    "surfboardUser",
    "surveyorWallet",
    "withdrawalRequest",
    "subscription",
    "surfboardPlan",
    "surfboardPlanViewerAttachment",
    "surfboardPlanShareResponse",
    "surfboardPlanShareInvite",
    "surveyorBankDetails",
    "refreshToken",
    "deviceToken",
    "pushPreference",
    "passwordResetToken",
    "emailVerificationToken",
    "emailVerificationOtp",
    "pendingRegistration",
    "loginAttempt",
    "legalConsent",
    // Records that must NEVER be touched by a closure:
    "certificateOfDepositBatch",
    "subscriptionHistory",
    "qREarningsTransaction",
    "surfboardAuditLog",
    "surfboardPlanComment",
    "surfboardNotification",
  ] as const;
  const tx = Object.fromEntries(names.map((n) => [n, model()])) as Record<
    (typeof names)[number],
    ReturnType<typeof model>
  >;
  return {
    tx,
    // The service reads before the transaction and writes inside it: one set of stubs serves both.
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    ...tx,
  };
});

const mocks = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  disableSubscription: vi.fn(),
  deleteFiles: vi.fn(),
  logAudit: vi.fn(),
  sendNotice: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/auth/passwordCheck", () => ({
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/surfboard/services/paystackSubscriptionService", () => ({
  disableSubscription: mocks.disableSubscription,
}));
vi.mock("@/surfboard/services/awsService", () => ({
  deleteMultipleSurfboardFilesFromS3WithUrl: mocks.deleteFiles,
}));
vi.mock("@/app/(projects)/(surfboard)/utils/auditLogger", () => ({
  logAuditAction: mocks.logAudit,
}));
vi.mock("@/utils/email", () => ({ sendAccountClosedNotice: mocks.sendNotice }));

const { closeSurveyorAccount, closureBlockers } =
  await import("@/surfboard/services/accountClosureService");
const { ApiError, UnauthenticatedError, ValidationError } =
  await import("@/lib/api/errors");

const USER = {
  id: "u1",
  email: "Ada@Example.com",
  firstName: "Ada",
  isActive: true,
  passwordHash: "hash",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.surfboardUser.findUnique.mockResolvedValue(USER);
  mocks.verifyPassword.mockResolvedValue(true);
  db.surveyorWallet.findUnique.mockResolvedValue({
    availableBalance: 0,
    pendingWithdrawal: 0,
  });
  db.withdrawalRequest.count.mockResolvedValue(0);
  db.subscription.findUnique.mockResolvedValue(null);
  db.surfboardPlanViewerAttachment.findMany.mockResolvedValue([]);
  db.surfboardPlan.findMany.mockResolvedValue([]);
  mocks.disableSubscription.mockResolvedValue({ message: "ok" });
  mocks.deleteFiles.mockResolvedValue({ success: true });
  mocks.sendNotice.mockResolvedValue(undefined);
  // clearAllMocks keeps an earlier mockRejectedValue: put the write back to working.
  db.surfboardUser.update.mockResolvedValue({});
});

/** Every call made on the models that hold records which must outlive the account. */
const touchedRecords = () =>
  [
    "certificateOfDepositBatch",
    "subscriptionHistory",
    "qREarningsTransaction",
    "surfboardAuditLog",
    "surfboardPlanComment",
    "surfboardNotification",
    "withdrawalRequest",
    "surveyorWallet",
  ].flatMap((name) =>
    Object.entries(
      db[name as keyof typeof db] as Record<
        string,
        { mock: { calls: unknown[] } }
      >
    )
      .filter(
        ([method, fn]) =>
          method !== "findUnique" &&
          method !== "count" &&
          fn.mock.calls.length > 0
      )
      .map(([method]) => `${name}.${method}`)
  );

describe("who may close an account", () => {
  it("does not close an unknown or already closed account", async () => {
    db.surfboardUser.findUnique.mockResolvedValue(null);
    await expect(closeSurveyorAccount("u1", "pw")).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    db.surfboardUser.findUnique.mockResolvedValue({ ...USER, isActive: false });
    await expect(closeSurveyorAccount("u1", "pw")).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("needs the password again: a wrong one erases nothing and touches nothing", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(closeSurveyorAccount("u1", "wrong")).rejects.toMatchObject({
      status: 400,
      details: { password: "Incorrect password" },
    });
    await expect(closeSurveyorAccount("u1", "wrong")).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mocks.verifyPassword).toHaveBeenCalledWith("wrong", "hash");
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.disableSubscription).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
  });
});

describe("what blocks a closure (so no money is silently lost)", () => {
  it("is nothing for a person with an empty wallet and no open withdrawal", async () => {
    expect(await closureBlockers("u1")).toEqual([]);
  });

  it("is money in the wallet", async () => {
    db.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 1500,
      pendingWithdrawal: 0,
    });
    expect(await closureBlockers("u1")).toEqual(["WALLET_BALANCE"]);
  });

  it("is a withdrawal being paid out, whether the wallet or the requests say so", async () => {
    db.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 0,
      pendingWithdrawal: 500,
    });
    expect(await closureBlockers("u1")).toEqual(["PENDING_WITHDRAWAL"]);
    db.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 0,
      pendingWithdrawal: 0,
    });
    db.withdrawalRequest.count.mockResolvedValue(1);
    expect(await closureBlockers("u1")).toEqual(["PENDING_WITHDRAWAL"]);
    // Only a request that is not yet paid or rejected counts.
    expect(db.withdrawalRequest.count).toHaveBeenLastCalledWith({
      where: { userId: "u1", status: { in: ["PENDING", "APPROVED"] } },
    });
  });

  it("lists both when both apply, and a person with no wallet row at all is not blocked", async () => {
    db.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 10,
      pendingWithdrawal: 5,
    });
    expect(await closureBlockers("u1")).toEqual([
      "WALLET_BALANCE",
      "PENDING_WITHDRAWAL",
    ]);
    db.surveyorWallet.findUnique.mockResolvedValue(null);
    db.withdrawalRequest.count.mockResolvedValue(0);
    expect(await closureBlockers("u1")).toEqual([]);
  });

  it("refuses with 409 ACCOUNT_CLOSURE_BLOCKED, names the reasons, and does nothing else", async () => {
    db.surveyorWallet.findUnique.mockResolvedValue({
      availableBalance: 1500,
      pendingWithdrawal: 0,
    });
    db.subscription.findUnique.mockResolvedValue({
      status: "active",
      cancelledAt: null,
      provider: "paystack",
    });

    const error = await closeSurveyorAccount("u1", "pw").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "ACCOUNT_CLOSURE_BLOCKED",
      details: { reasons: ["WALLET_BALANCE"] },
    });
    expect(mocks.disableSubscription).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
  });
});

describe("the subscription", () => {
  it("is cancelled with the payment provider BEFORE anything is erased", async () => {
    db.subscription.findUnique.mockResolvedValue({
      status: "active",
      cancelledAt: null,
      provider: "paystack",
    });
    const order: string[] = [];
    mocks.disableSubscription.mockImplementation(async () => {
      order.push("cancel");
      return { message: "ok" };
    });
    db.$transaction.mockImplementationOnce(
      async (fn: (t: unknown) => unknown) => {
        order.push("erase");
        return fn(db.tx);
      }
    );

    await closeSurveyorAccount("u1", "pw");

    expect(mocks.disableSubscription).toHaveBeenCalledWith("u1");
    expect(order).toEqual(["cancel", "erase"]);
  });

  it("leaves the account OPEN (502) when the provider cannot be reached, so a closed account never keeps paying", async () => {
    db.subscription.findUnique.mockResolvedValue({
      status: "active",
      cancelledAt: null,
      provider: "paystack",
    });
    mocks.disableSubscription.mockRejectedValue(
      new Error("Paystack Error: timeout")
    );

    await expect(closeSurveyorAccount("u1", "pw")).rejects.toMatchObject({
      status: 502,
      code: "SUBSCRIPTION_CANCEL_FAILED",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
  });

  it.each([
    [
      "one already cancelled",
      { status: "active", cancelledAt: new Date(), provider: "paystack" },
    ],
    [
      "one that has ended",
      { status: "expired", cancelledAt: null, provider: "paystack" },
    ],
    [
      "a one-time payment (nothing renews)",
      { status: "active", cancelledAt: null, provider: "paystack_onetime" },
    ],
    ["no subscription at all", null],
  ])("does not call the provider for %s", async (_name, row) => {
    db.subscription.findUnique.mockResolvedValue(row);
    await closeSurveyorAccount("u1", "pw");
    expect(mocks.disableSubscription).not.toHaveBeenCalled();
  });
});

describe("a successful closure", () => {
  beforeEach(() => {
    db.surfboardPlan.findMany.mockResolvedValue([
      { id: "plan-a", sharedTo: ["x", "u1", "y"] },
      { id: "plan-b", sharedTo: ["u1"] },
    ]);
    db.surfboardPlanViewerAttachment.findMany.mockResolvedValue([
      { url: "https://files.example/private-1.pdf" },
      { url: "https://files.example/private-2.pdf" },
    ]);
  });

  it("says it is closed", async () => {
    expect(await closeSurveyorAccount("u1", "pw")).toEqual({ closed: true });
  });

  it("takes the person off the plans others shared with them, and off no one else", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(db.surfboardPlan.findMany).toHaveBeenCalledWith({
      where: { sharedTo: { has: "u1" } },
      select: { id: true, sharedTo: true },
    });
    expect(db.surfboardPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-a" },
      data: { sharedTo: { set: ["x", "y"] } },
    });
    expect(db.surfboardPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-b" },
      data: { sharedTo: { set: [] } },
    });
    expect(db.surfboardPlan.update).toHaveBeenCalledTimes(2);
  });

  it("KEEPS every plan: none is deleted, and the person's own are not even read for change", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(db.surfboardPlan.deleteMany).not.toHaveBeenCalled();
    expect(db.surfboardPlan.delete).not.toHaveBeenCalled();
    expect(db.surfboardPlan.updateMany).not.toHaveBeenCalled();
    // The only plan writes are the two share lists above; no owner, status or file field changes.
    for (const [args] of db.surfboardPlan.update.mock.calls) {
      expect(Object.keys((args as { data: object }).data)).toEqual([
        "sharedTo",
      ]);
    }
  });

  it("KEEPS the records the privacy text says may be kept: batches, payments, withdrawals, the earnings ledger, comments, audit and notices", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(touchedRecords()).toEqual([]);
  });

  it("erases everything that says who the person is, scoped to this person", async () => {
    await closeSurveyorAccount("u1", "pw");

    expect(db.surfboardPlanShareResponse.deleteMany).toHaveBeenCalledWith({
      where: { sharedWithUserId: "u1" },
    });
    expect(db.surfboardPlanShareInvite.deleteMany).toHaveBeenCalledWith({
      where: { email: { equals: "Ada@Example.com", mode: "insensitive" } },
    });
    expect(db.surfboardPlanViewerAttachment.deleteMany).toHaveBeenCalledWith({
      where: { viewerId: "u1" },
    });
    expect(db.surveyorBankDetails.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
    for (const model of [
      "refreshToken",
      "deviceToken",
      "pushPreference",
      "passwordResetToken",
      "emailVerificationToken",
      "emailVerificationOtp",
    ] as const) {
      expect(db[model].deleteMany, model).toHaveBeenCalledWith({
        where: { userId: "u1", platform: "surfboard" },
      });
    }
    expect(db.pendingRegistration.deleteMany).toHaveBeenCalledWith({
      where: {
        platform: "surfboard",
        email: { equals: "Ada@Example.com", mode: "insensitive" },
      },
    });
    expect(db.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: "u1" },
          { identifier: { contains: "Ada@Example.com", mode: "insensitive" } },
        ],
      },
    });
  });

  it("keeps the subscription for the accounts but drops the card token and the address, and the consent record without its address", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(db.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { email: null, authorization: null, emailToken: null },
    });
    expect(db.legalConsent.updateMany).toHaveBeenCalledWith({
      where: { platform: "surfboard", userId: "u1" },
      data: { email: "closed-u1@closed.invalid" },
    });
  });

  it("closes the account row: no name, no address, no password, no way in, and a free email", async () => {
    await closeSurveyorAccount("u1", "pw");

    const [args] = db.surfboardUser.update.mock.calls[0];
    expect(args.where).toEqual({ id: "u1" });
    expect(args.data).toMatchObject({
      isActive: false,
      email: "closed-u1@closed.invalid",
      firstName: "Deleted",
      lastName: "user",
      passwordHash: null,
      authProviders: [],
      emailVerified: false,
      emailVerifiedVia: null,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      isKycValidated: false,
      logo: null,
      companyName: null,
      companyAddress: null,
      surconRegNumber: null,
      surconRegName: null,
      signature: null,
      prefix: null,
      suffix: null,
      residenceState: null,
      postalCode: null,
      phoneNumber: null,
      address: null,
      payerID: null,
      payerIDType: null,
    });
    // A placeholder that can never match a real Kinde identity (and is unique, as the column is).
    expect(args.data.kindeId).toMatch(/^closed:[0-9a-f-]{36}$/);
    expect(args.data.metadata.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // The original address appears nowhere in what is written to the account.
    expect(JSON.stringify(args.data)).not.toContain("example.com");
  });

  it("is one transaction, so a failure part-way leaves the account as it was", async () => {
    db.surfboardUser.update.mockRejectedValue(new Error("write failed"));
    await expect(closeSurveyorAccount("u1", "pw")).rejects.toThrow(
      "write failed"
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // Nothing after the commit happened.
    expect(mocks.logAudit).not.toHaveBeenCalled();
    expect(mocks.deleteFiles).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
  });

  it("writes an audit entry with no personal details", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(mocks.logAudit).toHaveBeenCalledWith({
      userId: "u1",
      action: "ACCOUNT_CLOSED",
      entity: "SurfboardUser",
      entityId: "u1",
      changes: { by: "the person, in the app" },
    });
    expect(JSON.stringify(mocks.logAudit.mock.calls)).not.toContain(
      "example.com"
    );
  });

  it("deletes the person's private files on others' plans, after the commit", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(mocks.deleteFiles).toHaveBeenCalledWith([
      { url: "https://files.example/private-1.pdf" },
      { url: "https://files.example/private-2.pdf" },
    ]);
  });

  it("tells the ORIGINAL address, by the first name it had", async () => {
    await closeSurveyorAccount("u1", "pw");
    expect(mocks.sendNotice).toHaveBeenCalledWith({
      to: "Ada@Example.com",
      firstName: "Ada",
      platform: "surfboard",
    });
  });

  it("is still closed when the private files cannot be deleted, or the notice cannot be sent", async () => {
    mocks.deleteFiles.mockResolvedValue({
      success: false,
      error: "S3 is down",
    });
    mocks.sendNotice.mockRejectedValue(new Error("mail is down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await closeSurveyorAccount("u1", "pw")).toEqual({ closed: true });
    expect(errors).toHaveBeenCalledTimes(2);
    errors.mockRestore();
  });

  it("does not call S3 when there were no private files", async () => {
    db.surfboardPlanViewerAttachment.findMany.mockResolvedValue([]);
    await closeSurveyorAccount("u1", "pw");
    expect(mocks.deleteFiles).not.toHaveBeenCalled();
  });
});
