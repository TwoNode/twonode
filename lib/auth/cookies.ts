import { cookies } from "next/headers";
import { Platform } from "@/utils/platform";

/**
 * Cookie names are suffixed per-platform (access_token_reva, access_token_surfboard, ...)
 * rather than one fixed pair, so a user can be simultaneously signed into REVA,
 * Surfboard, and GBC at once — the same property the existing multi-platform
 * USER_SESSION cookie (utils/encryptedCookies.ts) already provides, preserved
 * here with plain per-platform cookies instead of one shared multi-session payload.
 */
function cookieNames(platform: Platform) {
  return {
    access: `access_token_${platform}`,
    refresh: `refresh_token_${platform}`,
  };
}

export async function setAuthCookies(
  platform: Platform,
  accessToken: string,
  refreshToken: string,
  refreshMaxAgeSeconds: number = 30 * 24 * 60 * 60
) {
  const { access, refresh } = cookieNames(platform);
  const cookieStore = await cookies();

  cookieStore.set(access, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  cookieStore.set(refresh, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth/refresh", // attached exclusively to this endpoint
    maxAge: refreshMaxAgeSeconds,
  });
}

export async function clearAuthCookies(platform: Platform) {
  const { access, refresh } = cookieNames(platform);
  const cookieStore = await cookies();

  cookieStore.delete({ name: access, path: "/" });
  cookieStore.delete({ name: refresh, path: "/api/v1/auth/refresh" });
}

export async function getAccessTokenCookie(
  platform: Platform
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(cookieNames(platform).access)?.value;
}

export async function getRefreshTokenCookie(
  platform: Platform
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(cookieNames(platform).refresh)?.value;
}
