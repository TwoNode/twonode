/**
 * Computes subscription period and next charge date based on interval.
 * Uses rolling intervals relative to the payment time.
 */
export const computePeriodPerTimestamp = (
  interval: "monthly" | "quarterly" | "annually",
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
  let monthsToAdd = 0;

  switch (interval) {
    case "monthly":
      monthsToAdd = 1;
      break;
    case "quarterly":
      monthsToAdd = 3;
      break;
    case "annually":
      monthsToAdd = 12;
      break;
  }

  // Helper to safely add months
  const addMonths = (date: Date, months: number) => {
    const newDate = new Date(date);
    const targetMonth = newDate.getMonth() + months;
    const endYear = newDate.getFullYear() + Math.floor(targetMonth / 12);
    const endMonth = targetMonth % 12;

    const daysInTargetMonth = new Date(endYear, endMonth + 1, 0).getDate();
    newDate.setFullYear(endYear);
    newDate.setMonth(endMonth);
    newDate.setDate(Math.min(newDate.getDate(), daysInTargetMonth));
    return newDate;
  };

  const nextCharge = addMonths(currentStart, monthsToAdd);
  const currentEnd = new Date(nextCharge.getTime() - 1000); // 1 sec before nextCharge

  return { currentStart, currentEnd, nextCharge };
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
