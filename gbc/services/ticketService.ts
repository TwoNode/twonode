import crypto from "crypto";
import prisma from "@/lib/prisma";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/api/errors";
import { getSettings as fetchGBCSettings } from "@/gbc/services/settingsService";
import {
  initializeTicketPayment,
  koboToNaira,
  verifyPayment as verifyPaystackPayment,
} from "@/gbc/utils/paystack";
import { uploadQRCode } from "@/gbc/utils/aws-s3";
import { generateQRCodeBuffer } from "@/gbc/utils/qr_code";
import { sendGBCTicketConfirmation } from "@/gbc/utils/email";
import { sendGBCTicketSMS } from "@/gbc/utils/sms";
import { calculateTicketPrice, isTicketTypeAvailable } from "@/gbc/utils";
import type { TicketPurchaseInput } from "@/gbc/utils/validations";
import { generateTicketReceiptPdfBuffer } from "@/gbc/services/receiptPdfService";
import type { GBCEdition, GBCTicket } from "@/prisma/generated";
import { paginateQuery } from "@/lib/api/pagination";

/**
 * Migrated from app/(projects)/(GBC)/actions/ticket-actions.ts. Pure Prisma,
 * throws typed errors instead of {success:false} — see
 * docs/development-history/phases/phase-4-gbc.md. Ticket-number generation
 * moved here (spec step 8) from the Prisma dbgenerated SQL default, which
 * hardcoded the "GBC2_" prefix — now reads it off the active edition instead,
 * so a future edition's tickets get its own prefix without a schema change.
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

/** Settings are per edition — pass the edition the tickets are (being) sold under. */
async function getSettings(edition?: string) {
  return fetchGBCSettings(edition);
}

function resolveProfession(
  profession: string,
  otherProfession?: string
): string {
  return profession === "OTHER" && otherProfession
    ? `Other: ${otherProfession}`
    : profession;
}

/**
 * The current edition — ACTIVE if one is marked, else the latest edition by
 * start date (matches editionService.ts's getEditions() ordering). Used to
 * scope ticket stats/numbering when no edition is explicitly requested.
 * Previously fell back to a hardcoded "2.0"/GBC2 when nothing was ACTIVE,
 * which meant the dashboard silently showed an old edition's numbers even
 * after a newer edition existed — now it always finds a real edition,
 * hardcoding "2.0" only if the table is genuinely empty.
 */
async function getActiveEditionInfo(): Promise<{
  key: string;
  ticketPrefix: string;
}> {
  const active = await prisma.gBCEdition.findFirst({
    where: { status: "ACTIVE" },
  });
  if (active) return { key: active.key, ticketPrefix: active.ticketPrefix };
  const latest = await prisma.gBCEdition.findFirst({
    where: { deletedAt: null },
    orderBy: { startDate: "desc" },
  });
  return {
    key: latest?.key ?? "2.0",
    ticketPrefix: latest?.ticketPrefix ?? "GBC2",
  };
}

/** Same shape as the old dbgenerated default (prefix + 6 hex chars), just computed in application code so the prefix can vary per edition. */
function generateTicketNumber(prefix: string): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `${prefix}_${suffix}`;
}

/**
 * Shared by createGroupTicket (5 attendees)/createPairTicket (2 attendees) —
 * the source duplicated this ~150 lines of per-attendee validation almost
 * byte-for-byte between the two functions, differing only in the count.
 */
