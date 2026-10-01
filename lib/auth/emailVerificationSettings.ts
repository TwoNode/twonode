import { Platform } from "@/utils/platform";
import { getSettings as getGBCSettings } from "@/gbc/services/settingsService";
import { getSurfboardSettings } from "@/surfboard/services/settingsService";
import { getCurrentSettings as getRevaSettings } from "@/reva/services/settingsService";

export interface EmailVerificationConfig {
  enabled: boolean;
  method: "OTP" | "LINK";
  gracePeriodDays: number;
  enforcedSince: string;
}

const DEFAULT_CONFIG: EmailVerificationConfig = {
  enabled: false,
  method: "OTP",
  gracePeriodDays: 30,
  enforcedSince: "2026-10-01T00:00:00.000Z",
};

/**
 * Normalized getter for email verification settings across Surfboard, GBC, and REVA.
 * Ensures caller code never needs to deal with platform-specific storage shapes.
 */
export async function getEmailVerificationSettings(
  platform: Platform
): Promise<EmailVerificationConfig> {
  try {
    switch (platform) {
      case Platform.GBC: {
        const s = await getGBCSettings();
        if (s?.emailVerification) {
          return {
            enabled: Boolean(s.emailVerification.enabled),
            method: s.emailVerification.method || "OTP",
            gracePeriodDays: s.emailVerification.gracePeriodDays ?? 30,
            enforcedSince: s.emailVerification.enforcedSince || DEFAULT_CONFIG.enforcedSince,
          };
        }
        break;
      }
      case Platform.SURFBOARD: {
        const s = await getSurfboardSettings();
        if (s?.emailVerification) {
          return {
            enabled: Boolean(s.emailVerification.enabled),
            method: s.emailVerification.method || "OTP",
            gracePeriodDays: s.emailVerification.gracePeriodDays ?? 30,
            enforcedSince: s.emailVerification.enforcedSince || DEFAULT_CONFIG.enforcedSince,
          };
        }
        break;
      }
      case Platform.REVA: {
        const s = await getRevaSettings();
        if (s?.emailVerification) {
          return {
            enabled: Boolean(s.emailVerification.enabled),
            method: s.emailVerification.method || "OTP",
            gracePeriodDays: s.emailVerification.gracePeriodDays ?? 30,
            enforcedSince: s.emailVerification.enforcedSince || DEFAULT_CONFIG.enforcedSince,
          };
        }
        break;
      }
      default:
        return DEFAULT_CONFIG;
    }
  } catch (err) {
    console.error(`Failed to load email verification settings for ${platform}:`, err);
  }
  return DEFAULT_CONFIG;
}
