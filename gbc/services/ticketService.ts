import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import { getAllGBCSettings } from "@/app/(projects)/(GBC)/actions/settings-actions";
import {
  initializeTicketPayment,
  koboToNaira,
  verifyPayment as verifyPaystackPayment,
} from "@/app/(projects)/(GBC)/utils/paystack";
import { uploadQRCode } from "@/app/(projects)/(GBC)/utils/aws-s3";
import { generateQRCodeBuffer } from "@/app/(projects)/(GBC)/utils/qr_code";
import { sendGBCTicketConfirmation } from "@/app/(projects)/(GBC)/utils/email";
import { sendGBCTicketSMS } from "@/app/(projects)/(GBC)/utils/sms";
import { calculateTicketPrice, isTicketTypeAvailable } from "@/app/(projects)/(GBC)/utils";
import type { TicketPurchaseInput } from "@/app/(projects)/(GBC)/utils/validations";

/**
 * Migrated from app/(projects)/(GBC)/actions/ticket-actions.ts. Pure Prisma,
 * throws typed errors instead of {success:false} — see
 * docs/development-history/phases/phase-4-gbc.md. Ticket-number generation
 * stays on the Prisma dbgenerated default for now; the edition-metadata
 * migration (spec step 8) moves it here reading the active edition's prefix.
 */

type TicketType = "EARLY_BIRD" | "REGULAR" | "COMPANY" | "VIP" | "STUDENT";
type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type AttendeeInput = {
  name: string;
  email: string;
  phone?: string;
  gender: Gender;
  profession: string;
  otherProfession?: string;
  isPrimary?: boolean;
};

async function getSettings() {
  const result = await getAllGBCSettings();
  return result.success ? result.data ?? null : null;
}

function resolveProfession(profession: string, otherProfession?: string): string {
  return profession === "OTHER" && otherProfession ? `Other: ${otherProfession}` : profession;
}

/**
 * Shared by createGroupTicket (5 attendees)/createPairTicket (2 attendees) —
 * the source duplicated this ~150 lines of per-attendee validation almost
 * byte-for-byte between the two functions, differing only in the count.
 */
function validateAttendees(attendeesData: AttendeeInput[], count: number): AttendeeInput {
  if (!attendeesData || attendeesData.length !== count) {
    throw new ValidationError({ attendees: `Requires exactly ${count} attendees` });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9]{11}$/;
  const validGenders: Gender[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

  attendeesData.forEach((attendee, i) => {
    const label = `attendee${i + 1}`;
    if (!attendee.name?.trim()) throw new ValidationError({ [label]: "Name is required" });
    if (!attendee.email?.trim()) throw new ValidationError({ [label]: "Email is required" });
    if (!emailRegex.test(attendee.email)) throw new ValidationError({ [label]: "Invalid email format" });
    if (!attendee.gender || !validGenders.includes(attendee.gender)) {
      throw new ValidationError({ [label]: "Invalid gender value" });
    }
    if (!attendee.profession?.trim()) throw new ValidationError({ [label]: "Profession is required" });
    if (attendee.profession === "OTHER" && !attendee.otherProfession?.trim()) {
      throw new ValidationError({ [label]: 'Please specify profession when selecting "Other"' });
    }
    if (attendee.phone?.trim() && !phoneRegex.test(attendee.phone.replace(/\s/g, ""))) {
      throw new ValidationError({ [label]: "Phone number must be 11 digits" });
    }
  });

  const emails = attendeesData.map((a) => a.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    throw new ValidationError({ attendees: "Each attendee must have a unique email address" });
  }

  const primaryAttendees = attendeesData.filter((a) => a.isPrimary);
  if (primaryAttendees.length !== 1) {
    throw new ValidationError({ attendees: "Exactly one attendee must be designated as the primary contact" });
  }

  return primaryAttendees[0];
}

async function assertCapacityAvailable(seatsNeeded: number, settings: Awaited<ReturnType<typeof getSettings>>) {
  if (settings?.tickets.pauseTicketReg) {
    throw new ConflictError("Ticket registration is currently paused.");
  }
  const soldTickets = await prisma.gBCTicket.count({ where: { paymentStatus: "COMPLETED" } });
  const maxTickets = settings ? settings.tickets.maxCapacity : 1000;
  if (soldTickets + seatsNeeded > maxTickets) {
    const remaining = maxTickets - soldTickets;
    throw new ConflictError(
      seatsNeeded === 1
        ? "Sorry, all tickets are sold out"
        : `Sorry, only ${remaining} tickets remaining. Not enough for a group purchase.`
    );
  }
}

export async function createTicket(data: TicketPurchaseInput) {
  const settings = await getSettings();
  await assertCapacityAvailable(1, settings);

  const soldEarlyBirdTickets = await prisma.gBCTicket.count({
    where: { paymentStatus: "COMPLETED", ticketType: "EARLY_BIRD" },
  });

  const availability = isTicketTypeAvailable(data.ticketType as TicketType, soldEarlyBirdTickets, {
    maxEarlyBirdCapacity: settings?.tickets.maxEarlyBirdCapacity,
    earlyBirdDeadline: settings?.tickets.earlyBirdDeadline,
  });
  if (!availability.available) {
    throw new ConflictError(availability.reason || "This ticket type is not available");
  }

  if (data.ticketType === "COMPANY" || data.ticketType === "REGULAR") {
    throw new ValidationError({
      ticketType: `${data.ticketType} tickets must be purchased via the group/pair endpoints`,
    });
  }

  const price = calculateTicketPrice(data.ticketType as TicketType, settings?.tickets);

  const ticket = await prisma.gBCTicket.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      profession: resolveProfession(data.profession, data.otherProfession),
      ticketType: data.ticketType,
      price,
      paymentStatus: "PENDING",
    },
  });

  const paymentResponse: any = await initializeTicketPayment(
    data.email,
    price,
    ticket.ticketNumber,
    data.ticketType as TicketType,
    { name: data.name, phone: data.phone, profession: resolveProfession(data.profession, data.otherProfession) }
  );

  const existing = await prisma.gBCTicket.count({ where: { paymentRef: paymentResponse.data.reference } });
  if (existing > 0) {
    throw new ConflictError("Payment reference already exists. Please try again or contact support.");
  }

  await prisma.gBCTicket.update({
    where: { id: ticket.id },
    data: { paymentRef: paymentResponse.data.reference },
  });

  return { ticket, reference: paymentResponse.data.reference, paymentUrl: paymentResponse.data.authorization_url };
}

