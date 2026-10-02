import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gBCContactInquiry: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  gBCEdition: { findFirst: vi.fn() },
}));

const mockEmail = vi.hoisted(() => ({
  sendGBCContactConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendGBCAdminNotification: vi.fn().mockResolvedValue(undefined),
  sendGBCInquiryReply: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/utils/email", () => mockEmail);

const {
  submitContactForm,
  replyToInquiry,
  getInquiries,
  getInquiriesPaginated,
  getInquiryStats,
} = await import("@/gbc/services/contactService");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
});

describe("submitContactForm", () => {
  it("creates the inquiry and sends both the confirmation and admin notification", async () => {
    mockPrisma.gBCContactInquiry.create.mockResolvedValue({ id: "i1" });
    const data = {
      name: "Jane",
      email: "jane@test.com",
      subject: "Hi",
      message: "Hello there",
      type: "GENERAL",
    } as any;

    await submitContactForm(data);

    expect(mockPrisma.gBCContactInquiry.create).toHaveBeenCalledWith({ data });
    expect(mockEmail.sendGBCContactConfirmation).toHaveBeenCalledWith(
      "Jane",
      "jane@test.com",
      "Hi"
    );
    expect(mockEmail.sendGBCAdminNotification).toHaveBeenCalledWith(
      "GENERAL",
      "Jane",
      "jane@test.com",
      undefined,
      "Hi",
      "Hello there"
    );
  });
});

describe("submitContactForm edition tagging", () => {
  const data = {
    name: "Jane",
    email: "jane@test.com",
    subject: "Hi",
    message: "Hello there",
    type: "GENERAL",
  } as any;

  it("tags the inquiry with the active edition", async () => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue({
      key: "3.0",
      name: "GBC 3.0",
      theme: "T",
      subTheme: "S",
      venue: "V",
      startDate: new Date("2027-04-30"),
      endDate: new Date("2027-04-30"),
      status: "ACTIVE",
      ticketPrefix: "GBC3",
    });
    mockPrisma.gBCContactInquiry.create.mockResolvedValue({ id: "i1" });

    await submitContactForm(data);

    expect(mockPrisma.gBCContactInquiry.create).toHaveBeenCalledWith({
      data: { ...data, edition: "3.0" },
    });
  });

  it("leaves the schema default in place when no edition is active", async () => {
    mockPrisma.gBCContactInquiry.create.mockResolvedValue({ id: "i1" });

    await submitContactForm(data);

    expect(mockPrisma.gBCContactInquiry.create).toHaveBeenCalledWith({ data });
  });
});

describe("getInquiries", () => {
  it("filters by status, type and edition together", async () => {
    mockPrisma.gBCContactInquiry.findMany.mockResolvedValue([]);

    await getInquiries({ status: "PENDING", type: "GENERAL", edition: "2.0" });

    expect(mockPrisma.gBCContactInquiry.findMany).toHaveBeenCalledWith({
      where: { status: "PENDING", type: "GENERAL", edition: "2.0" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getInquiriesPaginated", () => {
  it("pushes the edition filter into both the page query and the count", async () => {
    mockPrisma.gBCContactInquiry.findMany.mockResolvedValue([{ id: "i1" }]);
    mockPrisma.gBCContactInquiry.count.mockResolvedValue(25);

    const result = await getInquiriesPaginated({
      page: 2,
      pageSize: 10,
      edition: "2.0",
      status: "PENDING",
      search: "jane",
    });

    const where = {
      status: "PENDING",
      edition: "2.0",
      OR: [
        { name: { contains: "jane", mode: "insensitive" } },
        { email: { contains: "jane", mode: "insensitive" } },
        { subject: { contains: "jane", mode: "insensitive" } },
      ],
    };
    expect(mockPrisma.gBCContactInquiry.findMany).toHaveBeenCalledWith({
      where,
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(mockPrisma.gBCContactInquiry.count).toHaveBeenCalledWith({ where });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("falls back to the last real page when the requested page is past the end", async () => {
    mockPrisma.gBCContactInquiry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "last" }]);
    mockPrisma.gBCContactInquiry.count.mockResolvedValue(11);

    const result = await getInquiriesPaginated({ page: 9, pageSize: 10 });

    expect(result.data).toEqual([{ id: "last" }]);
    expect(result.pagination.page).toBe(2);
  });
});

describe("getInquiryStats", () => {
  it("counts everything when no edition is given", async () => {
    mockPrisma.gBCContactInquiry.count
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);

    expect(await getInquiryStats()).toEqual({
      total: 9,
      pending: 4,
      inProgress: 3,
      resolved: 2,
    });
    expect(mockPrisma.gBCContactInquiry.count).toHaveBeenNthCalledWith(1, {
      where: {},
    });
    expect(mockPrisma.gBCContactInquiry.count).toHaveBeenNthCalledWith(2, {
      where: { status: "PENDING" },
    });
  });

  it("scopes every count to the edition when one is given", async () => {
    mockPrisma.gBCContactInquiry.count.mockResolvedValue(0);

    await getInquiryStats("1.0");

    for (const [args] of mockPrisma.gBCContactInquiry.count.mock.calls) {
      expect(args.where).toMatchObject({ edition: "1.0" });
    }
    expect(mockPrisma.gBCContactInquiry.count).toHaveBeenCalledTimes(4);
  });
});

describe("replyToInquiry", () => {
  it("throws NotFoundError for an unknown inquiry", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue(null);
    await expect(replyToInquiry("nope", "Subj", "Msg")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws when the reply email fails to send, without updating status", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue({
      email: "a@test.com",
      name: "A",
    });
    mockEmail.sendGBCInquiryReply.mockResolvedValueOnce({
      success: false,
      error: "SMTP down",
    });
    await expect(replyToInquiry("i1", "Subj", "Msg")).rejects.toThrow(
      "SMTP down"
    );
    expect(mockPrisma.gBCContactInquiry.update).not.toHaveBeenCalled();
  });

  it("marks the inquiry IN_PROGRESS once the reply sends", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue({
      email: "a@test.com",
      name: "A",
    });
    await replyToInquiry("i1", "Subj", "Msg");
    expect(mockPrisma.gBCContactInquiry.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "IN_PROGRESS" },
    });
  });
});
