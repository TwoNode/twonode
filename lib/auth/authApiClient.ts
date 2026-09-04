import type { ApiResult } from "@/lib/api/types";
import type { Platform } from "@/utils/platform";

/** Thin client for the native email/password endpoints — /api/v1/auth/*. */

type SessionUser = { id: string; email: string; role: string };

async function jsonFetch<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function login(input: {
  platform: Platform;
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<ApiResult<SessionUser>> {
  return jsonFetch("/api/v1/auth/login", input);
}

export function register(input: {
  platform: Platform;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<ApiResult<SessionUser>> {
  return jsonFetch("/api/v1/auth/register", input);
}

export function requestPasswordReset(input: {
  platform: Platform;
  email: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/request-password-reset", input);
}

export function resetPassword(input: {
  platform: Platform;
  token: string;
  newPassword: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/reset-password", input);
}