async function createMultiTicket(attendeesData: AttendeeInput[], count: number, ticketType: "COMPANY" | "REGULAR") {
  const primaryAttendee = validateAttendees(attendeesData, count);
  const settings = await getSettings();
  await assertCapacityAvailable(count, settings);

  const price = calculateTicketPrice(ticketType, settings?.tickets);

  const tickets = await Promise.all(
    attendeesData.map((attendee) =>
      prisma.gBCTicket.create({
        data: {
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone || undefined,
          gender: attendee.gender,
          profession: resolveProfession(attendee.profession, attendee.otherProfession),
          ticketType,
          price: price / count,
          paymentStatus: "PENDING",
        },
      })
    )
  );

  const ticketNumbers = tickets.map((t) => t.ticketNumber);
  const label = ticketType === "COMPANY" ? "Group" : "Pair";

  const paymentResponse: any = await initializeTicketPayment(
    primaryAttendee.email,
    price,
    ticketNumbers[0],
    ticketType,
    {
      name: `${label} Ticket (${attendeesData.length} attendees)`,
      phone: primaryAttendee.phone,
      profession: `${ticketType}_PURCHASE`,
      ticketIds: tickets.map((t) => t.id),
      allTicketNumbers: ticketNumbers,
    }
  );

  await Promise.all(
    tickets.map((ticket) =>
      prisma.gBCTicket.update({
        where: { id: ticket.id },
        data: { paymentRef: paymentResponse.data.reference },
      })
    )
  );

  return { tickets, reference: paymentResponse.data.reference, paymentUrl: paymentResponse.data.authorization_url };
}

export async function createGroupTicket(attendeesData: AttendeeInput[]) {
  return createMultiTicket(attendeesData, 5, "COMPANY");
}

export async function createPairTicket(attendeesData: AttendeeInput[]) {
  return createMultiTicket(attendeesData, 2, "REGULAR");
}

const EXPECTED_TICKET_COUNT: Record<string, number> = {
  EARLY_BIRD: 1,
  STUDENT: 1,
  VIP: 1,
  REGULAR: 2,
  COMPANY: 5,
};

