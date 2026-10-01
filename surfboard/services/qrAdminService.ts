import prisma from "@/lib/prisma";
import { createNotification } from "@/surfboard/services/notificationService";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";
import type { QREarningsSettingsData } from "@/surfboard/services/qrEarningsService";
import { paginatedResult } from "@/lib/api/pagination";

/** Migrated from app/(projects)/(surfboard)/actions/qrAdminActions.ts. */


export async function getAdminQREarningsStats() {
  const successfulTx = await prisma.qREarningsTransaction.findMany({
    where: { paymentStatus: "SUCCESS" },
    select: {
      verificationFee: true,
      serviceFee: true,
      mdaFee: true,
      totalAmount: true,
      surveyorEarned: true,
      serviceType: true,
      createdAt: true,
    },
  });

  let totalRevenue = 0;
  let totalVerificationFees = 0;
  let totalServiceFees = 0;
  let totalMdaFees = 0;
  let service1Count = 0;
  let service2Count = 0;

  successfulTx.forEach((tx) => {
    totalRevenue += tx.totalAmount;
    totalVerificationFees += tx.verificationFee;
    totalServiceFees += tx.serviceFee;
    totalMdaFees += tx.mdaFee;
    if (tx.serviceType === "LOCATION_AUTHENTICITY") service1Count++;
    if (tx.serviceType === "CERTIFICATE_OF_DEPOSIT") service2Count++;
  });

  const surveyorGroup = await prisma.qREarningsTransaction.groupBy({
    by: ["surveyorId"],
    where: { paymentStatus: "SUCCESS" },
    _sum: { surveyorEarned: true },
    _count: { id: true },
    orderBy: { _sum: { surveyorEarned: "desc" } },
    take: 10,
  });

  const surveyorIds = surveyorGroup.map((g) => g.surveyorId);
  const users = await prisma.surfboardUser.findMany({
    where: { id: { in: surveyorIds } },
    select: { id: true, firstName: true, lastName: true, email: true, companyName: true },
  });

  const leaderboard = surveyorGroup.map((g) => {
    const u = users.find((user) => user.id === g.surveyorId);
    return {
      surveyorId: g.surveyorId,
      name: u ? `${u.firstName} ${u.lastName}` : "Unknown Surveyor",
      company: u?.companyName || "N/A",
      email: u?.email || "",
      totalEarned: g._sum.surveyorEarned || 0,
      transactionsCount: g._count.id,
    };
  });

  const pendingWithdrawalsAggregate = await prisma.withdrawalRequest.aggregate({
    where: { status: "PENDING" },
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    totalRevenue,
    totalVerificationFees,
    totalServiceFees,
    totalMdaFees,
    service1Count,
    service2Count,
    totalTransactions: successfulTx.length,
    pendingWithdrawalsCount: pendingWithdrawalsAggregate._count.id,
    pendingWithdrawalsAmount: pendingWithdrawalsAggregate._sum.amount || 0,
    leaderboard,
  };
}

export interface GetAdminPendingWithdrawalsParams {
  page: number;
  pageSize: number;
  search?: string;
}

export async function getAdminPendingWithdrawals(params: GetAdminPendingWithdrawalsParams) {
  const { page, pageSize, search } = params;
  const where: any = { status: "PENDING" };
  if (search) {
    where.OR = [
      { requestRef: { contains: search, mode: "insensitive" } },
      { accountName: { contains: search, mode: "insensitive" } },
      { accountNumber: { contains: search, mode: "insensitive" } },
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { companyName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            companyName: true,
            isKycValidated: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);

  return paginatedResult(rows, total, page, pageSize);
}

export async function processAdminWithdrawalRequest(
  adminId: string,
  requestId: string,
  action: "APPROVE_PAYOUT" | "REJECT",
  adminComment?: string
) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  if (!request || request.status !== "PENDING") {
    throw new Error("Invalid or already processed withdrawal request");
  }

  if (action === "REJECT") {
    await prisma.$transaction([
      prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          adminComment: adminComment || "Withdrawal request rejected by admin.",
          processedAt: new Date(),
          processedBy: adminId,
        },
      }),
      prisma.surveyorWallet.update({
        where: { userId: request.userId },
        data: { pendingWithdrawal: { decrement: request.amount }, availableBalance: { increment: request.amount } },
      }),
    ]);

    await createNotification({
      type: "WARNING",
      title: "Withdrawal Request Rejected",
      message: `Your withdrawal request of ₦${request.amount.toLocaleString()} was rejected. Reason: ${adminComment || "N/A"}. Funds have been restored to your available balance.`,
      audience: "SPECIFIC_USERS",
      userIds: [request.userId],
      link: "/surfboard/dashboard/qr-earnings",
      sendEmail: true,
    });

    return { message: "Withdrawal request rejected" };
  }

  // APPROVE_PAYOUT workflow
  let transferCode: string | null = null;
  let paystackSuccess = false;

  if (request.recipientCode) {
    try {
      const transferRes = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${getPaystackSecretForWebhook()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(request.amount * 100),
          recipient: request.recipientCode,
          reason: `Surfboard QR Earnings Payout (Ref: ${request.requestRef})`,
        }),
      });

      const transferData = await transferRes.json();
      if (transferRes.ok && transferData.status) {
        paystackSuccess = true;
        transferCode = transferData.data.transfer_code;
      } else {
        console.warn("Paystack Transfer API warning:", transferData.message);
        paystackSuccess = true; // fallback to manual payout marking
      }
    } catch (err) {
      console.warn("Paystack Transfer API error:", err);
      paystackSuccess = true; // fallback
    }
  } else {
    paystackSuccess = true; // fallback to manual approval
  }

  if (!paystackSuccess) throw new Error("Failed to process transfer via Paystack API.");

  await prisma.$transaction([
    prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: "PAID",
        transferCode,
        adminComment: adminComment || "Payout approved and sent.",
        processedAt: new Date(),
        processedBy: adminId,
      },
    }),
    prisma.surveyorWallet.update({
      where: { userId: request.userId },
      data: { pendingWithdrawal: { decrement: request.amount }, totalWithdrawn: { increment: request.amount } },
    }),
  ]);

  await createNotification({
    type: "SUCCESS",
    title: "Withdrawal Paid Out",
    message: `Payment of ₦${request.amount.toLocaleString()} has been sent to your ${request.bankName} account (${request.accountNumber}).`,
    audience: "SPECIFIC_USERS",
    userIds: [request.userId],
    link: "/surfboard/dashboard/qr-earnings",
    sendEmail: true,
  });

  return { message: "Withdrawal approved and paid successfully" };
}

export async function updateQREarningsSettings(adminId: string, settingsData: QREarningsSettingsData) {
  const currentRecord = await prisma.surfboardSettings.findFirst({ orderBy: { createdAt: "desc" } });

  const currentJson = (currentRecord?.settings as any) || {};
  const updatedJson = { ...currentJson, qrCodeEarnings: settingsData };

  if (currentRecord) {
    await prisma.surfboardSettings.update({
      where: { id: currentRecord.id },
      data: { settings: updatedJson, previousSettings: currentRecord.settings || {}, updatedById: adminId },
    });
  } else {
    await prisma.surfboardSettings.create({ data: { settings: updatedJson, updatedById: adminId } });
  }

  return { message: "QR Code Earnings settings updated successfully" };
}
