import getPrismaEdge from "@/lib/prismaEdge";
import type { SubscriptionData } from "@/utils/encryptedCookies";

/**
 * Accelerate-backed subscription lookup, used ONLY by proxy.ts's native-
 * session fast path — the one call site that runs in the Edge Runtime and
 * can't use lib/prisma.ts's native query engine. Everywhere else
 * (updateLastActivityAndSubscription, getNativeSessionAsLegacyUserData)
 * keeps using the regular getUserActiveSubscription in
 * lib/subscriptionQueries.ts — no reason to route Node-runtime callers
 * through Accelerate too. See lib/prismaEdge.ts's comment for why
 * PRISMA_ACCELERATE_URL must be set before this actually works.
 */
export async function getUserActiveSubscriptionEdge(userId: string) {
  try {
    const prisma = getPrismaEdge();
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
