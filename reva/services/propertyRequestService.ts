import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import { notifyNewPropertyRequest } from "@/reva/services/notificationService";

/**
 * Migrated from app/(projects)/reva/actions/revaActions.ts's property-CRUD
 * functions — both Property (authenticated) and OneTimeUserProperty (guest)
 * live here since they're the same conceptual entity split across two
 * tables. Pure Prisma, throws typed errors instead of {success:false}.
 */

export type PropertyStatus = "Available" | "Completed" | "Processing";
export type PaymentStatus = "Paid" | "Unpaid";

export type PropertyWithoutUser = Omit<
  Prisma.PropertyCreateInput,
  "user" | "status" | "paymentStatus"
> & {
  reference?: string;
  status?: PropertyStatus | string | null | undefined;
  paymentStatus?: PaymentStatus | string | null | undefined;
};

/** The native JWT session carries {sub, role, platform} only — routes that need the user's email/name for a Paystack charge or an email notification fetch it here. */
export async function getUserContact(userId: string) {
  const user = await prisma.revaUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!user) throw new NotFoundError("User");
  return user;
}

export type OneTimeUserPropertyCreateInput = Omit<
  Prisma.OneTimeUserPropertyCreateInput,
  "reference" | "status" | "paymentStatus"
>;

export type PropertyCreateInput = Omit<
  Prisma.PropertyCreateInput,
  "reference" | "status" | "paymentStatus"
>;

function generateReference(): string {
  return `REVA_${crypto.randomUUID().replace(/-/g, "").slice(0, 9)}`;
}

export async function saveToOneTimeProperty(data: OneTimeUserPropertyCreateInput) {
  const newProperty = await prisma.oneTimeUserProperty.create({
    data: {
      ...data,
      paymentStatus: "Unpaid",
      status: "Processing",
      statusMessage: "Request is being processed",
    } as Prisma.OneTimeUserPropertyCreateInput,
  });

  await notifyNewPropertyRequest(newProperty, undefined);

  return newProperty;
}

export async function saveToPropertyTable(data: PropertyCreateInput) {
  const newProperty = await prisma.property.create({
    data: {
      ...data,
      reference: generateReference(),
      paymentStatus: "Unpaid",
      status: "Processing",
      statusMessage: "Request is being processed",
    } as Prisma.PropertyCreateInput,
  });

  const propertyWithUser = await prisma.property.findUnique({
    where: { id: newProperty.id },
    include: { user: true },
  });

  await notifyNewPropertyRequest(newProperty, propertyWithUser?.user?.id);

  return newProperty;
}

export async function updateOneTimeTransactionStatus(
  reference: string,
  status: PropertyStatus,
  paymentStatus: PaymentStatus,
  statusMessage: string,
  error: string | null
) {
  return prisma.oneTimeUserProperty.update({
    where: { reference },
    data: { status, paymentStatus, statusMessage, error },
  });
}

export async function updatePropertyTransactionStatus(
  reference: string,
  status: PropertyStatus,
  paymentStatus: PaymentStatus,
  statusMessage: string,
  error: string | null
) {
  return prisma.property.update({
    where: { reference },
    data: { status, paymentStatus, statusMessage, error },
  });
}

/**
 * documentsUrls and report.directFileLink are raw, permanent, unsigned S3
 * URLs — never return them from a general fetch response. A real
 * (short-lived, presigned) URL only ever comes from the OTP-verified
 * download endpoints (see downloadOtpService.ts). Everything else on
 * `report` (isApproved, approvedAt, and — for a Detailed Form report — the
 * structured due-diligence fields RevaReportPDF renders) stays as-is: none
 * of that is a URL, so none of it is the thing this redaction closes.
 * `directFileLink`'s presence becomes a `downloadAvailable` boolean so a
 * "Download Report" button can still render correctly.
 */
function redactDownloadableFields<T extends { documentsUrls: string[]; report: unknown }>(
  row: T
): Omit<T, "documentsUrls" | "report"> & {
  documentsCount: number;
  report: (Record<string, unknown> & { downloadAvailable: boolean }) | null;
} {
  const { documentsUrls, report, ...safe } = row;
  let safeReport: (Record<string, unknown> & { downloadAvailable: boolean }) | null = null;
  if (report && typeof report === "object") {
    const { directFileLink, ...restOfReport } = report as Record<string, unknown>;
    safeReport = { ...restOfReport, downloadAvailable: "directFileLink" in (report as object) };
  }
  return {
    ...safe,
    documentsCount: documentsUrls.length,
    report: safeReport,
  };
}

/**
 * userId here is RevaUser.id (the native session's `sub`), so this queries
 * Property.userId directly — the source instead matched via
 * `property.user.kindeId === kindeId` (a relation filter keyed on Kinde's
 * id), an unnecessary indirection now that the native session already
 * carries the RevaUser row's own id.
 */
export async function getUserProperties(userId: string) {
  const properties = await prisma.property.findMany({
    where: { userId, deleted: false },
  });

  return [...properties]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    })
    .map(redactDownloadableFields);
}

/**
 * Requires an email match, unlike the source's id-only lookup — resolved
 * open question: guest data everywhere else in REVA is gated on a
 * reference+email pair, and this was the one exception. Throws NotFoundError
 * (not a distinct "forbidden") for a wrong email so a caller can't use this
 * to probe which ids exist.
 */
export async function getUserPropertyById(id: string, email: string) {
  const property = await prisma.oneTimeUserProperty.findUnique({ where: { id } });
  if (!property || property.email !== email) throw new NotFoundError("Property");
  return property;
}

export async function getTransactionData(reference: string) {
  const transaction = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });
  if (!transaction) throw new NotFoundError("Transaction");
  return transaction;
}

/**
 * NOTE (observed, not changed — outside this phase's resolved decisions):
 * the source has no ownership check here either, matched as-is. Any
 * authenticated REVA user who knows/guesses a reference can read that
 * transaction's data. Worth its own decision later if this needs closing.
 */
export async function authGetTransactionData(reference: string) {
  const transaction = await prisma.property.findUnique({ where: { reference } });
  if (!transaction) throw new NotFoundError("Transaction");
  return redactDownloadableFields(transaction);
}

export async function getOneTimeRequestByReference(reference: string, email: string) {
  const request = await prisma.oneTimeUserProperty.findFirst({ where: { reference, email } });
  if (!request) throw new NotFoundError("Request");
  return redactDownloadableFields(request);
}
