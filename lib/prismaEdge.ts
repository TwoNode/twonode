import { PrismaClient } from "../prisma/generated";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * Edge-Runtime-safe Prisma client, for the handful of call sites that need
 * a real DB query from code Next.js/Netlify run outside Node (proxy.ts's
 * middleware). Prisma Accelerate's connection protocol works over plain
 * fetch, unlike the regular client's native query engine binary, which
 * Netlify's Edge Runtime can't execute.
 *
 * Requires a real Accelerate connection string (starts with "prisma://"),
 * from a Prisma Data Platform project — https://console.prisma.io — set as
 * PRISMA_ACCELERATE_URL. This is a separate, additional service from the
 * regular DATABASE_URL Postgres connection lib/prisma.ts uses directly;
 * nothing here is wired up or testable until that's provisioned.
 */
type EdgeClient = ReturnType<typeof buildEdgeClient>;

declare global {
  // eslint-disable-next-line no-var
  var prismaEdge: EdgeClient | undefined;
}

function buildEdgeClient() {
  const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
  if (!accelerateUrl) {
    throw new Error(
      "PRISMA_ACCELERATE_URL is not set. lib/prismaEdge.ts needs a Prisma " +
        "Accelerate connection string (from https://console.prisma.io) to " +
        "run queries from Edge Runtime code — see this file's own comment."
    );
  }
  return new PrismaClient({ datasourceUrl: accelerateUrl }).$extends(
    withAccelerate()
  );
}

// Deliberately lazy: this file is imported unconditionally by middleware for
// every platform, but only Surfboard dashboard routes ever actually need a
// query. Throwing at import time (before PRISMA_ACCELERATE_URL exists) would
// break every platform's auth, not just Surfboard's subscription check.
function getPrismaEdge(): EdgeClient {
  if (!globalThis.prismaEdge) {
    globalThis.prismaEdge = buildEdgeClient();
  }
  return globalThis.prismaEdge;
}

export default getPrismaEdge;
