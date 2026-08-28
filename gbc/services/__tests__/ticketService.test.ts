import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward what this migration actually changed: the shared
 * validateAttendees helper (was ~150 lines duplicated between
 * createGBCGroupTicket/createGBCPairTicket), capacity/registration checks
 * now throwing typed ConflictError instead of {success:false}, the new
 * lookupMyTicket guest-auth function, and checkInTicket's error paths.
 */

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  gBCUser: { findUnique: vi.fn() },
}));

const mockSettings = vi.hoisted(() => ({
  getAllGBCSettings: vi.fn().mockResolvedValue({
    success: true,
    data: {
      tickets: { pauseTicketReg: false, maxCapacity: 1000, maxEarlyBirdCapacity: 500 },
      event: { date: null, venue: null },
      contact: { city: null },
    },
  }),
}));

const mockPaystack = vi.hoisted(() => ({
  initializeTicketPayment: vi.fn().mockResolvedValue({
    data: { reference: "ref_1", authorization_url: "https://paystack.test/pay" },
  }),
  koboToNaira: (kobo: number) => kobo / 100,
  verifyPayment: vi.fn(),
}));

const mockAwsS3 = vi.hoisted(() => ({ uploadQRCode: vi.fn().mockResolvedValue({ url: "u", key: "k" }) }));
const mockQr = vi.hoisted(() => ({ generateQRCodeBuffer: vi.fn().mockResolvedValue(Buffer.from("qr")) }));
const mockEmail = vi.hoisted(() => ({ sendGBCTicketConfirmation: vi.fn().mockResolvedValue({ success: true }) }));
const mockSms = vi.hoisted(() => ({ sendGBCTicketSMS: vi.fn().mockResolvedValue(undefined) }));
const mockUtils = vi.hoisted(() => ({
  calculateTicketPrice: vi.fn().mockReturnValue(100000),
  isTicketTypeAvailable: vi.fn().mockReturnValue({ available: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/app/(projects)/(GBC)/actions/settings-actions", () => mockSettings);
vi.mock("@/app/(projects)/(GBC)/utils/paystack", () => mockPaystack);
vi.mock("@/app/(projects)/(GBC)/utils/aws-s3", () => mockAwsS3);
vi.mock("@/app/(projects)/(GBC)/utils/qr_code", () => mockQr);
vi.mock("@/app/(projects)/(GBC)/utils/email", () => mockEmail);
vi.mock("@/app/(projects)/(GBC)/utils/sms", () => mockSms);
vi.mock("@/app/(projects)/(GBC)/utils", () => mockUtils);

const {
  createTicket,
  createGroupTicket,
  createPairTicket,
  verifyPayment,
  lookupMyTicket,
  getTicketAvailability,
  checkInTicket,
} = await import("@/gbc/services/ticketService");

const attendee = (overrides: Partial<Record<string, any>> = {}) => ({
  name: "Jane Doe",
  email: "jane@test.com",
  gender: "FEMALE",
  profession: "ENGINEER",
  isPrimary: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings.getAllGBCSettings.mockResolvedValue({
    success: true,
    data: {
      tickets: { pauseTicketReg: false, maxCapacity: 1000, maxEarlyBirdCapacity: 500 },
      event: { date: null, venue: null },
      contact: { city: null },
    },
  });
  mockUtils.isTicketTypeAvailable.mockReturnValue({ available: true });
  mockPaystack.initializeTicketPayment.mockResolvedValue({
    data: { reference: "ref_1", authorization_url: "https://paystack.test/pay" },
  });
});

describe("createTicket", () => {
  it("throws ConflictError when registration is paused", async () => {
    mockSettings.getAllGBCSettings.mockResolvedValue({
      success: true,
      data: { tickets: { pauseTicketReg: true, maxCapacity: 1000 }, event: {}, contact: {} },
    });
    await expect(
      createTicket({ name: "A", email: "a@test.com", gender: "MALE", profession: "OTHER", ticketType: "EARLY_BIRD" } as any)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects COMPANY/REGULAR ticket types (must use group/pair endpoints)", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValue(0);
    await expect(
      createTicket({ name: "A", email: "a@test.com", gender: "MALE", profession: "X", ticketType: "COMPANY" } as any)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("creates a ticket and initializes payment on the happy path", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.gBCTicket.create.mockResolvedValue({ id: "t1", ticketNumber: "GBC2_ABC" });
    mockPrisma.gBCTicket.update.mockResolvedValue({});

    const result = await createTicket({
      name: "A",
      email: "a@test.com",
      gender: "MALE",
      profession: "OTHER",
      otherProfession: "Founder",
      ticketType: "EARLY_BIRD",
    } as any);

    expect(result.reference).toBe("ref_1");
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { paymentRef: "ref_1" },
    });
  });
});

describe("createGroupTicket / createPairTicket (validateAttendees)", () => {
  it("throws ValidationError when the attendee count doesn't match", async () => {
    await expect(createGroupTicket([attendee()])).rejects.toMatchObject({ status: 400 });
  });

  it("throws ValidationError when no attendee is marked primary", async () => {
    const attendees = [attendee({ isPrimary: false }), attendee({ email: "b@test.com", isPrimary: false })];
    await expect(createPairTicket(attendees)).rejects.toMatchObject({ status: 400 });
  });

  it("throws ValidationError on duplicate emails", async () => {
    const attendees = [attendee(), attendee()];
    await expect(createPairTicket(attendees)).rejects.toMatchObject({ status: 400 });
  });

  it("creates all tickets and shares one payment reference on the happy path", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValue(0);
    mockPrisma.gBCTicket.create
      .mockResolvedValueOnce({ id: "t1", ticketNumber: "GBC2_A" })
      .mockResolvedValueOnce({ id: "t2", ticketNumber: "GBC2_B" });
    mockPrisma.gBCTicket.update.mockResolvedValue({});

    const attendees = [attendee(), attendee({ email: "b@test.com", isPrimary: false })];
    const result = await createPairTicket(attendees);

    expect(result.tickets).toHaveLength(2);
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledTimes(2);
  });
});

describe("lookupMyTicket", () => {
  it("throws NotFoundError on any mismatch (never distinguishes which field)", async () => {
    mockPrisma.gBCTicket.findFirst.mockResolvedValue(null);
    await expect(lookupMyTicket("GBC2_X", "nope@test.com")).rejects.toMatchObject({ status: 404 });
  });

  it("returns the ticket on a real match", async () => {
    mockPrisma.gBCTicket.findFirst.mockResolvedValue({ ticketNumber: "GBC2_X", email: "a@test.com" });
    const result = await lookupMyTicket("GBC2_X", "a@test.com");
    expect(result.ticketNumber).toBe("GBC2_X");
  });
});

describe("getTicketAvailability", () => {
  it("returns capacity numbers only, no revenue", async () => {
    mockPrisma.gBCTicket.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    const result = await getTicketAvailability();
    expect(result).toEqual({ availableTickets: 990, maxTickets: 1000, soldEarlyBirdTickets: 3 });
    expect(result).not.toHaveProperty("totalRevenue");
  });
});

describe("verifyPayment", () => {
  it("throws NotFoundError when no tickets match the reference", async () => {
    mockPaystack.verifyPayment.mockResolvedValue({ status: true, data: { status: "success" } });
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    await expect(verifyPayment("ref_missing")).rejects.toMatchObject({ status: 404 });
  });

  it("throws ConflictError when the ticket count doesn't match the expected count for the type", async () => {
    mockPaystack.verifyPayment.mockResolvedValue({ status: true, data: { status: "success" } });
    mockPrisma.gBCTicket.findMany.mockResolvedValue([{ ticketType: "REGULAR" }]);
    await expect(verifyPayment("ref_1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("checkInTicket", () => {
  it("throws NotFoundError for an unknown ticket number", async () => {
    mockPrisma.gBCTicket.findUnique.mockResolvedValue(null);
    await expect(checkInTicket("GBC2_NOPE", "admin@test.com")).rejects.toMatchObject({ status: 404 });
  });

  it("throws ConflictError when payment isn't completed", async () => {
    mockPrisma.gBCTicket.findUnique.mockResolvedValue({ paymentStatus: "PENDING", checkedIn: false });
    await expect(checkInTicket("GBC2_X", "admin@test.com")).rejects.toMatchObject({ status: 409 });
  });

  it("throws ConflictError when already checked in", async () => {
    mockPrisma.gBCTicket.findUnique.mockResolvedValue({
      paymentStatus: "COMPLETED",
      checkedIn: true,
      checkedInAt: new Date(),
    });
    await expect(checkInTicket("GBC2_X", "admin@test.com")).rejects.toMatchObject({ status: 409 });
  });

  it("records checkedInBy with the acting admin's email on success", async () => {
    mockPrisma.gBCTicket.findUnique.mockResolvedValue({
      id: "t1",
      ticketNumber: "GBC2_X",
      name: "Jane",
      phone: null,
      paymentStatus: "COMPLETED",
      checkedIn: false,
    });
    mockPrisma.gBCTicket.update.mockResolvedValue({ checkedInBy: "admin@test.com" });

    await checkInTicket("GBC2_X", "admin@test.com");

    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: expect.objectContaining({ checkedIn: true, checkedInBy: "admin@test.com" }),
    });
  });
});
