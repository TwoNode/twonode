import { PrismaClient } from "../prisma/generated";

declare global {
  // Allow global prisma reuse in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Add connection pool configuration to the database URL
// Applied in all environments since dev also connects to remote AWS RDS
const databaseUrl = process.env.DATABASE_URL;
const poolParams = databaseUrl?.includes("?")
  ? "&connection_limit=10&pool_timeout=30"
  : "?connection_limit=10&pool_timeout=30";
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

// In development, enable HMR by storing the Prisma instance in globalThis
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
