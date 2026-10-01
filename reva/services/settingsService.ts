import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";

export interface RevaEmailVerificationSettings {
  enabled: boolean;
  method: "OTP" | "LINK";
  gracePeriodDays: number;
  enforcedSince: string;
}

export interface RevaSettingsData {
  emailVerification: RevaEmailVerificationSettings;
}

export const DEFAULT_REVA_SETTINGS: RevaSettingsData = {
  emailVerification: {
    enabled: false,
    method: "OTP",
    gracePeriodDays: 30,
    enforcedSince: "2026-10-01T00:00:00.000Z",
  },
};

function mergeSettings(dbSettings: any): RevaSettingsData {
  if (!dbSettings || typeof dbSettings !== "object") return { ...DEFAULT_REVA_SETTINGS };
  return {
    emailVerification: {
      ...DEFAULT_REVA_SETTINGS.emailVerification,
      ...(dbSettings.emailVerification || {}),
    },
  };
}

export async function getCurrentSettings(): Promise<RevaSettingsData> {
  const row = await prisma.revaSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row || !row.settings) {
    return DEFAULT_REVA_SETTINGS;
  }
  return mergeSettings(row.settings);
}

export async function updateSettings(
  newSettings: Partial<RevaSettingsData>,
  userId?: string
): Promise<RevaSettingsData> {
  const current = await getCurrentSettings();
  const merged: RevaSettingsData = {
    emailVerification: {
      ...current.emailVerification,
      ...(newSettings.emailVerification || {}),
    },
  };

  // Server is the sole authority for enforcedSince — never trust a
  // caller-supplied value, and only stamp it fresh on a genuine
  // false->true enable transition. Otherwise every account created
  // between this feature's deploy date and whenever a superadmin
  // actually enables it would wrongly get zero grace period (the static
  // default's hardcoded date, not the real enable moment).
  if (newSettings.emailVerification) {
    const wasEnabled = current.emailVerification.enabled === true;
    const nowEnabled = merged.emailVerification.enabled === true;
    merged.emailVerification.enforcedSince =
      !wasEnabled && nowEnabled
        ? new Date().toISOString()
        : current.emailVerification.enforcedSince;
  }

  const existing = await prisma.revaSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) {
    await prisma.revaSettings.update({
      where: { id: existing.id },
      data: {
        settings: merged as unknown as Prisma.InputJsonValue,
        updatedBy: userId,
      },
    });
  } else {
    await prisma.revaSettings.create({
      data: {
        settings: merged as unknown as Prisma.InputJsonValue,
        updatedBy: userId,
      },
    });
  }

  return merged;
}
