import { headers } from "next/headers";

/**
 * The token in an `Authorization: Bearer <token>` header, or null when there
 * is no such header. Native apps authenticate this way because they have no
 * browser cookie jar.
 */
export function extractBearerToken(headerBag: {
  get(name: string): string | null;
}): string | null {
  const raw = headerBag.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}

/**
 * The bearer token of the request currently being handled, read from
 * next/headers. Null outside a request scope (build time, some tests), where
 * headers() throws.
 */
export async function getRequestBearerToken(): Promise<string | null> {
  try {
    return extractBearerToken(await headers());
  } catch {
    return null;
  }
}
