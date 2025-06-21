import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { EncryptJWT, jwtDecrypt, JWTPayload } from "jose";
import { Platform, RevaRole } from "@/utils/platform";

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

// Interface for user data to be encrypted
export interface EncryptedUserData {
  platform: Platform; // Platform.REVA, Platform.SCRAM, etc.
  role: RevaRole; // RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  kindeId: string;
  sessionId: string; // Unique session identifier
  lastActivity: number; // For idle timeout tracking
}

// Extended JWT payload interface
interface UserJWTPayload extends JWTPayload {
  platform: Platform;
  role: RevaRole;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  kindeId: string;
  sessionId: string;
  lastActivity: number;
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

    const userData: EncryptedUserData = {
      platform: userPayload.platform,
      role: userPayload.role,
      userId: userPayload.userId,
      email: userPayload.email,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      kindeId: userPayload.kindeId,
      sessionId: userPayload.sessionId,
      lastActivity: userPayload.lastActivity,
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

// Set encrypted user cookie (server-side)
export async function setEncryptedUserCookie(
  userData: Omit<EncryptedUserData, "sessionId" | "lastActivity">,
  response?: NextResponse
): Promise<NextResponse> {
  const encryptedJWT = await encryptUserData(userData);

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
    const cookieStore = req ? req.cookies : cookies();
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

// Get encrypted user data from request (middleware)
export async function getEncryptedUserDataFromRequest(
  req: NextRequest
): Promise<EncryptedUserData | null> {
  try {
    const encryptedJWT = req.cookies.get("USER_SESSION")?.value;

    if (!encryptedJWT) {
      return null;
    }

    return await decryptUserData(encryptedJWT);
  } catch (error) {
    console.error("Error getting encrypted user data from request:", error);
    return null;
  }
}

// Get and refresh user session (updates last activity)
export async function getAndRefreshUserSession(
  req?: NextRequest
): Promise<{ userData: EncryptedUserData; response: NextResponse } | null> {
  try {
    const cookieStore = req && req?.cookies ? req.cookies : cookies();
    const encryptedJWT = cookieStore.get("USER_SESSION")?.value;

    if (!encryptedJWT) {
      return null;
    }

    const userData = await decryptUserData(encryptedJWT);
    const refreshedJWT = await updateLastActivity(encryptedJWT);

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
export function clearEncryptedUserCookie(
  response?: NextResponse
): NextResponse {
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

    cookies().set(cookieName, "", { maxAge: 0 });
    cookies().delete(cookieName);

    return response;
  } else {
    const newResponse = NextResponse.next();
    newResponse.cookies.set(cookieName, "", cookieOptions);

    cookies().set(cookieName, "", { maxAge: 0 });
    cookies().delete(cookieName);

    return newResponse;
  }
}

// Invalidate a specific session (for logout from specific device)
export async function invalidateSession(sessionId: string): Promise<void> {
  // In a real application, you would store invalidated session IDs in a database/cache
  // For now, we'll just log the invalidation
  console.log(`Session invalidated: ${sessionId}`);

  // TODO: Implement session invalidation storage (Redis, database, etc.)
  // This would be checked during decryptUserData to ensure the session hasn't been invalidated
}

// Utility functions for checking permissions
export function canAccessRevaAdminPanel(
  userData: EncryptedUserData | null
): boolean {
  if (!userData) return false;
  return (
    userData.role === RevaRole.ADMIN || userData.role === RevaRole.SUPERADMIN
  );
}

export function canAccessRevaUserPanel(
  userData: EncryptedUserData | null
): boolean {
  if (!userData) return false;
  return [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN].includes(
    userData.role
  );
}

export function isSuperAdmin(userData: EncryptedUserData | null): boolean {
  if (!userData) return false;
  return userData.role === RevaRole.SUPERADMIN;
}

export function isAdmin(userData: EncryptedUserData | null): boolean {
  if (!userData) return false;
  return (
    userData.role === RevaRole.ADMIN || userData.role === RevaRole.SUPERADMIN
  );
}

export function isRegularUser(userData: EncryptedUserData | null): boolean {
  if (!userData) return false;
  return userData.role === RevaRole.USER;
}

export function isPlatformUser(
  userData: EncryptedUserData | null,
  platform: Platform
): boolean {
  if (!userData) return false;
  return userData.platform === platform;
}

// Additional utility functions for session management
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
