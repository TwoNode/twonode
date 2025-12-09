"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";

interface LGAFees {
  [lga: string]: number;
}

interface SurfboardSettingsData {
  lgaFees: LGAFees;
  systemChargePercent: number;
}

const DEFAULT_SETTINGS: SurfboardSettingsData = {
  lgaFees: {
    Agege: 90,
    "Ajeromi-Ifelodun": 60,
    Alimosho: 60,
    "Amuwo-Odofin": 60,
    Apapa: 60,
    Badagry: 70,
    Epe: 60,
    "Eti-Osa": 50,
    "Ibeju-Lekki": 60,
    "Ifako-Ijaiye": 90,
    Ikeja: 30,
    Ikorodu: 20,
    Kosofe: 60,
    "Lagos Island": 60,
    "Lagos Mainland": 60,
    Mushin: 20,
    Ojo: 60,
    "Oshodi-Isolo": 60,
    Shomolu: 30,
    Surulere: 60,
  },
  systemChargePercent: 10,
};

/**
 * Get current settings
 */
export async function getCurrentSettings(): Promise<
  ApiResult<SurfboardSettingsData>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      // Return default settings with Lagos LGA rates BY SAVING DEFAULT SETTINGS
      await prisma.surfboardSettings.create({
        data: {
          settings: DEFAULT_SETTINGS as any,
          previousSettings: {},
          updatedById: user.id,
        },
      });

      revalidatePath("/surf-restricted/dashboard/cod-settings");
      return {
        success: true,
        data: {
          lgaFees: {
            Agege: 90,
            "Ajeromi-Ifelodun": 60,
            Alimosho: 60,
            "Amuwo-Odofin": 60,
            Apapa: 60,
            Badagry: 70,
            Epe: 60,
            "Eti-Osa": 50,
            "Ibeju-Lekki": 60,
            "Ifako-Ijaiye": 90,
            Ikeja: 30,
            Ikorodu: 20,
            Kosofe: 60,
            "Lagos Island": 60,
            "Lagos Mainland": 60,
            Mushin: 20,
            Ojo: 60,
            "Oshodi-Isolo": 60,
            Shomolu: 30,
            Surulere: 60,
          },
          systemChargePercent: 10,
        },
      };
    }

    const settingsData = settings.settings as any;
    return {
      success: true,
      data: {
        lgaFees: settingsData.lgaFees || {},
        systemChargePercent: settingsData.systemChargePercent || 10,
      },
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getCurrentSettings"),
    };
  }
}

/**
 * Update settings (creates new record with previous settings backup)
 */
export async function updateSettings(
  newSettings: SurfboardSettingsData
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current settings to backup
    const currentSettings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    // Create new settings record
    await prisma.surfboardSettings.create({
      data: {
        settings: newSettings as any,
        previousSettings: currentSettings?.settings || {},
        updatedById: user.id,
      },
    });

    revalidatePath("/surf-restricted/dashboard/cod-settings");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating settings:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateSettings"),
    };
  }
}

/**
 * Get settings history
 */
export async function getSettingsHistory(): Promise<
  ApiResult<
    Array<{
      id: string;
      settings: SurfboardSettingsData;
      previousSettings: SurfboardSettingsData;
      updatedAt: Date;
      updatedBy: { firstName: string; lastName: string; email: string } | null;
    }>
  >
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const history = await prisma.surfboardSettings.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: history.map((h) => ({
        id: h.id,
        settings: h.settings as any,
        previousSettings: h.previousSettings as any,
        updatedAt: h.updatedAt,
        updatedBy: h.updatedBy,
      })),
    };
  } catch (error) {
    console.error("Error fetching settings history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getSettingsHistory"),
    };
  }
}

/**
 * Revert to previous settings
 */
export async function revertToPreviousSettings(
  settingsId: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const targetSettings = await prisma.surfboardSettings.findUnique({
      where: { id: settingsId },
    });

    if (!targetSettings) {
      return { success: false, error: "Settings not found" };
    }

    // Create new settings record with previous settings
    await prisma.surfboardSettings.create({
      data: {
        settings: targetSettings.previousSettings ?? {},
        previousSettings: targetSettings.settings ?? {},
        updatedById: user.id,
      },
    });

    revalidatePath("/surf-restricted/dashboard/cod-settings");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error reverting settings:", error);
    return {
      success: false,
      error: handlePrismaError(error, "revertToPreviousSettings"),
    };
  }
}
