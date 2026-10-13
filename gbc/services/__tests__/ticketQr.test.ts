import { beforeEach, describe, expect, it, vi } from "vitest";

/** QR codes are private files: pages and API responses carry a signed link, never the stored URL. */

const signed = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/gbc/services/settingsService", () => ({ getSettings: vi.fn() }));
vi.mock("@/gbc/utils/aws-s3", () => ({
  uploadQRCode: vi.fn(),
  getSignedS3Url: signed,
}));
vi.mock("@/gbc/utils/qr_code", () => ({ generateQRCodeBuffer: vi.fn() }));
vi.mock("@/gbc/utils/email", () => ({ sendGBCTicketConfirmation: vi.fn() }));
vi.mock("@/gbc/utils/sms", () => ({ sendGBCTicketSMS: vi.fn() }));
vi.mock("@/gbc/services/receiptPdfService", () => ({
  generateTicketReceiptPdfBuffer: vi.fn(),
}));

const { signedTicketQrUrl, withSignedQr } =
  await import("@/gbc/services/ticketService");

beforeEach(() => {
  signed.mockReset().mockImplementation(async (key: string) => `signed:${key}`);
});

describe("signedTicketQrUrl", () => {
  it("signs the stored key", async () => {
    expect(
      await signedTicketQrUrl({
        qrCodeS3Key: "private/gbc/2.0/qrcodes/a.png",
        qrCode: "https://x/private/gbc/2.0/qrcodes/a.png",
      })
    ).toBe("signed:private/gbc/2.0/qrcodes/a.png");
  });

  it("signs the key found in an old public URL when the key column is empty", async () => {
    expect(
      await signedTicketQrUrl({
        qrCodeS3Key: null,
        qrCode: "https://b.s3.eu-north-1.amazonaws.com/GBC2/qrcodes/1-a-t.png",
      })
    ).toBe("signed:GBC2/qrcodes/1-a-t.png");
  });

  it("returns null, without signing, when the ticket has no QR code", async () => {
    expect(await signedTicketQrUrl({})).toBeNull();
    expect(await signedTicketQrUrl(undefined)).toBeNull();
    expect(signed).not.toHaveBeenCalled();
  });
});

describe("withSignedQr", () => {
  it("swaps the stored QR link for a signed one and keeps the other fields", async () => {
    const out = await withSignedQr({
      ticketNumber: "T1",
      qrCodeS3Key: "private/gbc/2.0/qrcodes/a.png",
      qrCode: "https://stored/url",
    });
    expect(out.qrCode).toBe("signed:private/gbc/2.0/qrcodes/a.png");
    expect(out.ticketNumber).toBe("T1");
  });
});
