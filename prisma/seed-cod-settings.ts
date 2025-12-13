/**
 * Seed script for Certificate of Deposit Settings
 * Run with: npx tsx prisma/seed-cod-settings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lagos State LGA fee rates (₦ per square meter)
const LAGOS_LGA_FEES = {
  Agege: 8.5,
  "Ajeromi-Ifelodun": 9.0,
  Alimosho: 8.0,
  "Amuwo-Odofin": 10.0,
  Apapa: 12.0,
  Badagry: 6.0,
  Epe: 5.5,
  "Eti-Osa": 15.0,
  "Ibeju-Lekki": 12.0,
  "Ifako-Ijaiye": 8.0,
  Ikeja: 11.0,
  Ikorodu: 7.0,
  Kosofe: 8.5,
  "Lagos Island": 18.0,
  "Lagos Mainland": 10.0,
  Mushin: 9.0,
  Ojo: 7.5,
  "Oshodi-Isolo": 9.5,
  Shomolu: 8.5,
  Surulere: 10.5,
};

async function seedCODSettings() {
  try {
    console.log("🌱 Seeding Certificate of Deposit Settings...");

    // Check if settings already exist
    const existingSettings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (existingSettings) {
      console.log("⚠️  Settings already exist. Skipping seed.");
      console.log(
        "   To update, use the CoD Settings page in the admin dashboard."
      );
      return;
    }

    // Create initial settings
    const settings = await prisma.surfboardSettings.create({
      data: {
        settings: {
          lgaFees: LAGOS_LGA_FEES,
          systemChargePercent: 10,
        },
        previousSettings: {},
      },
    });

    console.log("✅ Successfully seeded CoD Settings:");
    console.log(`   - ${Object.keys(LAGOS_LGA_FEES).length} LGA fee rates`);
    console.log(`   - System charge: 10%`);
    console.log(`   - Settings ID: ${settings.id}`);
    console.log("\n📋 LGA Fee Rates:");
    Object.entries(LAGOS_LGA_FEES)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([lga, rate]) => {
        console.log(`   ${lga.padEnd(20)} ₦${rate}/m²`);
      });
  } catch (error) {
    console.error("❌ Error seeding CoD Settings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCODSettings()
  .then(() => {
    console.log("\n✨ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed failed:", error);
    process.exit(1);
  });
