import { describe, expect, it } from "vitest";
import {
  calculatePlanFeeByZone,
  ZoneFeeRow,
} from "@/surfboard/services/codFeeService";

/**
 * Pure calculation, no Prisma/mocking needed. Weighted toward the
 * double-fee heuristic (calculatePlanFeeByZone -> shouldChargeDoubleFee)
 * since that's the part with the most business logic and the most ways to
 * get the "who pays double" call wrong.
 */

const ZONE_FEES: ZoneFeeRow[] = [
  {
    range: "0-500",
    start: 0,
    end: 500,
    lagosZoneA: 10000,
    lagosZoneB: 8000,
    lagosZoneC: 6000,
    lagosZoneD: 4000,
  },
  {
    range: "501-1000",
    start: 501,
    end: 1000,
    lagosZoneA: 20000,
    lagosZoneB: 16000,
    lagosZoneC: 12000,
    lagosZoneD: 8000,
  },
];

describe("calculatePlanFeeByZone", () => {
  it("picks the fee row matching the plan's area", async () => {
    const result = await calculatePlanFeeByZone(
      "lagosZoneA",
      300,
      "John Doe",
      ZONE_FEES
    );
    expect(result).toEqual({ fee: 10000, isDoubleFee: false });
  });

  it("falls through to the next range as area grows", async () => {
    const result = await calculatePlanFeeByZone(
      "lagosZoneA",
      700,
      "John Doe",
      ZONE_FEES
    );
    expect(result.fee).toBe(20000);
  });

  it("uses the last row's rate when area exceeds every defined range", async () => {
    const result = await calculatePlanFeeByZone(
      "lagosZoneA",
      5000,
      "John Doe",
      ZONE_FEES
    );
    expect(result.fee).toBe(20000); // last row's lagosZoneA, not zero
  });

  it("returns a zero fee for an area below every defined range with no fallback", async () => {
    const gappedFees: ZoneFeeRow[] = [
      {
        range: "100-500",
        start: 100,
        end: 500,
        lagosZoneA: 10000,
        lagosZoneB: 8000,
        lagosZoneC: 6000,
        lagosZoneD: 4000,
      },
    ];
    const result = await calculatePlanFeeByZone(
      "lagosZoneA",
      10,
      "John Doe",
      gappedFees
    );
    expect(result).toEqual({ fee: 0, isDoubleFee: false });
  });

  it("returns a zero fee for an unrecognized zone", async () => {
    const result = await calculatePlanFeeByZone(
      "lagosZoneQ",
      300,
      "John Doe",
      ZONE_FEES
    );
    expect(result).toEqual({ fee: 0, isDoubleFee: false });
  });

  it("selects the fee by zone letter", async () => {
    const a = await calculatePlanFeeByZone(
      "lagosZoneA",
      300,
      "John Doe",
      ZONE_FEES
    );
    const d = await calculatePlanFeeByZone(
      "lagosZoneD",
      300,
      "John Doe",
      ZONE_FEES
    );
    expect(a.fee).toBe(10000);
    expect(d.fee).toBe(4000);
  });

  describe("double-fee heuristic", () => {
    it("charges single fee for one name", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John Doe",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(false);
      expect(result.fee).toBe(10000);
    });

    it("charges double fee for more than 2 newline-separated names", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John Doe\nJane Doe\nJim Doe",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(true);
      expect(result.fee).toBe(20000);
    });

    it("does not double for exactly 2 names", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John Doe\nJane Doe",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(false);
    });

    it("charges double when ethnicity is explicitly corporate, even for a plain title", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John Doe",
        ZONE_FEES,
        "corporate"
      );
      expect(result.isDoubleFee).toBe(true);
    });

    it("charges double for a title containing a corporate keyword", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "Doe Enterprises Limited",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(true);
    });

    it("charges double for more than 2 names joined by 'and'/'&'", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John and Jane and Jim",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(true);
    });

    it("does not double for a plain non-corporate 2-person 'and' title", async () => {
      const result = await calculatePlanFeeByZone(
        "lagosZoneA",
        300,
        "John and Jane",
        ZONE_FEES
      );
      expect(result.isDoubleFee).toBe(false);
    });
  });
});
