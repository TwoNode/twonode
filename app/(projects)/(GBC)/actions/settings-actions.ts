"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";
import { GBCSettingsData, defaultSettings } from "../utils/settings";

// Get the current user and check authorization
async function checkAuthorization(requireSuperAdmin = false) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", user: null };
  }

  const currentUser = await prisma.gBCUser.findUnique({
    where: { kindeId: user.id },
  });

  if (!currentUser) {
    return { success: false, error: "User not found", user: null };
  }

  if (currentUser.role === "USER") {
    return { success: false, error: "Not authorized", user: null };
  }

  if (requireSuperAdmin && currentUser.role !== "SUPERADMIN") {
    return {
      success: false,
      error: "Only Super Admins can perform this action",
      user: null,
    };
  }

  return { success: true, user: currentUser };
}

/**
 * Get all GBC settings
 * Returns the settings object, initializes with defaults if not found
 */
export async function getAllGBCSettings(): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  try {
    // Try to get the first (and should be only) settings record
    const settingsRecord = await prisma.gBCSettings.findFirst();

    if (!settingsRecord) {
      // Initialize with default settings if none exist
      const initialized = await initializeDefaultSettings();
      if (!initialized.success) {
        return { success: false, error: initialized.error };
      }
      return { success: true, data: defaultSettings };
    }

    const savedSettings = (settingsRecord.settings ||
      {}) as Partial<GBCSettingsData>;

    // Merge saved settings with defaults to ensure all fields exist
    const mergedSettings: GBCSettingsData = {
      event: { ...defaultSettings.event, ...(savedSettings.event || {}) },
      contact: { ...defaultSettings.contact, ...(savedSettings.contact || {}) },
      tickets: { ...defaultSettings.tickets, ...(savedSettings.tickets || {}) },
      notifications: {
        ...defaultSettings.notifications,
        ...(savedSettings.notifications || {}),
      },
      gallery: { ...defaultSettings.gallery, ...(savedSettings.gallery || {}) },
      system: { ...defaultSettings.system, ...(savedSettings.system || {}) },
      editions: savedSettings.editions ?? defaultSettings.editions,
    };

    return {
      success: true,
      data: mergedSettings,
    };
  } catch (error) {
    console.error("Get all settings error:", error);
    return {
      success: false,
      error: "Failed to fetch settings",
    };
  }
}

/**
 * Get a specific setting value by path (e.g., "event.name" or "tickets.earlyBirdPrice")
 */
export async function getGBCSetting(path: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const result = await getAllGBCSettings();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const keys = path.split(".");
    let value: any = result.data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return { success: false, error: `Setting not found: ${path}` };
      }
    }

    return { success: true, data: value };
  } catch (error) {
    console.error("Get setting error:", error);
    return {
      success: false,
      error: "Failed to fetch setting",
    };
  }
}

/**
 * Update the entire settings object
 */
export async function updateAllGBCSettings(
  settings: GBCSettingsData,
  auth?: {
    success: boolean;
    user?: any;
    error?: string;
  }
): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  try {
    if (!auth || !auth.success || !auth.user) {
      const auth = await checkAuthorization();
      if (!auth.success || !auth.user) {
        return { success: false, error: auth.error };
      }
    }

    // Get the first settings record or create if doesn't exist
    const existingSettings = await prisma.gBCSettings.findFirst();

    let updatedSettings;
    if (existingSettings) {
      // Save current settings as previous before updating
      updatedSettings = await prisma.gBCSettings.update({
        where: { id: existingSettings.id },
        data: {
          settings: settings as Prisma.InputJsonValue,
          previousSettings: existingSettings.settings as Prisma.InputJsonValue,
        },
      });
    } else {
      // First time initialization - no previous settings
      updatedSettings = await prisma.gBCSettings.create({
        data: {
          settings: settings as Prisma.InputJsonValue,
          previousSettings: Prisma.JsonNull as any,
        },
      });
    }

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: auth?.user?.id,
        action: "UPDATE_ALL_SETTINGS",
        entity: "GBCSettings",
        entityId: updatedSettings.id,
        changes: JSON.stringify(settings),
      },
    });

    revalidatePath("/gbc-restricted/settings");

    return {
      success: true,
      data: updatedSettings.settings as GBCSettingsData,
    };
  } catch (error) {
    console.error("Update all settings error:", error);
    return {
      success: false,
      error: "Failed to update settings",
    };
  }
}

