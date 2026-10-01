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

export function verifyEmail(input: {
  platform: Platform;
  token: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/verify-email", input);
}

export function verifyEmailOtp(input: {
  platform: Platform;
  code: string;
  userId?: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/verify-email-otp", input);
}

export function resendVerification(input: {
  platform: Platform;
  email: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/resend-verification", input);
}

export type MeResponse = {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  emailVerifiedVia: string | null;
  mustVerifyNow: boolean;
  verificationMethod: "OTP" | "LINK";
  verificationGraceEndsAt: string | null;
};

export async function getMe(platform: Platform): Promise<ApiResult<MeResponse>> {
  const res = await fetch(`/api/v1/auth/me?platform=${encodeURIComponent(platform)}`);
  return res.json();
}

export type InvitationDetails = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  expiresAt: string;
  loginPath: string;
};

/** What the accept-invite page shows before the invitee sets a password. */
export async function getInvitation(input: { platform: Platform; token: string }): Promise<ApiResult<InvitationDetails>> {
  const query = new URLSearchParams({ platform: input.platform, token: input.token });
  const res = await fetch(`/api/v1/auth/invitations?${query}`);
  return res.json();
}

export function acceptInvitation(input: {
  platform: Platform;
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<ApiResult<{ message: string; loginPath: string }>> {
  return jsonFetch("/api/v1/auth/accept-invite", input);
}
