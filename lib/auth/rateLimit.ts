import prisma from "@/lib/prisma";

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

export type RateLimitOptions = { max?: number; windowMs?: number };

export async function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions = {}
): Promise<boolean> {
  const since = new Date(Date.now() - (opts.windowMs ?? WINDOW_MS));
  const count = await prisma.loginAttempt.count({
    where: { identifier, createdAt: { gt: since } },
  });
  return count < (opts.max ?? MAX_ATTEMPTS);
}

/**
 * Records the attempt FIRST, then checks the window count. checkRateLimit +
 * recordAttempt (check, do the work, record only on failure) leaves two
 * holes: a burst of parallel requests all read the same low count before
 * any of them records, and successful requests are never counted at all.
 * Use this for anything that costs something (sends email, hashes a
 * password) or can be guessed at in parallel.
 */
export async function consumeRateLimit(
  identifier: string,
  userId?: string,
  opts: RateLimitOptions = {}
): Promise<boolean> {
  await prisma.loginAttempt.create({ data: { identifier, userId } });
  const since = new Date(Date.now() - (opts.windowMs ?? WINDOW_MS));
  const count = await prisma.loginAttempt.count({
    where: { identifier, createdAt: { gt: since } },
  });
  return count <= (opts.max ?? MAX_ATTEMPTS);
}

export async function recordAttempt(identifier: string, userId?: string) {
  await prisma.loginAttempt.create({ data: { identifier, userId } });
}

export function getClientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  // On Vercel the platform sets x-vercel-forwarded-for / x-real-ip itself and
  // overwrites anything the caller sends, so prefer them. x-forwarded-for is the
  // fallback; its first value is client-controlled anywhere that is not behind a
  // proxy that rewrites it, so it must not be relied on outside Vercel.
  const raw =
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for") ??
    "127.0.0.1";
  return raw.split(",")[0].trim() || "127.0.0.1";
}
