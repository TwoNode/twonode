import prisma from "@/lib/prisma";
import type { PushKind } from "@/lib/push/pushEvents";

/**
 * At most one push of a kind to a person in a 5 minute window (TASK-0015 1I.4).
 * A whole batch queried at once would otherwise send each surveyor one identical
 * notification per plan; the words are generic, so the second says nothing the
 * first did not, and the plans themselves are listed in the app.
 *
 * The window is a fixed bucket (the time divided by 5 minutes), claimed by
 * writing a row whose id is the person, the kind and the bucket: a second write
 * is a unique-key conflict, which makes the claim atomic across servers with
 * no lock. The cost is that two pushes either side of a bucket boundary can
 * both be sent, which is fine for a cool-down.
 */
export const COOLDOWN_WINDOW_MS = 5 * 60 * 1000;
/** Old rows are of no use after their window; kept a day so a clock slip cannot matter. */
export const COOLDOWN_KEEP_MS = 24 * 60 * 60 * 1000;

export function cooldownId(userId: string, kind: PushKind, now: Date): string {
  return `${userId}:${kind}:${Math.floor(now.getTime() / COOLDOWN_WINDOW_MS)}`;
}

/** The people, of these, whose window for this kind was free and is now taken. */
export async function claimPushWindow(
  userIds: string[],
  kind: PushKind,
  now: Date = new Date()
): Promise<Set<string>> {
  const claimed = new Set<string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const result = await prisma.pushCooldown.createMany({
        data: [{ id: cooldownId(userId, kind, now), sentAt: now }],
        skipDuplicates: true,
      });
      if (result.count === 1) claimed.add(userId);
    })
  );
  return claimed;
}

/** Deletes windows older than a day. Run by the receipts cron. */
export async function prunePushCooldowns(
  now: Date = new Date()
): Promise<number> {
  const result = await prisma.pushCooldown.deleteMany({
    where: { sentAt: { lt: new Date(now.getTime() - COOLDOWN_KEEP_MS) } },
  });
  return result.count;
}
