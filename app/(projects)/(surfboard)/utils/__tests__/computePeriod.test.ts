import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  computeExtendedPeriod,
  computePeriodPerTimestamp,
} from "@/app/(projects)/(surfboard)/utils/computePeriod";

/**
 * All dates here are built and read with LOCAL fields. That is the frame
 * computePeriod stores its results in (Lagos wall-clock numbers placed in the
 * server's zone), so these tests give the same answer on a UTC server, a
 * Lagos laptop, anywhere.
 */
const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, m - 1, d, h, mi, s);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hms = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

describe("addCalendarMonths", () => {
  it.each([
    // [start, months, expected]
    ["2027-01-31", 1, "2027-02-28"],
    ["2027-01-30", 1, "2027-02-28"],
    ["2027-01-29", 1, "2027-02-28"],
    ["2028-01-31", 1, "2028-02-29"], // leap year
    ["2026-08-31", 1, "2026-09-30"],
    ["2026-08-31", 3, "2026-11-30"],
    ["2026-11-30", 3, "2027-02-28"],
    ["2028-02-29", 12, "2029-02-28"],
    ["2026-12-31", 12, "2027-12-31"],
    ["2026-01-15", 1, "2026-02-15"],
    ["2026-12-15", 1, "2027-01-15"],
    ["2026-11-01", 12, "2027-11-01"],
  ])(
    "%s + %i month(s) = %s (clamped, never spills into the next month)",
    (start, months, expected) => {
      const [y, m, d] = start.split("-").map(Number);
      expect(ymd(addCalendarMonths(at(y, m, d), months))).toBe(expected);
    }
  );

  it("keeps the time of day and doesn't mutate its input", () => {
    const input = at(2026, 1, 31, 13, 45, 9);
    const out = addCalendarMonths(input, 1);
    expect(hms(out)).toBe("13:45:09");
    expect(ymd(input)).toBe("2026-01-31");
  });
});