async function ensureQRAndEmail(ticket: Awaited<ReturnType<typeof prisma.gBCTicket.update>>, settings: Awaited<ReturnType<typeof getSettings>>, forceSendEmail?: boolean) {
  let qrJustGenerated = false;
  let qrBuffer: Buffer | null = null;

  try {
    if (!ticket.qrCode || !ticket.qrCodeS3Key) {
      qrBuffer = await generateQRCodeBuffer({
        ticketNumber: ticket.ticketNumber,
        name: ticket.name,
        email: ticket.email,
        ticketType: ticket.ticketType,
      });
      const { url: qrCodeUrl, key: qrCodeS3Key } = await uploadQRCode(qrBuffer, ticket.ticketNumber);
      await prisma.gBCTicket.update({ where: { id: ticket.id }, data: { qrCode: qrCodeUrl, qrCodeS3Key } });
      qrJustGenerated = true;
    } else if (forceSendEmail) {
      qrBuffer = await generateQRCodeBuffer({
        ticketNumber: ticket.ticketNumber,
        name: ticket.name,
        email: ticket.email,
        ticketType: ticket.ticketType,
      });
    }

    if (qrJustGenerated || forceSendEmail) {
      if (!qrBuffer) {
        qrBuffer = await generateQRCodeBuffer({
          ticketNumber: ticket.ticketNumber,
          name: ticket.name,
          email: ticket.email,
          ticketType: ticket.ticketType,
        });
      }

      const eventDate = settings?.event.date
        ? new Date(settings.event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day";
      const eventLocation = settings?.contact.city || process.env.NEXT_PUBLIC_EVENT_LOCATION || "Lagos, Nigeria";
      const eventVenue = settings?.event.venue || process.env.NEXT_PUBLIC_EVENT_VENUE || "Conference Center, Lagos";

      const emailResult = await sendGBCTicketConfirmation({
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone || undefined,
        ticketNumber: ticket.ticketNumber,
        ticketType: ticket.ticketType,
        price: ticket.price,
        qrCodeBase64: `data:image/png;base64,${qrBuffer.toString("base64")}`,
        eventDate,
        eventLocation,
        eventVenue,
      });
      if (!emailResult.success) {
        console.error(`Failed to send confirmation email to ${ticket.email}:`, emailResult.error);
      }
    }
  } catch (error) {
    // QR/email failures are non-critical to payment verification succeeding.
    console.error(`QR/email step failed for ticket ${ticket.ticketNumber}:`, error);
  }
}

export async function verifyPayment(reference: string, sendEmail?: boolean) {
  if (!reference) throw new ValidationError({ reference: "Payment reference is required" });

  const verification = await verifyPaystackPayment(reference);
  if (!verification.status || verification.data.status !== "success") {
    throw new ConflictError(verification.message || "Payment verification failed");
  }

  const tickets = await prisma.gBCTicket.findMany({ where: { paymentRef: reference } });
  if (!tickets || tickets.length === 0) throw new NotFoundError("Tickets for this payment");

  const firstTicketType = tickets[0].ticketType;
  if (!tickets.every((t) => t.ticketType === firstTicketType)) {
    throw new ConflictError("Invalid payment: tickets with the same payment reference must have the same type");
  }
  const expectedCount = EXPECTED_TICKET_COUNT[firstTicketType];
  if (expectedCount && tickets.length !== expectedCount) {
    throw new ConflictError(
      `Invalid payment: ${firstTicketType} tickets require exactly ${expectedCount} ticket(s), found ${tickets.length}`
    );
  }

  const updatedTickets = await Promise.all(
    tickets.map((ticket) =>
      prisma.gBCTicket.update({
        where: { id: ticket.id },
        data: {
          paymentStatus: "COMPLETED",
          paymentDate: new Date(verification.data.paid_at),
          paymentMethod: "paystack",
          paymentDetails: JSON.stringify(verification.data),
        },
      })
    )
  );

  const settings = await getSettings();
  await Promise.all(updatedTickets.map((ticket) => ensureQRAndEmail(ticket, settings, sendEmail)));

  return { tickets: updatedTickets, count: updatedTickets.length, amount: koboToNaira(verification.data.amount) };
}

export async function getTicketAvailability() {
  const [completedTickets, soldEarlyBirdTickets] = await Promise.all([
    prisma.gBCTicket.count({ where: { paymentStatus: "COMPLETED" } }),
    prisma.gBCTicket.count({ where: { paymentStatus: "COMPLETED", ticketType: "EARLY_BIRD" } }),
  ]);
  const settings = await getSettings();
  const maxTickets = settings ? settings.tickets.maxCapacity : 1000;

  return { availableTickets: maxTickets - completedTickets, maxTickets, soldEarlyBirdTickets };
}

export async function getTicketByNumber(ticketNumber: string) {
  const ticket = await prisma.gBCTicket.findFirst({ where: { ticketNumber } });
  if (!ticket) throw new NotFoundError("Ticket");
  return ticket;
}

/** Reference+email guest-auth, same pattern as REVA's one-time-request lookup — never confirms which field mismatched, so it can't be used to probe valid ticket numbers. */
export async function lookupMyTicket(ticketNumber: string, email: string) {
  const ticket = await prisma.gBCTicket.findFirst({
    where: { ticketNumber, email: { equals: email, mode: "insensitive" } },
  });
  if (!ticket) throw new NotFoundError("Ticket");
  return ticket;
}

export async function getTicketStats() {
  const [statusStats, checkedInCount, soldEarlyBirdTickets] = await Promise.all([
    prisma.gBCTicket.groupBy({ by: ["paymentStatus"], _count: { id: true }, _sum: { price: true } }),
    prisma.gBCTicket.count({ where: { checkedIn: true } }),
    prisma.gBCTicket.count({ where: { paymentStatus: "COMPLETED", ticketType: "EARLY_BIRD" } }),
  ]);

  const totalTickets = statusStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const completedStat = statusStats.find((stat) => stat.paymentStatus === "COMPLETED");
  const pendingStat = statusStats.find((stat) => stat.paymentStatus === "PENDING");

  const completedTickets = completedStat?._count.id || 0;
  const settings = await getSettings();
  const maxTickets = settings ? settings.tickets.maxCapacity : 1000;

  return {
    totalTickets,
    completedTickets,
    pendingTickets: pendingStat?._count.id || 0,
    checkedInTickets: checkedInCount,
    availableTickets: maxTickets - completedTickets,
    totalRevenue: completedStat?._sum.price || 0,
    maxTickets,
    soldEarlyBirdTickets,
  };
}

export async function getTickets(filters?: { status?: string; search?: string; limit?: number }) {
  const where: any = {};
  if (filters?.status) where.paymentStatus = filters.status;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
      { ticketNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return prisma.gBCTicket.findMany({ where, orderBy: { createdAt: "desc" }, take: filters?.limit || 100 });
}

export async function getTicketById(id: string) {
  const ticket = await prisma.gBCTicket.findUnique({ where: { id } });
  if (!ticket) throw new NotFoundError("Ticket");
  return ticket;
}

export async function exportTickets() {
  return prisma.gBCTicket.findMany({
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
}

export async function deleteTicket(id: string) {
  const ticket = await prisma.gBCTicket.findUnique({ where: { id } });
  if (!ticket) throw new NotFoundError("Ticket");
  if (ticket.paymentStatus === "COMPLETED") {
    throw new ConflictError("Cannot delete completed ticket. Use refund instead.");
  }
  await prisma.gBCTicket.delete({ where: { id } });
}

export async function generateTicketQRCode(ticketId: string) {
  const ticket = await prisma.gBCTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError("Ticket");

  const qrBuffer = await generateQRCodeBuffer({
    ticketNumber: ticket.ticketNumber,
    name: ticket.name,
    email: ticket.email,
    ticketType: ticket.ticketType,
  });
  const { url, key } = await uploadQRCode(qrBuffer, ticket.ticketNumber);
  await prisma.gBCTicket.update({ where: { id: ticketId }, data: { qrCode: url, qrCodeS3Key: key } });

  return { url, key };
}

export async function checkInTicket(ticketNumber: string, adminEmail: string) {
  const ticket = await prisma.gBCTicket.findUnique({ where: { ticketNumber } });
  if (!ticket) throw new NotFoundError("Ticket");
  if (ticket.paymentStatus !== "COMPLETED") throw new ConflictError("Ticket payment not completed");
  if (ticket.checkedIn) {
    throw new ConflictError(`Ticket already checked in at ${ticket.checkedInAt?.toLocaleString()}`);
  }

  const updatedTicket = await prisma.gBCTicket.update({
    where: { id: ticket.id },
    data: { checkedIn: true, checkedInAt: new Date(), checkedInBy: adminEmail },
  });

  if (ticket.phone) {
    try {
      await sendGBCTicketSMS(ticket.phone, ticket.name, ticket.ticketNumber, process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day");
    } catch (smsError) {
      console.error("SMS sending failed (non-critical):", smsError);
    }
  }

  return { ticket: updatedTicket, message: `Welcome ${ticket.name}!` };
}

/** The native JWT session carries {sub, role, platform} only — routes that need the acting admin's email (e.g. for checkInTicket's checkedInBy) fetch it here. */
export async function getAdminContact(userId: string) {
  const user = await prisma.gBCUser.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw new NotFoundError("User");
  return user;
}
