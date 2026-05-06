"use server";

import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { Platform } from "@/utils/platform";

interface UserData {
  platform: Platform;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches current user's authentication data from encrypted cookies
 * Returns platform, role, email, firstName, lastName
 * Used by access control hooks for authorization checks
 */
export async function getUserData(): Promise<ApiResult<any>> {
  try {
    const userData = await getEncryptedUserData();

    if (!userData) {
      return {
        success: false,
        error: "No user data found",
      };
    }

    // Return the full object for multi-platform support
    return {
      success: true,
      data: userData
    };
  } catch (error) {
    console.error("Error getting user data:", error);
    return {
      success: false,
      error: "Failed to get user data",
    };
  }
}
