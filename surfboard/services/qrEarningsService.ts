import prisma from "@/lib/prisma";
import { createNotification } from "@/surfboard/services/notificationService";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";
import { requireActiveSubscription } from "@/surfboard/services/subscriptionService";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Migrated from app/(projects)/(surfboard)/actions/qrEarningsActions.ts —
 * same behavior, Prisma-only (no "use server", no next/cache). Callers
 * that used to get { success: false, error } back on failure now get a
 * thrown ApiError instead, caught by the route's handleApiError — the
 * service layer never returns a failure shape itself.
 *
 * getPaystackSecretForWebhook() is async — it must be awaited fresh inside
 * each function that needs it, never cached at module scope (that binds a
 * Promise, not a string, silently sending "Bearer [object Promise]" as the
 * Authorization header — a real bug caught and fixed live on main in
 * hotfix/qr-payment-verification, ported here so this migrated copy
 * doesn't reintroduce it once this branch merges).
 */

export type QREarningsSettingsData = {
  freeScanLimit: number;
  service1: { verificationFee: number; serviceFeePercent: number };
  service2: { verificationFee: number; serviceFeePercent: number };
  customFees: Array<{ name: string; amount: number; isPercentage: boolean }>;
};

const DEFAULT_QR_SETTINGS: QREarningsSettingsData = {
  freeScanLimit: 5,
  service1: { verificationFee: 1000, serviceFeePercent: 10 },
  service2: { verificationFee: 2500, serviceFeePercent: 10 },
  customFees: [],
};

export async function getQREarningsSettings(): Promise<QREarningsSettingsData> {
  const settingsRecord = await prisma.surfboardSettings.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (settingsRecord?.settings) {
    const settingsJson = settingsRecord.settings as any;
    if (settingsJson.qrCodeEarnings) {
      return { ...DEFAULT_QR_SETTINGS, ...settingsJson.qrCodeEarnings };
    }
  }
  return DEFAULT_QR_SETTINGS;
}

export async function getPlanQRAccessState(
  planId: string,
  accessToken?: string
) {
  const plan = await prisma.surfboardPlan.findFirst({
    where: { OR: [{ id: planId }, { planNumber: planId }], deleted: false },
    select: {
      id: true,
      planNumber: true,
      surveyTitle: true,
      redCopyStatus: true,
      recordsIIStatus: true,
      qrScanCount: true,
      certificateFilePaths: true,
    },
  });

  if (!plan) throw new NotFoundError("Plan");

  const settings = await getQREarningsSettings();
  // CoD is available whenever a certificate file exists on the plan,
  // regardless of whether it arrived via the full MDA approval chain,
  // a direct admin upload, or legacy CSV migration.
  const isCoDAvailable = (plan.certificateFilePaths?.length ?? 0) > 0;

  if (accessToken) {
    const transaction = await prisma.qREarningsTransaction.findFirst({
      where: { accessToken, planId: plan.id, paymentStatus: "SUCCESS" },
    });

    if (transaction?.expiresAt) {
      const now = new Date();
      if (transaction.expiresAt > now) {
        return {
          accessState: "PAID_ACTIVE" as const,
          serviceType: transaction.serviceType,
          expiresAt: transaction.expiresAt.toISOString(),
          isCoDAvailable,
          planId: plan.id,
          planNumber: plan.planNumber,
          pricing: settings,
        };
      }
      return {
        accessState: "EXPIRED" as const,
        isCoDAvailable,
        planId: plan.id,
        planNumber: plan.planNumber,
        pricing: settings,
      };
    }
  }

  if (plan.qrScanCount < settings.freeScanLimit) {
    return {
      accessState: "FREE" as const,
      scanCount: plan.qrScanCount,
      freeLimit: settings.freeScanLimit,
      isCoDAvailable,
      planId: plan.id,
      planNumber: plan.planNumber,
      pricing: settings,
    };
  }

  return {
    accessState: "PAYWALL_REQUIRED" as const,
    scanCount: plan.qrScanCount,
    freeLimit: settings.freeScanLimit,
    isCoDAvailable,
    planId: plan.id,
    planNumber: plan.planNumber,
    pricing: settings,
  };
}

export async function incrementPlanQRScanCount(planId: string): Promise<void> {
  const plan = await prisma.surfboardPlan.findFirst({
    where: { OR: [{ id: planId }, { planNumber: planId }], deleted: false },
    select: { id: true },
  });
  if (!plan) return;

  await prisma.surfboardPlan.update({
    where: { id: plan.id },
    data: { qrScanCount: { increment: 1 } },
  });
}

export async function initiateQRServicePayment(
  planId: string,
  serviceType: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT",
  payerEmail?: string,
  payerName?: string
) {
  const plan = await prisma.surfboardPlan.findFirst({
    where: { OR: [{ id: planId }, { planNumber: planId }], deleted: false },
    select: { id: true, planNumber: true, userId: true },
  });

  if (!plan || !plan.userId) throw new NotFoundError("Plan or surveyor");

  const settings = await getQREarningsSettings();
  const serviceConfig =
    serviceType === "LOCATION_AUTHENTICITY"
      ? settings.service1
      : settings.service2;

  const verificationFee = serviceConfig.verificationFee;
  const serviceFee = verificationFee * (serviceConfig.serviceFeePercent / 100);

  let mdaFee = 0;
  for (const fee of settings.customFees ?? []) {
    mdaFee += fee.isPercentage
      ? verificationFee * (fee.amount / 100)
      : fee.amount;
  }

  const totalAmount = verificationFee + serviceFee + mdaFee;
  const surveyorEarned = verificationFee; // Surveyor gets full verification fee

  const reference = `QREarn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const transaction = await prisma.qREarningsTransaction.create({
    data: {
      reference,
      planId: plan.id,
      surveyorId: plan.userId,
      serviceType,
      verificationFee,
      serviceFee,
      mdaFee,
      totalAmount,
      surveyorEarned,
      payerEmail: payerEmail || null,
      payerName: payerName || null,
      paymentStatus: "PENDING",
    },
  });

  const paystackKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    "";

  return {
    reference: transaction.reference,
    amountInNaira: totalAmount,
    amountInKobo: Math.round(totalAmount * 100),
    paystackKey,
    serviceType,
    planNumber: plan.planNumber,
    payerEmail: payerEmail || "client@twonodes.com",
  };
}

export async function verifyQRServicePayment(
  reference: string,
  paystackRef?: string
) {
  const transaction = await prisma.qREarningsTransaction.findUnique({
    where: { reference },
    include: { plan: { select: { id: true, planNumber: true } } },
  });

  if (!transaction) throw new NotFoundError("Transaction reference");

  if (transaction.paymentStatus === "SUCCESS") {
    return {
      accessToken: transaction.accessToken,
      expiresAt: transaction.expiresAt?.toISOString(),
    };
  }

  // Confirm directly with Paystack before trusting this call at all — a
  // reference alone proves nothing (it's handed out for free by
  // initiateQRServicePayment, before any payment happens).
  const verifyRef = paystackRef || reference;
  const paystackSecretKey = await getPaystackSecretForWebhook();
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(verifyRef)}`,
    { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
  );
  const verifyData = await verifyRes.json();
  const expectedAmountKobo = Math.round(transaction.totalAmount * 100);

  if (
    !verifyRes.ok ||
    !verifyData.status ||
    verifyData.data?.status !== "success" ||
    verifyData.data?.amount < expectedAmountKobo
  ) {
    console.error("QR payment verification failed with Paystack:", {
      reference,
      verifyRef,
      paystackStatus: verifyData?.data?.status,
      paystackAmount: verifyData?.data?.amount,
      expectedAmountKobo,
    });
    throw new ValidationError({
      payment:
        "Payment could not be verified. If you were charged, contact support with your reference.",
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  const updatedTransaction = await prisma.qREarningsTransaction.update({
    where: { reference },
    data: {
      paymentStatus: "SUCCESS",
      paymentRef: paystackRef || reference,
      expiresAt,
    },
  });

  await prisma.surveyorWallet.upsert({
    where: { userId: transaction.surveyorId },
    create: {
      userId: transaction.surveyorId,
      availableBalance: transaction.surveyorEarned,
      totalEarned: transaction.surveyorEarned,
    },
    update: {
      availableBalance: { increment: transaction.surveyorEarned },
      totalEarned: { increment: transaction.surveyorEarned },
    },
  });

  const serviceName =
    transaction.serviceType === "LOCATION_AUTHENTICITY"
      ? "Location Verification"
      : "Certificate of Deposit";

  await createNotification({
    type: "SUCCESS",
    title: "QR Code Earnings Received",
    message: `You earned ₦${transaction.surveyorEarned.toLocaleString()} from a ${serviceName} query on survey plan ${transaction.plan.planNumber}.`,
    audience: "SPECIFIC_USERS",
    userIds: [transaction.surveyorId],
    link: "/surfboard/dashboard/qr-earnings",
    sendEmail: true,
  });

  if (transaction.payerEmail) {
    try {
      const { sendNotificationMail } = await import("@/utils/email");
      // Use the plan's UUID, not its plan number: plan numbers contain
      // slashes (e.g. "NNN/1457/A/004/2026/LA") which break the single
      // dynamic route segment at /surfboardplan/[id].
      const accessUrl = `${getSiteUrl()}/surfboardplan/${transaction.plan.id}?token=${updatedTransaction.accessToken}`;

      await sendNotificationMail({
        to: transaction.payerEmail,
        subject: `Access Granted: Survey Plan ${transaction.plan.planNumber}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Your Survey Plan Access is Ready</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #1a1a1a;">
              <div style="max-width: 520px; margin: 0 auto; padding: 24px 20px;">
                <!-- Brand Header -->
                <div style="padding: 20px 0 16px; border-bottom: 3px solid #233dff;">
                  <span style="font-size: 16px; font-weight: 700; color: #141c4d; letter-spacing: .02em;">Surfboard</span>
                  <span style="font-size: 13px; color: #888888; margin-left: 8px;">by TwoNode Technologies</span>
                </div>

                <!-- Body -->
                <div style="padding: 28px 0 20px;">
                  <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">Your Survey Plan Access is Ready</h2>
                  <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151;">
                    You have successfully purchased a 1-hour access pass for <strong>${serviceName}</strong> on Survey Plan <strong>${transaction.plan.planNumber}</strong>.
                  </p>
                  
                  <div style="margin: 24px 0;">
                    <a href="${accessUrl}" style="background-color: #233dff; background-image: linear-gradient(135deg, #233dff, #141c4d); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Access Survey Plan</a>
                  </div>

                  <p style="margin: 20px 0 8px; font-size: 14px; font-weight: 600; color: #111827;">Or use this Access Code directly:</p>
                  <p style="margin: 0 0 16px; text-align: center;">
                    <span style="background: #f4f4f5; color: #141c4d; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 20px; letter-spacing: .1em; font-family: monospace; display: inline-block;">${updatedTransaction.accessToken}</span>
                  </p>
                  <p style="color: #6b7280; font-size: 13px;">This access session expires in 1 hour from the time of purchase.</p>
                </div>

                <!-- Footer -->
                <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888888; font-size: 12px; line-height: 1.6;">
                  <a href="https://www.twonodetechnologies.com" style="color: #141c4d; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:info@twonodetechnologies.com" style="color: #888888; text-decoration: none;">info@twonodetechnologies.com</a>
                  <p style="margin: 6px 0 0; color: #9ca3af; font-size: 11px;">
                    This is an automated notification from Surfboard. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (err) {
      console.error("Failed to send access email to payer:", err);
    }
  }

  return {
    accessToken: updatedTransaction.accessToken,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getSurveyorEarningsOverview(surveyorId: string) {
  let wallet = await prisma.surveyorWallet.findUnique({
    where: { userId: surveyorId },
  });
  if (!wallet) {
    wallet = await prisma.surveyorWallet.create({
      data: { userId: surveyorId },
    });
  }

  const bankDetails = await prisma.surveyorBankDetails.findUnique({
    where: { userId: surveyorId },
  });

  const transactions = await prisma.qREarningsTransaction.findMany({
    where: { surveyorId, paymentStatus: "SUCCESS" },
    include: { plan: { select: { planNumber: true, surveyTitle: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId: surveyorId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { wallet, bankDetails, transactions, withdrawals };
}

/**
 * Server-side aggregate rather than a client-side sum over
 * `getSurveyorEarningsOverview`'s `transactions` — that list is capped at 50
 * and could silently truncate a busy month.
 */
export async function getSurveyorEarningsThisMonth(
  surveyorId: string
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const result = await prisma.qREarningsTransaction.aggregate({
    where: {
      surveyorId,
      paymentStatus: "SUCCESS",
      createdAt: { gte: startOfMonth, lt: startOfNextMonth },
    },
    _sum: { surveyorEarned: true },
  });
  return result._sum.surveyorEarned ?? 0;
}

export async function saveSurveyorBankDetails(
  surveyorId: string,
  input: { bankCode: string; bankName: string; accountNumber: string }
) {
  const paystackSecretKey = await getPaystackSecretForWebhook();

  const resolveRes = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${input.accountNumber}&bank_code=${input.bankCode}`,
    { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
  );

  const resolveData = await resolveRes.json();
  if (!resolveRes.ok || !resolveData.status) {
    throw new ValidationError({
      accountNumber:
        resolveData.message ||
        "Could not verify bank account. Please check account number and bank.",
    });
  }

  const accountName = resolveData.data.account_name;

  let recipientCode: string | null = null;
  try {
    const recipientRes = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: accountName,
          account_number: input.accountNumber,
          bank_code: input.bankCode,
          currency: "NGN",
        }),
      }
    );
    const recipientData = await recipientRes.json();
    if (recipientRes.ok && recipientData.status) {
      recipientCode = recipientData.data.recipient_code;
    }
  } catch (recipientErr) {
    console.warn("Paystack Recipient Creation Warning:", recipientErr);
  }

  return prisma.surveyorBankDetails.upsert({
    where: { userId: surveyorId },
    create: {
      userId: surveyorId,
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName,
      recipientCode,
      isVerified: true,
      verifiedAt: new Date(),
    },
    update: {
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName,
      recipientCode,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });
}

export async function requestWithdrawal(surveyorId: string, amount: number) {
  await requireActiveSubscription(surveyorId);
  if (amount <= 0)
    throw new ValidationError({ amount: "Amount must be greater than zero" });

  const bankDetails = await prisma.surveyorBankDetails.findUnique({
    where: { userId: surveyorId },
  });
  if (!bankDetails || !bankDetails.isVerified) {
    throw new ValidationError({
      bankDetails:
        "Your bank account is not verified yet. Please set up your bank account under Settings.",
    });
  }

  const wallet = await prisma.surveyorWallet.findUnique({
    where: { userId: surveyorId },
  });
  if (!wallet || wallet.availableBalance < amount) {
    throw new ValidationError({ amount: "Insufficient available balance" });
  }

  const [, withdrawal] = await prisma.$transaction([
    prisma.surveyorWallet.update({
      where: { userId: surveyorId },
      data: {
        availableBalance: { decrement: amount },
        pendingWithdrawal: { increment: amount },
      },
    }),
    prisma.withdrawalRequest.create({
      data: {
        userId: surveyorId,
        amount,
        status: "PENDING",
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        recipientCode: bankDetails.recipientCode,
      },
    }),
  ]);

  const surveyor = await prisma.surfboardUser.findUnique({
    where: { id: surveyorId },
    select: { firstName: true, lastName: true },
  });

  await createNotification({
    type: "SYSTEM",
    title: "New Withdrawal Request",
    message:
      `${surveyor?.firstName ?? ""} ${surveyor?.lastName ?? ""}`.trim() +
      ` requested a withdrawal of ₦${amount.toLocaleString()}.`,
    audience: "GENERAL_ADMINS",
    link: "/surfboard-restricted/dashboard/qr-earnings",
    sendEmail: true,
  });

  return withdrawal;
}

// ---------------------------------------------------------------------------
// KYC admin (settingsActions.ts) — same subsystem (SurveyorBankDetails),
// migrated alongside per the Phase 1 plan.
// ---------------------------------------------------------------------------

// Both KYC functions below are SUPERADMIN-only — enforced by the route's
// withAuth({ roles: [SUPERADMIN] }), not re-checked here.

export async function getSurveyorsForKyc() {
  return prisma.surfboardUser.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      surconRegNumber: true,
      payerID: true,
      payerIDType: true,
      isKycValidated: true,
      createdAt: true,
      bankDetails: {
        select: {
          bankName: true,
          accountNumber: true,
          accountName: true,
          isVerified: true,
          verifiedAt: true,
        },
      },
    },
  });
}

/**
 * Approves (or revokes) a surveyor's payout bank account. `actorId` is the
 * admin doing it, for the audit trail — approving a bank account is what lets
 * a surveyor withdraw earnings, so every change is recorded.
 */
export async function toggleBankVerification(
  userId: string,
  status: boolean,
  actorId?: string
) {
  const bankDetails = await prisma.surveyorBankDetails.findUnique({
    where: { userId },
  });
  if (!bankDetails) {
    throw new NotFoundError("Bank details for this surveyor");
  }

  await prisma.surveyorBankDetails.update({
    where: { userId },
    data: { isVerified: status, verifiedAt: status ? new Date() : null },
  });

  await writeAudit(Platform.SURFBOARD, {
    userId: actorId,
    action: status ? "VERIFY_BANK_ACCOUNT" : "REVOKE_BANK_ACCOUNT",
    entity: "SurveyorBankDetails",
    entityId: bankDetails.id,
    changes: { surveyorId: userId, isVerified: status },
  });

  return { success: true };
}
