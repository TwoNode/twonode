"use server";

import { revalidatePath } from "next/cache";
import { uploadQRCode } from "../utils/aws-s3";
import { checkInSchema, ticketPurchaseSchema } from "../utils/validations";
import prisma from "@/lib/prisma";
import {
  initializeTicketPayment,
  koboToNaira,
  verifyPayment,
} from "../utils/paystack";
import { requireAdmin } from "../utils/auth";
import { calculateTicketPrice } from "../utils";
import { sendGBCTicketSMS } from "../utils/sms";
import { generateQRCodeBuffer } from "../utils/qr_code";
import { getAllGBCSettings } from "./settings-actions";

export async function createGBCTicket(formData: FormData) {
  try {
    // Parse form data
    const phone = formData.get("phone") as string;
    const profession = formData.get("profession") as string;
    const otherProfession = formData.get("otherProfession") as string;

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      ...(phone && { phone }), // Only include phone if it exists
      gender: formData.get("gender") as string,
      profession,
      ...(profession === "OTHER" && otherProfession && { otherProfession }),
      ticketType: formData.get("ticketType") as string,
    };

    // Validate input
    const validated = ticketPurchaseSchema.parse(data);

    // Check ticket availability
    const soldTickets = await prisma.gBCTicket.count({
      where: { paymentStatus: "COMPLETED" },
    });

    const settingsResult = await getAllGBCSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    if (settings?.tickets.pauseTicketReg) {
      return {
        success: false,
        error: "Ticket registration is currently paused.",
      };
    }

    const maxTickets = settings ? settings.tickets.maxCapacity : 150;

    if (soldTickets >= maxTickets) {
      return {
        success: false,
        error: "Sorry, all tickets are sold out",
      };
    }

    // Calculate price
    const price = calculateTicketPrice(validated.ticketType);

    // Generate a temporary ticket number (will be replaced by database default)
    // const tempTicketNumber = `TEMP_${Date.now()}`;

    // Create ticket record first to get the real ticketNumber
    const ticket = await prisma.gBCTicket.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        gender: validated.gender,
        profession:
          validated.profession === "OTHER" && validated.otherProfession
            ? `Other: ${validated.otherProfession}`
            : validated.profession,
        ticketType: validated.ticketType,
        price,
        paymentStatus: "PENDING",
        // Use the temporary ticket number that will be replaced by the database default
        // ticketNumber: tempTicketNumber,
      },
    });

    // Initialize payment with the actual ticketNumber from the database
    const paymentResponse = await initializeTicketPayment(
      validated.email,
      price,
      ticket.ticketNumber, // Use the actual ticketNumber from the database
      validated.ticketType,
      {
        name: validated.name,
        phone: validated.phone,
        profession:
          validated.profession === "OTHER" && validated.otherProfession
            ? `Other: ${validated.otherProfession}`
            : validated.profession,
      }
    );

    // Update ticket with payment reference
    await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: { paymentRef: paymentResponse.data.reference },
    });

    revalidatePath("/gbc2/restricted/tickets");
    revalidatePath("/gbc2/tickets");

    return {
      success: true,
      data: {
        ticket,
        reference: paymentResponse.data.reference,
        paymentUrl: paymentResponse.data.authorization_url,
      },
    };
  } catch (error) {
    console.error("Ticket creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

// Create group tickets for Company ticket type (5 attendees)
export async function createGBCGroupTicket(attendeesData: any[]) {
  try {
    // Validate that we have exactly 5 attendees
    if (!attendeesData || attendeesData.length !== 5) {
      return {
        success: false,
        error: "Group tickets require exactly 5 attendees",
      };
    }

    // Check ticket availability (need 5 seats)
    const soldTickets = await prisma.gBCTicket.count({
      where: { paymentStatus: "COMPLETED" },
    });

    const settingsResult = await getAllGBCSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    if (settings?.tickets.pauseTicketReg) {
      return {
        success: false,
        error: "Ticket registration is currently paused.",
      };
    }

    const maxTickets = settings ? settings.tickets.maxCapacity : 150;

    if (soldTickets + 5 > maxTickets) {
      return {
        success: false,
        error: `Sorry, only ${
          maxTickets - soldTickets
        } tickets remaining. Not enough for a group purchase.`,
      };
    }

    // Get the price for company tickets
    const price = calculateTicketPrice("COMPANY");

    // Create all 5 tickets
    const ticketPromises = attendeesData.map((attendee) => {
      const professionValue =
        attendee.profession === "OTHER" && attendee.otherProfession
          ? `Other: ${attendee.otherProfession}`
          : attendee.profession;

      return prisma.gBCTicket.create({
        data: {
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone || undefined,
          gender: attendee.gender,
          profession: professionValue,
          ticketType: "COMPANY",
          price: price / 5, // Split the price equally among attendees
          paymentStatus: "PENDING",
        },
      });
    });

    const tickets = await Promise.all(ticketPromises);

    // Use the first attendee's email for payment (primary contact)
    const primaryEmail = attendeesData[0].email;
    const ticketNumbers = tickets.map((t) => t.ticketNumber).join(", ");

    // Initialize payment for the group
    const paymentResponse = await initializeTicketPayment(
      primaryEmail,
      price,
      ticketNumbers, // Pass all ticket numbers
      "COMPANY",
      {
        name: `Group Ticket (${attendeesData.length} attendees)`,
        phone: attendeesData[0].phone,
        profession: "GROUP_PURCHASE",
        ticketIds: tickets.map((t) => t.id),
      }
    );

    // Update all tickets with the same payment reference
    await Promise.all(
      tickets.map((ticket) =>
        prisma.gBCTicket.update({
          where: { id: ticket.id },
          data: { paymentRef: paymentResponse.data.reference },
        })
      )
    );

    revalidatePath("/gbc2/restricted/tickets");
    revalidatePath("/gbc2/tickets");

    return {
      success: true,
      data: {
        tickets,
        reference: paymentResponse.data.reference,
        paymentUrl: paymentResponse.data.authorization_url,
      },
    };
  } catch (error) {
    console.error("Group ticket creation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create group tickets",
    };
  }
}

/**
 * Verify GBC payment and update ticket status
 */
export async function verifyGBCPayment(reference: string) {
  try {
    // Verify payment with Paystack
    const verification = await verifyPayment(reference);

    if (!verification.status || verification.data.status !== "success") {
      throw new Error(verification.message || "Payment verification failed");
    }

    // Get the ticket using the reference
    const ticket = await prisma.gBCTicket.findFirst({
      where: { paymentRef: reference },
    });

    if (!ticket) {
      throw new Error("Ticket not found for this payment");
    }

    // Update ticket status to completed
    const updatedTicket = await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: {
        paymentStatus: "COMPLETED",
        paymentDate: new Date(verification.data.paid_at),
        paymentMethod: "paystack",
        paymentDetails: JSON.stringify(verification.data),
      },
    });

    // Generate QR code for the ticket
    try {
      const qrBuffer = await generateQRCodeBuffer({
        ticketNumber: updatedTicket.ticketNumber,
        name: updatedTicket.name,
        email: updatedTicket.email,
        ticketType: updatedTicket.ticketType,
      });

      // Upload QR code to S3
      const { url: qrCodeUrl, key: qrCodeS3Key } = await uploadQRCode(
        qrBuffer,
        updatedTicket.ticketNumber
      );

      // Update ticket with QR code info
      await prisma.gBCTicket.update({
        where: { id: updatedTicket.id },
        data: {
          qrCode: qrCodeUrl,
          qrCodeS3Key,
        },
      });
    } catch (qrError) {
      console.error("Error generating QR code:", qrError);
      // Don't fail the whole process if QR code generation fails
    }

    return {
      success: true,
      data: {
        ...updatedTicket,
        amount: koboToNaira(verification.data.amount),
      },
    };
  } catch (error) {
    console.error("GBC Payment verification error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Payment verification failed",
    };
  }
}

