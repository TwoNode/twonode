// src/lib/qrcode.ts
import QRCode from "qrcode";
import { createHmac } from "crypto";

const QR_SECRET =
  process.env.QR_CODE_SECRET || "@default@-_33##_s3cr3t-ch@nge-th!s";

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
 * Generate QR code data string with security hash and timestamp
 */
export function generateQRData(ticketData: TicketData): string {
  const hash = generateQRHash(ticketData.ticketNumber);

  return JSON.stringify({
    ticketNumber: ticketData.ticketNumber,
    name: ticketData.name,
    email: ticketData.email,
    ticketType: ticketData.ticketType,
    hash,
    timestamp: Date.now(),
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
 * Generate a plain verification QR code for a URL — used by the certificate
 * PDF, distinct from generateQRCode/generateQRData above which encode a
 * signed check-in payload for gate scanning. A certificate's QR just needs
 * to open the public certificate page, which does its own ticket lookup, so
 * there's no hash/timestamp payload to verify here.
 */
export async function generateVerificationQRDataURL(
  url: string
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    type: "image/png",
    width: 300,
    margin: 1,
    color: { dark: "#1A1024", light: "#FFFFFF" },
  });
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
 * Parse and verify QR code data with hash and optional timestamp validation
 * @param qrDataString - JSON string from QR code
 * @param maxAgeHours - Optional maximum age of QR code in hours. If not provided, timestamp validation is skipped
 */
export function parseAndVerifyQRData(
  qrDataString: string,
  maxAgeHours?: number
): {
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
      return {
        valid: false,
        error: "QR code verification failed - possible forgery",
      };
    }

    // Check if QR code is not too old (only if maxAgeHours is provided)
    if (maxAgeHours !== undefined && data.timestamp) {
      const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
      if (ageInHours > maxAgeHours) {
        return {
          valid: false,
          error: `QR code expired (${ageInHours.toFixed(
            1
          )} hours old, max: ${maxAgeHours} hours)`,
        };
      }
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: "Failed to parse QR code data" };
  }
}
