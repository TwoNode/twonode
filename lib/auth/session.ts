import { Platform } from "@/utils/platform";
import { verifyToken, JWTPayload } from "@/lib/auth/jwt";
import { getAccessTokenCookie } from "@/lib/auth/cookies";

export async function getServerSession(
  platform: Platform
): Promise<JWTPayload | null> {
  const token = await getAccessTokenCookie(platform);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.platform !== platform) return null;
  return payload;
}
