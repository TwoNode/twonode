"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { contactFormSchema } from "@/gbc/utils/validations";
import { requireAdmin } from "@/gbc/utils/auth";
import {
  sendGBCAdminNotification,
  sendGBCContactConfirmation,
} from "@/gbc/utils/email";

export async function submitGBCContactForm(formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      type: formData.get("type") as string,
    };

    const validated = contactFormSchema.parse(data);

    // Create inquiry
    const inquiry = await prisma.gBCContactInquiry.create({
      data: validated,
    });

    // Send confirmation email to user
    await sendGBCContactConfirmation(
      validated.name,
      validated.email,
      validated.subject
    );

    // Send notification to admin
    await sendGBCAdminNotification(
      validated.type,
      validated.name,
      validated.email,
      "",
      validated.subject,
      validated.message
    );

    return {
      success: true,
      data: inquiry,
      message: "Thank you! We'll get back to you soon.",
    };
  } catch (error) {
    console.error("Contact form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit form",
    };
  }
}

export async function getGBCContactInquiries(filters?: {
  status?: string;
  type?: string;
}) {
  try {
    await requireAdmin();

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const inquiries = await prisma.gBCContactInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: inquiries };
  } catch (error) {
    console.error("Get inquiries error:", error);
    return {
      success: false,
      error: "Failed to fetch inquiries",
    };
  }
}

export async function updateGBCInquiryStatus(id: string, status: string) {
  try {
    await requireAdmin();

    const inquiry = await prisma.gBCContactInquiry.update({
      where: { id },
      data: { status: status as any },
    });

    revalidatePath("/gbc-restricted/inquiries");

    return { success: true, data: inquiry };
  } catch (error) {
    console.error("Update inquiry status error:", error);
    return {
      success: false,
      error: "Failed to update inquiry status",
    };
  }
}

export async function deleteGBCInquiry(id: string) {
  try {
    await requireAdmin();

    await prisma.gBCContactInquiry.delete({
      where: { id },
    });

    revalidatePath("/gbc-restricted/inquiries");

    return { success: true, message: "Inquiry deleted successfully" };
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return {
      success: false,
      error: "Failed to delete inquiry",
    };
  }
}

export async function replyToGBCInquiry(
  id: string,
  replySubject: string,
  replyMessage: string
) {
  try {
    await requireAdmin();

    // Get the inquiry details
    const inquiry = await prisma.gBCContactInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      return {
        success: false,
        error: "Inquiry not found",
      };
    }

    // Send the reply email
    const { sendGBCInquiryReply } = await import("@/gbc/utils/email");
    const emailResult = await sendGBCInquiryReply(
      inquiry.email,
      inquiry.name,
      replySubject,
      replyMessage
    );

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || "Failed to send reply email",
      };
    }

    // Update inquiry status to IN_PROGRESS or RESOLVED
    await prisma.gBCContactInquiry.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
    });

    revalidatePath("/gbc-restricted/inquiries");

    return {
      success: true,
      message: "Reply sent successfully",
    };
  } catch (error) {
    console.error("Reply to inquiry error:", error);
    return {
      success: false,
      error: "Failed to send reply",
    };
  }
}

// ============ USER MANAGEMENT ============

export async function getGBCUsers() {
  try {
    await requireAdmin();

    const users = await prisma.gBCUser.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("Get users error:", error);
    return {
      success: false,
      error: "Failed to fetch users",
    };
  }
}

export async function updateGBCUserRole(
  userId: string,
  role: "USER" | "ADMIN" | "SUPERADMIN"
) {
  try {
    await requireAdmin();

    const user = await prisma.gBCUser.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath("/gbc-restricted/users");

    return {
      success: true,
      data: user,
      message: `User role updated to ${role}`,
    };
  } catch (error) {
    console.error("Update user role error:", error);
    return {
      success: false,
      error: "Failed to update user role",
    };
  }
}
