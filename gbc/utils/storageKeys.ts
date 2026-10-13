/**
 * Bucket keys for GBC files (ADR-0013). Kept apart from `aws-s3.ts`, which
 * needs the AWS environment variables at import time.
 *
 * - QR codes are private: `private/gbc/<edition>/qrcodes/…`, read through a
 *   signed link only.
 * - Everything else still goes to the old public `GBC2/<folder>/…` layout until
 *   the public images move to `public/gbc/<edition>/…`.
 */

const OLD_PUBLIC_PREFIX = "GBC2";

function safeSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned || "unknown";
}

export function gbcFileName(
  originalName: string,
  now: number = Date.now(),
  random: string = Math.random().toString(36).substring(2, 15)
): string {
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();
  return `${now}-${random}-${sanitizedName}`;
}

/** Key for a QR code: private, grouped by edition. */
export function gbcQrCodeKey(
  edition: string,
  ticketNumber: string,
  now?: number,
  random?: string
): string {
  return `private/gbc/${safeSegment(edition)}/qrcodes/${gbcFileName(
    `${ticketNumber}.png`,
    now,
    random
  )}`;
}

/** Key for the public GBC files that have not moved yet (gallery, speakers, logos). */
export function gbcPublicKey(
  folder: string | undefined,
  originalName: string,
  now?: number,
  random?: string
): string {
  const fileName = gbcFileName(originalName, now, random);
  return folder
    ? `${OLD_PUBLIC_PREFIX}/${folder}/${fileName}`
    : `${OLD_PUBLIC_PREFIX}/${fileName}`;
}

/** The stored key behind a ticket's QR code: the key column, else the key inside the old public URL. */
export function ticketQrKey(ticket: {
  qrCodeS3Key?: string | null;
  qrCode?: string | null;
}): string | null {
  if (ticket.qrCodeS3Key) return ticket.qrCodeS3Key;
  if (!ticket.qrCode) return null;
  try {
    const key = decodeURIComponent(new URL(ticket.qrCode).pathname.slice(1));
    return key.startsWith("GBC2/qrcodes/") || key.startsWith("private/gbc/")
      ? key
      : null;
  } catch {
    return null;
  }
}