function validateAttendees(
  attendeesData: AttendeeInput[],
  count: number
): AttendeeInput {
  if (!attendeesData || attendeesData.length !== count) {
    throw new ValidationError({
      attendees: `Requires exactly ${count} attendees`,
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9]{11}$/;
  const validGenders: Gender[] = [
    "MALE",
    "FEMALE",
    "OTHER",
    "PREFER_NOT_TO_SAY",
  ];

  attendeesData.forEach((attendee, i) => {
    const label = `attendee${i + 1}`;
    if (!attendee.name?.trim())
      throw new ValidationError({ [label]: "Name is required" });
    if (!attendee.email?.trim())
      throw new ValidationError({ [label]: "Email is required" });
    if (!emailRegex.test(attendee.email))
      throw new ValidationError({ [label]: "Invalid email format" });
    if (!attendee.gender || !validGenders.includes(attendee.gender)) {
      throw new ValidationError({ [label]: "Invalid gender value" });
    }
    if (!attendee.profession?.trim())
      throw new ValidationError({ [label]: "Profession is required" });
    if (attendee.profession === "OTHER" && !attendee.otherProfession?.trim()) {
      throw new ValidationError({
        [label]: 'Please specify profession when selecting "Other"',
      });
    }
    if (
      attendee.phone?.trim() &&
      !phoneRegex.test(attendee.phone.replace(/\s/g, ""))
    ) {
      throw new ValidationError({ [label]: "Phone number must be 11 digits" });
    }
  });

  const emails = attendeesData.map((a) => a.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    throw new ValidationError({
      attendees: "Each attendee must have a unique email address",
    });
  }

  const primaryAttendees = attendeesData.filter((a) => a.isPrimary);
  if (primaryAttendees.length !== 1) {
    throw new ValidationError({
      attendees:
        "Exactly one attendee must be designated as the primary contact",
    });
  }

  return primaryAttendees[0];
}

async function assertCapacityAvailable(
  seatsNeeded: number,
  settings: Awaited<ReturnType<typeof getSettings>>,
  edition: string
) {
  if (settings?.tickets.pauseTicketReg) {
    throw new ConflictError("Ticket registration is currently paused.");
  }
  // Capacity is that edition's own: another edition's sales must not count against it.
  const soldTickets = await prisma.gBCTicket.count({
    where: { paymentStatus: "COMPLETED", edition },
  });
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
  const activeEdition = await getActiveEditionInfo();
  const settings = await getSettings(activeEdition.key);
  await assertCapacityAvailable(1, settings, activeEdition.key);

  const soldEarlyBirdTickets = await prisma.gBCTicket.count({
    where: {
      paymentStatus: "COMPLETED",
      ticketType: "EARLY_BIRD",
      edition: activeEdition.key,
    },
  });

  const availability = isTicketTypeAvailable(
    data.ticketType as TicketType,
    soldEarlyBirdTickets,
    {
      maxEarlyBirdCapacity: settings?.tickets.maxEarlyBirdCapacity,
      earlyBirdDeadline: settings?.tickets.earlyBirdDeadline,
    }
  );
  if (!availability.available) {
    throw new ConflictError(
      availability.reason || "This ticket type is not available"
    );
  }

  if (data.ticketType === "COMPANY" || data.ticketType === "REGULAR") {
    throw new ValidationError({
      ticketType: `${data.ticketType} tickets must be purchased via the group/pair endpoints`,
    });
  }

  const price = calculateTicketPrice(
    data.ticketType as TicketType,
    settings?.tickets
  );

  const ticket = await prisma.gBCTicket.create({
    data: {
      ticketNumber: generateTicketNumber(activeEdition.ticketPrefix),
      edition: activeEdition.key,
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
    {
      name: data.name,
      phone: data.phone,
      profession: resolveProfession(data.profession, data.otherProfession),
    }
  );

  const existing = await prisma.gBCTicket.count({
    where: { paymentRef: paymentResponse.data.reference },
  });
  if (existing > 0) {
    throw new ConflictError(
      "Payment reference already exists. Please try again or contact support."
    );
  }

  await prisma.gBCTicket.update({
    where: { id: ticket.id },
    data: { paymentRef: paymentResponse.data.reference },
  });

  return {
    ticket,
    reference: paymentResponse.data.reference,
    paymentUrl: paymentResponse.data.authorization_url,
  };
}

async function createMultiTicket(
  attendeesData: AttendeeInput[],
  count: number,
  ticketType: "COMPANY" | "REGULAR"
) {
  const primaryAttendee = validateAttendees(attendeesData, count);
  const activeEdition = await getActiveEditionInfo();
  const settings = await getSettings(activeEdition.key);
  await assertCapacityAvailable(count, settings, activeEdition.key);

  const price = calculateTicketPrice(ticketType, settings?.tickets);
  const ticketPrefix = activeEdition.ticketPrefix;
  const edition = activeEdition.key;

  const tickets = await Promise.all(
    attendeesData.map((attendee) =>
      prisma.gBCTicket.create({
        data: {
          ticketNumber: generateTicketNumber(ticketPrefix),
          edition,
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone || undefined,
          gender: attendee.gender,
          profession: resolveProfession(
            attendee.profession,
            attendee.otherProfession
          ),
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

  return {
    tickets,
    reference: paymentResponse.data.reference,
    paymentUrl: paymentResponse.data.authorization_url,
  };
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

async function ensureQRAndEmail(
  ticket: GBCTicket & { editionRef: GBCEdition },
  settings: Awaited<ReturnType<typeof getSettings>>,
  forceSendEmail?: boolean
) {
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
      const { url: qrCodeUrl, key: qrCodeS3Key } = await uploadQRCode(
        qrBuffer,
        ticket.ticketNumber
      );
      await prisma.gBCTicket.update({
        where: { id: ticket.id },
        data: { qrCode: qrCodeUrl, qrCodeS3Key },
      });
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
        ? new Date(settings.event.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day";
      const eventLocation =
        settings?.contact.city ||
        process.env.NEXT_PUBLIC_EVENT_LOCATION ||
        "Lagos, Nigeria";
      const eventVenue =
        settings?.event.venue ||
        process.env.NEXT_PUBLIC_EVENT_VENUE ||
        "Conference Center, Lagos";

      // Receipt generation is best-effort — a failure here shouldn't block
      // the ticket confirmation email (which has the QR code attendees
      // actually need at the door) from going out.
      let receiptPdfBuffer: Buffer | undefined;
      if (ticket.paymentStatus === "COMPLETED") {
        try {
          receiptPdfBuffer = await generateTicketReceiptPdfBuffer(ticket);
        } catch (error) {
          console.error(
            `Receipt PDF generation failed for ticket ${ticket.ticketNumber}:`,
            error
          );
        }
      }

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
        receiptPdfBuffer,
      });
      if (!emailResult.success) {
        console.error(
          `Failed to send confirmation email to ${ticket.email}:`,
          emailResult.error
        );
      }
    }
  } catch (error) {
    // QR/email failures are non-critical to payment verification succeeding.
    console.error(
      `QR/email step failed for ticket ${ticket.ticketNumber}:`,
      error
    );
  }
}

export async function verifyPayment(reference: string, sendEmail?: boolean) {
  if (!reference)
    throw new ValidationError({ reference: "Payment reference is required" });

  const verification = await verifyPaystackPayment(reference);
  if (!verification.status || verification.data.status !== "success") {
    throw new ConflictError(
      verification.message || "Payment verification failed"
    );
  }

  const tickets = await prisma.gBCTicket.findMany({
    where: { paymentRef: reference },
    include: { editionRef: true },
  });
  if (!tickets || tickets.length === 0)
    throw new NotFoundError("Tickets for this payment");

  const firstTicketType = tickets[0].ticketType;
  if (!tickets.every((t) => t.ticketType === firstTicketType)) {
    throw new ConflictError(
      "Invalid payment: tickets with the same payment reference must have the same type"
    );
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
        include: { editionRef: true },
      })
    )
  );

  // The confirmation email describes the event the ticket was bought for.
  const settings = await getSettings(updatedTickets[0]?.edition);
  await Promise.all(
    updatedTickets.map((ticket) =>
      ensureQRAndEmail(ticket, settings, sendEmail)
    )
  );

  return {
    tickets: updatedTickets,
    count: updatedTickets.length,
    amount: koboToNaira(verification.data.amount),
  };
}

export async function getTicketAvailability() {
  const { key: edition } = await getActiveEditionInfo();
  const [completedTickets, soldEarlyBirdTickets] = await Promise.all([
    prisma.gBCTicket.count({ where: { paymentStatus: "COMPLETED", edition } }),
    prisma.gBCTicket.count({
      where: { paymentStatus: "COMPLETED", ticketType: "EARLY_BIRD", edition },
    }),
  ]);
  const settings = await getSettings(edition);
  const maxTickets = settings ? settings.tickets.maxCapacity : 1000;

  return {
    availableTickets: maxTickets - completedTickets,
    maxTickets,
    soldEarlyBirdTickets,
  };
}

export async function getTicketByNumber(ticketNumber: string) {
  const ticket = await prisma.gBCTicket.findFirst({
    where: { ticketNumber },
    include: { editionRef: true },
  });
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

/**
 * Defaults to the active edition when none is passed (dashboard's original
 * behavior). Passing an edition key scopes every count — including
 * `totalTickets`/`pendingTickets`, which previously spanned all editions
 * regardless of which one was "current" — so the GBC admin edition switcher
 * can show a past or future edition's own numbers instead of always the
 * active edition's.
 */
export async function getTicketStats(edition?: string) {
  const editionKey = edition ?? (await getActiveEditionInfo()).key;
  const [statusStats, checkedInCount, soldEarlyBirdTickets, editionCompleted] =
    await Promise.all([
      prisma.gBCTicket.groupBy({
        by: ["paymentStatus"],
        _count: { id: true },
        _sum: { price: true },
        where: { edition: editionKey },
      }),
      prisma.gBCTicket.count({
        where: { checkedIn: true, edition: editionKey },
      }),
      prisma.gBCTicket.count({
        where: {
          paymentStatus: "COMPLETED",
          ticketType: "EARLY_BIRD",
          edition: editionKey,
        },
      }),
      prisma.gBCTicket.count({
        where: { paymentStatus: "COMPLETED", edition: editionKey },
      }),
    ]);

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
  const settings = await getSettings(editionKey);
  const maxTickets = settings ? settings.tickets.maxCapacity : 1000;

  return {
    totalTickets,
    completedTickets,
    pendingTickets: pendingStat?._count.id || 0,
    checkedInTickets: checkedInCount,
    availableTickets: maxTickets - editionCompleted,
    totalRevenue: completedStat?._sum.price || 0,
    maxTickets,
    soldEarlyBirdTickets,
  };
}

function buildTicketWhere(filters?: {
  status?: string;
  search?: string;
  checkedIn?: boolean;
  edition?: string;
}) {
  const where: any = {};
  if (filters?.status) where.paymentStatus = filters.status;
  if (filters?.checkedIn !== undefined) where.checkedIn = filters.checkedIn;
  if (filters?.edition) where.edition = filters.edition;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
      { ticketNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/**
 * `limit` used to silently default to 100 when omitted — real data loss for
 * the two callers (attendees/certificates pages) that fetch "every COMPLETED
 * ticket" for a real business action and can easily exceed that. Omitting
 * `limit` now means unbounded, matching what those callers actually expect;
 * RecentTickets' explicit `limit: 5` and the (uncalled) admin API route's
 * optional limit are both unaffected.
 */
export async function getTickets(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  edition?: string;
}) {
  const where = buildTicketWhere(filters);
  return prisma.gBCTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit,
  });
}

export interface TicketListFilters {
  status?: string;
  search?: string;
  checkedIn?: boolean;
  edition?: string;
}

export interface GetTicketsPaginatedParams extends TicketListFilters {
  page: number;
  pageSize: number;
}

/** Paginated/searchable/filterable sibling of getTickets() — the admin Tickets, Attendees and Certificates pages. */
export async function getTicketsPaginated(params: GetTicketsPaginatedParams) {
  const { page, pageSize, ...filters } = params;
  const where = buildTicketWhere(filters);

  return paginateQuery(
    (skip, take) =>
      prisma.gBCTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    () => prisma.gBCTicket.count({ where }),
    page,
    pageSize
  );
}

/** Every ticket number matching the filters — lets a "select all" span pages without shipping full rows. */
export async function getTicketNumbers(
  filters: TicketListFilters
): Promise<string[]> {
  const rows = await prisma.gBCTicket.findMany({
    where: buildTicketWhere(filters),
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });
  return rows.map((r) => r.ticketNumber);
}

/** Headline counts over COMPLETED tickets, optionally scoped to one edition — independent of any list's page/search/check-in filters. */
export async function getAttendeeStats(edition?: string) {
  const base = buildTicketWhere({ status: "COMPLETED", edition });
  const [total, checkedIn, certificatesSent] = await Promise.all([
    prisma.gBCTicket.count({ where: base }),
    prisma.gBCTicket.count({ where: { ...base, checkedIn: true } }),
    prisma.gBCTicket.count({
      where: { ...base, certificateSentCount: { gt: 0 } },
    }),
  ]);
  return { total, checkedIn, pending: total - checkedIn, certificatesSent };
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
    throw new ConflictError(
      "Cannot delete completed ticket. Use refund instead."
    );
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
  await prisma.gBCTicket.update({
    where: { id: ticketId },
    data: { qrCode: url, qrCodeS3Key: key },
  });

  return { url, key };
}

export async function checkInTicket(ticketNumber: string, adminEmail: string) {
  const ticket = await prisma.gBCTicket.findUnique({ where: { ticketNumber } });
  if (!ticket) throw new NotFoundError("Ticket");
  if (ticket.paymentStatus !== "COMPLETED")
    throw new ConflictError("Ticket payment not completed");
  if (ticket.checkedIn) {
    throw new ConflictError(
      `Ticket already checked in at ${ticket.checkedInAt?.toLocaleString()}`
    );
  }

  const updatedTicket = await prisma.gBCTicket.update({
    where: { id: ticket.id },
    data: { checkedIn: true, checkedInAt: new Date(), checkedInBy: adminEmail },
  });

  if (ticket.phone) {
    try {
      await sendGBCTicketSMS(
        ticket.phone,
        ticket.name,
        ticket.ticketNumber,
        process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day"
      );
    } catch (smsError) {
      console.error("SMS sending failed (non-critical):", smsError);
    }
  }

  return { ticket: updatedTicket, message: `Welcome ${ticket.name}!` };
}

/** The native JWT session carries {sub, role, platform} only — routes that need the acting admin's email (e.g. for checkInTicket's checkedInBy) fetch it here. */
export async function getAdminContact(userId: string) {
  const user = await prisma.gBCUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new NotFoundError("User");
  return user;
}
