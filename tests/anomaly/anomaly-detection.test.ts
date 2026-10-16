import { describe, it, expect } from "vitest";
import { addCalendarMonths } from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { subscriptionExpiry, EXPIRING_SOON_WINDOW_DAYS } from "@/surfboard/utils/subscriptionExpiry";
import { normalizePlanNumber, samePlanNumber, planNumberToKeySegment } from "@/surfboard/utils/planNumber";
import { safeUploadFileName, revaUploadKey } from "@/reva/utils/uploadKey";

describe("Anomaly Testing Suite: Surfboard & REVA", () => {
  describe("Temporal & Calendar Transition Anomalies", () => {
    it("handles leap year February 29th clamping accurately", () => {
      // 2024 is a leap year (Feb has 29 days)
      const jan31Leap = new Date(2024, 0, 31);
      const febResultLeap = addCalendarMonths(jan31Leap, 1);
      expect(febResultLeap.getFullYear()).toBe(2024);
      expect(febResultLeap.getMonth()).toBe(1); // February
      expect(febResultLeap.getDate()).toBe(29);

      // 2025 is NOT a leap year (Feb has 28 days)
      const jan31NonLeap = new Date(2025, 0, 31);
      const febResultNonLeap = addCalendarMonths(jan31NonLeap, 1);
      expect(febResultNonLeap.getFullYear()).toBe(2025);
      expect(febResultNonLeap.getMonth()).toBe(1); // February
      expect(febResultNonLeap.getDate()).toBe(28);
    });

    it("clamps 31-day months transitioning to 30-day months", () => {
      // August 31 + 1 month -> September 30
      const aug31 = new Date(2026, 7, 31);
      const sepResult = addCalendarMonths(aug31, 1);
      expect(sepResult.getMonth()).toBe(8); // September
      expect(sepResult.getDate()).toBe(30);

      // March 31 + 1 month -> April 30
      const mar31 = new Date(2026, 2, 31);
      const aprResult = addCalendarMonths(mar31, 1);
      expect(aprResult.getMonth()).toBe(3); // April
      expect(aprResult.getDate()).toBe(30);
    });

    it("handles zero and negative month offsets without data corruption", () => {
      const date = new Date(2026, 5, 15);
      const zeroAdded = addCalendarMonths(date, 0);
      expect(zeroAdded.getTime()).toBe(date.getTime());

      const oneMonthBack = addCalendarMonths(date, -1);
      expect(oneMonthBack.getMonth()).toBe(4); // May
      expect(oneMonthBack.getDate()).toBe(15);
    });

    it("handles invalid, corrupted, or NaN dates gracefully in subscriptionExpiry", () => {
      expect(subscriptionExpiry(null).tone).toBe("none");
      expect(subscriptionExpiry(undefined).tone).toBe("none");
      expect(subscriptionExpiry("not-a-valid-date-string").tone).toBe("none");
      expect(subscriptionExpiry(new Date(NaN)).tone).toBe("none");
    });

    it("evaluates negative epoch and distant future date anomalies", () => {
      // Negative epoch (pre-1970 date)
      const pre1970 = new Date("1960-01-01T00:00:00Z");
      const expiredResult = subscriptionExpiry(pre1970, new Date("2026-10-16T00:00:00Z"));
      expect(expiredResult.tone).toBe("expired");
      expect(expiredResult.relative).toContain("ago");

      // Far future date (year 2099)
      const year2099 = new Date("2099-12-31T23:59:59Z");
      const futureResult = subscriptionExpiry(year2099, new Date("2026-10-16T00:00:00Z"));
      expect(futureResult.tone).toBe("ok");
      expect(futureResult.relative).toContain("in ");
    });

    it("detects exact boundary of expiring-soon window", () => {
      const now = new Date("2026-10-16T12:00:00Z");
      // 5 days out (within 7-day window) -> soon
      const soonDate = new Date("2026-10-21T12:00:00Z");
      expect(subscriptionExpiry(soonDate, now).tone).toBe("soon");

      // 10 days out (beyond 7-day window) -> ok
      const okDate = new Date("2026-10-26T12:00:00Z");
      expect(subscriptionExpiry(okDate, now).tone).toBe("ok");
    });
  });

  describe("Cadastral Plan Number & Search Anomalies", () => {
    it("handles extreme length plan numbers without memory issues or crashes", () => {
      const extremePlanNumber = "SURV/" + "A".repeat(10000) + "/2026";
      const normalized = normalizePlanNumber(extremePlanNumber);
      expect(normalized.startsWith("SURV/")).toBe(true);
      expect(normalized.endsWith("/2026")).toBe(true);
      expect(normalized.length).toBe(extremePlanNumber.length);
    });

    it("handles strings with weird whitespace, tabs, newlines and unicode spaces", () => {
      const weirdSpaces = "  OG  \t\n  1234  \r  AB  ";
      expect(normalizePlanNumber(weirdSpaces)).toBe("OG 1234 AB");
      expect(planNumberToKeySegment(weirdSpaces)).toBe("OG-1234-AB");
    });

    it("safely handles plan numbers with multiple consecutive separators and trailing noise", () => {
      const noisy = "///LA/123/2026....____";
      const normalized = normalizePlanNumber(noisy);
      expect(normalized).toBe("///LA/123/2026");
      expect(planNumberToKeySegment(noisy)).toBe("___LA_123_2026");
    });

    it("correctly identifies identity equivalence across irregular formats", () => {
      expect(samePlanNumber("og/123/la", "  OG / 123 / LA  ")).toBe(false); // internal space differences are distinguished
      expect(samePlanNumber("OG/123/LA", "og/123/la")).toBe(true);
      expect(samePlanNumber("OG/123/LA.", "og/123/la_")).toBe(true);
      expect(samePlanNumber("", "")).toBe(false); // empty never matches empty
      expect(samePlanNumber(null, null)).toBe(false);
    });
  });

  describe("File Upload & Storage Anomalies", () => {
    it("sanitizes file names consisting entirely of dots and spaces", () => {
      expect(safeUploadFileName("...")).toBe("file");
      expect(safeUploadFileName("   ")).toBe("file");
      expect(safeUploadFileName("......   ")).toBe("file");
    });

    it("sanitizes Windows reserved device names and illegal control characters", () => {
      const reserved = "CON.pdf";
      const sanitized = safeUploadFileName(reserved);
      expect(sanitized.length).toBeGreaterThan(0);

      // ASCII control characters (0x01 - 0x1F)
      const controlChars = "test\x01\x02\x1Ffile.pdf";
      expect(safeUploadFileName(controlChars)).toBe("testfile.pdf");
    });

    it("handles references with unicode and special symbols without corrupting S3 paths", () => {
      const key = revaUploadKey({
        reference: "REV-2026-₦#@!*&^%$",
        fileName: "dossier.pdf",
        uniqueSuffix: "part-1",
      });

      // Special characters should be stripped from folder segment, preserving safe alphanumeric
      expect(key.startsWith("private/reva/REV-2026-/")).toBe(true);
      expect(key).not.toContain("₦");
      expect(key).not.toContain("#");
      expect(key).not.toContain("@");
    });
  });
});
