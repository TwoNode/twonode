const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const readline = require("readline");
const path = require("path");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configuration
const config = {
  // Set to true to actually execute the migration
  // Set to false to do a dry run (default)
  execute: process.argv.includes("--execute"),

  // Path to the migration SQL file
  migrationPath: path.join(
    __dirname,
    "../prisma/migrations/20240802_add_user_profile_fields/migration.sql"
  ),

  // Database URL - will be read from environment variables
  databaseUrl: process.env.DATABASE_URL,
};

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Function to prompt for confirmation
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Main function
async function main() {
  try {
    console.log("=== Database Migration Tool ===");
    console.log(`Environment: ${isProduction ? "PRODUCTION" : "development"}`);
    console.log(
      "Migration to apply: Add user profile fields to SurfboardUser table\n"
    );

    // Check if database URL is set
    if (!config.databaseUrl) {
      console.error("Error: DATABASE_URL environment variable is not set");
      process.exit(1);
    }

    // Show the migration SQL
    console.log("The following SQL will be executed:");
    console.log("----------------------------------------");
    const migrationSql = require("fs").readFileSync(
      config.migrationPath,
      "utf8"
    );
    console.log(migrationSql);
    console.log("----------------------------------------\n");

    // In production, always require explicit confirmation
    if (isProduction && !config.execute) {
      console.log("WARNING: This is a production environment.");
      console.log(
        "To actually execute this migration, run with --execute flag."
      );
      process.exit(0);
    }

    // Ask for confirmation
    const confirmed = await prompt(
      "Do you want to apply this migration? (y/n) "
    );
    if (!confirmed) {
      console.log("Migration cancelled");
      process.exit(0);
    }

    console.log("\nApplying migration...");

    // Create a Prisma client
    const prisma = new PrismaClient();

    try {
      // Start a transaction
      await prisma.$transaction(async (tx) => {
        // Execute the migration SQL
        await tx.$executeRawUnsafe(migrationSql);
        console.log("Migration applied successfully!");
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
