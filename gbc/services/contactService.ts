import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import {
  sendGBCAdminNotification,
  sendGBCContactConfirmation,
  sendGBCInquiryReply,
} from "@/gbc/utils/email";
import type { ContactFormInput } from "@/gbc/utils/validations";
import { paginateQuery } from "@/lib/api/pagination";
import { getActiveEdition } from "@/gbc/services/editionService";

/**
 * Migrated from contact-actions.ts — inquiry functions only. Its "USER
 * MANAGEMENT" tail (getGBCUsers/updateGBCUserRole) is dead — zero real
 * importers, the live /gbc-restricted/users page uses admin-actions.ts
 * instead — not migrated, per phase-4-gbc.md.
 */

export async function submitContactForm(data: ContactFormInput) {
  // The public form never supplies an edition: tag the inquiry with the one
  // currently active, or leave the schema default when none is.
  const active = await getActiveEdition();
  const inquiry = await prisma.gBCContactInquiry.create({
    data: active ? { ...data, edition: active.key } : data,
  });

  await sendGBCContactConfirmation(data.name, data.email, data.subject);
  await sendGBCAdminNotification(
    data.type,
    data.name,
    data.email,
    undefined,
    data.subject,
    data.message
  );

  return inquiry;
}

export async function getInquiries(filters?: {
  status?: string;
  type?: string;
  edition?: string;
}) {
  const where: Prisma.GBCContactInquiryWhereInput = {};
  if (filters?.status) where.status = filters.status as any;
  if (filters?.type) where.type = filters.type;
  if (filters?.edition) where.edition = filters.edition;
  return prisma.gBCContactInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export interface GetInquiriesPaginatedParams {
  page: number;
  pageSize: number;
  status?: string;
  type?: string;
  edition?: string;
  search?: string;
}

/** Paginated/searchable sibling of getInquiries() — the admin Inquiries page. */
export async function getInquiriesPaginated(
  params: GetInquiriesPaginatedParams
) {
  const { page, pageSize, status, type, edition, search } = params;
  const where: Prisma.GBCContactInquiryWhereInput = {};
  if (status) where.status = status as any;
  if (type) where.type = type;
  if (edition) where.edition = edition;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  return paginateQuery(
    (skip, take) =>
      prisma.gBCContactInquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    () => prisma.gBCContactInquiry.count({ where }),
    page,
    pageSize
  );
}

/** Overview counts for the Inquiries page's stat cards — scoped to an edition when one is picked, but independent of the list's status/type/search filters and page. */
export async function getInquiryStats(edition?: string) {
  const base: Prisma.GBCContactInquiryWhereInput = edition ? { edition } : {};
  const [total, pending, inProgress, resolved] = await Promise.all([
    prisma.gBCContactInquiry.count({ where: base }),
    prisma.gBCContactInquiry.count({
      where: { ...base, status: "PENDING" as any },
    }),
    prisma.gBCContactInquiry.count({
      where: { ...base, status: "IN_PROGRESS" as any },
    }),
    prisma.gBCContactInquiry.count({
      where: { ...base, status: "RESOLVED" as any },
    }),
  ]);
  return { total, pending, inProgress, resolved };
}

export async function updateInquiryStatus(id: string, status: string) {
  return prisma.gBCContactInquiry.update({
    where: { id },
    data: { status: status as any },
  });
}

export async function deleteInquiry(id: string) {
  await prisma.gBCContactInquiry.delete({ where: { id } });
}

export async function replyToInquiry(
  id: string,
  replySubject: string,
  replyMessage: string
) {
  const inquiry = await prisma.gBCContactInquiry.findUnique({ where: { id } });
  if (!inquiry) throw new NotFoundError("Inquiry");

  const emailResult = await sendGBCInquiryReply(
    inquiry.email,
    inquiry.name,
    replySubject,
    replyMessage
  );
  if (!emailResult.success) {
    throw new Error(emailResult.error || "Failed to send reply email");
  }

  await prisma.gBCContactInquiry.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  });
}
