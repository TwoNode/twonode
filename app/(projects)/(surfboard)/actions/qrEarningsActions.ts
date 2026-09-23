"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { createNotification } from "./notificationActions";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import { revalidatePath } from "next/cache";

// getPaystackSecretForWebhook() is async — caching its return value at
// module scope (as this used to) binds a Promise, not a string, so every
// `Authorization: Bearer ${PAYSTACK_SECRET_KEY}` header silently sent the
// literal text "Bearer [object Promise]". Call it fresh inside each
// function that needs the key instead.

// Thrown inside requestWithdrawal's transaction when the atomic balance
// re-check loses the race (see comment at the throw site), so the outer
// catch can tell it apart from a genuine unexpected error.
class InsufficientBalanceError extends Error {}

export type QREarningsSettingsData = {
  freeScanLimit: number;
  service1: {
    verificationFee: number;
    serviceFeePercent: number;
  };
  service2: {
    verificationFee: number;
    serviceFeePercent: number;
  };
  customFees: Array<{
    name: string;
    amount: number;
    isPercentage: boolean;
  }>;
};

const DEFAULT_QR_SETTINGS: QREarningsSettingsData = {
  freeScanLimit: 5,
  service1: {
    verificationFee: 1000,
    serviceFeePercent: 10,
  },
  service2: {
    verificationFee: 2500,
    serviceFeePercent: 10,
  },
  customFees: [],
};

/**
 * Reads QR Code Earnings Settings from SurfboardSettings
 */
export async function getQREarningsSettings(): Promise<QREarningsSettingsData> {
  try {
    const settingsRecord = await prisma.surfboardSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (settingsRecord && settingsRecord.settings) {
      const settingsJson = settingsRecord.settings as any;
      if (settingsJson.qrCodeEarnings) {
        return {
          ...DEFAULT_QR_SETTINGS,
          ...settingsJson.qrCodeEarnings,
        };
      }
    }
    return DEFAULT_QR_SETTINGS;
  } catch (error) {
    console.error("Error fetching QR Earnings Settings:", error);
    return DEFAULT_QR_SETTINGS;
  }
}

/**
 * Gets the current QR access state for a plan (Free, Paid Active, Paywall Required, or Expired)
 */