export async function getGBCTickets(filters?: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  try {
    await requireAdmin();

    const where: any = {};

    if (filters?.status) {
      where.paymentStatus = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { ticketNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.gBCTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    });

    return { success: true, data: tickets };
  } catch (error) {
    console.error("Get tickets error:", error);
    return {
      success: false,
      error: "Failed to fetch tickets",
    };
  }
}

export async function getGBCTicketById(id: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    return { success: true, data: ticket };
  } catch (error) {
    console.error("Get ticket error:", error);
    return {
      success: false,
      error: "Failed to fetch ticket",
    };
  }
}

export async function checkInGBCTicket(ticketNumber: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = checkInSchema.parse({ ticketNumber });

    // Find ticket
    const ticket = await prisma.gBCTicket.findUnique({
      where: { ticketNumber: validated.ticketNumber },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.paymentStatus !== "COMPLETED") {
      return { success: false, error: "Ticket payment not completed" };
    }

    if (ticket.checkedIn) {
      return {
        success: false,
        error: `Ticket already checked in at ${ticket.checkedInAt?.toLocaleString()}`,
      };
    }

    // Check in ticket
    const updatedTicket = await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: admin.email,
      },
    });

    // Send SMS confirmation if phone available
    if (ticket.phone) {
      await sendGBCTicketSMS(
        ticket.phone,
        ticket.name,
        ticket.ticketNumber,
        process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day"
      );
    }

    revalidatePath("/gbc2/restricted/check-in");
    revalidatePath("/gbc2/restricted/tickets");

    return {
      success: true,
      data: updatedTicket,
      message: `Welcome ${ticket.name}!`,
    };
  } catch (error) {
    console.error("Check-in error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check in ticket",
    };
  }
}

