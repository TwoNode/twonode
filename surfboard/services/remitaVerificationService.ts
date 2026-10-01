import prisma from "@/lib/prisma";
import area from "@turf/area";
import { checkPaymentStatus } from "@/app/(projects)/(surfboard)/utils/remita";
import { fetchAndExtractTextFromUrl } from "@/app/(projects)/(surfboard)/utils/pdfUtils";
import { extractLASGReceiptFromHtml, extractPaymentDetailsFromText } from "@/surfboard/services/aiExtractionService";
import {
  notifyLASGReceiptUploaded,
  notifyPaymentReceived,
  notifyRecordCopySubmitted,
} from "@/surfboard/services/notificationService";
import { logAuditAction, createChangeLog } from "@/app/(projects)/(surfboard)/utils/auditLogger";
import { computeGeometryDetails } from "@/app/(projects)/(surfboard)/utils/dbUtils";
import { calculatePlanFeeByZone, getChartingInterpretation, getZoneFromGeometry } from "@/surfboard/services/codFeeService";
import { getZoneFees, getSystemChargePercent } from "@/surfboard/services/settingsService";
import { ApiError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { SurfboardRole } from "@/utils/platform";
import { paginatedResult } from "@/lib/api/pagination";

/**
 * Migrated from app/(projects)/(surfboard)/actions/codActions.ts — batch
 * submission through Remita/LASG payment verification. Depends on
 * codFeeService.ts and settingsService.ts (both already migrated) for
 * zone/fee calculation.
 *
 * Callers pass userId/userRole explicitly instead of this service reading
 * cookies itself.
 */

type PayerProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  payerID?: number | null;
  payerIDType?: string | null;
};

