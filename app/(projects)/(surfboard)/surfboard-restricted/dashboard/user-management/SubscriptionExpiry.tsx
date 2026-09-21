import { format } from "date-fns";
import { subscriptionExpiry, type ExpiryTone } from "@/surfboard/utils/subscriptionExpiry";

const TONE_CLASSES: Record<ExpiryTone, string> = {
  none: "text-gray-500 dark:text-gray-400",
  ok: "text-gray-600 dark:text-gray-400",
  soon: "font-medium text-amber-700 dark:text-amber-400",
  expired: "font-medium text-red-700 dark:text-red-400",
};

/** One line under a user's plan: when the subscription ends, and how close (or how far past) that is. */
export function SubscriptionExpiry({ currentEnd }: { currentEnd?: Date | string | null }) {
  const { tone, date, relative } = subscriptionExpiry(currentEnd);

  if (!date) {
    return <div className={`mt-1 text-xs ${TONE_CLASSES.none}`}>No end date</div>;
  }

  return (
    <div className={`mt-1 text-xs ${TONE_CLASSES[tone]}`}>
      {tone === "expired" ? "Expired" : "Expires"} {format(date, "MMM d, yyyy")}
      <span className="font-normal opacity-80"> · {relative}</span>
    </div>
  );
}
