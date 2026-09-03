import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { EncryptJWT, jwtDecrypt, JWTPayload } from "jose";
import { Platform, RevaRole } from "@/utils/platform";
import type { SurfboardRole, GBCRole } from "@/utils/platform";

// JWT configuration
const JWT_ALGORITHM = "dir"; // Direct key agreement
const JWT_ENCRYPTION = "A256GCM"; // AES-256-GCM encryption
const JWT_ISSUER = "your-app-name"; // Change to your app name
const JWT_AUDIENCE = "your-app-users"; // Change to your app audience

// Get encryption key from environment variable
const getEncryptionKey = (): Uint8Array => {
  const key = process.env.COOKIE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("COOKIE_ENCRYPTION_KEY environment variable is required");
  }

  // Validate key length (must be 32 bytes for A256GCM)
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "COOKIE_ENCRYPTION_KEY must be 32 bytes (64 hex characters)"
    );
  }

  return new Uint8Array(keyBuffer);
};

export interface SubscriptionData {
  status: "active" | "canceled" | "expired" | "past_due";
  interval: "monthly" | "quarterly" | "annually";
  expiresAt?: number | string | Date | null;
  subCode?: string;
  planCode?: string;
  emailToken?: string;
}

export interface PlatformSession {
  role: RevaRole | SurfboardRole | GBCRole;
  subscription?: SubscriptionData;
}

// Interface for user data to be encrypted
export interface EncryptedUserData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  kindeId: string;
  sessionId: string; // Unique session identifier
  lastActivity: number; // For idle timeout tracking
  picture?: string | null; // Optional user picture URL
  
  // Multi-platform support
  platforms: Partial<Record<Platform, PlatformSession>>;
  
  // Legacy fields (kept for backward compatibility during transition)
  platform?: Platform; 
  role?: RevaRole | SurfboardRole | GBCRole;
  subscription?: SubscriptionData;
}

// Extended JWT payload interface
interface UserJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  kindeId: string;
  sessionId: string;
  lastActivity: number;
  picture?: string | null;
  
  platforms: Partial<Record<Platform, PlatformSession>>;
  
  // Legacy
  platform?: Platform;
  role?: RevaRole | SurfboardRole | GBCRole;
  subscription?: SubscriptionData;
}

// Generate a unique session ID
const generateSessionId = (): string => {
  return crypto.randomUUID();
};

// Encrypt user data using JOSE JWE
export async function encryptUserData(
  data: Omit<EncryptedUserData, "sessionId" | "lastActivity">
): Promise<string> {
  try {
    const key = getEncryptionKey();
    const now = Math.floor(Date.now() / 1000); // JWT timestamps are in seconds

    const payload: UserJWTPayload = {
      ...data,
      sessionId: generateSessionId(),
      lastActivity: now,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      iat: now,
      exp: now + 24 * 60 * 60, // 24 hours expiration
      nbf: now, // Not before (valid from now)
    };

    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({
        alg: JWT_ALGORITHM,
        enc: JWT_ENCRYPTION,
        typ: "JWT",
      })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setNotBefore(0)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .encrypt(key);

    return jwt;
  } catch (error) {
    console.error("Error encrypting user data:", error);
    throw new Error("Failed to encrypt user data");
  }
}

// Decrypt user data using JOSE JWE
export async function decryptUserData(
  encryptedJWT: string
): Promise<EncryptedUserData> {
  try {
    const key = getEncryptionKey();

    const { payload } = await jwtDecrypt(encryptedJWT, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const userPayload = payload as UserJWTPayload;

    // Validate required fields
    if (!userPayload.userId || !userPayload.email || !userPayload.sessionId) {
      throw new Error("Invalid JWT payload - missing required fields");
    }

    // Check if session is expired (additional check beyond JWT exp)
    const now = Math.floor(Date.now() / 1000);
    const maxIdleTime = 24 * 60 * 60; // 24 hours in seconds

    if (
      userPayload.lastActivity &&
      now - userPayload.lastActivity > maxIdleTime
    ) {
      throw new Error("Session expired due to inactivity");
    }

    // Migration logic: handle old single-platform payloads
    let platforms = userPayload.platforms || {};
    if ((!platforms || Object.keys(platforms).length === 0) && userPayload.platform && userPayload.role) {
      platforms = {};
      platforms[userPayload.platform] = {
        role: userPayload.role,
        subscription: userPayload.subscription
      };
    }

    const userData: EncryptedUserData = {
      userId: userPayload.userId,
      email: userPayload.email,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      kindeId: userPayload.kindeId,
      picture: userPayload.picture,
      sessionId: userPayload.sessionId,
      lastActivity: userPayload.lastActivity,
      platforms: platforms,
      // Keep legacy fields populated for safety
      platform: userPayload.platform,
      role: userPayload.role,
      subscription: userPayload.subscription
    };

    return userData;
  } catch (error) {
    // Distinguish between different error types without exposing details
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as any).code === "ERR_JWT_EXPIRED"
    ) {
      console.error("JWT expired");
      throw new Error("Session expired");
    } else if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as any).code === "ERR_JWT_INVALID"
    ) {
      console.error("Invalid JWT");
      throw new Error("Invalid session");
    } else if (
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as any).message === "string" &&
      (error as any).message.includes("missing required fields")
    ) {
      console.error("Invalid session payload");
      throw new Error("Invalid session");
    } else if (
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as any).message === "string" &&
      (error as any).message.includes("inactivity")
    ) {
      console.error("Session expired due to inactivity");
      throw new Error("Session expired");
    } else {
      console.error("Error decrypting user data:", error);
      throw new Error("Session validation failed");
    }
  }
}

