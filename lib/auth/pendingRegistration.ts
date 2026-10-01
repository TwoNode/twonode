import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { ConflictError, ValidationError } from "@/lib/api/errors";
import { sendEmailVerificationOtp, sendVerificationEmail } from "@/utils/email";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";
import { findUserByEmail, createNativeUser, markEmailVerified, type NativeAuthUser } from "@/lib/auth/userLookup";

/**
 * OTP-first registration: no User row — verified or not — exists until the
 * secret (OTP code or link token, per the platform's own admin-configured
 * `method`) sent here is confirmed. Everything the eventual account needs
 * lives on this PendingRegistration row, keyed by an opaque id the client
 * can't forge its way into: completePendingRegistration() reads
 * email/password/name from THIS row only, never from the completion
 * request body, so there's no field a tampered frontend could use to
 * attach a verified secret to a different, unverified email.
 *
 * `codeHash` holds sha256 of whichever secret was issued — a 6-digit OTP
 * or a long random link token. Completion doesn't care which: it just
 * hashes whatever string it's given and compares. Only issuance and
 * delivery differ by method.
 */

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes — matches EmailVerificationOtp
const LINK_EXPIRY_MS = 60 * 60 * 1000; // 1 hour — matches EmailVerificationToken
const MAX_ATTEMPTS = 5;

function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function generateLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function registerVerifyPath(platform: Platform): string {
  switch (platform) {
    case Platform.SURFBOARD:
      return "/surfboard/verify-email";
    case Platform.REVA:
      return "/reva/verify-email";
    case Platform.GBC:
      return "/gbc-restricted/verify-email";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function sendPendingRegistrationSecret(
  platform: Platform,
  method: "OTP" | "LINK",
  row: { id: string; email: string; firstName: string },
  secret: string
): Promise<void> {
  if (method === "OTP") {
    await sendEmailVerificationOtp({ to: row.email, firstName: row.firstName, code: secret, platform });
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] registration OTP for ${row.email} (${platform}): ${secret}`);
    }
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com";
  // Both the opaque row id and the raw token travel in the link — a fresh
  // page load from an email client has no prior client state to carry
  // pendingRegistrationId in, unlike the OTP step which gets it from the
  // send-otp response already sitting in the browser.
  const verifyUrl = `${siteUrl}${registerVerifyPath(platform)}?pid=${row.id}&token=${secret}`;
  await sendVerificationEmail({ to: row.email, firstName: row.firstName, verifyUrl, platform });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] registration verify link for ${row.email} (${platform}): ${verifyUrl}`);
  }
}

export async function issuePendingRegistration(
  platform: Platform,
  data: { email: string; password: string; firstName: string; lastName: string }
): Promise<{ pendingRegistrationId: string; method: "OTP" | "LINK" }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await findUserByEmail(platform, normalizedEmail);
  if (existing) {
    throw new ConflictError("Email address is already registered");
  }

  const { method } = await getEmailVerificationSettings(platform);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const secret = method === "OTP" ? generateOtpCode() : generateLinkToken();
  const expiresAt = new Date(Date.now() + (method === "OTP" ? OTP_EXPIRY_MS : LINK_EXPIRY_MS));

  const row = await prisma.pendingRegistration.upsert({
    where: { platform_email: { platform, email: normalizedEmail } },
    update: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      passwordHash,
      method,
      codeHash: hashSecret(secret),
      attempts: 0,
      expiresAt,
      usedAt: null,
    },
    create: {
      platform,
      email: normalizedEmail,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      passwordHash,
      method,
      codeHash: hashSecret(secret),
      expiresAt,
    },
  });

  await sendPendingRegistrationSecret(platform, method, row, secret);

  return { pendingRegistrationId: row.id, method };
}

export async function resendPendingRegistration(
  platform: Platform,
  pendingRegistrationId: string
): Promise<void> {
  const row = await prisma.pendingRegistration.findUnique({ where: { id: pendingRegistrationId } });
  // Enumeration-safe: a missing/foreign/used row returns the same success
  // shape as a real resend — the route layer doesn't distinguish either.
  if (!row || row.platform !== platform || row.usedAt) return;

  // Reuses the method the row already committed to at issue time, not
  // whatever the platform's settings say right now — a resend shouldn't
  // silently switch delivery methods mid-flight if an admin changes the
  // setting between the original send and this resend.
  const method = row.method === "LINK" ? "LINK" : "OTP";
  const secret = method === "OTP" ? generateOtpCode() : generateLinkToken();
  const expiresAt = new Date(Date.now() + (method === "OTP" ? OTP_EXPIRY_MS : LINK_EXPIRY_MS));

  await prisma.pendingRegistration.update({
    where: { id: row.id },
    data: { codeHash: hashSecret(secret), attempts: 0, expiresAt },
  });

  await sendPendingRegistrationSecret(platform, method, row, secret);
}

/**
 * Verifies the OTP/link token and creates the account in one step — there
 * is no separate "mark this pending registration verified" call a client
 * could invoke and then walk away from with a verified-but-uncommitted row.
 */
export async function completePendingRegistration(
  platform: Platform,
  pendingRegistrationId: string,
  secret: string
): Promise<NativeAuthUser> {
  const cleanSecret = (secret || "").trim();
  // Length check is just a cheap pre-DB sanity check — a 6-digit OTP and a
  // 64-char hex link token both satisfy it; the real check is the hash
  // comparison below, which doesn't care which kind of secret this is.
  if (cleanSecret.length < 6) {
    throw new ValidationError({ code: "Invalid verification code" });
  }

  const row = await prisma.pendingRegistration.findUnique({ where: { id: pendingRegistrationId } });
  if (!row || row.platform !== platform || row.expiresAt < new Date()) {
    throw new ValidationError({ code: "This registration has expired — please start over" });
  }

  // Idempotent retry window: if the row was completed within the last 30 seconds
  // (e.g. concurrent browser requests, double-clicks, or React StrictMode in dev),
  // and the secret matches, return the created user rather than failing.
  if (row.usedAt) {
    const isRecent = Date.now() - row.usedAt.getTime() < 30 * 1000;
    if (isRecent && row.codeHash === hashSecret(cleanSecret)) {
      const existing = await findUserByEmail(platform, row.email);
      if (existing) {
        const via = row.method === "LINK" ? "LINK" : "OTP";
        return { ...existing, emailVerified: true, emailVerifiedVia: via };
      }
    }
    throw new ValidationError({ code: "This registration has expired — please start over" });
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    throw new ValidationError({ code: "Too many attempts — please request a new code" });
  }

  if (row.codeHash !== hashSecret(cleanSecret)) {
    await prisma.pendingRegistration.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new ValidationError({ code: "Incorrect or expired code" });
  }

  // Re-check at completion time too — someone else could have registered
  // this email in the window between send-otp and a slow/retried complete.
  const existing = await findUserByEmail(platform, row.email);
  if (existing) {
    await prisma.pendingRegistration.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    throw new ConflictError("Email address is already registered");
  }

  const via = row.method === "LINK" ? "LINK" : "OTP";
  const user = await createNativeUser(platform, {
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
  });
  await markEmailVerified(platform, user.id, via);

  await prisma.pendingRegistration.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  return { ...user, emailVerified: true, emailVerifiedVia: via };
}
