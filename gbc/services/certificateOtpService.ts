import crypto from "crypto";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { ValidationError, RateLimitError } from "@/lib/api/errors";
import { sendGBCCertificateOtpEmail } from "@/gbc/utils/email";

// ADR-0008: GBC certificate access: verify publicly, download with an emailed code
// Keyed HMAC secret. In production CERTIFICATE_OTP_SECRET is required: falling
// back to an auth secret would let a leak of that secret forge download tokens,
// and a constant in the source would make them forgeable by anyone.
function getOtpSecret(): string {
  const dedicated = process.env.CERTIFICATE_OTP_SECRET;
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CERTIFICATE_OTP_SECRET is not set");
  }
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "twonode-cert-otp-dev-only-secret"
  );
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const EMAIL_REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAIL_REQUESTS = 5;
const IP_REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_IP_REQUESTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS_LOCKOUT = 10;
const DOWNLOAD_TOKEN_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

export const GENERIC_OTP_RESPONSE = {
  message:
    "If an issued certificate exists for this email address, a verification code has been sent.",
};

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

function computeHmac(code: string): string {
  return crypto.createHmac("sha256", getOtpSecret()).update(code).digest("hex");
}

function computeSha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

/** Check if email is currently locked out due to repeated failed OTP attempts */
async function isEmailLockedOut(normalizedEmail: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: {
      identifier: `cert_fail:${normalizedEmail}`,
      createdAt: { gt: since },
    },
  });
  return count >= MAX_FAILED_ATTEMPTS_LOCKOUT;
}

/** Record a failed attempt for lockout tracking across all codes */
async function recordFailedAttempt(normalizedEmail: string) {
  try {
    await prisma.loginAttempt.create({
      data: {
        identifier: `cert_fail:${normalizedEmail}`,
      },
    });
  } catch (err) {
    console.error("Failed to record cert fail attempt:", err);
  }
}

/** Record a request attempt for rate limiting */
async function checkAndConsumeRateLimit(
  identifier: string,
  windowMs: number,
  maxAttempts: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.loginAttempt.count({
    where: {
      identifier,
      createdAt: { gt: since },
    },
  });
  if (count >= maxAttempts) {
    return false;
  }
  await prisma.loginAttempt.create({ data: { identifier } });
  return true;
}

/**
 * Request a 6-digit OTP to download a certificate.
 * Anti-enumeration: returns identical message and timing whether or not a certificate exists.
 * Sends email ONLY to the stored address on the ticket.
 */
