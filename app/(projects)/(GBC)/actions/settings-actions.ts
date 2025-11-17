"use server";

import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";

// Default settings to initialize
const defaultSettings = [
  // Event Configuration
  {
    key: "event_name",
    value: "Geospatial Builders Conference 2.0",
    category: "event",
  },
  { key: "event_date", value: "2025-03-15", category: "event" },
  { key: "event_time", value: "09:00", category: "event" },
  {
    key: "event_venue",
    value: "Eko Hotel & Suites, Lagos",
    category: "event",
  },
  {
    key: "event_theme",
    value: "Geospatial Capital: A Catalyst for Inclusive Growth",
    category: "event",
  },
  {
    key: "event_sub_theme",
    value: "Driving Transformation in Land Administration and Energy",
    category: "event",
  },
  {
    key: "event_description",
    value: "The premier platform for geospatial innovation in Nigeria",
    category: "event",
  },
  { key: "registration_opens", value: "2025-01-01", category: "event" },
  { key: "registration_closes", value: "2025-03-10", category: "event" },

  // Ticket Pricing
  { key: "ticket_early_bird_price", value: "100000", category: "tickets" },
  { key: "ticket_regular_price", value: "120000", category: "tickets" },
  { key: "ticket_company_price", value: "150000", category: "tickets" },
  { key: "ticket_vip_price", value: "200000", category: "tickets" },
  { key: "ticket_student_price", value: "50000", category: "tickets" },
  {
    key: "ticket_early_bird_deadline",
    value: "2025-02-28",
    category: "tickets",
  },
  { key: "ticket_max_capacity", value: "150", category: "tickets" },

  // Notification Settings
  {
    key: "email_ticket_confirmation",
    value: "true",
    category: "notifications",
  },
  {
    key: "email_event_reminder_7days",
    value: "true",
    category: "notifications",
  },
  {
    key: "email_event_reminder_1day",
    value: "true",
    category: "notifications",
  },
  {
    key: "email_admin_new_ticket",
    value: "true",
    category: "notifications",
  },
  {
    key: "email_checkin_confirmation",
    value: "false",
    category: "notifications",
  },
  {
    key: "sms_ticket_confirmation",
    value: "false",
    category: "notifications",
  },

  // System Settings
  { key: "maintenance_mode", value: "false", category: "system" },
  { key: "debug_mode", value: "false", category: "system" },
  { key: "automatic_backups", value: "true", category: "system" },
];

// export async function updateGBCSetting(key: string, value: string) {
//   try {
//     const { getUser } = getKindeServerSession();
//     const user = await getUser();

//     if (!user) {
//       return { success: false, error: "Not authenticated" };
//     }

//     // Check if user is admin
//     const currentUser = await prisma.gBCUser.findUnique({
//       where: { kindeId: user.id },
//     });

//     if (!currentUser || currentUser.role === "USER") {
//       return { success: false, error: "Not authorized" };
//     }

//     // Upsert setting (update if exists, create if doesn't)
//     const setting = await prisma.gBCSettings.upsert({
//       where: { key },
//       update: { value },
//       create: {
//         key,
//         value,
//         category: "general",
//       },
//     });

//     // Log the action
//     await prisma.gBCAuditLog.create({
//       data: {
//         userId: currentUser.id,
//         action: "UPDATE_SETTING",
//         entity: "GBCSettings",
//         entityId: setting.id,
//         changes: JSON.stringify({ key, value }),
//       },
//     });

//     revalidatePath("/admin/settings");

//     return { success: true, data: setting };
//   } catch (error) {
//     console.error("Error updating setting:", error);
//     return { success: false, error: "Failed to update setting" };
//   }
// }

// export async function getAllGBCSettings() {
//   try {
//     const { getUser } = getKindeServerSession();
//     const user = await getUser();

//     if (!user) {
//       return { success: false, error: "Not authenticated" };
//     }

//     const settings = await prisma.gBCSettings.findMany({
//       orderBy: {
//         category: "asc",
//       },
//     });

//     return {
//       success: true,
//       data: settings.map((s) => ({
//         ...s,
//         updatedAt: s.updatedAt.toISOString(),
//       })),
//     };
//   } catch (error) {
//     console.error("Error fetching settings:", error);
//     return { success: false, error: "Failed to fetch settings" };
//   }
// }

