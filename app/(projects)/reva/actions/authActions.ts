"use server";

import { getEncryptedUserData } from "@/utils/encryptedCookies";

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches current user's authentication data from encrypted cookies
 * Returns the full multi-platform session data.
 * Used by Reva access control hooks for authorization checks.
 */
export async function getRevaUserData(): Promise<ApiResult<any>> {
  try {
    const userData = await getEncryptedUserData();

    if (!userData) {
      return {
        success: false,
        error: "No user data found",
      };
    }

    return {
      success: true,
      data: userData
    };
  } catch (error) {
    console.error("Error getting Reva user data:", error);
    return {
      success: false,
      error: "Failed to get user data",
    };
  }
}
