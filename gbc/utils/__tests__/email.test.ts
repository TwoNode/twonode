import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendMail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ response: "250 ok" })
);
const mockCreateTransport = vi.hoisted(() =>
  vi.fn(() => ({ sendMail: mockSendMail }))
);
const mockGenerateCertificatePdfBuffer = vi.hoisted(() => vi.fn());
const mockGetCertificateVerificationUrl = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));
vi.mock("@/gbc/services/certificatePdfService", () => ({
  generateCertificatePdfBuffer: mockGenerateCertificatePdfBuffer,
  getCertificateVerificationUrl: mockGetCertificateVerificationUrl,
}));

const { sendGBCCertificateEmail } = await import("@/gbc/utils/email");

const ticket = {
  ticketNumber: "GBC2_ABC123",
  name: "Jane Doe",
  email: "jane@test.com",
  checkedInAt: new Date("2026-03-15T10:00:00Z"),
  editionRef: {
    name: "GBC 2.0",
    theme: "Geospatial Capital",
    subTheme: "Driving Transformation",
    venue: "Eko Hotel & Suites, Lagos",
    startDate: new Date("2026-03-15T00:00:00Z"),
    endDate: new Date("2026-03-15T00:00:00Z"),
  },
};

const fakePdf = Buffer.from("%PDF-fake");

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateCertificatePdfBuffer.mockResolvedValue(fakePdf);
  mockGetCertificateVerificationUrl.mockReturnValue(
    "https://www.twonodetechnologies.com/gbc/certificate/GBC2_ABC123"
  );
});

describe("sendGBCCertificateEmail", () => {
  it("attaches the generated PDF instead of only linking to the certificate page", async () => {
    const result = await sendGBCCertificateEmail(ticket, "Congratulations!");

    expect(result).toEqual({ success: true });
    expect(mockGenerateCertificatePdfBuffer).toHaveBeenCalledWith(ticket);

    const [mailOptions] = mockSendMail.mock.calls[0];
    expect(mailOptions.to).toBe("jane@test.com");
    expect(mailOptions.attachments).toEqual([
      expect.objectContaining({
        filename: "GBC-2.0-Certificate-GBC2_ABC123.pdf",
        content: fakePdf,
        contentType: "application/pdf",
      }),
    ]);
  });

  it("names the subject and sender after the ticket's own edition, not a hardcoded product name", async () => {
    await sendGBCCertificateEmail(ticket, "body");
    const [mailOptions] = mockSendMail.mock.calls[0];
    expect(mailOptions.subject).toBe("Your GBC 2.0 Certificate of Attendance");
    expect(mailOptions.from).toContain("GBC 2.0");
  });

  it("returns success:false instead of throwing when sending fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP down"));
    const result = await sendGBCCertificateEmail(ticket, "body");
    expect(result).toEqual({ success: false, error: "SMTP down" });
  });

  it("surfaces a PDF generation failure the same way as a send failure", async () => {
    mockGenerateCertificatePdfBuffer.mockRejectedValueOnce(
      new Error("font not found")
    );
    const result = await sendGBCCertificateEmail(ticket, "body");
    expect(result).toEqual({ success: false, error: "font not found" });
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
