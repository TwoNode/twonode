import { SignJWT, jwtVerify } from "jose";
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

function toPayload(p: Record<string, unknown>): JWTPayload {
  return {
    sub: p.sub as string,
    role: p.role as string,
    platform: p.platform as Platform,
    emailVerified: Boolean(p.emailVerified),
    mustVerifyNow: Boolean(p.mustVerifyNow),
  };
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return toPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}

// Logout still has to identify the user when the 15-minute access token has
// already expired — but only a token WE signed. Accepting expiry is fine;
// accepting an unverified payload (jose's decodeJwt) would let anyone with a
// victim's user id forge a cookie and revoke that user's sessions.
const EXPIRED_TOKEN_TOLERANCE_SECONDS = 30 * 24 * 60 * 60; // the refresh-token lifetime

export async function verifyTokenAllowExpired(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: EXPIRED_TOKEN_TOLERANCE_SECONDS,
    });
    return toPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}
