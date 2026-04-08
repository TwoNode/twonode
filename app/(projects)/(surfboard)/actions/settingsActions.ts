"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";
import { logAuditAction, createChangeLog } from "../utils/auditLogger";
import { COD_FEES, type ZoneFeeRow } from "../utils/CoDFees";

interface SurfboardSettingsData {
  zoneFees: ZoneFeeRow[];
  systemChargePercent: number;
  codAcceptanceText: string;
  codPolicyContent: string;
  queryResponseFeePercent: number;
}

const DEFAULT_SETTINGS: SurfboardSettingsData = {
  zoneFees: COD_FEES,
  systemChargePercent: 10,
  codAcceptanceText: "I hereby affirm that the information provided in this submission is true, accurate, and complete to the best of my knowledge.",
  codPolicyContent: "Official CoD Submission Policy.\n\nBy clicking 'Submit', you agree to the terms and conditions outlined by the MDA.",
  queryResponseFeePercent: 10,
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
      // Return default settings with zone fees BY SAVING DEFAULT SETTINGS
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
        data: DEFAULT_SETTINGS,
      };
    }

    const settingsData = settings.settings as any;
    return {
      success: true,
      data: {
        zoneFees: settingsData.zoneFees || COD_FEES,
        systemChargePercent: settingsData.systemChargePercent || 10,
        codAcceptanceText: settingsData.codAcceptanceText || DEFAULT_SETTINGS.codAcceptanceText,
        codPolicyContent: settingsData.codPolicyContent || DEFAULT_SETTINGS.codPolicyContent,
        queryResponseFeePercent: settingsData.queryResponseFeePercent || DEFAULT_SETTINGS.queryResponseFeePercent,
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
 * Get zone fees (for use in codActions.ts)
 */
export async function getZoneFees(): Promise<ZoneFeeRow[]> {
  try {
    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      return COD_FEES;
    }

    const settingsData = settings.settings as any;
    return settingsData.zoneFees || COD_FEES;
  } catch (err) {
    console.error("Error fetching zone fees:", err);
    return COD_FEES;
  }
}

/**
 * Get system charge percentage
 */
export async function getSystemChargePercent(): Promise<number> {
  try {
    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      return 10; // Default 10%
    }

    const settingsData = settings.settings as any;
    return settingsData.systemChargePercent || 10;
  } catch (err) {
    console.error("Error fetching system charge:", err);
    return 10;
  }
}

/**
 * Public getter for Surveyor CoD Submission modal
 */
export async function getCodSubmissionSettings(): Promise<{
  codAcceptanceText: string;
  codPolicyContent: string;
  queryResponseFeePercent: number;
}> {
  try {
    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      return {
        codAcceptanceText: DEFAULT_SETTINGS.codAcceptanceText,
        codPolicyContent: DEFAULT_SETTINGS.codPolicyContent,
        queryResponseFeePercent: DEFAULT_SETTINGS.queryResponseFeePercent,
      };
    }

    const s = settings.settings as any;
    return {
      codAcceptanceText: s.codAcceptanceText || DEFAULT_SETTINGS.codAcceptanceText,
      codPolicyContent: s.codPolicyContent || DEFAULT_SETTINGS.codPolicyContent,
      queryResponseFeePercent: s.queryResponseFeePercent || DEFAULT_SETTINGS.queryResponseFeePercent,
    };
  } catch (error) {
    console.error("Error fetching CoD submission settings:", error);
    return {
      codAcceptanceText: DEFAULT_SETTINGS.codAcceptanceText,
      codPolicyContent: DEFAULT_SETTINGS.codPolicyContent,
      queryResponseFeePercent: DEFAULT_SETTINGS.queryResponseFeePercent,
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
    const newSettingsRecord = await prisma.surfboardSettings.create({
      data: {
        settings: newSettings as any,
        previousSettings: currentSettings?.settings || {},
        updatedById: user.id,
      },
    });

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: "UPDATE_SETTINGS",
      entity: "SurfboardSettings",
      entityId: newSettingsRecord.id,
      changes: createChangeLog({
        zoneFees: `${newSettings.zoneFees.length} fee ranges`,
        systemChargePercent: newSettings.systemChargePercent,
      }),
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
    const revertedSettings = await prisma.surfboardSettings.create({
      data: {
        settings: targetSettings.previousSettings ?? {},
        previousSettings: targetSettings.settings ?? {},
        updatedById: user.id,
      },
    });

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: "REVERT_SETTINGS",
      entity: "SurfboardSettings",
      entityId: revertedSettings.id,
      changes: createChangeLog({
        revertedFrom: settingsId,
        revertedTo: (targetSettings.previousSettings as any) || {},
      }),
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