export async function requestCertificateOtp({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<{ message: string; nonce: string }> {
  const normalized = normalizeEmail(email);
  const nonce = crypto.randomBytes(16).toString("base64url");

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError({ email: "A valid email address is required" });
  }

  // 1. Check if email is locked out
  if (await isEmailLockedOut(normalized)) {
    return { ...GENERIC_OTP_RESPONSE, nonce };
  }

  // 2. Check and consume rate limits
  const ipAllowed = await checkAndConsumeRateLimit(
    `cert_req_ip:${ip}`,
    IP_REQUEST_WINDOW_MS,
    MAX_IP_REQUESTS
  );
  const emailAllowed = await checkAndConsumeRateLimit(
    `cert_req_email:${normalized}`,
    EMAIL_REQUEST_WINDOW_MS,
    MAX_EMAIL_REQUESTS
  );

  if (!ipAllowed || !emailAllowed) {
    // Return generic response without sending email so rate limits don't leak address status
    return { ...GENERIC_OTP_RESPONSE, nonce };
  }

  // 3. Find ticket(s) with certificateIssued = true
  const ticket = await prisma.gBCTicket.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      certificateIssued: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      ticketNumber: true,
    },
  });

  if (!ticket) {
    // Simulated delay + dummy computation so response time does not leak existence
    computeHmac("000000");
    await new Promise((r) => setTimeout(r, 120));
    return { ...GENERIC_OTP_RESPONSE, nonce };
  }

  // 4. Invalidate prior unused OTPs for this email
  await prisma.gBCCertificateOtp.updateMany({
    where: { email: normalized, usedAt: null },
    data: { usedAt: new Date() },
  });

  // 5. Generate code and store keyed HMAC + nonce hash
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHmac = computeHmac(code);
  const nonceHash = computeSha256(nonce);

  await prisma.gBCCertificateOtp.create({
    data: {
      email: normalized,
      codeHmac,
      nonceHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  // 6. Send email strictly to the stored address (never typed address).
  // Sent after the response so a slow mail call does not reveal that the
  // address has an issued certificate (the "no ticket" branch returns fast).
  const send = () =>
    sendGBCCertificateOtpEmail({
      to: ticket.email,
      name: ticket.name,
      code,
    }).catch((err) => console.error("Certificate OTP email failed:", err));
  try {
    after(send);
  } catch {
    // Outside a request scope (tests, scripts): send inline.
    await send();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] Certificate OTP for ${ticket.email}: ${code}`);
  }

  return { ...GENERIC_OTP_RESPONSE, nonce };
}

/**
 * Verify 6-digit OTP and issue a short-lived download token (valid for 2 minutes).
 * Atomic attempt counter and single-use claim prevents race condition attacks.
 */
export async function verifyCertificateOtpAndIssueToken({
  email,
  code,
  nonce,
}: {
  email: string;
  code: string;
  nonce: string;
}): Promise<{ token: string; ticketNumbers: string[] }> {
  const normalized = normalizeEmail(email);
  const cleanCode = (code || "").trim();

  if (!cleanCode || cleanCode.length !== 6) {
    throw new ValidationError({ code: "Code must be 6 digits" });
  }

  if (!nonce) {
    throw new ValidationError({
      code: "Invalid verification session. Please request a new code.",
    });
  }

  // 1. Check if email is locked out
  if (await isEmailLockedOut(normalized)) {
    throw new RateLimitError();
  }

  // 2. Find active OTP
  const activeOtp = await prisma.gBCCertificateOtp.findFirst({
    where: {
      email: normalized,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeOtp) {
    await recordFailedAttempt(normalized);
    throw new ValidationError({
      code: "Invalid or expired code. Please request a new code.",
    });
  }

  // 3. Check browser binding nonce
  const givenNonceHash = computeSha256(nonce);
  if (activeOtp.nonceHash !== givenNonceHash) {
    await recordFailedAttempt(normalized);
    throw new ValidationError({
      code: "Code is not valid for this browser session. Please request a new code.",
    });
  }

  // 4. Atomically reserve an attempt count BEFORE compare
  const reserved = await prisma.gBCCertificateOtp.updateMany({
    where: {
      id: activeOtp.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: activeOtp.maxAttempts },
    },
    data: { attempts: { increment: 1 } },
  });

  if (reserved.count === 0) {
    await recordFailedAttempt(normalized);
    throw new ValidationError({
      code: "Too many attempts for this code. Please request a new code.",
    });
  }

  // 5. Compare keyed HMAC in constant time
  const givenHmac = computeHmac(cleanCode);
  const storedHmacBuf = Buffer.from(activeOtp.codeHmac, "hex");
  const givenHmacBuf = Buffer.from(givenHmac, "hex");

  const match =
    storedHmacBuf.length === givenHmacBuf.length &&
    crypto.timingSafeEqual(storedHmacBuf, givenHmacBuf);

  if (!match) {
    await recordFailedAttempt(normalized);
    throw new ValidationError({ code: "Incorrect code. Please try again." });
  }

  // 6. Atomic single-use claim
  const claimed = await prisma.gBCCertificateOtp.updateMany({
    where: { id: activeOtp.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (claimed.count === 0) {
    throw new ValidationError({
      code: "Code has already been used. Please request a new code.",
    });
  }

  // 7. Find issued tickets for this email
  const tickets = await prisma.gBCTicket.findMany({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      certificateIssued: true,
    },
    select: { ticketNumber: true },
  });

  if (!tickets.length) {
    throw new ValidationError({
      code: "No issued certificate found for this email.",
    });
  }

  const ticketNumbers = tickets.map((t) => t.ticketNumber);

  // 8. Generate short-lived download token
  const tokenPayload = {
    ticketNumbers,
    exp: Date.now() + DOWNLOAD_TOKEN_EXPIRY_MS,
  };
  const token = createDownloadToken(tokenPayload);

  return { token, ticketNumbers };
}

/** Create signed download token with HMAC signature */
export function createDownloadToken(payload: {
  ticketNumbers: string[];
  exp: number;
}): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getOtpSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

/** Verify signed download token and check expiry */
export function verifyDownloadToken(token: string): {
  ticketNumbers: string[];
} {
  const parts = (token || "").split(".");
  if (parts.length !== 2) {
    throw new ValidationError({ token: "Invalid download token" });
  }

  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getOtpSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expSigBuf = Buffer.from(expectedSig);

  if (
    sigBuf.length !== expSigBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expSigBuf)
  ) {
    throw new ValidationError({ token: "Invalid download token signature" });
  }

  let parsed: { ticketNumbers: string[]; exp: number };
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    throw new ValidationError({ token: "Malformed download token payload" });
  }

  if (Date.now() > parsed.exp) {
    throw new ValidationError({
      token: "Download token expired. Please verify your code again.",
    });
  }

  return { ticketNumbers: parsed.ticketNumbers };
}
