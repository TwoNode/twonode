import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/services/settingsService", () => ({ getSettings: vi.fn() }));
vi.mock("@/gbc/utils/aws-s3", () => ({ uploadQRCode: vi.fn() }));
vi.mock("@/gbc/utils/qr_code", () => ({ generateQRCodeBuffer: vi.fn() }));
vi.mock("@/gbc/utils/email", () => ({ sendGBCTicketConfirmation: vi.fn() }));
vi.mock("@/gbc/utils/sms", () => ({ sendGBCTicketSMS: vi.fn() }));
vi.mock("@/gbc/services/receiptPdfService", () => ({
  generateTicketReceiptPdfBuffer: vi.fn(),
}));

const { getTicketByNumber } = await import("@/gbc/services/ticketService");

beforeEach(() => vi.clearAllMocks());

describe("getTicketByNumber", () => {
  it("looks the ticket up by its number", async () => {
    mockPrisma.gBCTicket.findFirst.mockResolvedValue({
      ticketNumber: "GBC2_2aff9d",
    });
    await getTicketByNumber("GBC2_2aff9d");
    expect(mockPrisma.gBCTicket.findFirst.mock.calls[0][0].where).toEqual({
      ticketNumber: "GBC2_2aff9d",
    });
  });

  // `where: { ticketNumber: undefined }` matches every row, so an unread
  // route param used to return whichever ticket was first in the table.
  it.each([undefined, null, "", "   "])(
    "refuses %j without querying, so it can never match an arbitrary ticket",
    async (bad) => {
      await expect(getTicketByNumber(bad as any)).rejects.toMatchObject({
        status: 404,
      });
      expect(mockPrisma.gBCTicket.findFirst).not.toHaveBeenCalled();
    }
  );

  it("throws NotFound when no ticket has that number", async () => {
    mockPrisma.gBCTicket.findFirst.mockResolvedValue(null);
    await expect(getTicketByNumber("GBC2_nope")).rejects.toMatchObject({
      status: 404,
    });
  });
});
