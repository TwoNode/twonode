/**
 * How a subscription's end date reads in the admin User Management list.
 * "Expiring soon" uses the same window as the list's Expiring-soon filter
 * (adminUserService), so a row flagged here is exactly what that filter finds.
 */

export const EXPIRING_SOON_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ExpiryTone = "none" | "ok" | "soon" | "expired";

export interface SubscriptionExpiry {
  tone: ExpiryTone;
  /** The end date, or null when the subscription has none. */
  date: Date | null;
  /** "in 12 days", "3 days ago", "today" — empty when there is no date. */
  relative: string;
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function subscriptionExpiry(
  currentEnd: Date | string | null | undefined,
  now: Date = new Date()
): SubscriptionExpiry {
  if (!currentEnd) return { tone: "none", date: null, relative: "" };
  const date = new Date(currentEnd);
  if (Number.isNaN(date.getTime())) return { tone: "none", date: null, relative: "" };

  const diff = date.getTime() - now.getTime();

  if (diff < 0) {
    const daysAgo = Math.floor(-diff / DAY_MS);
    return { tone: "expired", date, relative: daysAgo === 0 ? "today" : `${plural(daysAgo, "day")} ago` };
  }

  const daysLeft = Math.ceil(diff / DAY_MS);
  return {
    tone: diff <= EXPIRING_SOON_WINDOW_DAYS * DAY_MS ? "soon" : "ok",
    date,
    relative: daysLeft <= 1 ? "today or tomorrow" : `in ${plural(daysLeft, "day")}`,
  };
}
