import prisma from "@/lib/prisma";
import type { SubscriptionData } from "@/utils/encryptedCookies";

/**
 * Split out of utils/encryptedCookies.ts so that file (and anything that
 * only needs its cookie/JWT helpers, like proxy.ts's legacy Kinde flow) has
 * no Prisma import in its own module scope — Prisma Client instantiation is
 * a module-load-time side effect, so any file that imports this one pulls
 * Prisma's native query engine into its bundle even if this function is
 * never actually called at runtime.
 *
 * This is the regular (non-Accelerate) version, for the existing Node-
 * runtime callers (encryptedCookies.ts's own updateLastActivityAndSubscription,
 * lib/auth/session.ts's getNativeSessionAsLegacyUserData) — no reason to
 * route those through Accelerate. proxy.ts's middleware uses the separate
 * Accelerate-backed getUserActiveSubscriptionEdge in
 * lib/auth/subscriptionLookup.ts instead, since only that call site runs in
 * the Edge Runtime.
 */
export async function getUserActiveSubscription(userId: string) {
  try {
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        OR: [
          { status: "active" },
          {
            // Include cancelled subscriptions still in grace period
            AND: [{ status: "canceled" }, { currentEnd: { gte: new Date() } }],
          },
        ],
      },
    });

    if (!sub) return null;

    return {
      status: sub.status,
      interval: sub.interval,
      expiresAt: sub.currentEnd,
      subCode: sub.subCode,
      planCode: sub.planCode,
      emailToken: sub.emailToken,
    } as SubscriptionData;
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}
