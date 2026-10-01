import { Platform } from "@/utils/platform";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";

/**
 * Computes whether an unverified user must be blocked right now, based on
 * platform settings, enforcement activation date, and grandfathering grace period.
 *
 * Rules:
 * 1. If enforcement is disabled (!config.enabled) -> false
 * 2. If user is already verified (user.emailVerified) -> false
 * 3. If user registered after enforcement began (user.createdAt >= enforcedSince) -> true
 * 4. If user was grandfathered (user.createdAt < enforcedSince):
 *    - Has the grace period expired? (now >= enforcedSince + gracePeriodDays) -> true
 *    - Still inside grace period -> false (nag banner only, do not block)
 */
export async function computeMustVerifyNow(
  platform: Platform,
  user: { emailVerified: boolean; createdAt: Date }
): Promise<boolean> {
  const config = await getEmailVerificationSettings(platform);
  if (!config.enabled || user.emailVerified) {
    return false;
  }

  const enforcedSince = new Date(config.enforcedSince);
  if (isNaN(enforcedSince.getTime())) {
    return false;
  }

  // Account created after enforcement started: must verify immediately
  if (user.createdAt.getTime() >= enforcedSince.getTime()) {
    return true;
  }

  // Grandfathered account: check if grace period window has passed
  const gracePeriodDays = config.gracePeriodDays ?? 30;
  const graceEndsAt = new Date(enforcedSince.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  return Date.now() >= graceEndsAt.getTime();
}

/**
 * Returns the ISO timestamp when the verification grace period ends for a grandfathered user.
 * Returns null if verification is not enabled, user is already verified, or user is not in grace.
 */
export async function computeVerificationGraceEndsAt(
  platform: Platform,
  user: { emailVerified: boolean; createdAt: Date }
): Promise<string | null> {
  const config = await getEmailVerificationSettings(platform);
  if (!config.enabled || user.emailVerified) {
    return null;
  }

  const enforcedSince = new Date(config.enforcedSince);
  if (isNaN(enforcedSince.getTime())) {
    return null;
  }

  // New accounts don't get a grace period
  if (user.createdAt.getTime() >= enforcedSince.getTime()) {
    return null;
  }

  const gracePeriodDays = config.gracePeriodDays ?? 30;
  const graceEndsAt = new Date(enforcedSince.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  // If already expired, grace period is over
  if (Date.now() >= graceEndsAt.getTime()) {
    return null;
  }

  return graceEndsAt.toISOString();
}