describe("computeExtendedPeriod", () => {
  const paid = new Date("2026-10-04T10:00:00Z");

  describe("when nothing is running — the same period as before this change", () => {
    const fresh = (i: "monthly" | "quarterly" | "annually") =>
      computePeriodPerTimestamp(i, paid);

    it("no subscription: a fresh period from the payment date", () => {
      const p = computeExtendedPeriod("monthly", paid, null);
      expect(p.extended).toBe(false);
      expect(p.currentStart).toEqual(fresh("monthly").currentStart);
      expect(p.currentEnd).toEqual(fresh("monthly").currentEnd);
      expect(p.nextCharge).toEqual(fresh("monthly").nextCharge);
      expect(p.windowStart).toEqual(p.currentStart);
    });

    it("period already over", () => {
      const p = computeExtendedPeriod("quarterly", paid, {
        status: "active",
        currentStart: at(2026, 1, 1),
        currentEnd: at(2026, 2, 1),
      });
      expect(p.extended).toBe(false);
      expect(p.currentEnd).toEqual(fresh("quarterly").currentEnd);
    });

    it("a period ending exactly at the payment instant isn't remaining time", () => {
      const start = fresh("monthly").currentStart;
      const p = computeExtendedPeriod("monthly", paid, {
        status: "active",
        currentStart: at(2026, 9, 1),
        currentEnd: new Date(start.getTime()),
      });
      expect(p.extended).toBe(false);
    });

    it.each(["expired", "", null, undefined, "pending"])(
      "an unexpired end under status %j is not paid coverage, so it isn't carried over",
      (status) => {
        const p = computeExtendedPeriod("monthly", paid, {
          status: status as any,
          currentEnd: at(2027, 12, 31, 23, 59, 59),
        });
        expect(p.extended).toBe(false);
        expect(p.currentEnd).toEqual(fresh("monthly").currentEnd);
      }
    );

    it("no end date, or an unreadable one", () => {
      expect(
        computeExtendedPeriod("monthly", paid, {
          status: "active",
          currentEnd: null,
        }).extended
      ).toBe(false);
      expect(
        computeExtendedPeriod("monthly", paid, {
          status: "active",
          currentEnd: new Date(NaN),
        }).extended
      ).toBe(false);
    });
  });

  describe("when paid time remains — the purchase adds to it", () => {
    const running = {
      status: "active",
      currentStart: at(2026, 7, 1),
      currentEnd: at(2026, 12, 31, 23, 59, 59),
    };

    it.each([
      ["monthly", "2027-01-01", "2027-01-31"],
      ["quarterly", "2027-01-01", "2027-03-31"],
      ["annually", "2027-01-01", "2027-12-31"],
    ] as const)(
      "%s: starts the second the current period ends, with no gap and no overlap",
      (interval, windowStart, end) => {
        const p = computeExtendedPeriod(interval, paid, running);
        expect(p.extended).toBe(true);
        expect(ymd(p.windowStart)).toBe(windowStart);
        expect(hms(p.windowStart)).toBe("00:00:00");
        expect(ymd(p.currentEnd)).toBe(end);
        expect(hms(p.currentEnd)).toBe("23:59:59");
        // the next period begins exactly where this one stops
        expect(p.currentEnd.getTime() + 1000).toBe(p.nextCharge.getTime());
      }
    );

    it("keeps the coverage's original start, so currentStart..currentEnd is the whole continuous stretch", () => {
      const p = computeExtendedPeriod("monthly", paid, running);
      expect(p.currentStart).toEqual(running.currentStart);
    });

    it("counts a canceled (auto-renew off) or past_due subscription that is still inside its period", () => {
      for (const status of ["canceled", "past_due"]) {
        expect(
          computeExtendedPeriod("monthly", paid, { ...running, status })
            .extended
        ).toBe(true);
      }
    });

    it("two purchases in a row add up: monthly then annual = 13 months of coverage, nothing lost", () => {
      const first = computeExtendedPeriod("monthly", paid, running);
      const second = computeExtendedPeriod("annually", paid, {
        status: "active",
        currentStart: first.currentStart,
        currentEnd: first.currentEnd,
      });
      expect(ymd(second.windowStart)).toBe("2027-02-01");
      expect(ymd(second.currentEnd)).toBe("2028-01-31");
    });

    it("a card renewal landing on top of credit someone else bought keeps that credit", () => {
      // e.g. an association (or an admin) granted a year; the surveyor's own
      // monthly renewal then fires. It used to reset the end to ~1 month away.
      const credit = {
        status: "active",
        currentStart: at(2026, 10, 1),
        currentEnd: at(2027, 9, 30, 23, 59, 59),
      };
      const p = computeExtendedPeriod("monthly", paid, credit);
      expect(ymd(p.currentEnd)).toBe("2027-10-31");
    });

    it("anchors on the 29th-31st clamp to the shorter month and stay on the clamped day (documented, bounded to 3 days)", () => {
      const p = computeExtendedPeriod("monthly", paid, {
        status: "active",
        currentEnd: at(2027, 1, 30, 23, 59, 59),
      });
      // window starts 31 Jan, +1 month clamps to 28 Feb, so the period ends 27 Feb
      expect(ymd(p.windowStart)).toBe("2027-01-31");
      expect(ymd(p.nextCharge)).toBe("2027-02-28");
      expect(ymd(p.currentEnd)).toBe("2027-02-27");

      const next = computeExtendedPeriod("monthly", paid, {
        status: "active",
        currentEnd: p.currentEnd,
      });
      expect(ymd(next.nextCharge)).toBe("2027-03-28"); // not back to the 31st
      expect(ymd(next.currentEnd)).toBe("2027-03-27");
    });
  });
});

describe("computePeriodPerTimestamp is unchanged for a payment made when nothing is running", () => {
  it("is one calendar month / quarter / year from the payment, ending a second before the next charge", () => {
    const paid = new Date("2026-10-04T10:00:00Z");
    for (const [interval, months] of [
      ["monthly", 1],
      ["quarterly", 3],
      ["annually", 12],
    ] as const) {
      const p = computePeriodPerTimestamp(interval, paid);
      expect(p.nextCharge).toEqual(addCalendarMonths(p.currentStart, months));
      expect(p.currentEnd.getTime()).toBe(p.nextCharge.getTime() - 1000);
    }
  });

  it("no longer runs long when the payment lands on the 29th-31st", () => {
    // 31 Jan 2027 monthly used to end on 2 Mar (Feb 31 spilled into March).
    const p = computePeriodPerTimestamp(
      "monthly",
      new Date("2027-01-31T10:00:00Z")
    );
    expect(ymd(p.nextCharge)).toBe("2027-02-28");
  });
});
