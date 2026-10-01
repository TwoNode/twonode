import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: { findMany: vi.fn(), update: vi.fn() },
}));

const mockEmail = vi.hoisted(() => ({ sendGBCCertificateEmail: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/utils/email", () => mockEmail);

const { sendBulkCertificates } = await import("@/gbc/services/certificateService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendBulkCertificates", () => {
  it("throws ValidationError when no ticket numbers are given", async () => {
    await expect(sendBulkCertificates([], "body")).rejects.toMatchObject({ status: 400 });
  });

  it("throws ValidationError when none of the ticket numbers match a real ticket", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([]);
    await expect(sendBulkCertificates(["GBC2_NOPE"], "body")).rejects.toMatchObject({ status: 400 });
  });

  it("increments certificateSentCount only for tickets whose email actually sent", async () => {
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      { id: "t1", name: "A", email: "a@test.com", ticketNumber: "GBC2_A" },
      { id: "t2", name: "B", email: "b@test.com", ticketNumber: "GBC2_B" },
    ]);
    mockEmail.sendGBCCertificateEmail
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "bounced" });

    const result = await sendBulkCertificates(["GBC2_A", "GBC2_B"], "body");

    expect(result).toEqual({ sent: 1, failed: 1, message: "Sent 1 certificate emails successfully. Failed to send 1." });
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.gBCTicket.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { certificateSentCount: { increment: 1 } },
    });
  });
});
