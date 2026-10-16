import { describe, it, expect } from "vitest";
import { normalizePlanNumber, planNumberToKeySegment, samePlanNumber } from "@/surfboard/utils/planNumber";
import { safeUploadFileName, revaUploadKey } from "@/reva/utils/uploadKey";
import { addCalendarMonths } from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { subscriptionExpiry, ExpiryTone } from "@/surfboard/utils/subscriptionExpiry";

// Pseudo-random generative generator for reproducible fuzz runs
class PRNG {
  private s: number;
  constructor(seed = 42) {
    this.s = seed;
  }
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) % 4294967296;
    return this.s / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  string(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_./\\- :;@#$%^&*()!~`+=[]{}|'\"<>,?\n\t\0\u200B\u202E\uFEFF😀🔥🚀";
    let res = "";
    for (let i = 0; i < length; i++) {
      res += chars[this.int(0, chars.length - 1)];
    }
    return res;
  }
}

describe("Fuzz Testing Suite: Generative Input Invariant Verification", () => {
  const prng = new PRNG(1337);

  describe("Plan Number Fuzzing (1,000 iterations)", () => {
    it("preserves canonical normalization invariants under randomized fuzz inputs", () => {
      for (let i = 0; i < 1000; i++) {
        const len = prng.int(0, 150);
        const fuzzed = prng.string(len);

        let normalized: string;
        expect(() => {
          normalized = normalizePlanNumber(fuzzed);
        }).not.toThrow();

        // Invariant 1: Always returns a string
        expect(typeof normalized!).toBe("string");

        // Invariant 2: No lowercase characters
        expect(normalized!).toBe(normalized!.toUpperCase());

        // Invariant 3: Multiple consecutive spaces are collapsed
        expect(normalized!).not.toMatch(/\s{2,}/);

        // Invariant 4: No trailing dots, underscores, or spaces
        expect(normalized!).not.toMatch(/[_.\s]$/);

        // Invariant 5: Idempotency: f(f(x)) === f(x)
        expect(normalizePlanNumber(normalized!)).toBe(normalized!);

        // Invariant 6: planNumberToKeySegment never contains slashes or spaces
        const keySegment = planNumberToKeySegment(fuzzed);
        expect(keySegment).not.toContain("/");
        expect(keySegment).not.toContain(" ");
      }
    });

    it("preserves equivalence symmetry and reflexivity under fuzzing", () => {
      for (let i = 0; i < 500; i++) {
        const fuzzed = prng.string(prng.int(1, 40));
        // Reflexivity for non-empty normalized
        const norm = normalizePlanNumber(fuzzed);
        if (norm !== "") {
          expect(samePlanNumber(fuzzed, fuzzed)).toBe(true);
        }

        // Symmetry: samePlanNumber(a, b) === samePlanNumber(b, a)
        const fuzzed2 = prng.string(prng.int(1, 40));
        expect(samePlanNumber(fuzzed, fuzzed2)).toBe(samePlanNumber(fuzzed2, fuzzed));
      }
    });
  });

  describe("File Name & S3 Key Fuzzing (1,000 iterations)", () => {
    it("guarantees path traversal immunity across random binary & unicode filenames", () => {
      for (let i = 0; i < 1000; i++) {
        const fuzzedName = prng.string(prng.int(0, 100));

        let sanitized: string;
        expect(() => {
          sanitized = safeUploadFileName(fuzzedName);
        }).not.toThrow();

        // Invariant 1: Output is never empty
        expect(sanitized!.length).toBeGreaterThan(0);

        // Invariant 2: Output never contains path separators or null bytes
        expect(sanitized!).not.toContain("/");
        expect(sanitized!).not.toContain("\\");
        expect(sanitized!).not.toContain("\0");

        // Invariant 3: Output never starts with a dot
        expect(sanitized!).not.toMatch(/^\./);

        // Invariant 4: revaUploadKey always stays inside private/reva/
        const fuzzedRef = prng.string(prng.int(0, 80));
        const key = revaUploadKey({
          reference: fuzzedRef,
          fileName: fuzzedName,
          uniqueSuffix: `fuzz-${i}`,
        });

        expect(key.startsWith("private/reva/")).toBe(true);
        expect(key).not.toContain("../");
        expect(key).not.toContain("..\\");
        expect(key).not.toContain("\0");
      }
    });
  });

  describe("Calendar & Temporal Fuzzing (1,000 iterations)", () => {
    it("ensures month additions always produce valid dates bounded by month days", () => {
      for (let i = 0; i < 1000; i++) {
        // Random year between 1970 and 2100
        const year = prng.int(1970, 2100);
        const month = prng.int(0, 11);
        const day = prng.int(1, 31);
        const offset = prng.int(-60, 60);

        const baseDate = new Date(year, month, day);
        if (Number.isNaN(baseDate.getTime())) continue;

        let resultDate: Date;
        expect(() => {
          resultDate = addCalendarMonths(baseDate, offset);
        }).not.toThrow();

        // Invariant 1: Must be a valid date
        expect(Number.isNaN(resultDate!.getTime())).toBe(false);

        // Invariant 2: The day in target month must not exceed target month's maximum days
        const targetDaysInMonth = new Date(
          resultDate!.getFullYear(),
          resultDate!.getMonth() + 1,
          0
        ).getDate();
        expect(resultDate!.getDate()).toBeLessThanOrEqual(targetDaysInMonth);
        expect(resultDate!.getDate()).toBeGreaterThanOrEqual(1);
      }
    });

    it("ensures subscriptionExpiry outputs strictly conform to ExpiryTone enum", () => {
      const allowedTones: Set<ExpiryTone> = new Set(["none", "ok", "soon", "expired"]);

      for (let i = 0; i < 1000; i++) {
        // Random timestamp between epoch and year 2100
        const randomMs = prng.int(0, 4102444800000);
        const testDate = prng.next() > 0.1 ? new Date(randomMs) : (prng.string(10) as any);
        const now = new Date(prng.int(1700000000000, 1800000000000));

        let res: any;
        expect(() => {
          res = subscriptionExpiry(testDate, now);
        }).not.toThrow();

        // Invariant 1: Tone must be one of the 4 valid tones
        expect(allowedTones.has(res.tone)).toBe(true);

        // Invariant 2: Relative is always a string
        expect(typeof res.relative).toBe("string");

        // Invariant 3: If tone is none, date must be null
        if (res.tone === "none") {
          expect(res.date).toBeNull();
        } else {
          expect(res.date instanceof Date).toBe(true);
        }
      }
    });
  });
});