export async function getPlanQRAccessState(
  planId: string,
  accessToken?: string
) {
  try {
    const plan = await prisma.surfboardPlan.findFirst({
      where: {
        OR: [{ id: planId }, { planNumber: planId }],
        deleted: false,
      },
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

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const settings = await getQREarningsSettings();
    // CoD is available whenever a certificate file exists on the plan,
    // regardless of whether it arrived via the full MDA approval chain,
    // a direct admin upload, or legacy CSV migration.
    const isCoDAvailable = (plan.certificateFilePaths?.length ?? 0) > 0;

    // 1. Check if token is provided and valid (active within 1 hour)
    if (accessToken) {
      const transaction = await prisma.qREarningsTransaction.findFirst({
        where: {
          accessToken,
          planId: plan.id,
          paymentStatus: "SUCCESS",
        },
      });

      if (transaction && transaction.expiresAt) {
        const now = new Date();
        if (transaction.expiresAt > now) {
          return {
            success: true,
            accessState: "PAID_ACTIVE",
            serviceType: transaction.serviceType,
            expiresAt: transaction.expiresAt.toISOString(),
            isCoDAvailable,
            planId: plan.id,
            planNumber: plan.planNumber,
            pricing: settings,
          };
        } else {
          return {
            success: true,
            accessState: "EXPIRED",
            isCoDAvailable,
            planId: plan.id,
            planNumber: plan.planNumber,
            pricing: settings,
          };
        }
      }
    }

    // 2. Check if within free scan limit
    if (plan.qrScanCount < settings.freeScanLimit) {
      return {
        success: true,
        accessState: "FREE",
        scanCount: plan.qrScanCount,
        freeLimit: settings.freeScanLimit,
        isCoDAvailable,
        planId: plan.id,
        planNumber: plan.planNumber,
        pricing: settings,
      };
    }

    // 3. Otherwise paywall is required
    return {
      success: true,
      accessState: "PAYWALL_REQUIRED",
      scanCount: plan.qrScanCount,
      freeLimit: settings.freeScanLimit,
      isCoDAvailable,
      planId: plan.id,
      planNumber: plan.planNumber,
      pricing: settings,
    };
  } catch (error) {
    console.error("Error getting QR access state:", error);
    return { success: false, error: "Failed to verify QR access state" };
  }
}

/**
 * Increments the QR Scan Counter for a plan
 */
export async function incrementPlanQRScanCount(planId: string) {
  try {
    const plan = await prisma.surfboardPlan.findFirst({
      where: {
        OR: [{ id: planId }, { planNumber: planId }],
        deleted: false,
      },
      select: { id: true, qrScanCount: true },
    });

    if (!plan) return;

    await prisma.surfboardPlan.update({
      where: { id: plan.id },
      data: { qrScanCount: { increment: 1 } },
    });
  } catch (error) {
    console.error("Error incrementing QR scan count:", error);
  }
}

/**
 * Initiates QR Code Service Payment (Calculates fees & creates PENDING QREarningsTransaction)
 */
export async function initiateQRServicePayment(
  planId: string,
  serviceType: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT",
  payerEmail?: string,
  payerName?: string
) {
  try {
    const plan = await prisma.surfboardPlan.findFirst({
      where: {
        OR: [{ id: planId }, { planNumber: planId }],
        deleted: false,
      },
      select: {
        id: true,
        planNumber: true,
        userId: true,
      },
    });

    if (!plan || !plan.userId) {
      return { success: false, error: "Plan or surveyor not found" };
    }

    const settings = await getQREarningsSettings();
    const serviceConfig =
      serviceType === "LOCATION_AUTHENTICITY"
        ? settings.service1
        : settings.service2;

    const verificationFee = serviceConfig.verificationFee;
    const serviceFee = verificationFee * (serviceConfig.serviceFeePercent / 100);

    let mdaFee = 0;
    if (settings.customFees && settings.customFees.length > 0) {
      for (const fee of settings.customFees) {
        if (fee.isPercentage) {
          mdaFee += verificationFee * (fee.amount / 100);
        } else {
          mdaFee += fee.amount;
        }
      }
    }

    const totalAmount = verificationFee + serviceFee + mdaFee;
    const surveyorEarned = verificationFee; // Surveyor gets full verification fee

    const reference = `QREarn_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;

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
      success: true,
      data: {
        reference: transaction.reference,
        amountInNaira: totalAmount,
        amountInKobo: Math.round(totalAmount * 100),
        paystackKey,
        serviceType,
        planNumber: plan.planNumber,
        payerEmail: payerEmail || "client@twonodes.com",
      },
    };
  } catch (error) {
    console.error("Error initiating QR service payment:", error);
    return { success: false, error: "Failed to initiate payment" };
  }
}

/**
 * Verifies Paystack Payment & activates 1-hour access session
 */
export async function verifyQRServicePayment(
  reference: string,
  paystackRef?: string
) {
  try {
    const transaction = await prisma.qREarningsTransaction.findUnique({
      where: { reference },
      include: {
        plan: {
          select: { id: true, planNumber: true },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction reference not found" };
    }

    if (transaction.paymentStatus === "SUCCESS") {
      return {
        success: true,
        accessToken: transaction.accessToken,
        expiresAt: transaction.expiresAt?.toISOString(),
      };
    }

    // Confirm directly with Paystack before trusting this call at all — a
    // reference alone proves nothing (it's handed out for free by
    // initiateQRServicePayment, before any payment happens), so this used to
    // let anyone mark any transaction SUCCESS and pull real money into the
    // surveyor's wallet without ever paying.
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
      return {
        success: false,
        error: "Payment could not be verified. If you were charged, contact support with your reference.",
      };
    }

    // Set 1 hour expiration from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    // 1. Update Transaction
    const updatedTransaction = await prisma.qREarningsTransaction.update({
      where: { reference },
      data: {
        paymentStatus: "SUCCESS",
        paymentRef: paystackRef || reference,
        expiresAt,
      },
    });

    // 2. Credit Surveyor Wallet
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

    // 3. Send Notification to Surveyor
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

    revalidatePath("/surfboard/dashboard/qr-earnings");

    // 4. Send Email to Payer with Access Token and Link
    if (transaction.payerEmail) {
      try {
        const { sendNotificationMail } = await import("@/utils/email");
        // Use the plan's UUID, not its plan number: plan numbers contain
        // slashes (e.g. "NNN/1457/A/004/2026/LA") which break the single
        // dynamic route segment at /surfboardplan/[id].
        const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://surfboard.twonodes.com"}/surfboardplan/${transaction.plan.id}?token=${updatedTransaction.accessToken}`;
        
        await sendNotificationMail({
          to: transaction.payerEmail,
          subject: `Access Granted: Survey Plan ${transaction.plan.planNumber}`,
          html: `
            <h2>Your Survey Plan Access is Ready</h2>
            <p>You have successfully purchased a 1-hour access pass for <strong>${serviceName}</strong> on Survey Plan <strong>${transaction.plan.planNumber}</strong>.</p>
            <p>Click the secure link below to access your session immediately:</p>
            <p><a href="${accessUrl}" style="padding: 10px 20px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Access Survey Plan</a></p>
            <p><strong>Or use this Access Code if you are already on the page:</strong></p>
            <p style="font-family: monospace; font-size: 1.2em; background-color: #f1f5f9; padding: 10px; border-radius: 5px;">${updatedTransaction.accessToken}</p>
            <p><small>This access will expire 1 hour from the time of purchase.</small></p>
          `,
        });
        console.log(`Access email sent to ${transaction.payerEmail}`);
      } catch (err) {
        console.error("Failed to send access email to payer:", err);
      }
    }

    return {
      success: true,
      accessToken: updatedTransaction.accessToken,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Error verifying QR payment:", error);
    return { success: false, error: "Failed to verify payment" };
  }
}

/**
 * Gets surveyor wallet balance, transaction ledger, bank details, and withdrawal requests
 */
export async function getSurveyorEarningsOverview() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Ensure wallet exists
    let wallet = await prisma.surveyorWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.surveyorWallet.create({
        data: { userId: user.id },
      });
    }

    const bankDetails = await prisma.surveyorBankDetails.findUnique({
      where: { userId: user.id },
    });

    const transactions = await prisma.qREarningsTransaction.findMany({
      where: {
        surveyorId: user.id,
        paymentStatus: "SUCCESS",
      },
      include: {
        plan: {
          select: { planNumber: true, surveyTitle: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      success: true,
      data: {
        wallet,
        bankDetails,
        transactions,
        withdrawals,
      },
    };
  } catch (error) {
    console.error("Error getting surveyor earnings overview:", error);
    return { success: false, error: "Failed to fetch earnings data" };
  }
}

/**
 * Saves and validates bank details for surveyor using Paystack Bank Resolve API
 */
export async function saveSurveyorBankDetails(input: {
  bankCode: string;
  bankName: string;
  accountNumber: string;
}) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const paystackSecretKey = await getPaystackSecretForWebhook();

    // 1. Resolve Bank Account Name with Paystack API
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${input.accountNumber}&bank_code=${input.bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const resolveData = await resolveRes.json();
    if (!resolveRes.ok || !resolveData.status) {
      return {
        success: false,
        error:
          resolveData.message ||
          "Could not verify bank account. Please check account number and bank.",
      };
    }

    const accountName = resolveData.data.account_name;

    // 2. Create Paystack Transfer Recipient Code
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

    // 3. Upsert SurveyorBankDetails
    const bankDetails = await prisma.surveyorBankDetails.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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

    revalidatePath("/surfboard/dashboard/settings");
    revalidatePath("/surfboard/dashboard/qr-earnings");

    return {
      success: true,
      data: bankDetails,
    };
  } catch (error) {
    console.error("Error saving surveyor bank details:", error);
    return { success: false, error: "Failed to save bank account details" };
  }
}

/**
 * Requests a withdrawal of available earnings
 */
export async function requestWithdrawal(amount: number) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    const bankDetails = await prisma.surveyorBankDetails.findUnique({
      where: { userId: user.id },
    });

    if (!bankDetails || !bankDetails.isVerified) {
      return {
        success: false,
        error:
          "Your bank account is not verified yet. Please set up your bank account under Settings.",
      };
    }

    const wallet = await prisma.surveyorWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || wallet.availableBalance < amount) {
      return { success: false, error: "Insufficient available balance" };
    }

    // The check above reads the balance outside any lock, so two concurrent
    // requests (double-click, duplicate tab) could both pass it and both
    // decrement, driving the balance negative. Re-check the balance inside
    // the same atomic UPDATE via `updateMany`'s `where` clause — Postgres
    // only matches/updates the row if the condition still holds at execution
    // time, so a second concurrent request that already lost the race gets
    // `count: 0` here instead of also decrementing.
    const [updatedWallet, withdrawal] = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.surveyorWallet.updateMany({
        where: { userId: user.id, availableBalance: { gte: amount } },
        data: {
          availableBalance: { decrement: amount },
          pendingWithdrawal: { increment: amount },
        },
      });

      if (updateResult.count === 0) {
        throw new InsufficientBalanceError();
      }

      const updatedWallet = await tx.surveyorWallet.findUniqueOrThrow({
        where: { userId: user.id },
      });

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount,
          status: "PENDING",
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          accountName: bankDetails.accountName,
          recipientCode: bankDetails.recipientCode,
        },
      });

      return [updatedWallet, withdrawal] as const;
    });

    // Notify Admins
    await createNotification({
      type: "SYSTEM",
      title: "New Withdrawal Request",
      message: `${user.firstName} ${user.lastName} requested a withdrawal of ₦${amount.toLocaleString()}.`,
      audience: "GENERAL_ADMINS",
      link: "/surf-restricted/dashboard/qr-earnings",
      sendEmail: true,
    });

    revalidatePath("/surfboard/dashboard/qr-earnings");
    revalidatePath("/surf-restricted/dashboard/qr-earnings");

    return {
      success: true,
      data: withdrawal,
    };
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { success: false, error: "Insufficient available balance" };
    }
    console.error("Error requesting withdrawal:", error);
    return { success: false, error: "Failed to request withdrawal" };
  }
}
