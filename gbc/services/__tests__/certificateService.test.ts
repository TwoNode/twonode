import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: { findMany: vi.fn(), update: vi.fn() },
}));

const mockEmail = vi.hoisted(() => ({ sendGBCCertificateEmail: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/utils/email", () => mockEmail);

const { sendBulkCertificates, issueCertificates } =
  await import("@/gbc/services/certificateService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issueCertificates", () => {
  it("throws ValidationError when no ticket numbers are given", async () => {
    await expect(issueCertificates([])).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws ValidationError when no valid tickets match", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    await expect(issueCertificates(["GBC2_NONE"])).rejects.toMatchObject({
      status: 400,
    });
  });

  it("freezes edition details and sets certificateIssued = true", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      {
        id: "t1",
        ticketNumber: "GBC2_A",
        certificatePublicId: null,
        certificateIssuedAt: null,
        editionRef: {
          name: "Annual Conference",
          theme: "Innovate",
          subTheme: "Next Gen",
          venue: "Main Hall",
          startDate: new Date("2026-05-01"),
          endDate: new Date("2026-05-02"),
        },
      },
    ]);

    const res = await issueCertificates(["GBC2_A"]);
    expect(res).toEqual({ count: 1 });
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({
          certificateIssued: true,
          certificateEventName: "Annual Conference",
          certificateTheme: "Innovate",
          certificateSubTheme: "Next Gen",
          certificateVenue: "Main Hall",
          certificatePublicId: expect.any(String),
        }),
      })
    );
  });
});

describe("sendBulkCertificates", () => {
  it("throws ValidationError when no ticket numbers are given", async () => {
    await expect(sendBulkCertificates([], "body")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws ValidationError when none of the ticket numbers match a real ticket", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    await expect(
      sendBulkCertificates(["GBC2_NOPE"], "body")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("freezes edition details and increments certificateSentCount only for tickets whose email actually sent", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      {
        id: "t1",
        name: "A",
        email: "a@test.com",
        ticketNumber: "GBC2_A",
        editionRef: { name: "Event A" },
      },
      {
        id: "t2",
        name: "B",
        email: "b@test.com",
        ticketNumber: "GBC2_B",
        editionRef: { name: "Event B" },
      },
    ]);
    mockEmail.sendGBCCertificateEmail
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "bounced" });

    const result = await sendBulkCertificates(["GBC2_A", "GBC2_B"], "body");

    expect(result).toEqual({
      sent: 1,
      failed: 1,
      message: "Sent 1 certificate emails successfully. Failed to send 1.",
    });

    // 2 update calls for freezing edition details + 1 update call for certificateSentCount increment on success
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledTimes(3);
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { certificateSentCount: { increment: 1 } },
    });
  });
});
