// src/lib/qrcode.ts
import QRCode from "qrcode";
import { createHmac } from "crypto";

const QR_SECRET = process.env.QR_CODE_SECRET || "default-secret-change-this";

interface TicketData {
  ticketNumber: string;
  name: string;
  email: string;
  ticketType: string;
}

/**
 * Generate a secure hash for the QR code data
 */
export function generateQRHash(ticketNumber: string): string {
  const hmac = createHmac("sha256", QR_SECRET);
  hmac.update(ticketNumber);
  return hmac.digest("hex");
}

/**
 * Verify QR code hash
 */
export function verifyQRHash(ticketNumber: string, hash: string): boolean {
  const expectedHash = generateQRHash(ticketNumber);
  return expectedHash === hash;
}

/**
 * Generate QR code data string
 * Now only includes the ticket number for simplicity
 */
export function generateQRData(ticketData: TicketData): string {
  // const hash = generateQRHash(ticketData.ticketNumber);
  
  return JSON.stringify({
    ticketNumber: ticketData.ticketNumber,
    // name: ticketData.name,
    // email: ticketData.email,
    // ticketType: ticketData.ticketType,
    // hash,
    // timestamp: Date.now(),
  });
}

/**
 * Generate QR code as base64 data URL
 */
export async function generateQRCode(ticketData: TicketData): Promise<string> {
  try {
    const qrData = generateQRData(ticketData);

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code as buffer (for email attachments)
 */
export async function generateQRCodeBuffer(
  ticketData: TicketData
): Promise<Buffer> {
  try {
    const qrData = generateQRData(ticketData);

    const buffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 400,
      margin: 2,
    });

    return buffer;
  } catch (error) {
    console.error("QR Code buffer generation error:", error);
    throw new Error("Failed to generate QR code buffer");
  }
}

/**
 * Parse and verify QR code data
 */
export function parseAndVerifyQRData(qrDataString: string): {
  valid: boolean;
  data?: TicketData & { hash: string; timestamp: number };
  error?: string;
} {
  try {
    const data = JSON.parse(qrDataString);

    // Validate required fields
    if (!data.ticketNumber || !data.hash) {
      return { valid: false, error: "Invalid QR code data" };
    }

    // Verify hash
    const isValid = verifyQRHash(data.ticketNumber, data.hash);

    if (!isValid) {
      return { valid: false, error: "QR code verification failed" };
    }

    // Check if QR code is not too old (24 hours)
    const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (ageInHours > 24) {
      // Still valid but warn about age
      console.warn(`QR code is ${ageInHours.toFixed(1)} hours old`);
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: "Failed to parse QR code data" };
  }
}
