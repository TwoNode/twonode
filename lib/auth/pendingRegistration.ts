import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { ConflictError, ValidationError } from "@/lib/api/errors";
import { sendEmailVerificationOtp, sendVerificationEmail } from "@/utils/email";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";
import {
  findUserByEmail,
  createNativeUser,
  type NativeAuthUser,
} from "@/lib/auth/userLookup";
import { getSiteUrl } from "@/lib/siteUrl";

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

function secretMatches(storedHash: string, secret: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashSecret(secret), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
    await sendEmailVerificationOtp({
      to: row.email,
      firstName: row.firstName,
      code: secret,
      platform,
    });
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[dev] registration OTP for ${row.email} (${platform}): ${secret}`
      );
    }
    return;
  }

  const siteUrl = getSiteUrl();
  // Both the opaque row id and the raw token travel in the link — a fresh
  // page load from an email client has no prior client state to carry
  // pendingRegistrationId in, unlike the OTP step which gets it from the
  // send-otp response already sitting in the browser.
  const verifyUrl = `${siteUrl}${registerVerifyPath(platform)}?pid=${row.id}&token=${secret}`;
  await sendVerificationEmail({
    to: row.email,
    firstName: row.firstName,
    verifyUrl,
    platform,
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[dev] registration verify link for ${row.email} (${platform}): ${verifyUrl}`
    );
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
  const expiresAt = new Date(
    Date.now() + (method === "OTP" ? OTP_EXPIRY_MS : LINK_EXPIRY_MS)
  );

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
  const row = await prisma.pendingRegistration.findUnique({
    where: { id: pendingRegistrationId },
  });
  // Enumeration-safe: a missing/foreign/used row returns the same success
  // shape as a real resend — the route layer doesn't distinguish either.
  if (!row || row.platform !== platform || row.usedAt) return;

  // Reuses the method the row already committed to at issue time, not
  // whatever the platform's settings say right now — a resend shouldn't
  // silently switch delivery methods mid-flight if an admin changes the
  // setting between the original send and this resend.
  const method = row.method === "LINK" ? "LINK" : "OTP";
  const secret = method === "OTP" ? generateOtpCode() : generateLinkToken();
  const expiresAt = new Date(
    Date.now() + (method === "OTP" ? OTP_EXPIRY_MS : LINK_EXPIRY_MS)
  );

  await prisma.pendingRegistration.update({
    where: { id: row.id },
    data: { codeHash: hashSecret(secret), attempts: 0, expiresAt },
  });

  await sendPendingRegistrationSecret(platform, method, row, secret);
}

const EXPIRED_MESSAGE = "This registration has expired — please start over";

/**
 * Verifies the OTP/link token and creates the account in one step — there
 * is no separate "mark this pending registration verified" call a client
 * could invoke and then walk away from with a verified-but-uncommitted row.
 *
 * `password` must be the password the registration was started with. The
 * emailed secret proves the address is the caller's; the password proves the
 * caller is also the person who chose it. Without it, anyone could (re)submit
 * a victim's address with a password they know, and the victim — entering the
 * code from the newest email — would create an account the attacker can log
 * into.
 */
export async function completePendingRegistration(
  platform: Platform,
  pendingRegistrationId: string,
  secret: string,
  password: string
): Promise<NativeAuthUser> {
  const cleanSecret = (secret || "").trim();
  // Length check is just a cheap pre-DB sanity check — a 6-digit OTP and a
  // 64-char hex link token both satisfy it; the real check is the hash
  // comparison below, which doesn't care which kind of secret this is.
  if (cleanSecret.length < 6) {
    throw new ValidationError({ code: "Invalid verification code" });
  }

  const row = await prisma.pendingRegistration.findUnique({
    where: { id: pendingRegistrationId },
  });
  if (!row || row.platform !== platform || row.expiresAt < new Date()) {
    throw new ValidationError({ code: EXPIRED_MESSAGE });
  }
  const via = row.method === "LINK" ? "LINK" : "OTP";

  // Idempotent retry window: if the row was completed within the last 30 seconds
  // (e.g. a double-click or React StrictMode in dev) by someone presenting the
  // same secret AND password, return the created user rather than failing.
  if (row.usedAt) {
    const isRecent = Date.now() - row.usedAt.getTime() < 30 * 1000;
    if (
      isRecent &&
      secretMatches(row.codeHash, cleanSecret) &&
      (await bcrypt.compare(password, row.passwordHash))
    ) {
      const existing = await findUserByEmail(platform, row.email);
      if (existing) {
        return { ...existing, emailVerified: true, emailVerifiedVia: via };
      }
    }
    throw new ValidationError({ code: EXPIRED_MESSAGE });
  }

  // Reserve an attempt atomically BEFORE comparing anything. A read-then-
  // increment cap lets a burst of parallel guesses all see the same low
  // count; this conditional update admits exactly MAX_ATTEMPTS of them.
  const reserved = await prisma.pendingRegistration.updateMany({
    where: { id: row.id, usedAt: null, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) {
    const fresh = await prisma.pendingRegistration.findUnique({
      where: { id: row.id },
    });
    throw new ValidationError({
      code:
        fresh && !fresh.usedAt && fresh.attempts >= MAX_ATTEMPTS
          ? "Too many attempts — please request a new code"
          : EXPIRED_MESSAGE,
    });
  }

  if (!secretMatches(row.codeHash, cleanSecret)) {
    throw new ValidationError({ code: "Incorrect or expired code" });
  }

  if (!(await bcrypt.compare(password, row.passwordHash))) {
    throw new ValidationError({
      password: "That isn't the password this registration was started with",
    });
  }

  // Claim the row and create the account in ONE transaction. The claim
  // (usedAt: null -> now) is the concurrency guard: a simultaneous second
  // completion blocks on the row lock until this commits, then matches
  // nothing, and falls through to the idempotent lookup below — by which
  // point the account this transaction created is committed and visible.
  // If account creation fails, the claim rolls back with it, so the user can
  // retry instead of being left with a consumed, account-less registration.
  let user: NativeAuthUser | null = null;
  try {
    user = await prisma.$transaction(async (tx) => {
      const claim = await tx.pendingRegistration.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) return null;
      return createNativeUser(
        platform,
        {
          email: row.email,
          passwordHash: row.passwordHash,
          firstName: row.firstName,
          lastName: row.lastName,
          emailVerifiedVia: via,
        },
        tx
      );
    });
  } catch (err) {
    // Someone registered this address between send-otp and now.
    if ((err as { code?: string })?.code === "P2002") {
      await prisma.pendingRegistration.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      throw new ConflictError("Email address is already registered");
    }
    throw err;
  }

  if (user) {
    return { ...user, emailVerified: true, emailVerifiedVia: via };
  }

  const existing = await findUserByEmail(platform, row.email);
  if (existing) {
    return { ...existing, emailVerified: true, emailVerifiedVia: via };
  }
  throw new ValidationError({ code: EXPIRED_MESSAGE });
}