// Update last activity timestamp
export async function updateLastActivity(
  encryptedJWT: string
): Promise<string> {
  try {
    const userData = await decryptUserData(encryptedJWT);

    // Create new JWT with updated lastActivity
    const updatedData = {
      ...userData,
      lastActivity: Math.floor(Date.now() / 1000),
    };

    // Remove sessionId and lastActivity from the data passed to encryptUserData
    const { sessionId, lastActivity, ...dataForEncryption } = updatedData;

    // Create new encrypted JWT with preserved sessionId
    const key = getEncryptionKey();
    const now = Math.floor(Date.now() / 1000);

    const payload: UserJWTPayload = {
      ...dataForEncryption,
      sessionId, // Preserve existing session ID
      lastActivity: now,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      iat: now,
      exp: now + 24 * 60 * 60,
      nbf: now,
    };

    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({
        alg: JWT_ALGORITHM,
        enc: JWT_ENCRYPTION,
        typ: "JWT",
      })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setNotBefore(0)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .encrypt(key);

    return jwt;
  } catch (error) {
    console.error("Error updating last activity:", error);
    throw new Error("Failed to update session");
  }
}

export async function getUserActiveSubscription(userId: string) {
  try {
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        OR: [
          { status: "active" },
          {
            // Include cancelled subscriptions still in grace period
            AND: [{ status: "canceled" }, { currentEnd: { gte: new Date() } }],
          },
        ],
      },
    });

    if (!sub) return null;

    return {
      status: sub.status,
      interval: sub.interval,
      expiresAt: sub.currentEnd,
      subCode: sub.subCode,
      planCode: sub.planCode,
      emailToken: sub.emailToken,
    } as SubscriptionData;
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}

// Update last activity timestamp and refresh subscriptions for ALL platforms
export async function updateLastActivityAndSubscription(
  encryptedJWT: string
): Promise<string> {
  try {
    const userData = await decryptUserData(encryptedJWT);
    
    // Refresh subscription for Surfboard if it exists in the platforms
    if (userData.platforms[Platform.SURFBOARD]) {
      const sub = await getUserActiveSubscription(userData.userId);
      if (sub) {
        userData.platforms[Platform.SURFBOARD]!.subscription = sub;
      }
    }

    // Create new JWT with updated lastActivity
    const updatedData = {
      ...userData,
      lastActivity: Math.floor(Date.now() / 1000),
    };

    // Remove sessionId and lastActivity from the data passed to encryptUserData
    const { sessionId, lastActivity, ...dataForEncryption } = updatedData;

    // Create new encrypted JWT with preserved sessionId
    const key = getEncryptionKey();
    const now = Math.floor(Date.now() / 1000);

    const payload: UserJWTPayload = {
      ...dataForEncryption,
      sessionId, // Preserve existing session ID
      lastActivity: now,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      iat: now,
      exp: now + 24 * 60 * 60,
      nbf: now,
    };

    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({
        alg: JWT_ALGORITHM,
        enc: JWT_ENCRYPTION,
        typ: "JWT",
      })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setNotBefore(0)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .encrypt(key);

    return jwt;
  } catch (error) {
    console.error("Error updating last activity:", error);
    throw new Error("Failed to update session");
  }
}

