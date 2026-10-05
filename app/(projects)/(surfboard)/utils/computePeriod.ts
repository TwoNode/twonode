export type SubscriptionInterval = "monthly" | "quarterly" | "annually";

const MONTHS_PER_INTERVAL: Record<SubscriptionInterval, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

/**
 * Calendar-month addition that clamps to the last day of a shorter month
 * (31 Jan + 1 month = 28 Feb, not 3 Mar). Works on the Date's local
 * (server-zone) fields, the same frame computePeriodPerTimestamp stores its
 * results in — so it must only ever be fed dates produced there, never a raw
 * Paystack instant.
 *
 * The day is pinned to the 1st BEFORE the month is changed: calling
 * `setMonth` on the 31st first overflows into the following month (Jan 31 →
 * "Feb 31" → 3 Mar) and the clamp afterwards has nothing left to clamp. (This
 * function used to do exactly that, so periods starting on the 29th–31st ran
 * up to three days long.)
 */
export const addCalendarMonths = (date: Date, months: number) => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(day, daysInTargetMonth));
  return result;
};

/**
 * Computes subscription period and next charge date based on interval.
 * Uses rolling intervals relative to the payment time.
 *
 * This is the period for a payment made when nothing is running. A payment
 * made while paid time remains must not use it directly (it would throw the
 * remaining time away) — use computeExtendedPeriod.
 */
export const computePeriodPerTimestamp = (
  interval: SubscriptionInterval,
  referenceDate?: Date
) => {
  const timeZone = "Africa/Lagos";
  const now = referenceDate;

  if (!now) {
    throw new Error("Reference date is required");
  }

  // Convert to Lagos time (date-only precision)
  const toLagosDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((p) => [p.type, p.value])
    );

    return new Date(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
  };

  const currentStart = toLagosDate(now);
  const monthsToAdd = MONTHS_PER_INTERVAL[interval];

  const nextCharge = addCalendarMonths(currentStart, monthsToAdd);
  const currentEnd = new Date(nextCharge.getTime() - 1000); // 1 sec before nextCharge

  return { currentStart, currentEnd, nextCharge };
};

/** Statuses under which an unexpired `currentEnd` is paid-for coverage (anything else, e.g. "expired", is not credit to carry over). */
const COVERAGE_STATUSES = new Set(["active", "past_due", "canceled"]);

export type ExistingPeriod = {
  status?: string | null;
  currentStart?: Date | null;
  currentEnd?: Date | null;
};

/**
 * The period a payment buys, given what the account already has.
 *
 * - Nothing running (no subscription, an ended period, or a status that isn't
 *   coverage): a fresh period from the payment date — exactly
 *   computePeriodPerTimestamp.
 * - Paid time still remaining when the payment lands: the new period starts
 *   the instant the current one ends, so no paid days are lost. Whoever pays
 *   (the user early, an association for them, a card renewal landing after an
 *   admin granted credit), purchases ADD.
 *
 * `currentStart`/`currentEnd` describe the whole continuous coverage;
 * `windowStart`..`currentEnd` is just the stretch THIS payment bought (what
 * the history ledger records). `extended` tells which case applied.
 *
 * Month-end note: the new period is `addCalendarMonths(windowStart, n)`, so an
 * anniversary on the 29th–31st clamps (31 Jan → 28 Feb) and the chained anchor
 * stays on the clamped day afterwards (28 Mar, 28 Apr…), up to three days
 * earlier than the original date; it does not compound beyond that.
 */
export const computeExtendedPeriod = (
  interval: SubscriptionInterval,
  paidDate: Date,
  existing?: ExistingPeriod | null
) => {
  const fresh = computePeriodPerTimestamp(interval, paidDate);
  const existingEnd = existing?.currentEnd
    ? new Date(existing.currentEnd)
    : null;

  // Compared in the stored (Lagos wall-clock) frame: fresh.currentStart IS the
  // payment instant in that frame, existingEnd was stored in it.
  const covered =
    existingEnd !== null &&
    !Number.isNaN(existingEnd.getTime()) &&
    COVERAGE_STATUSES.has(existing?.status ?? "") &&
    existingEnd.getTime() > fresh.currentStart.getTime();

  if (!covered || existingEnd === null) {
    return {
      currentStart: fresh.currentStart,
      currentEnd: fresh.currentEnd,
      nextCharge: fresh.nextCharge,
      windowStart: fresh.currentStart,
      extended: false as const,
    };
  }

  const windowStart = new Date(existingEnd.getTime() + 1000);
  const nextCharge = addCalendarMonths(
    windowStart,
    MONTHS_PER_INTERVAL[interval]
  );
  return {
    currentStart: existing?.currentStart ?? fresh.currentStart,
    currentEnd: new Date(nextCharge.getTime() - 1000), // 1 sec before nextCharge
    nextCharge,
    windowStart,
    extended: true as const,
  };
};

/**
 * Computes subscription period based on interval
 */
function computePeriodPerQuarter(
  interval: "monthly" | "quarterly" | "annually",
  referenceDate?: Date
) {
  const timeZone = "Africa/Lagos";
  const now = referenceDate || new Date();

  // Helper to convert date to Lagos timezone
  const toLagosDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === "year")!.value);
    const month = parseInt(parts.find((p) => p.type === "month")!.value);
    const day = parseInt(parts.find((p) => p.type === "day")!.value);

    return new Date(year, month - 1, day);
  };

  const currentStart = toLagosDate(now);

  if (interval === "monthly") {
    // End of current month
    const currentEnd = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Next charge on 1st of next month
    const nextCharge = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth() + 1,
      1
    );

    return { currentStart, currentEnd, nextCharge };
  }

  if (interval === "quarterly") {
    const quarter = Math.floor(currentStart.getMonth() / 3);
    const quarterStartMonth = quarter * 3;

    const periodStart = new Date(
      currentStart.getFullYear(),
      quarterStartMonth,
      1
    );

    const currentEnd = new Date(
      currentStart.getFullYear(),
      quarterStartMonth + 3,
      0,
      23,
      59,
      59
    );

    const nextCharge = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth() + 1,
      1
    );

    return { currentStart: periodStart, currentEnd, nextCharge };
  }

  if (interval === "annually") {
    // Annually
    const periodStart = new Date(currentStart.getFullYear(), 0, 1);
    const currentEnd = new Date(currentStart.getFullYear(), 11, 31, 23, 59, 59);
    const nextCharge = new Date(currentStart.getFullYear() + 1, 0, 1);

    return { currentStart: periodStart, currentEnd, nextCharge };
  }

  return { currentStart, currentEnd: null, nextCharge: null };
}