export async function exportGBCTickets() {
  try {
    await requireAdmin();

    const tickets = await prisma.gBCTicket.findMany({
      where: { paymentStatus: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        ticketNumber: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        profession: true,
        ticketType: true,
        price: true,
        checkedIn: true,
        checkedInAt: true,
        createdAt: true,
      },
    });

    return { success: true, data: tickets };
  } catch (error) {
    console.error("Export tickets error:", error);
    return {
      success: false,
      error: "Failed to export tickets",
    };
  }
}

export async function getGBCTicketStats() {
  try {
    // await requireAdmin();

    // Optimize queries by combining related operations
    // Query 1: Get aggregated stats by payment status in a single query
    const [statusStats, checkedInCount] = await Promise.all([
      // Get ticket counts grouped by payment status AND total revenue in one query
      prisma.gBCTicket.groupBy({
        by: ["paymentStatus"],
        _count: { id: true },
        _sum: { price: true },
      }),
      // Query 2: Get checked-in tickets count
      prisma.gBCTicket.count({ where: { checkedIn: true } }),
    ]);

    // Process the grouped results to extract individual stats
    const totalTickets = statusStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0
    );
    const completedStat = statusStats.find(
      (stat) => stat.paymentStatus === "COMPLETED"
    );
    const pendingStat = statusStats.find(
      (stat) => stat.paymentStatus === "PENDING"
    );

    const completedTickets = completedStat?._count.id || 0;
    const pendingTickets = pendingStat?._count.id || 0;
    const checkedInTickets = checkedInCount;
    const totalRevenue = completedStat?._sum.price || 0;

    const settingsResult = await getAllGBCSettings();
    const maxTickets =
      settingsResult.success && settingsResult.data
        ? settingsResult.data.tickets.maxCapacity
        : 1000;
    const availableTickets = maxTickets - completedTickets;

    return {
      success: true,
      data: {
        totalTickets,
        completedTickets,
        pendingTickets,
        checkedInTickets,
        availableTickets,
        totalRevenue,
        maxTickets,
      },
    };
  } catch (error) {
    console.error("Get ticket stats error:", error);
    return {
      success: false,
      error: "Failed to fetch ticket stats",
    };
  }
}

export async function deleteGBCTicket(id: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.paymentStatus === "COMPLETED") {
      return {
        success: false,
        error: "Cannot delete completed ticket. Use refund instead.",
      };
    }

    await prisma.gBCTicket.delete({
      where: { id },
    });

    revalidatePath("/gbc2/restricted/tickets");

    return { success: true, message: "Ticket deleted successfully" };
  } catch (error) {
    console.error("Delete ticket error:", error);
    return {
      success: false,
      error: "Failed to delete ticket",
    };
  }
}

export async function generateGBCTicketQRCode(ticketId: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    // Generate QR code buffer
    const qrBuffer = await generateQRCodeBuffer({
      ticketNumber: ticket.ticketNumber,
      name: ticket.name,
      email: ticket.email,
      ticketType: ticket.ticketType,
    });

    // Upload to S3
    const { url, key } = await uploadQRCode(qrBuffer, ticket.ticketNumber);

    // Update ticket with QR code info
    await prisma.gBCTicket.update({
      where: { id: ticketId },
      data: {
        qrCode: url,
        qrCodeS3Key: key,
      },
    });

    revalidatePath("/gbc2/restricted/tickets");

    return { success: true, data: { url, key } };
  } catch (error) {
    console.error("Generate QR code error:", error);
    return {
      success: false,
      error: "Failed to generate QR code",
    };
  }
}