// Set/Merge encrypted user cookie (server-side)
// Now handles multiple platforms by merging into existing session
export async function setEncryptedUserCookie(
  newData: Omit<EncryptedUserData, "sessionId" | "lastActivity" | "platforms"> & {
    platform: Platform;
    role: PlatformSession["role"];
    subscription?: PlatformSession["subscription"];
  },
  response?: NextResponse
): Promise<NextResponse> {
  // 1. Get existing session
  const existingData = await getEncryptedUserData();
  
  let finalPlatforms: Partial<Record<Platform, PlatformSession>> = {};
  
  if (existingData) {
    // Port existing platforms
    finalPlatforms = { ...existingData.platforms };
  }
  
  // 2. Add/Update the specific platform
  finalPlatforms[newData.platform] = {
    role: newData.role,
    subscription: newData.subscription
  };

  // 3. Prepare final data object
  const finalUserData: Omit<EncryptedUserData, "sessionId" | "lastActivity"> = {
    userId: newData.userId,
    email: newData.email,
    firstName: newData.firstName,
    lastName: newData.lastName,
    kindeId: newData.kindeId,
    picture: newData.picture,
    platforms: finalPlatforms,
    // Keep legacy fields updated for compatibility
    platform: newData.platform,
    role: newData.role,
    subscription: newData.subscription
  };

  const encryptedJWT = await encryptUserData(finalUserData);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  };

  if (response) {
    response.cookies.set("USER_SESSION", encryptedJWT, cookieOptions);
    return response;
  } else {
    const newResponse = NextResponse.next();
    newResponse.cookies.set("USER_SESSION", encryptedJWT, cookieOptions);
    return newResponse;
  }
}

// Get encrypted user data (server-side)
export async function getEncryptedUserData(
  req?: NextRequest
): Promise<EncryptedUserData | null> {
  try {
    const cookieStore = req ? req.cookies : await cookies();
    const encryptedJWT = cookieStore.get("USER_SESSION")?.value;

    if (!encryptedJWT) {
      return null;
    }

    return await decryptUserData(encryptedJWT);
  } catch (error) {
    console.error("Error getting encrypted user data:", error);
    return null;
  }
}

// Get and refresh user session (updates last activity)
export async function getAndRefreshUserSession(
  req?: NextRequest,
  updateSubscription?: boolean
): Promise<{ userData: EncryptedUserData; response: NextResponse } | null> {
  try {
    const cookieStore = req && req?.cookies ? req.cookies : await cookies();
    const encryptedJWT = cookieStore.get("USER_SESSION")?.value;

    if (!encryptedJWT) {
      return null;
    }

    const userData = await decryptUserData(encryptedJWT);
    const refreshedJWT =
      updateSubscription 
        ? await updateLastActivityAndSubscription(encryptedJWT)
        : await updateLastActivity(encryptedJWT);

    const response = NextResponse.next();
    response.cookies.set("USER_SESSION", refreshedJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return { userData, response };
  } catch (error) {
    console.error("Error refreshing user session:", error);
    return null;
  }
}

// Clear encrypted user cookie
export async function clearEncryptedUserCookie(
  response?: NextResponse
): Promise<NextResponse> {
  const cookieName = "USER_SESSION";

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };

  if (response) {
    response.cookies.set(cookieName, "", cookieOptions);
    // Note: serverside clear for headers
    return response;
  } else {
    const newResponse = NextResponse.next();
    newResponse.cookies.set(cookieName, "", cookieOptions);
    return newResponse;
  }
}

// Checker functions - refined for multi-platform
export function isSuperAdmin(userData: EncryptedUserData | null, platform: Platform): boolean {
  if (!userData) return false;
  return userData.platforms[platform]?.role === RevaRole.SUPERADMIN;
}

export function isAdmin(userData: EncryptedUserData | null, platform: Platform): boolean {
  if (!userData) return false;
  const role = userData.platforms[platform]?.role;
  return (
    role === RevaRole.ADMIN || role === RevaRole.SUPERADMIN
  );
}

export function isRegularUser(userData: EncryptedUserData | null, platform: Platform): boolean {
  if (!userData) return false;
  return userData.platforms[platform]?.role === RevaRole.USER;
}

export function isPlatformUser(
  userData: EncryptedUserData | null,
  platform: Platform
): boolean {
  if (!userData) return false;
  return !!userData.platforms[platform];
}

// Legacy helpers (can be removed once all references are updated)
export function getSessionId(
  userData: EncryptedUserData | null
): string | null {
  return userData?.sessionId || null;
}

export function isSessionActive(userData: EncryptedUserData | null): boolean {
  if (!userData) return false;

  const now = Math.floor(Date.now() / 1000);
  const maxIdleTime = 24 * 60 * 60; // 24 hours

  return now - userData.lastActivity <= maxIdleTime;
}
