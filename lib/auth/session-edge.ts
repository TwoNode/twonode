import { Platform } from "@/utils/platform";
import { verifyToken, type JWTPayload } from "@/lib/auth/jwt";
import { getAccessTokenCookie } from "@/lib/auth/cookies";

/**
 * Cookie read + JWT verify only — no Prisma import anywhere in this file's
 * dependency graph, deliberately, so it's safe to import from Edge Runtime
 * code (proxy.ts). lib/auth/session.ts re-exports this same function for
 * Node-runtime callers, but proxy.ts must import it from here directly:
 * importing the re-export from session.ts would still pull that file's own
 * module-scope `import prisma from "@/lib/prisma"` into the bundle, since a
 * module's top-level side effects (like Prisma Client instantiation) run on
 * import regardless of which named export is actually used.
 */
export async function getServerSession(
  platform: Platform
): Promise<JWTPayload | null> {
  const token = await getAccessTokenCookie(platform);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.platform !== platform) return null;
  return payload;
}
