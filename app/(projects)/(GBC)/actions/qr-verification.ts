"use server";

import { createHmac } from "crypto";

const QR_SECRET =
  process.env.QR_CODE_SECRET || "@default@-_33##_s3cr3t-ch@nge-th!s";

interface TicketData {
  ticketNumber: string;
  name: string;
  email: string;
  ticketType: string;
  hash: string;
  timestamp: number;
}

/**
 * Server-side QR code verification
 * This must run on the server because it uses Node.js crypto module
 */
export async function verifyQRCodeHash(
  qrDataString: string,
  maxAgeHours?: number
): Promise<{
  valid: boolean;
  data?: TicketData;
  error?: string;
}> {
  try {
    const data = JSON.parse(qrDataString);

    // Validate required fields
    if (!data.ticketNumber || !data.hash) {
      return { valid: false, error: "Invalid QR code data" };
    }

    // Verify hash using server-side crypto
    const hmac = createHmac("sha256", QR_SECRET);
    hmac.update(data.ticketNumber);
    const expectedHash = hmac.digest("hex");

    if (expectedHash !== data.hash) {
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
    console.error("QR verification error:", error);
    return { valid: false, error: "Failed to parse QR code data" };
  }
}
