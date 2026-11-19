import { RateLimitError } from "@/lib/api/errors";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { MAP_LIMIT_WINDOW_MS } from "@/surfboard/utils/mapGoogleLimits";

/**
 * Counts one use of a Google-backed map call against the account's daily allowance and refuses (429
 * RATE_LIMITED) once it is spent. The count is made before Google is asked, so a refused call costs nothing.
 */
export async function spendMapAllowance(
  kind: "route" | "autocomplete" | "place" | "reverse",
  userId: string,
  max: number
): Promise<void> {
  const allowed = await consumeRateLimit(`map-${kind}:${userId}`, userId, {
    windowMs: MAP_LIMIT_WINDOW_MS,
    max,
  });
  if (!allowed) throw new RateLimitError();
}
