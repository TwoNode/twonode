import prisma from "@/lib/prisma";
import type { SubscriptionData } from "@/utils/encryptedCookies";

/**
 * Split out of utils/encryptedCookies.ts so that file (and anything that
 * only needs its cookie/JWT helpers, like proxy.ts's legacy Kinde flow) has
 * no Prisma import in its own module scope — Prisma Client instantiation is
 * a module-load-time side effect, so any file that imports this one pulls
 * Prisma's native query engine into its bundle even if this function is
 * never actually called at runtime. Keeping it isolated here means only
 * code that has a genuine reason to hit the DB pays that cost.
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
