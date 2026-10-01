import { beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "@/utils/platform";
import {
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  getMe,
} from "@/lib/auth/authApiClient";

describe("authApiClient email verification methods", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("verifyEmailOtp", () => {
    it("posts to /api/v1/auth/verify-email-otp with platform, code, and optional userId", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: { message: "Email verified successfully." } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await verifyEmailOtp({
        platform: Platform.SURFBOARD,
        code: "123456",
        userId: "user-123",
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: Platform.SURFBOARD,
          code: "123456",
          userId: "user-123",
        }),
      });
      expect(result).toEqual({ success: true, data: { message: "Email verified successfully." } });
    });
  });

  describe("getMe", () => {
    it("fetches /api/v1/auth/me with encoded platform param", async () => {
      const mockMeData = {
        id: "usr_1",
        email: "test@example.com",
        role: "surveyor",
        emailVerified: false,
        emailVerifiedVia: null,
        mustVerifyNow: false,
        verificationMethod: "OTP" as const,
        verificationGraceEndsAt: "2026-10-31T00:00:00.000Z",
      };

      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: mockMeData }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getMe(Platform.SURFBOARD);

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/me?platform=surfboard");
      expect(result).toEqual({ success: true, data: mockMeData });
    });
  });

  describe("resendVerification", () => {
    it("posts to /api/v1/auth/resend-verification", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: { message: "If that email is registered and unverified, we've sent a verification code or link to it." },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await resendVerification({
        platform: Platform.GBC,
        email: "admin@gbc.com",
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: Platform.GBC,
          email: "admin@gbc.com",
        }),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("verifyEmail", () => {
    it("posts to /api/v1/auth/verify-email with token", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: { message: "Email verified." } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await verifyEmail({
        platform: Platform.REVA,
        token: "tok_12345",
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: Platform.REVA,
          token: "tok_12345",
        }),
      });
      expect(result.success).toBe(true);
    });
  });
});
