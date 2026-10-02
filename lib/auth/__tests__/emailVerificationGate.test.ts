import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSettings = vi.hoisted(() => ({
  getEmailVerificationSettings: vi.fn(),
}));

vi.mock("@/lib/auth/emailVerificationSettings", () => mockSettings);

const { Platform } = await import("@/utils/platform");
const { computeMustVerifyNow, computeVerificationGraceEndsAt } =
  await import("@/lib/auth/emailVerificationGate");

describe("emailVerificationGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeMustVerifyNow", () => {
    it("returns false if platform email verification is disabled", async () => {
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: false,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: "2026-09-01T00:00:00.000Z",
      });

      const user = {
        emailVerified: false,
        createdAt: new Date("2026-09-15T00:00:00.000Z"),
      };
      const mustVerify = await computeMustVerifyNow(Platform.SURFBOARD, user);
      expect(mustVerify).toBe(false);
    });

    it("returns false if user is already verified", async () => {
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: true,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: "2026-09-01T00:00:00.000Z",
      });

      const user = {
        emailVerified: true,
        createdAt: new Date("2026-09-15T00:00:00.000Z"),
      };
      const mustVerify = await computeMustVerifyNow(Platform.SURFBOARD, user);
      expect(mustVerify).toBe(false);
    });

    it("returns true immediately for new accounts created after enforcement began", async () => {
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: true,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: "2026-09-01T00:00:00.000Z",
      });

      // Created after enforcedSince
      const user = {
        emailVerified: false,
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
      };
      const mustVerify = await computeMustVerifyNow(Platform.SURFBOARD, user);
      expect(mustVerify).toBe(true);
    });

    it("returns false for grandfathered accounts still inside grace period", async () => {
      // Enforcement started 10 days ago, grace period is 30 days
      const tenDaysAgo = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString();
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: true,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: tenDaysAgo,
      });

      // User registered before enforcement started (15 days ago)
      const user = {
        emailVerified: false,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      };
      const mustVerify = await computeMustVerifyNow(Platform.SURFBOARD, user);
      expect(mustVerify).toBe(false);
    });

    it("returns true for grandfathered accounts when grace period has expired", async () => {
      // Enforcement started 40 days ago, grace period is 30 days -> grace expired 10 days ago
      const fortyDaysAgo = new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000
      ).toISOString();
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: true,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: fortyDaysAgo,
      });

      // User registered before enforcement started (50 days ago)
      const user = {
        emailVerified: false,
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      };
      const mustVerify = await computeMustVerifyNow(Platform.SURFBOARD, user);
      expect(mustVerify).toBe(true);
    });
  });

  describe("computeVerificationGraceEndsAt", () => {
    it("returns null if disabled or already verified", async () => {
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: false,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: "2026-09-01T00:00:00.000Z",
      });

      const user = {
        emailVerified: false,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      };
      expect(
        await computeVerificationGraceEndsAt(Platform.SURFBOARD, user)
      ).toBeNull();
    });

    it("returns ISO date string if grandfathered user is inside grace", async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        enabled: true,
        method: "OTP",
        gracePeriodDays: 30,
        enforcedSince: fiveDaysAgo.toISOString(),
      });

      const user = {
        emailVerified: false,
        createdAt: new Date(fiveDaysAgo.getTime() - 1000),
      };

      const graceEndsAt = await computeVerificationGraceEndsAt(
        Platform.SURFBOARD,
        user
      );
      expect(graceEndsAt).not.toBeNull();
      const expectedEnd = new Date(
        fiveDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(graceEndsAt).toBe(expectedEnd);
    });
  });
});
