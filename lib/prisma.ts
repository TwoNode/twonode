import { PrismaClient } from "../prisma/generated";

declare global {
  // Allow global prisma reuse in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Add connection pool configuration to the database URL
// Set connection_limit to 5 to prevent exhausting AWS RDS connection limits on serverless
const databaseUrl = process.env.DATABASE_URL;
const poolParams = databaseUrl?.includes("?")
  ? "&connection_limit=7&pool_timeout=30"
  : "?connection_limit=7&pool_timeout=30";
const connectionString = `${databaseUrl}${poolParams}`;

const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            // "query",
            "info",
            "warn",
            "error",
          ]
        : ["warn", "error"],
    datasourceUrl: connectionString,
  });

// Cache Prisma instance on globalThis in all environments so warm serverless lambdas reuse connections
globalThis.prisma = prisma;

export default prisma;
