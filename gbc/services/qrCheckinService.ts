import { createHmac } from "crypto";
import { ValidationError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/(GBC)/actions/qr-verification.ts — unchanged
 * logic (HMAC-SHA256, already correct), just relocated and route-gated
 * (admin — this is the server-side half of the QR scanner, not public).
 */

const QR_SECRET =
  process.env.QR_CODE_SECRET || "@default@-_33##_s3cr3t-ch@nge-th!s";

interface QRTicketData {
  ticketNumber: string;
  name: string;
  email: string;
  ticketType: string;
  hash: string;
  timestamp: number;
}

/**
 * A forged, mismatched, or expired QR code is a normal scan outcome the
 * scanner UI needs to display, not a request failure — this returns
 * {valid: false, error} rather than throwing for those cases. Only a
 * genuinely malformed request (unparseable JSON) is treated as invalid input.
 */
export function verifyQRCodeHash(
  qrDataString: string,
  maxAgeHours?: number
): { valid: boolean; data?: QRTicketData; error?: string } {
  let data: QRTicketData;
  try {
    data = JSON.parse(qrDataString);
  } catch {
    throw new ValidationError({ qrDataString: "Failed to parse QR code data" });
  }

  if (!data.ticketNumber || !data.hash) {
    return { valid: false, error: "Invalid QR code data" };
  }

  const hmac = createHmac("sha256", QR_SECRET);
  hmac.update(data.ticketNumber);
  const expectedHash = hmac.digest("hex");

  if (expectedHash !== data.hash) {
    return {
      valid: false,
      error: "QR code verification failed - possible forgery",
    };
  }

  if (maxAgeHours !== undefined && data.timestamp) {
    const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (ageInHours > maxAgeHours) {
      return {
        valid: false,
        error: `QR code expired (${ageInHours.toFixed(1)} hours old, max: ${maxAgeHours} hours)`,
      };
    }
  }

  return { valid: true, data };
}
