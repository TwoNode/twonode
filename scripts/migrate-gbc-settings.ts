/**
 * Migration script to convert GBCSettings from key-value format to JSON format
 *
 * Run this BEFORE updating the schema to the new format
 *
 * HISTORICAL — do not run. It predates settings being one row per edition
 * (gbc_settings.edition is now required and unique), so its INSERT no longer
 * matches the table. Kept only as a record of the old key-value -> JSON step.
 * Usage: npx tsx scripts/migrate-gbc-settings.ts
 */

import { PrismaClient } from "@/prisma/generated";

const prisma = new PrismaClient();

// Type for the old settings format
type OldSetting = {
  id: string;
  key: string;
  value: string;
  category: string | null;
};

// Type for the new settings format
type NewSettingsData = {
  event: {
    name: string;
    date: string;
    time: string;
    venue: string;
    theme: string;
    subTheme: string;
    description: string;
    registrationOpens: string;
    registrationCloses: string;
  };
  tickets: {
    earlyBirdPrice: number;
    regularPrice: number;
    companyPrice: number;
    vipPrice: number;
    studentPrice: number;
    earlyBirdDeadline: string;
    maxCapacity: number;
  };
  notifications: {
    emailTicketConfirmation: boolean;
    emailEventReminder7Days: boolean;
    emailEventReminder1Day: boolean;
    emailAdminNewTicket: boolean;
    emailCheckinConfirmation: boolean;
    smsTicketConfirmation: boolean;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    automaticBackups: boolean;
  };
};

// Default values for settings
const defaultSettings: NewSettingsData = {
  event: {
    name: "Geospatial Builders Conference 2.0",
    date: "2026-03-15",
    time: "09:00",
    venue: "Eko Hotel & Suites, Lagos",
    theme: "Geospatial Capital: A Catalyst for Inclusive Growth",
    subTheme: "Driving Transformation in Land Administration and Energy",
    description: "The premier platform for geospatial innovation in Nigeria",
    registrationOpens: "2026-01-01",
    registrationCloses: "2026-03-10",
  },
  tickets: {
    earlyBirdPrice: 100000,
    regularPrice: 120000,
    companyPrice: 250000,
    vipPrice: 200000,
    studentPrice: 20000,
    earlyBirdDeadline: "2026-02-28",
    maxCapacity: 150,
  },
  notifications: {
    emailTicketConfirmation: true,
    emailEventReminder7Days: true,
    emailEventReminder1Day: true,
    emailAdminNewTicket: true,
    emailCheckinConfirmation: false,
    smsTicketConfirmation: false,
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
    automaticBackups: true,
  },
};

// Map old key names to new nested structure
const keyMapping: Record<
  string,
  { path: string; type: "string" | "number" | "boolean" }
> = {
  event_name: { path: "event.name", type: "string" },
  event_date: { path: "event.date", type: "string" },
  event_time: { path: "event.time", type: "string" },
  event_venue: { path: "event.venue", type: "string" },
  event_theme: { path: "event.theme", type: "string" },
  event_sub_theme: { path: "event.subTheme", type: "string" },
  event_description: { path: "event.description", type: "string" },
  registration_opens: { path: "event.registrationOpens", type: "string" },
  registration_closes: { path: "event.registrationCloses", type: "string" },

  ticket_early_bird_price: { path: "tickets.earlyBirdPrice", type: "number" },
  ticket_regular_price: { path: "tickets.regularPrice", type: "number" },
  ticket_company_price: { path: "tickets.companyPrice", type: "number" },
  ticket_vip_price: { path: "tickets.vipPrice", type: "number" },
  ticket_student_price: { path: "tickets.studentPrice", type: "number" },
  ticket_early_bird_deadline: {
    path: "tickets.earlyBirdDeadline",
    type: "string",
  },
  ticket_max_capacity: { path: "tickets.maxCapacity", type: "number" },

  email_ticket_confirmation: {
    path: "notifications.emailTicketConfirmation",
    type: "boolean",
  },
  email_event_reminder_7days: {
    path: "notifications.emailEventReminder7Days",
    type: "boolean",
  },
  email_event_reminder_1day: {
    path: "notifications.emailEventReminder1Day",
    type: "boolean",
  },
  email_admin_new_ticket: {
    path: "notifications.emailAdminNewTicket",
    type: "boolean",
  },
  email_checkin_confirmation: {
    path: "notifications.emailCheckinConfirmation",
    type: "boolean",
  },
  sms_ticket_confirmation: {
    path: "notifications.smsTicketConfirmation",
    type: "boolean",
  },

  maintenance_mode: { path: "system.maintenanceMode", type: "boolean" },
  debug_mode: { path: "system.debugMode", type: "boolean" },
  automatic_backups: { path: "system.automaticBackups", type: "boolean" },
};

function convertValue(
  value: string,
  type: "string" | "number" | "boolean"
): any {
  switch (type) {
    case "number":
      return parseInt(value, 10);
    case "boolean":
      return value === "true" || value === "1";
    case "string":
    default:
      return value;
  }
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

async function migrateSettings() {
  console.log("Starting GBC Settings migration...\n");

  try {
    // Fetch all old settings
    const oldSettings = await prisma.$queryRaw<OldSetting[]>`
      SELECT id, key, value, category FROM gbc_settings
    `;

    console.log(`Found ${oldSettings.length} old settings to migrate`);

    if (oldSettings.length === 0) {
      console.log("No settings to migrate. Creating default settings...");
      // No old settings, we'll just use defaults
      return;
    }

    // Start with default settings and override with actual values
    const newSettings = JSON.parse(JSON.stringify(defaultSettings));

    // Convert old settings to new format
    for (const setting of oldSettings) {
      const mapping = keyMapping[setting.key];

      if (mapping) {
        const convertedValue = convertValue(setting.value, mapping.type);
        setNestedValue(newSettings, mapping.path, convertedValue);
        console.log(
          `✓ Migrated ${setting.key} -> ${mapping.path} = ${convertedValue}`
        );
      } else {
        console.log(`⚠ Skipped unknown key: ${setting.key}`);
      }
    }

    console.log("\n📝 Migration Summary:");
    console.log(JSON.stringify(newSettings, null, 2));

    // Backup old settings to a JSON file
    const fs = require("fs");
    const path = require("path");
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupPath = path.join(
      backupDir,
      `gbc-settings-backup-${timestamp}.json`
    );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          oldSettings,
          newSettings,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log(`\n💾 Backup saved to: ${backupPath}`);

    // Delete all old settings
    console.log("\n🗑️  Deleting old settings...");
    await prisma.$executeRaw`DELETE FROM gbc_settings`;
    console.log("✓ Old settings deleted");

    // Insert new settings (temporarily adding the columns to demonstrate)
    console.log("\n📥 Creating new settings record...");
    await prisma.$executeRaw`
      INSERT INTO gbc_settings (id, settings)
      VALUES (gen_random_uuid()::text, ${JSON.stringify(newSettings)}::jsonb)
    `;

    console.log("✓ New settings created");
    console.log("\n✅ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Update your Prisma schema to the new format");
    console.log("2. Run: npx prisma generate");
    console.log("3. Run: npx prisma db push");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateSettings();
