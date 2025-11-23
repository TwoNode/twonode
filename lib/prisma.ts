import { PrismaClient } from "@prisma/client";

declare global {
  // Allow global prisma reuse in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

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
    // Prisma 7: Pass database URL directly to client
    datasourceUrl: process.env.DATABASE_URL,
  });

// In development, enable HMR by storing the Prisma instance in globalThis
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
export default prisma;

// // Add connection pool configuration to the database URL if in production
// const databaseUrl = process.env.DATABASE_URL;
// const connectionString =
//   process.env.NODE_ENV === "production"
//     ? `${databaseUrl}?connection_limit=20&pool_timeout=30`
//     : databaseUrl;

// const prisma =
//   globalThis.prisma ||
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? [
//             // "query",
//             "info",
//             "warn",
//             "error",
//           ]
//         : ["warn", "error"],
//     datasourceUrl: connectionString,
//   });

// export default prisma;