/**
 * Update a specific section of settings (e.g., just "event" or "tickets")
 */
export async function updateGBCSettingsSection(
  section: keyof GBCSettingsData,
  data: any
): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization();
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    const currentSettings = await getAllGBCSettings();
    if (!currentSettings.success || !currentSettings.data) {
      return { success: false, error: currentSettings.error };
    }

    const updatedSettings = {
      ...currentSettings.data,
      [section]: data,
    };

    return await updateAllGBCSettings(updatedSettings, auth);
  } catch (error) {
    console.error("Update settings section error:", error);
    return {
      success: false,
      error: "Failed to update settings section",
    };
  }
}

/**
 * Update a single setting value by path (e.g., updateGBCSetting("event.name", "New Name"))
 */
export async function updateGBCSetting(
  path: string,
  value: any
): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization();
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    const currentSettings = await getAllGBCSettings();
    if (!currentSettings.success || !currentSettings.data) {
      return { success: false, error: currentSettings.error };
    }

    const keys = path.split(".");
    if (keys.length === 0) {
      return { success: false, error: "Invalid path" };
    }

    // Validate top-level section
    const topLevelKey = keys[0] as keyof GBCSettingsData;
    const validSections: (keyof GBCSettingsData)[] = [
      "event",
      "contact",
      "tickets",
      "notifications",
      "system",
      "gallery",
    ];

    if (!validSections.includes(topLevelKey)) {
      return {
        success: false,
        error: `Invalid settings section: ${topLevelKey}`,
      };
    }

    const updatedSettings = JSON.parse(JSON.stringify(currentSettings.data));
    let target: any = updatedSettings;

    // Navigate to the parent of the target property
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target)) {
        return { success: false, error: `Invalid path: ${path}` };
      }
      target = target[key];
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    if (!(lastKey in target)) {
      return { success: false, error: `Invalid path: ${path}` };
    }
    target[lastKey] = value;

    return await updateAllGBCSettings(updatedSettings, auth);
  } catch (error) {
    console.error("Update setting error:", error);
    return {
      success: false,
      error: "Failed to update setting",
    };
  }
}

/**
 * Update multiple settings at once using path-value pairs
 */
export async function updateMultipleGBCSettings(
  updates: Array<{ path: string; value: any }>
): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization();
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    const currentSettings = await getAllGBCSettings();
    if (!currentSettings.success || !currentSettings.data) {
      return { success: false, error: currentSettings.error };
    }
    const updatedSettings = JSON.parse(JSON.stringify(currentSettings.data));

    // Apply all updates
    for (const update of updates) {
      const keys = update.path.split(".");
      if (keys.length === 0) {
        return { success: false, error: "Invalid path" };
      }

      // Validate top-level section
      const topLevelKey = keys[0] as keyof GBCSettingsData;
      const validSections: (keyof GBCSettingsData)[] = [
        "event",
        "contact",
        "tickets",
        "notifications",
        "system",
        "gallery",
      ];

      if (!validSections.includes(topLevelKey)) {
        return {
          success: false,
          error: `Invalid settings section: ${topLevelKey}`,
        };
      }

      let target: any = updatedSettings;

      // Navigate to the parent of the target property
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in target)) {
          return { success: false, error: `Invalid path: ${update.path}` };
        }
        target = target[key];
      }

      // Set the value
      const lastKey = keys[keys.length - 1];
      if (!(lastKey in target)) {
        return { success: false, error: `Invalid path: ${update.path}` };
      }
      target[lastKey] = update.value;
    }

    return await updateAllGBCSettings(updatedSettings, auth);
  } catch (error) {
    console.error("Update multiple settings error:", error);
    return {
      success: false,
      error: "Failed to update settings",
    };
  }
}

/**
 * Initialize default settings
 */
