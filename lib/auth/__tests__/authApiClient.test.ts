import { beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "@/utils/platform";
import {
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  getMe,
  registerSendOtp,
  registerComplete,
  describeFailure,
  registerResendOtp,
} from "@/lib/auth/authApiClient";

describe("authApiClient email verification methods", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("verifyEmailOtp", () => {
    it("posts to /api/v1/auth/verify-email-otp with platform, code, and optional userId", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: { message: "Email verified successfully." },
        }),
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
      expect(result).toEqual({
        success: true,
        data: { message: "Email verified successfully." },
      });
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

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/me?platform=surfboard"
      );
      expect(result).toEqual({ success: true, data: mockMeData });
    });
  });

  describe("resendVerification", () => {
    it("posts to /api/v1/auth/resend-verification", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            message:
              "If that email is registered and unverified, we've sent a verification code or link to it.",
          },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await resendVerification({
        platform: Platform.GBC,
        email: "admin@gbc.com",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/resend-verification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: Platform.GBC,
            email: "admin@gbc.com",
          }),
        }
      );
      expect(result.success).toBe(true);
    });
  });

  describe("verifyEmail", () => {
    it("posts to /api/v1/auth/verify-email with token", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: { message: "Email verified." },
        }),
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

  describe("register methods", () => {
    it("registerSendOtp posts to /api/v1/auth/register/send-otp", async () => {
      const mockData = {
        pendingRegistrationId: "preg_1",
        method: "OTP" as const,
      };
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: mockData }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await registerSendOtp({
        platform: Platform.SURFBOARD,
        email: "new@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: Platform.SURFBOARD,
          email: "new@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        }),
      });
      expect(result).toEqual({ success: true, data: mockData });
    });

    it("registerComplete posts to /api/v1/auth/register with pendingRegistrationId, code and the original password", async () => {
      const mockUser = {
        id: "usr_1",
        email: "new@example.com",
        role: "user",
        emailVerified: true,
        mustVerifyNow: false,
      };
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: mockUser }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await registerComplete({
        platform: Platform.SURFBOARD,
        pendingRegistrationId: "preg_1",
        code: "654321",
        password: "Passw0rd!x",
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: Platform.SURFBOARD,
          pendingRegistrationId: "preg_1",
          code: "654321",
          password: "Passw0rd!x",
        }),
      });
      expect(result).toEqual({ success: true, data: mockUser });
    });

    it("registerResendOtp posts to /api/v1/auth/register/resend-otp", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: { message: "A fresh verification code has been sent." },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await registerResendOtp({
        platform: Platform.SURFBOARD,
        pendingRegistrationId: "preg_1",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/register/resend-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: Platform.SURFBOARD,
            pendingRegistrationId: "preg_1",
          }),
        }
      );
      expect(result.success).toBe(true);
    });
  });
  describe("describeFailure", () => {
    it("surfaces the first field message from a ValidationError's details", () => {
      expect(
        describeFailure({
          error: "Invalid request",
          code: "VALIDATION_ERROR",
          details: { code: "Incorrect or expired code" },
        })
      ).toBe("Incorrect or expired code");
    });

    it("falls back to the generic error for non-validation failures", () => {
      expect(
        describeFailure({ error: "Too many attempts.", code: "RATE_LIMITED" })
      ).toBe("Too many attempts.");
    });

    it("never returns an empty string", () => {
      expect(describeFailure({ error: "" })).toBe(
        "Something went wrong. Please try again."
      );
    });
  });
});
