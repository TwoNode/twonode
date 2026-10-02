import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { Platform } from "@/utils/platform";

const secretKey = process.env.JWT_SECRET;
if (!secretKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "CRITICAL: JWT_SECRET environment variable is not defined in production!"
  );
}

const JWT_SECRET = new TextEncoder().encode(
  secretKey ||
    "dev_twonodes_jwt_secret_key_2026_only_for_local_testing_environment"
);

export interface JWTPayload {
  sub: string;
  role: string;
  platform: Platform;
  emailVerified: boolean;
  mustVerifyNow: boolean;
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as Record<string, unknown>;
    return {
      sub: p.sub as string,
      role: p.role as string,
      platform: p.platform as Platform,
      emailVerified: Boolean(p.emailVerified),
      mustVerifyNow: Boolean(p.mustVerifyNow),
    };
  } catch {
    return null;
  }
}

/**
 * Decodes the access token payload without verifying expiration.
 * Useful for logout or cleanup handlers when the 15-minute token has expired,
 * but we still need the sub (userId) to revoke DB refresh tokens.
 */
export function decodeAccessToken(token: string): JWTPayload | null {
  try {
    const payload = decodeJwt(token) as Record<string, unknown>;
    if (!payload?.sub) return null;
    return {
      sub: payload.sub as string,
      role: (payload.role as string) || "",
      platform: payload.platform as Platform,
      emailVerified: Boolean(payload.emailVerified),
      mustVerifyNow: Boolean(payload.mustVerifyNow),
    };
  } catch {
    return null;
  }
}