export async function initializeDefaultSettings(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization();
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    // Check if settings already exist
    const existingSettings = await prisma.gBCSettings.findFirst();

    if (existingSettings) {
      return {
        success: true,
        message: "Settings already initialized",
      };
    }

    // Create settings with defaults
    const newSettings = await prisma.gBCSettings.create({
      data: {
        settings: defaultSettings as Prisma.InputJsonValue,
        previousSettings: Prisma.JsonNull as any,
      },
    });

    // Log the initialization
    await prisma.gBCAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "INITIALIZE_SETTINGS",
        entity: "GBCSettings",
        entityId: newSettings.id,
        changes: JSON.stringify({ action: "initialized_with_defaults" }),
      },
    });

    revalidatePath("/gbc-restricted/settings");

    return {
      success: true,
      message: "Successfully initialized settings with defaults",
    };
  } catch (error) {
    console.error("Error initializing settings:", error);
    return {
      success: false,
      error: "Failed to initialize settings",
    };
  }
}

/**
 * Reset settings to defaults (Super Admin only)
 */
export async function resetGBCSettingsToDefaults(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization(true); // Require Super Admin
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    const result = await updateAllGBCSettings(defaultSettings, auth);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log the reset
    await prisma.gBCAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "RESET_SETTINGS",
        entity: "GBCSettings",
        changes: JSON.stringify({ action: "reset_to_defaults" }),
      },
    });

    return {
      success: true,
      message: "Successfully reset settings to defaults",
    };
  } catch (error) {
    console.error("Error resetting settings:", error);
    return {
      success: false,
      error: "Failed to reset settings",
    };
  }
}

/**
 * Legacy compatibility function for bulk updates
 * Converts old key-value format to new path-value format
 */
export async function bulkUpdateSettings(
  settings: Array<{ key: string; value: string }>
): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  error?: string;
}> {
  // Convert old format to new format
  const updates = settings.map((s) => ({
    path: s.key.replace(/_/g, "."), // Convert snake_case to dot notation
    value: s.value,
  }));

  return updateMultipleGBCSettings(updates);
}

/**
 * Get previous settings (the state before the last update)
 */
export async function getPreviousGBCSettings(): Promise<{
  success: boolean;
  data?: GBCSettingsData | null;
  error?: string;
}> {
  try {
    const settingsRecord = await prisma.gBCSettings.findFirst();

    if (!settingsRecord) {
      return { success: false, error: "No settings found" };
    }

    if (!settingsRecord.previousSettings) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: settingsRecord.previousSettings as GBCSettingsData,
    };
  } catch (error) {
    console.error("Get previous settings error:", error);
    return {
      success: false,
      error: "Failed to fetch previous settings",
    };
  }
}

/**
 * Rollback to previous settings (Super Admin only)
 * This will restore the settings to the state before the last update
 */
export async function rollbackGBCSettings(): Promise<{
  success: boolean;
  data?: GBCSettingsData;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await checkAuthorization(true); // Require Super Admin
    if (!auth.success || !auth.user) {
      return { success: false, error: auth.error };
    }

    const previous = await getPreviousGBCSettings();
    if (!previous.success) {
      return { success: false, error: previous.error };
    }

    if (!previous.data) {
      return {
        success: false,
        error: "No previous settings available to rollback to",
      };
    }

    // Get current settings before rolling back
    const current = await getAllGBCSettings();
    if (!current.success || !current.data) {
      return { success: false, error: "Failed to get current settings" };
    }

    // Perform the rollback - update with previous settings
    const settingsRecord = await prisma.gBCSettings.findFirst();
    if (!settingsRecord) {
      return { success: false, error: "Settings record not found" };
    }

    const rolledBackSettings = await prisma.gBCSettings.update({
      where: { id: settingsRecord.id },
      data: {
        settings: previous.data as Prisma.InputJsonValue,
        previousSettings: current.data as Prisma.InputJsonValue,
      },
    });

    // Log the rollback action
    await prisma.gBCAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "ROLLBACK_SETTINGS",
        entity: "GBCSettings",
        entityId: rolledBackSettings.id,
        changes: JSON.stringify({
          action: "rolled_back_to_previous",
          rolledBackFrom: current.data,
          rolledBackTo: previous.data,
        }),
      },
    });

    revalidatePath("/gbc-restricted/settings");

    return {
      success: true,
      data: rolledBackSettings.settings as GBCSettingsData,
      message: "Successfully rolled back to previous settings",
    };
  } catch (error) {
    console.error("Rollback settings error:", error);
    return {
      success: false,
      error: "Failed to rollback settings",
    };
  }
}
