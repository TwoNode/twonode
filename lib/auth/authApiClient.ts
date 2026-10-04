import type { ApiResult } from "@/lib/api/types";
import type { Platform } from "@/utils/platform";

/** Thin client for the native email/password endpoints — /api/v1/auth/*. */

type SessionUser = { id: string; email: string; role: string };

/**
 * ValidationError responses say only "Invalid request"; the useful text is the
 * first field message in `details`. Use this wherever a failed auth call's
 * message is shown to the user.
 */
export function describeFailure(res: {
  error: string;
  code?: string;
  details?: unknown;
}): string {
  if (
    res.code === "VALIDATION_ERROR" &&
    res.details &&
    typeof res.details === "object"
  ) {
    const first = Object.values(
      res.details as Record<string, unknown>
    ).flat()[0];
    if (typeof first === "string") return first;
  }
  return res.error || "Something went wrong. Please try again.";
}

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

/** Step 1 of OTP/link-first registration — holds the signup and emails a code or link per the platform's method setting. No account exists yet. */
export function registerSendOtp(input: {
  platform: Platform;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<
  ApiResult<{ pendingRegistrationId: string; method: "OTP" | "LINK" }>
> {
  return jsonFetch("/api/v1/auth/register/send-otp", input);
}

/**
 * Step 2 — verifies the code and creates the account in one step; returns a
 * signed-in session like login(). `password` must be the one the signup was
 * started with: it binds the verification to the person who chose it.
 */
export function registerComplete(input: {
  platform: Platform;
  pendingRegistrationId: string;
  code: string;
  password: string;
}): Promise<ApiResult<SessionUser>> {
  return jsonFetch("/api/v1/auth/register", input);
}

export function registerResendOtp(input: {
  platform: Platform;
  pendingRegistrationId: string;
}): Promise<ApiResult<{ message: string }>> {
  return jsonFetch("/api/v1/auth/register/resend-otp", input);
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

export async function getMe(
  platform: Platform
): Promise<ApiResult<MeResponse>> {
  const res = await fetch(
    `/api/v1/auth/me?platform=${encodeURIComponent(platform)}`
  );
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
export async function getInvitation(input: {
  platform: Platform;
  token: string;
}): Promise<ApiResult<InvitationDetails>> {
  const query = new URLSearchParams({
    platform: input.platform,
    token: input.token,
  });
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