export async function getBatchesByStatus(status: string | undefined, userRole: SurfboardRole) {
  if (userRole !== SurfboardRole.ADMIN && userRole !== SurfboardRole.SUPERADMIN) {
    throw new ForbiddenError();
  }

  const whereClause: any = {};
  if (status) whereClause.paymentStatus = status;

  const batches = await prisma.certificateOfDepositBatch.findMany({
    where: whereClause,
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { plans: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return batches.map((batch) => ({ ...batch, planCount: batch._count.plans, _count: undefined }));
}

export interface GetAdminBatchesParams {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}

/** Admin-only, paginated/searchable sibling of getBatchesByStatus — kept separate since that function is also used unpaginated by the surveyor-facing submitted-batches modal. */
export async function getBatchesByStatusPaginated(userRole: SurfboardRole, params: GetAdminBatchesParams) {
  if (userRole !== SurfboardRole.ADMIN && userRole !== SurfboardRole.SUPERADMIN) {
    throw new ForbiddenError();
  }
  const { page, pageSize, status, search } = params;

  const where: any = {};
  if (status) where.paymentStatus = status;
  if (search) {
    where.OR = [
      { batchCode: { contains: search, mode: "insensitive" } },
      { submitter: { firstName: { contains: search, mode: "insensitive" } } },
      { submitter: { lastName: { contains: search, mode: "insensitive" } } },
      { submitter: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.certificateOfDepositBatch.findMany({
      where,
      include: {
        submitter: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { plans: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.certificateOfDepositBatch.count({ where }),
  ]);

  const data = rows.map((batch) => ({ ...batch, planCount: batch._count.plans, _count: undefined }));
  return paginatedResult(data, total, page, pageSize);
}

/** Aggregate counts/totals for a given payment status — kept independent of the paginated list so stat cards reflect the whole status bucket, not just the current page. */
export async function getBatchStatusStats(userRole: SurfboardRole, status: string) {
  if (userRole !== SurfboardRole.ADMIN && userRole !== SurfboardRole.SUPERADMIN) {
    throw new ForbiddenError();
  }
  const [count, aggregates] = await Promise.all([
    prisma.certificateOfDepositBatch.count({ where: { paymentStatus: status as any } }),
    prisma.certificateOfDepositBatch.aggregate({
      where: { paymentStatus: status as any },
      _sum: { totalAmount: true },
    }),
  ]);
  const planCountAgg = await prisma.surfboardPlan.count({ where: { batch: { paymentStatus: status as any } } });

  return {
    count,
    totalPlans: planCountAgg,
    totalAmount: aggregates._sum?.totalAmount ?? 0,
  };
}

/** Breakdown across every payment status at once — the Certificates page's overview cards, which (unlike Batch Management's two-tab view) span the whole bucket regardless of the active status filter. */
export async function getAllBatchStats(userRole: SurfboardRole) {
  if (userRole !== SurfboardRole.ADMIN && userRole !== SurfboardRole.SUPERADMIN) {
    throw new ForbiddenError();
  }
  const grouped = await prisma.certificateOfDepositBatch.groupBy({
    by: ["paymentStatus"],
    _count: true,
  });
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of grouped) {
    byStatus[row.paymentStatus] = row._count;
    total += row._count;
  }
  return {
    total,
    pendingUserPayment: byStatus.PENDING_USER_PAYMENT ?? 0,
    lasgPaid: byStatus.LASG_PAID ?? 0,
    accountsApproved: byStatus.ACCOUNTS_APPROVED ?? 0,
    accountsDisapproved: byStatus.ACCOUNTS_DISAPPROVED ?? 0,
    completed: byStatus.COMPLETED ?? 0,
  };
}

export async function submitRedCopyBatch(userId: string, planIds: string[], acceptanceAcknowledged: boolean) {
  if (!acceptanceAcknowledged) throw new ValidationError({ acceptanceAcknowledged: "Submission policy must be acknowledged" });

  const userDetails = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, payerID: true, payerIDType: true },
  });
  if (!userDetails) throw new NotFoundError("User details");

  const plans = await prisma.surfboardPlan.findMany({
    where: { id: { in: planIds }, userId, status: "PENDING", redCopyStatus: "NOT_SUBMITTED", deleted: false },
    select: { id: true, planNumber: true, geometry: true, surveyTitle: true, ethnicity: true, lga: true, deededArea: true, redCopyFileUrl: true },
  });
  if (plans.length !== planIds.length) {
    throw new ValidationError({ planIds: "Some plans are not eligible for submission or do not exist" });
  }

  const missingRecordCopy = plans.filter((p) => !p.redCopyFileUrl);
  if (missingRecordCopy.length > 0) {
    throw new ValidationError({
      redCopyFileUrl: `Please upload record copy for all selected plans. Missing: ${missingRecordCopy.map((p) => p.planNumber).join(", ")}`,
    });
  }

  const zoneFees = await getZoneFees();
  const systemChargePercent = await getSystemChargePercent();

  let totalFees = 0;
  const planFeeData = new Map<string, { fee: number; zone: string; isDoubleFee: boolean }>();
  const plansWithNoZone: string[] = [];

  for (const plan of plans) {
    const geom = typeof plan.geometry === "string" ? JSON.parse(plan.geometry) : plan.geometry;
    let planTotalFee = 0;
    let primaryZone = "";
    let anyDoubleFee = false;

    if (geom.type === "MultiPolygon") {
      for (let i = 0; i < geom.coordinates.length; i++) {
        const poly = { type: "Polygon", coordinates: geom.coordinates[i] };
        const polyString = JSON.stringify(poly);
        const zoneResult = await prisma.$queryRaw<Array<{ Zone: string }>>`
          SELECT "Zone" FROM "Scale_of_fees"
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(${polyString}), 4326))
          LIMIT 1;
        `;
        const parcelZone = zoneResult?.[0]?.Zone;
        if (!parcelZone) {
          plansWithNoZone.push(`${plan.planNumber} (Parcel ${i + 1})`);
          continue;
        }
        if (!primaryZone) primaryZone = parcelZone;

        const parcelArea = area(poly as any);
        const parcelInfo = (plan as any).parcels?.find((p: any) => p.polygonIndex === i);
        const titleToUse = parcelInfo?.surveyTitle || plan.surveyTitle;

        const { fee, isDoubleFee } = await calculatePlanFeeByZone(parcelZone, parcelArea, titleToUse, zoneFees, plan.ethnicity);
        planTotalFee += fee;
        if (isDoubleFee) anyDoubleFee = true;
      }
    } else {
      const zone = await getZoneFromGeometry(plan.geometry);
      if (!zone) {
        plansWithNoZone.push(plan.planNumber);
        continue;
      }
      primaryZone = zone;

      let areaSqM = 0;
      try {
        areaSqM = computeGeometryDetails(plan.geometry as any).areaSqM;
      } catch (error) {
        console.error("Error computing area for plan:", plan.planNumber, error);
      }

      const { fee, isDoubleFee } = await calculatePlanFeeByZone(zone, areaSqM, plan.surveyTitle, zoneFees, plan.ethnicity);
      planTotalFee = fee;
      anyDoubleFee = isDoubleFee;
    }

    planFeeData.set(plan.id, { fee: planTotalFee, zone: primaryZone, isDoubleFee: anyDoubleFee });
    totalFees += planTotalFee;
  }

  if (plansWithNoZone.length > 0) {
    throw new ValidationError({
      geometry: `The following plans are outside Lagos fee zones and cannot be submitted: ${plansWithNoZone.join(", ")}. Please ensure the survey geometry falls within Lagos State.`,
    });
  }

  const systemCharges = totalFees * (systemChargePercent / 100);
  const totalAmount = Math.trunc((totalFees + systemCharges) * 100) / 100;

  if (totalAmount <= 0) {
    throw new ValidationError({ totalAmount: "Unable to calculate fees. Please ensure zone fees are configured and plan area is valid." });
  }

  const batch = await prisma.certificateOfDepositBatch.create({
    data: {
      submittedBy: userId,
      planCount: plans.length,
      totalFees: Math.trunc(totalFees * 100) / 100,
      systemCharges: Math.trunc(systemCharges * 100) / 100,
      totalAmount,
      paymentStatus: "PENDING_USER_PAYMENT",
    },
    select: { id: true, batchCode: true, userPaymentRef: true },
  });

  for (const plan of plans) {
    const chartingInterpretation = await getChartingInterpretation(plan.geometry);
    const feeData = planFeeData.get(plan.id);

    await prisma.surfboardPlan.update({
      where: { id: plan.id },
      data: {
        batchId: batch.id,
        possibleChartingRemarks: chartingInterpretation,
        redCopyStatus: "SUBMITTED",
        redCopySubmittedAt: new Date(),
        accountsStatus: "PENDING",
        chartingStatus: "PENDING",
        surconStatus: "PENDING",
        recordsIStatus: "PENDING",
        recordsIIStatus: "PENDING",
        zone: feeData?.zone,
        codFee: feeData?.fee,
        isDoubleFee: feeData?.isDoubleFee ?? false,
      },
    });
  }

  await logAuditAction({
    userId,
    action: "SUBMIT_BATCH",
    entity: "CertificateOfDepositBatch",
    entityId: batch.id,
    changes: createChangeLog({ batchCode: batch.batchCode, planCount: plans.length, planIds, totalAmount, totalFees, systemCharges }),
  });

  try {
    await notifyRecordCopySubmitted({ userId, batchId: batch.id, batchCode: batch.batchCode, planCount: plans.length, totalAmount, sendEmail: true });
  } catch (notifError) {
    console.error("Error sending batch submission notification:", notifError);
  }

  const submitter: PayerProfile = userDetails;
  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    totalAmount,
    planCount: plans.length,
    reference: batch.userPaymentRef,
    email: userDetails.email,
    submitter,
  };
}

export async function verifyBatchPayment(userId: string, reference: string) {
  const batch = await prisma.certificateOfDepositBatch.findFirst({ where: { userPaymentRef: reference, submittedBy: userId } });
  if (!batch) throw new NotFoundError("Batch");

  if (batch.paymentStatus === "LASG_PAID") {
    return { batchId: batch.id, status: batch.paymentStatus };
  }

  const remitaStatus = await checkPaymentStatus(reference);

  if (remitaStatus.status === "paid") {
    await prisma.certificateOfDepositBatch.update({
      where: { id: batch.id },
      data: { paymentStatus: "LASG_PAID", userPaymentDate: remitaStatus.paymentDate || new Date(), lasgPaymentDate: remitaStatus.paymentDate || new Date() },
    });

    const submitter = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    if (submitter) {
      await notifyPaymentReceived({ batchId: batch.id, batchCode: batch.batchCode, amount: batch.totalAmount, paidBy: submitter, sendEmail: true });
    }
    await notifyLASGReceiptUploaded({ batchId: batch.id, batchCode: batch.batchCode, planCount: batch.planCount, sendEmail: true });

    await logAuditAction({
      userId,
      action: "VERIFY_PAYMENT",
      entity: "CertificateOfDepositBatch",
      entityId: batch.id,
      changes: createChangeLog({ batchCode: batch.batchCode, reference, amount: batch.totalAmount, paymentStatus: "LASG_PAID", note: "Direct MDA Remita payment verified" }),
    });

    return { batchId: batch.id, status: "LASG_PAID" };
  }

  if (remitaStatus.status === "pending") {
    return { batchId: batch.id, status: "PENDING" };
  }

  throw new ValidationError({ payment: remitaStatus.message || "Payment verification failed" });
}

export async function verifyBatchPaymentWithLinks(
  userId: string,
  userRole: SurfboardRole,
  batchId: string,
  lasgReceiptUrl: string,
  remitaReceiptUrl: string
) {
  const batch = await prisma.certificateOfDepositBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new NotFoundError("Batch");

  if (batch.submittedBy !== userId && userRole !== SurfboardRole.SUPERADMIN) {
    throw new ForbiddenError();
  }

  if (batch.paymentStatus === "LASG_PAID") {
    return { success: true, status: batch.paymentStatus, ebsUrl: batch.lasgReceiptUrl || "" };
  }

  let transId = "", transCode = "", payerId = "", payerType = "n";
  let isLegacyUrl = false;
  try {
    const lasgUrl = new URL(lasgReceiptUrl);
    if (lasgUrl.hostname !== "printreceipt.ebs-rcm.com" && !lasgUrl.hostname.includes("ebs-rcm.com")) {
      throw new ValidationError({ lasgReceiptUrl: "Invalid LASG receipt URL. Please paste a valid URL from ebs-rcm.com." });
    }
    transId = lasgUrl.searchParams.get("transid") || "";
    transCode = lasgUrl.searchParams.get("transcode") || "";
    payerId = lasgUrl.searchParams.get("payerid") || "";
    payerType = lasgUrl.searchParams.get("payertype") || "n";
    if (transId && transCode && payerId) isLegacyUrl = true;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError({ lasgReceiptUrl: "Invalid LASG receipt URL format. Please paste a valid URL starting with https://printreceipt.ebs-rcm.com/..." });
  }

  interface RemitaPaymentDetail {
    STATUS?: string;
    PAYMENTSTATUS?: string;
    RRRNUMBER?: string;
    RRR?: string;
    PAYER?: string;
    EMAIL?: string;
    TRANSACTIONAMOUNT?: number;
  }
  interface RemitaCustomField {
    COLUMNNAME?: string;
    COLUMNVALUE?: string;
  }
  interface RemitaApiResponse {
    paymentDetails?: RemitaPaymentDetail[];
    customFields?: RemitaCustomField[];
    status?: string;
  }

  const lasgPipeline = fetchAndExtractTextFromUrl(lasgReceiptUrl)
    .then(async (lasgExtracted) => {
      const text = lasgExtracted.text;
      if (!text || text.trim().length < 50) {
        throw new Error("[Step 4: Fetch LASG Receipt] LASG receipt page returned insufficient content. Please check the URL is correct and accessible.");
      }
      const aiResult = await extractLASGReceiptFromHtml(text);
      if (!aiResult.success || !aiResult.data) {
        throw new Error(`[Step 5: LASG Data Extraction] ${aiResult.error}`);
      }
      return aiResult.data;
    })
    .catch((err) => {
      if (err instanceof Error && err.message.includes("[Step")) throw err;
      throw new Error(`[Step 4: Fetch LASG Receipt] Failed to access LASG receipt URL: ${err.message}`);
    });

  const remitaApiUrl = remitaReceiptUrl.replace("/view-rrr/details.json", "/details.json");
  const remitaPipeline = fetch(remitaApiUrl, { headers: { "User-Agent": "Mozilla/5.0" } })
    .then(async (remitaRes) => {
      if (!remitaRes.ok) {
        throw new Error(`[Step 4: Fetch Remita Receipt] Failed to fetch Remita receipt data (HTTP status ${remitaRes.status}). Please check the URL is correct and accessible.`);
      }
      const remitaJson: RemitaApiResponse = await remitaRes.json();
      if (!remitaJson?.paymentDetails || remitaJson.paymentDetails.length === 0) {
        throw new Error(`[Step 4: Fetch Remita Receipt] Remita API returned no payment details. The receipt may be invalid or expired.`);
      }
      const pd = remitaJson.paymentDetails[0];
      const customFields = remitaJson.customFields || [];
      const lasgField = customFields.find((f) => f.COLUMNNAME?.toLowerCase() === "lasg");
      const remitaTransactionAnchor = lasgField?.COLUMNVALUE || "";
      const isRemitaPaid = remitaJson.status === "A" || pd.PAYMENTSTATUS === "RTC" || pd.PAYMENTSTATUS === "00" || pd.PAYMENTSTATUS === "01";

      const data = {
        rrr: String(pd.RRRNUMBER || pd.RRR || "").replace(/\D/g, ""),
        amount: Number(pd.TRANSACTIONAMOUNT) || 0,
        status: isRemitaPaid ? "PAID" : "UNPAID",
        transactionAnchor: remitaTransactionAnchor,
        payerName: String(pd.PAYER || "").trim(),
        payerEmail: String(pd.EMAIL || "").trim(),
      };
      if (!data.rrr || data.rrr.length < 10) {
        throw new Error(`[Step 5: Remita Data Extraction] Could not extract a valid RRR from the Remita receipt.`);
      }
      if (!data.transactionAnchor) {
        throw new Error(`[Step 5: Remita Data Extraction] Could not extract the LASG reference (anchor) from the Remita receipt BILLER REQUIRED INFORMATION section.`);
      }
      return data;
    })
    .catch((err) => {
      if (err instanceof Error && err.message.includes("[Step")) throw err;
      throw new Error(`[Step 4: Fetch Remita Receipt] Failed to access Remita receipt URL: ${err.message}`);
    });

  const userPromise = prisma.surfboardUser.findUnique({ where: { id: userId }, select: { payerID: true, payerIDType: true, firstName: true, lastName: true } });

  const [lasgResultPromise, remitaResultPromise, userResultPromise] = await Promise.allSettled([lasgPipeline, remitaPipeline, userPromise]);

  if (lasgResultPromise.status === "rejected") {
    throw new ValidationError({ lasgReceiptUrl: lasgResultPromise.reason?.message || "Unknown error parsing LASG receipt" });
  }
  const lasgData = lasgResultPromise.value;

  if (remitaResultPromise.status === "rejected") {
    throw new ValidationError({ remitaReceiptUrl: remitaResultPromise.reason?.message || "Unknown error parsing Remita receipt" });
  }
  const remitaData = remitaResultPromise.value;

  const fullUser = userResultPromise.status === "fulfilled" ? userResultPromise.value : null;

  const finalPayerId = isLegacyUrl ? payerId : lasgData.payerId?.replace(/\D/g, "");
  const finalPayerType = isLegacyUrl ? payerType : lasgData.payerType;

  if (finalPayerId) {
    if (!fullUser?.payerID) {
      throw new ValidationError({ payerID: "You cannot verify a payment because your profile does not have a Payer ID set. Please update your profile settings first." });
    }
    const urlPayerIdNum = parseInt(finalPayerId, 10);
    if (urlPayerIdNum !== fullUser.payerID) {
      throw new ValidationError({
        payerID: `Payer ID mismatch: The LASG receipt belongs to Payer ID "${finalPayerId}" but your profile has Payer ID "${fullUser.payerID}". You cannot use another user's receipt.`,
      });
    }
    if (finalPayerType) {
      const expectedType = fullUser.payerIDType === "Commercial" ? "c" : "n";
      const incomingType = finalPayerType.toLowerCase().charAt(0);
      if (incomingType !== expectedType) {
        throw new ValidationError({
          payerIDType: `Payer Type mismatch: The LASG receipt has Payer Type "${finalPayerType.toUpperCase()}" but your profile has Payer Type "${fullUser.payerIDType || "Individual"}". Please check your profile settings.`,
        });
      }
    }
  }

  const normalizeAnchor = (anchor: string) => anchor.replace(/[^0-9-]/g, "").trim();
  const lasgAnchor = normalizeAnchor(lasgData.transactionAnchor);
  const remitaAnchor = normalizeAnchor(remitaData.transactionAnchor);

  if (lasgAnchor !== remitaAnchor) {
    throw new ValidationError({
      anchor: `Transaction anchor mismatch: The LASG receipt reference "${lasgData.transactionAnchor}" does not match the Remita receipt reference "${remitaData.transactionAnchor}". These two receipts do not appear to be for the same transaction.`,
    });
  }

  if (lasgData.amountPaid !== batch.totalAmount) {
    throw new ValidationError({
      amount: `Amount mismatch: The LASG receipt shows ₦${lasgData.amountPaid.toLocaleString()} but the batch total is ₦${batch.totalAmount.toLocaleString()}. The payment amount must exactly match.`,
    });
  }

  if (remitaData.status !== "PAID") {
    throw new ValidationError({ status: `Remita receipt status is "${remitaData.status}" — expected "PAID". Please ensure payment is complete before verifying.` });
  }

  const rrr = remitaData.rrr;
  const existingBatchWithRRR = await prisma.certificateOfDepositBatch.findFirst({ where: { userPaymentRef: rrr, id: { not: batchId } }, select: { id: true, batchCode: true } });
  if (existingBatchWithRRR) {
    throw new ValidationError({ rrr: `This RRR (${rrr}) has already been used for batch ${existingBatchWithRRR.batchCode}. Each RRR can only be used once.` });
  }

  const ebsUrl = isLegacyUrl
    ? `https://printreceipt.ebs-rcm.com/Listen/printreceipt?dbName=LASG&payertype=${payerType}&payerid=${payerId}&transid=${transId}&transcode=${transCode}`
    : lasgReceiptUrl;

  const lasgPaymentDate = lasgData.transactionDate ? new Date(lasgData.transactionDate) : new Date();
  const validLasgPaymentDate = isNaN(lasgPaymentDate.getTime()) ? new Date() : lasgPaymentDate;

  await prisma.certificateOfDepositBatch.update({
    where: { id: batchId },
    data: {
      userPaymentRef: rrr,
      paymentStatus: "LASG_PAID",
      userPaymentDate: new Date(),
      lasgPaymentDate: validLasgPaymentDate,
      paymentAnchor: lasgAnchor,
      lasgReceiptUrl: ebsUrl,
      remitaReceiptUrl,
      lasgReceiptS3Key: null,
    },
  });

  const submitter = fullUser || (await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }));
  if (submitter) {
    try {
      await notifyPaymentReceived({ batchId: batch.id, batchCode: batch.batchCode, amount: batch.totalAmount, paidBy: submitter, sendEmail: true });
      await notifyLASGReceiptUploaded({ batchId: batch.id, batchCode: batch.batchCode, planCount: batch.planCount, sendEmail: true });
    } catch (e) {
      console.error("Notification error", e);
    }
  }

  return { success: true, status: "LASG_PAID", ebsUrl };
}

export async function verifyLASGReceiptLink(userId: string, userRole: SurfboardRole, batchId: string, receiptUrl: string) {
  const batch = await prisma.certificateOfDepositBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new NotFoundError("Batch");
  if (batch.submittedBy !== userId && userRole !== SurfboardRole.SUPERADMIN) throw new ForbiddenError();

  const { text } = await fetchAndExtractTextFromUrl(receiptUrl);
  const aiResult = await extractPaymentDetailsFromText(text);
  if (!aiResult.success || !aiResult.data) {
    throw new ValidationError({ receiptUrl: "Could not analyze receipt. Please ensure it is a valid PDF receipt." });
  }

  const { status, amount, rrr } = aiResult.data;
  if (status === "PENDING" || status === "FAILED") {
    throw new ValidationError({ status: `Receipt analysis indicates status is ${status}. Please upload a successful payment receipt.` });
  }

  const tolerance = 5.0;
  if (Math.abs(amount - batch.totalAmount) > tolerance) {
    throw new ValidationError({ amount: `Receipt amount (₦${amount}) does not match batch amount (₦${batch.totalAmount}).` });
  }

  await prisma.certificateOfDepositBatch.update({
    where: { id: batchId },
    data: { userPaymentRef: rrr || batch.userPaymentRef, paymentStatus: "LASG_PAID", userPaymentDate: new Date(), lasgPaymentDate: new Date(), lasgReceiptUrl: receiptUrl },
  });

  const submitter = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  if (submitter) {
    try {
      await notifyPaymentReceived({ batchId: batch.id, batchCode: batch.batchCode, amount: batch.totalAmount, paidBy: submitter, sendEmail: true });
      await notifyLASGReceiptUploaded({ batchId: batch.id, batchCode: batch.batchCode, planCount: batch.planCount, sendEmail: true });
    } catch (e) {
      console.error("Notification error", e);
    }
  }

  return { success: true, status: "LASG_PAID" };
}

/**
 * Called by batchApprovalService.ts's resubmitQueriedPlan (not built yet) —
 * kept private in the source; exported here so that service can import it
 * once it exists.
 */
export async function verifyQueryPaymentLinks(
  userId: string,
  lasgReceiptUrl: string,
  remitaReceiptUrl: string,
  expectedAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const remitaApiUrl = remitaReceiptUrl.replace("/view-rrr/details.json", "/details.json");

    const [lasgResult, remitaResult, fullUserResult] = await Promise.allSettled([
      fetchAndExtractTextFromUrl(lasgReceiptUrl),
      fetch(remitaApiUrl, { headers: { "User-Agent": "Mozilla/5.0" } }),
      prisma.surfboardUser.findUnique({ where: { id: userId }, select: { payerID: true, payerIDType: true } }),
    ]);

    let transId = "", transCode = "", payerId = "", payerType = "";
    let isLegacyUrl = false;
    try {
      const lasgUrl = new URL(lasgReceiptUrl);
      if (lasgUrl.hostname !== "printreceipt.ebs-rcm.com" && !lasgUrl.hostname.includes("ebs-rcm.com")) {
        return { success: false, error: "Invalid LASG receipt URL. Please paste a valid URL from ebs-rcm.com." };
      }
      transId = lasgUrl.searchParams.get("transid") || "";
      transCode = lasgUrl.searchParams.get("transcode") || "";
      payerId = lasgUrl.searchParams.get("payerid") || "";
      payerType = lasgUrl.searchParams.get("payertype") || "n";
      if (transId && transCode && payerId) isLegacyUrl = true;
    } catch {
      return { success: false, error: "Invalid LASG receipt URL format." };
    }

    if (isLegacyUrl && fullUserResult.status === "fulfilled" && fullUserResult.value?.payerID) {
      const dbPayerID = fullUserResult.value.payerID;
      if (parseInt(payerId, 10) !== dbPayerID) {
        return { success: false, error: `Payer ID mismatch: Receipt has ${payerId}, profile has ${dbPayerID}.` };
      }
      if (payerType) {
        const expectedType = fullUserResult.value.payerIDType === "Commercial" ? "c" : "n";
        const incomingType = payerType.toLowerCase().charAt(0);
        if (incomingType !== expectedType) {
          return {
            success: false,
            error: `Payer Type mismatch: The LASG receipt has Payer Type "${payerType.toUpperCase()}" but your profile has Payer Type "${fullUserResult.value.payerIDType || "Individual"}". Please check your profile settings.`,
          };
        }
      }
    }

    if (lasgResult.status === "rejected") {
      return { success: false, error: `Failed to access LASG receipt: ${(lasgResult.reason as any)?.message || "Unknown error"}` };
    }
    const lasgExtracted = lasgResult.value;
    if (!lasgExtracted.text || lasgExtracted.text.trim().length < 50) {
      return { success: false, error: "LASG receipt returned insufficient content." };
    }

    if (remitaResult.status === "rejected") {
      return { success: false, error: "Failed to fetch Remita receipt data." };
    }
    const remitaRes = remitaResult.value;
    if (!remitaRes.ok) {
      return { success: false, error: `Remita receipt API error (Status: ${remitaRes.status}).` };
    }

    const remitaJson = await remitaRes.json();
    if (!remitaJson?.paymentDetails || remitaJson.paymentDetails.length === 0) {
      return { success: false, error: "Remita API returned no payment details." };
    }

    const pd = remitaJson.paymentDetails[0];
    const amount = Number(pd.TRANSACTIONAMOUNT_NOFEE || pd.TRANSACTIONAMOUNT) || 0;
    const rrr = String(pd.RRRNUMBER || pd.RRR || "").replace(/\D/g, "");

    const [existingBatch, existingPlanWithReceipt] = await Promise.all([
      prisma.certificateOfDepositBatch.findFirst({ where: { userPaymentRef: rrr }, select: { batchCode: true } }),
      prisma.surfboardPlan.findFirst({
        where: { OR: [{ queryLasgReceiptUrls: { has: lasgReceiptUrl } }, { queryRemitaReceiptUrls: { has: remitaReceiptUrl } }] },
        select: { planNumber: true },
      }),
    ]);

    if (existingBatch) {
      return { success: false, error: `This receipt (RRR: ${rrr}) has already been used for batch submission (${existingBatch.batchCode}).` };
    }
    if (existingPlanWithReceipt) {
      return { success: false, error: `This receipt has already been used for a query response (Plan: ${existingPlanWithReceipt.planNumber}). Each query response requires a new, unique payment.` };
    }

    if (Math.abs(amount - expectedAmount) > 1) {
      return { success: false, error: `Payment mismatch: Expected ₦${expectedAmount.toLocaleString()}, but receipt is ₦${amount?.toLocaleString()}.` };
    }

    const isRemitaPaid = remitaJson.status === "A" || pd.PAYMENTSTATUS === "RTC" || pd.PAYMENTSTATUS === "00" || pd.PAYMENTSTATUS === "01";
    if (!isRemitaPaid) {
      const statusLabel = pd.PAYMENTSTATUS || remitaJson.status || "PENDING";
      return { success: false, error: `Payment status is ${statusLabel}.` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Verification error:", error);
    return { success: false, error: `Verification error: ${error.message}` };
  }
}

export async function getUserBatches(userId: string) {
  return prisma.certificateOfDepositBatch.findMany({
    where: { submittedBy: userId },
    select: {
      id: true,
      batchCode: true,
      planCount: true,
      totalFees: true,
      systemCharges: true,
      totalAmount: true,
      paymentStatus: true,
      userPaymentRef: true,
      userPaymentDate: true,
      createdAt: true,
      lasgReceiptUrl: true,
      remitaReceiptUrl: true,
      plans: {
        select: {
          id: true,
          planNumber: true,
          surveyTitle: true,
          facilitator: true,
          status: true,
          redCopyStatus: true,
          physicalCopySubmitted: true,
          physicalCopySubmittedAt: true,
          accountsStatus: true,
          chartingStatus: true,
          recordsIStatus: true,
          surconStatus: true,
        },
        orderBy: { createdAt: "asc" },
      },
      submitter: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, payerID: true, payerIDType: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const USER_BATCH_SELECT = {
  id: true,
  batchCode: true,
  planCount: true,
  totalFees: true,
  systemCharges: true,
  totalAmount: true,
  paymentStatus: true,
  userPaymentRef: true,
  userPaymentDate: true,
  createdAt: true,
  lasgReceiptUrl: true,
  remitaReceiptUrl: true,
  plans: {
    select: {
      id: true,
      planNumber: true,
      surveyTitle: true,
      facilitator: true,
      status: true,
      redCopyStatus: true,
      physicalCopySubmitted: true,
      physicalCopySubmittedAt: true,
      accountsStatus: true,
      chartingStatus: true,
      recordsIStatus: true,
      surconStatus: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  submitter: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, payerID: true, payerIDType: true } },
} as const;

/**
 * Paginated sibling of getUserBatches, for "My Batches" ("Active" / history
 * split): a batch moves to "history" once every plan in it has reached
 * LODGED — nothing further for the surveyor to do on it. Kept as a separate
 * function (not a getUserBatches option) since the plain array shape is
 * still used elsewhere (e.g. dashboard stat tiles) and shouldn't change.
 */
export async function getUserBatchesPaginated(
  userId: string,
  options: { page: number; pageSize: number; skip: number; take: number; scope: "active" | "history"; search?: string }
) {
  const historyFilter = { plans: { some: {}, every: { status: "LODGED" as const } } };
  const activeFilter = { plans: { some: { status: { not: "LODGED" as const } } } };

  const where: any = {
    submittedBy: userId,
    ...(options.scope === "history" ? historyFilter : activeFilter),
  };
  if (options.search) {
    where.OR = [
      { batchCode: { contains: options.search, mode: "insensitive" } },
      { plans: { some: { planNumber: { contains: options.search, mode: "insensitive" } } } },
      { plans: { some: { surveyTitle: { contains: options.search, mode: "insensitive" } } } },
      { plans: { some: { facilitator: { contains: options.search, mode: "insensitive" } } } },
    ];
  }

  const [total, batches] = await Promise.all([
    prisma.certificateOfDepositBatch.count({ where }),
    prisma.certificateOfDepositBatch.findMany({
      where,
      select: USER_BATCH_SELECT,
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    }),
  ]);

  return paginatedResult(batches, total, options.page, options.pageSize);
}

export async function getBatchPDFData(userId: string, batchId: string) {
  const batch = await prisma.certificateOfDepositBatch.findFirst({
    where: { id: batchId, submittedBy: userId },
    select: {
      batchCode: true,
      createdAt: true,
      paymentStatus: true,
      plans: {
        select: {
          planNumber: true,
          pillarType: true,
          pillars: true,
          surveyTitle: true,
          locality: true,
          deededArea: true,
          zone: true,
          planType: true,
          accountsStatus: true,
          chartingStatus: true,
          surconStatus: true,
          recordsIStatus: true,
          physicalCopySubmitted: true,
          physicalCopySubmittedAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      submitter: { select: { firstName: true, lastName: true, prefix: true, suffix: true, surconRegName: true, surconRegNumber: true, signature: true, companyAddress: true } },
    },
  });
  if (!batch) throw new NotFoundError("Batch");

  const totalPlansInBatch = batch.plans.length;
  const eligiblePlans = batch.plans.filter(
    (plan) => plan.accountsStatus === "APPROVED" && plan.chartingStatus === "APPROVED" && plan.recordsIStatus === "APPROVED" && plan.surconStatus === "APPROVED"
  );

  let currentSubmissionPlans = eligiblePlans.filter((p) => !p.physicalCopySubmitted);
  if (currentSubmissionPlans.length === 0 && eligiblePlans.length > 0) {
    let latestSubmissionTime = 0;
    eligiblePlans.forEach((p) => {
      if (p.physicalCopySubmittedAt) {
        const t = new Date(p.physicalCopySubmittedAt).getTime();
        if (t > latestSubmissionTime) latestSubmissionTime = t;
      }
    });
    if (latestSubmissionTime > 0) {
      currentSubmissionPlans = eligiblePlans.filter((p) => {
        if (!p.physicalCopySubmittedAt) return false;
        return Math.abs(new Date(p.physicalCopySubmittedAt).getTime() - latestSubmissionTime) < 5 * 60 * 1000;
      });
    }
  }

  const previousSubmissionCount = eligiblePlans.length - currentSubmissionPlans.length;
  const eligiblePlansCount = currentSubmissionPlans.length;

  const plans = eligiblePlans.map((plan) => {
    let pillarArray: any[] = [];
    if (Array.isArray(plan.pillars)) {
      pillarArray = plan.pillars;
    } else if (plan.pillars && typeof plan.pillars === "object" && plan.pillars !== null) {
      pillarArray = Object.values(plan.pillars as Record<string, unknown>);
    }

    let pillarCount = 0;
    if (pillarArray.length > 0) {
      const uniquePillarNumbers = new Set(
        pillarArray.map((p) => String((p as any)?.pillarNumber || "").trim()).filter((n) => n !== "")
      );
      pillarCount = uniquePillarNumbers.size;
    }

    return {
      planNumber: plan.planNumber,
      pillarType: plan.pillarType || "Beacons",
      pillarCount,
      surveyTitle: plan.surveyTitle,
      locality: plan.locality || "",
      deededArea: plan.deededArea || "0",
      zone: plan.zone || "UTM(ZONE 31)",
      planType: plan.planType,
    };
  });

  return {
    batchCode: batch.batchCode,
    createdAt: batch.createdAt,
    submitter: batch.submitter,
    totalPlansInBatch,
    eligiblePlansCount,
    previousSubmissionCount,
    plans: plans.filter((p) => currentSubmissionPlans.some((csp) => csp.planNumber === p.planNumber)),
  };
}

export async function retryBatchPayment(userId: string, batchId: string) {
  const batch = await prisma.certificateOfDepositBatch.findFirst({
    where: { id: batchId, submittedBy: userId },
    select: { id: true, batchCode: true, totalAmount: true, paymentStatus: true, userPaymentRef: true },
  });
  if (!batch) throw new NotFoundError("Batch");
  if (batch.paymentStatus === "LASG_PAID") throw new ValidationError({ paymentStatus: "Batch payment already completed" });

  const userDetails = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, payerID: true, payerIDType: true },
  });
  if (!userDetails?.email) throw new NotFoundError("User or email");

  if (!batch.totalAmount || batch.totalAmount <= 0) {
    console.error("Invalid batch amount:", { batchId: batch.id, batchCode: batch.batchCode, totalAmount: batch.totalAmount });
    throw new ValidationError({ totalAmount: "Invalid batch amount. Please contact support." });
  }

  const reference = batch.userPaymentRef || `SurfCoD_${batch.batchCode}_${Date.now()}`;
  if (!batch.userPaymentRef) {
    await prisma.certificateOfDepositBatch.update({ where: { id: batch.id }, data: { userPaymentRef: reference } });
  }

  const submitter: PayerProfile = userDetails;
  return { reference, email: userDetails.email, amount: batch.totalAmount, batchCode: batch.batchCode, batchId: batch.id, submitter };
}

export async function uploadLASGReceipt(userId: string, userRole: SurfboardRole, batchId: string, receiptUrl: string, receiptS3Key: string) {
  if (userRole !== SurfboardRole.ADMIN && userRole !== SurfboardRole.SUPERADMIN) throw new ForbiddenError();

  await prisma.certificateOfDepositBatch.update({
    where: { id: batchId },
    data: {
      lasgReceiptUrl: receiptUrl,
      lasgReceiptS3Key: receiptS3Key,
      lasgPaymentDate: new Date(),
      lasgReceiptUploadedBy: userId,
      lasgReceiptUploadedAt: new Date(),
      paymentStatus: "LASG_PAID",
    },
  });

  const batchWithPlans = await prisma.certificateOfDepositBatch.findUnique({ where: { id: batchId }, select: { batchCode: true, planCount: true } });
  if (batchWithPlans) {
    await notifyLASGReceiptUploaded({ batchId, batchCode: batchWithPlans.batchCode, planCount: batchWithPlans.planCount, sendEmail: true });
  }

  await logAuditAction({
    userId,
    action: "UPLOAD_LASG_RECEIPT",
    entity: "CertificateOfDepositBatch",
    entityId: batchId,
    changes: createChangeLog({ batchCode: batchWithPlans?.batchCode, receiptUrl, receiptS3Key, paymentStatus: "LASG_PAID" }),
  });

  return { success: true };
}

export async function getCurrentPayerProfile(userId: string): Promise<PayerProfile> {
  const dbUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, payerID: true, payerIDType: true },
  });
  if (!dbUser) throw new NotFoundError("User");
  return dbUser;
}

/** Dev-only debug tool (SUPERADMIN, non-production) — resets every plan's batch/stage/lock fields and deletes all batches. */
export async function deleteAllBatches(): Promise<{ deletedCount: number }> {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "FORBIDDEN", "This action is not available in production");
  }

  await prisma.surfboardPlan.updateMany({
    where: { batchId: { not: null } },
    data: {
      batchId: null,
      redCopyStatus: "NOT_SUBMITTED",
      redCopySubmittedAt: null,
      possibleChartingRemarks: null,
      accountsStatus: "PENDING",
      chartingStatus: "PENDING",
      surconStatus: "PENDING",
      recordsIStatus: "PENDING",
      recordsIIStatus: "PENDING",
      chartingRemarks: null,
      chartingApprovedBy: null,
      chartingApprovedAt: null,
      surconApprovedBy: null,
      surconApprovedAt: null,
      surconComment: null,
      recordsIApprovedBy: null,
      recordsIApprovedAt: null,
      recordsIComment: null,
      recordsIIApprovedBy: null,
      recordsIIApprovedAt: null,
      recordsIIComment: null,
      accountsLockedBy: null,
      accountsLockedAt: null,
      accountsLockExpiresAt: null,
      chartingLockedBy: null,
      chartingLockedAt: null,
      chartingLockExpiresAt: null,
      surconLockedBy: null,
      surconLockedAt: null,
      surconLockExpiresAt: null,
      recordsILockedBy: null,
      recordsILockedAt: null,
      recordsILockExpiresAt: null,
      recordsIILockedBy: null,
      recordsIILockedAt: null,
      recordsIILockExpiresAt: null,
    },
  });

  const result = await prisma.certificateOfDepositBatch.deleteMany({});
  return { deletedCount: result.count };
}
