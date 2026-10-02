import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { ValidationError } from "@/lib/api/errors";
import { sendEmailVerificationOtp } from "@/utils/email";
import { markEmailVerified } from "@/lib/auth/userLookup";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

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

/**
 * Verifies a 6-digit OTP code submitted by a user.
 * Capped at MAX_ATTEMPTS (5) wrong attempts per code.
 * On success, marks the code used and sets emailVerified = true (via "OTP").
 */
export async function verifyEmailOtp(
  platform: Platform,
  userId: string,
  code: string
): Promise<boolean> {
  const cleanCode = (code || "").trim();
  if (!cleanCode || cleanCode.length !== 6) {
    throw new ValidationError({ code: "Code must be 6 digits" });
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
    throw new ValidationError({
      code: "No active verification code found — please request a new code",
    });
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ValidationError({
      code: "Too many attempts — please request a new code",
    });
  }

  if (otp.codeHash !== hashCode(cleanCode)) {
    await prisma.emailVerificationOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ValidationError({ code: "Incorrect code" });
  }

  await prisma.emailVerificationOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  await markEmailVerified(platform, userId, "OTP");

  return true;
}
