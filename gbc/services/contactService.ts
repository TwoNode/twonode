import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import {
  sendGBCAdminNotification,
  sendGBCContactConfirmation,
  sendGBCInquiryReply,
} from "@/app/(projects)/(GBC)/utils/email";
import type { ContactFormInput } from "@/app/(projects)/(GBC)/utils/validations";

/**
 * Migrated from contact-actions.ts — inquiry functions only. Its "USER
 * MANAGEMENT" tail (getGBCUsers/updateGBCUserRole) is dead — zero real
 * importers, the live /gbc/restricted/users page uses admin-actions.ts
 * instead — not migrated, per phase-4-gbc.md.
 */

export async function submitContactForm(data: ContactFormInput) {
  const inquiry = await prisma.gBCContactInquiry.create({ data });

  await sendGBCContactConfirmation(data.name, data.email, data.subject);
  await sendGBCAdminNotification(data.type, data.name, data.email, undefined, data.subject, data.message);

  return inquiry;
}

export async function getInquiries(filters?: { status?: string; type?: string }) {
  const where: Prisma.GBCContactInquiryWhereInput = {};
  if (filters?.status) where.status = filters.status as any;
  if (filters?.type) where.type = filters.type;
  return prisma.gBCContactInquiry.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function updateInquiryStatus(id: string, status: string) {
  return prisma.gBCContactInquiry.update({ where: { id }, data: { status: status as any } });
}

export async function deleteInquiry(id: string) {
  await prisma.gBCContactInquiry.delete({ where: { id } });
}

export async function replyToInquiry(id: string, replySubject: string, replyMessage: string) {
  const inquiry = await prisma.gBCContactInquiry.findUnique({ where: { id } });
  if (!inquiry) throw new NotFoundError("Inquiry");

  const emailResult = await sendGBCInquiryReply(inquiry.email, inquiry.name, replySubject, replyMessage);
  if (!emailResult.success) {
    throw new Error(emailResult.error || "Failed to send reply email");
  }

  await prisma.gBCContactInquiry.update({ where: { id }, data: { status: "IN_PROGRESS" } });
}
