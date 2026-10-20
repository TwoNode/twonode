import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { ValidationError } from "@/lib/api/errors";
import { sendEmailVerificationOtp } from "@/utils/email";
import { markEmailVerified } from "@/lib/auth/userLookup";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const NO_ACTIVE_CODE_MESSAGE =
  "No active verification code found — please request a new code";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Too many attempts — please request a new code";

/** Why a code was turned down, for a client that wants to word each case itself. */
export type OtpRejection =
  "MALFORMED" | "NO_ACTIVE_CODE" | "TOO_MANY_ATTEMPTS" | "INCORRECT";

/**
 * A ValidationError (same status, code and `details` as before, so the
 * website's screens see no difference) that also says which way the code was
 * turned down. The mobile route maps `reason` to a stable code; matching on
 * the English message would break the day a message is reworded.
 */
export class OtpRejectedError extends ValidationError {
  readonly reason: OtpRejection;
  constructor(reason: OtpRejection, message: string) {
    super({ code: message });
    this.reason = reason;
  }
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Issues a fresh 6-digit numeric OTP and emails it.
 * Invalidates any prior unused OTP for this user on this platform.
 */
export async function issueAndSendVerificationOtp(
  platform: Platform,
  user: { id: string; email: string; firstName: string | null }
): Promise<void> {
  // Invalidate any outstanding unused codes for this account+platform
  await prisma.emailVerificationOtp.updateMany({
    where: { userId: user.id, platform, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  await prisma.emailVerificationOtp.create({
    data: {
      userId: user.id,
      platform,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  });

  await sendEmailVerificationOtp({
    to: user.email,
    firstName: user.firstName ?? "",
    code,
    platform,
  });

  // Local/dev convenience only — SMTP creds aren't always configured in
  // dev, and the raw code is never persisted anywhere (only its sha256 hash is).
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[dev] verification OTP for ${user.email} (${platform}): ${code}`
    );
  }
}

/** Constant-time comparison of two sha256 hex digests. */
function hashesMatch(storedHash: string, code: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashCode(code), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verifies a 6-digit OTP code submitted by a user.
 * Capped at MAX_ATTEMPTS (5) wrong attempts per code.
 * On success, marks the code used and sets emailVerified = true (via "OTP").
 *
 * Concurrency: the attempt is reserved with a conditional `updateMany`
 * BEFORE the code is compared, and the success path claims the row the same
 * way (`usedAt: null -> now`). A read-then-increment cap lets a burst of
 * parallel guesses all read the same low count and all be compared — a
 * 6-digit code has only a million values, so the cap is the real defence.
 * Here the database admits exactly MAX_ATTEMPTS comparisons per code, and
 * only one request can consume a correct code.
 */
export async function verifyEmailOtp(
  platform: Platform,
  userId: string,
  code: string
): Promise<boolean> {
  const cleanCode = (code || "").trim();
  if (!cleanCode || cleanCode.length !== 6) {
    throw new OtpRejectedError("MALFORMED", "Code must be 6 digits");
  }

  const otp = await prisma.emailVerificationOtp.findFirst({
    where: {
      userId,
      platform,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new OtpRejectedError("NO_ACTIVE_CODE", NO_ACTIVE_CODE_MESSAGE);
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new OtpRejectedError("TOO_MANY_ATTEMPTS", TOO_MANY_ATTEMPTS_MESSAGE);
  }

  const reserved = await prisma.emailVerificationOtp.updateMany({
    where: {
      id: otp.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) {
    // Lost a race: the cap was reached, or the code was used or expired,
    // between the read above and this write.
    const fresh = await prisma.emailVerificationOtp.findUnique({
      where: { id: otp.id },
    });
    throw fresh && !fresh.usedAt && fresh.attempts >= MAX_ATTEMPTS
      ? new OtpRejectedError("TOO_MANY_ATTEMPTS", TOO_MANY_ATTEMPTS_MESSAGE)
      : new OtpRejectedError("NO_ACTIVE_CODE", NO_ACTIVE_CODE_MESSAGE);
  }

  if (!hashesMatch(otp.codeHash, cleanCode)) {
    throw new OtpRejectedError("INCORRECT", "Incorrect code");
  }

  const claimed = await prisma.emailVerificationOtp.updateMany({
    where: { id: otp.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) {
    // A simultaneous request with the same (correct) code consumed it first.
    throw new OtpRejectedError("NO_ACTIVE_CODE", NO_ACTIVE_CODE_MESSAGE);
  }

  await markEmailVerified(platform, userId, "OTP");

  return true;
}