export async function bulkUpdateSettings(
  settings: Array<{ key: string; value: string }>
) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role === "USER") {
      return { success: false, error: "Not authorized" };
    }

    // Update all settings in a transaction
    const results = await Promise.all(
      settings.map((setting) =>
        prisma.gBCSettings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            key: setting.key,
            value: setting.value,
            category: "general",
          },
        })
      )
    );

    // Log the action
    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: "BULK_UPDATE_SETTINGS",
        entity: "GBCSettings",
        changes: JSON.stringify(settings),
      },
    });

    revalidatePath("/admin/settings");

    return { success: true, data: results };
  } catch (error) {
    console.error("Error bulk updating settings:", error);
    return { success: false, error: "Failed to bulk update settings" };
  }
}

export async function deleteSetting(key: string) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only Super Admins can delete settings" };
    }

    await prisma.gBCSettings.delete({
      where: { key },
    });

    await prisma.gBCAuditLog.create({
      data: {
        userId: currentUser.id,
        action: "DELETE_SETTING",
        entity: "GBCSettings",
        changes: JSON.stringify({ key }),
      },
    });

    revalidatePath("/admin/settings");

    return { success: true };
  } catch (error) {
    console.error("Error deleting setting:", error);
    return { success: false, error: "Failed to delete setting" };
  }
}

// Function to initialize default settings if they don't exist
export async function initializeDefaultSettings() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if user is admin
    const currentUser = await prisma.gBCUser.findUnique({
      where: { kindeId: user.id },
    });

    if (!currentUser || currentUser.role === "USER") {
      return { success: false, error: "Not authorized" };
    }

    // Get existing settings to avoid duplicates
    const existingSettings = await prisma.gBCSettings.findMany({
      where: {
        key: {
          in: defaultSettings.map((s) => s.key),
        },
      },
    });

    const existingKeys = existingSettings.map((s) => s.key);
    const settingsToCreate = defaultSettings.filter(
      (s) => !existingKeys.includes(s.key)
    );

    if (settingsToCreate.length === 0) {
      return {
        success: true,
        message: "All default settings already exist",
        created: 0,
      };
    }

    // Create all missing settings in a transaction
    const results = await prisma.$transaction(
      settingsToCreate.map((setting) =>
        prisma.gBCSettings.create({
          data: {
            key: setting.key,
            value: setting.value,
            category: setting.category,
          },
        })
      )
    );

    // Log the initialization
    if (results.length > 0) {
      await prisma.gBCAuditLog.create({
        data: {
          userId: currentUser.id,
          action: "INITIALIZE_SETTINGS",
          entity: "GBCSettings",
          changes: JSON.stringify({
            count: results.length,
            settings: results.map((r) => r.key),
          }),
        },
      });
    }

    revalidatePath("/admin/settings");

    return {
      success: true,
      message: `Successfully initialized ${results.length} settings`,
      created: results.length,
    };
  } catch (error) {
    console.error("Error initializing settings:", error);
    return {
      success: false,
      error: "Failed to initialize settings",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============ SETTINGS ============

export async function getGBCSetting(key: string) {
  try {
    const setting = await prisma.gBCSettings.findUnique({
      where: { key },
    });

    return { success: true, data: setting };
  } catch (error) {
    console.error("Get setting error:", error);
    return {
      success: false,
      error: "Failed to fetch setting",
    };
  }
}

export async function getAllGBCSettings() {
  try {
    let settings = await prisma.gBCSettings.findMany({
      orderBy: { key: "asc" },
    });

    // Check if any settings are missing and initialize them
    const missingSettings = defaultSettings.filter(
      (setting) => !settings?.some((s: any) => s.key === setting.key)
    );

    if (missingSettings.length > 0) {
      // In a real app, you would save these to the database
      await initializeDefaultSettings();

      settings = await prisma.gBCSettings.findMany({
        orderBy: { key: "asc" },
      });
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error("Get all settings error:", error);
    return {
      success: false,
      error: "Failed to fetch settings",
    };
  }
}

export async function updateGBCSetting(key: string, value: string) {
  try {
    const setting = await prisma.gBCSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    revalidatePath("/gbc2/restricted/settings");

    return { success: true, data: setting };
  } catch (error) {
    console.error("Update setting error:", error);
    return {
      success: false,
      error: "Failed to update setting",
    };
  }
}

export async function updateMultipleGBCSettings(
  settings: Array<{ key: string; value: string }>
) {
  try {
    await Promise.all(
      settings.map((setting) =>
        prisma.gBCSettings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
      )
    );

    revalidatePath("/gbc2/restricted/settings");

    return { success: true, message: "Settings updated successfully" };
  } catch (error) {
    console.error("Update multiple settings error:", error);
    return {
      success: false,
      error: "Failed to update settings",
    };
  }
}
