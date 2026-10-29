import { NextRequest, NextResponse } from "next/server";
import { prunePushCooldowns } from "@/lib/push/cooldown";
import { checkPushReceipts } from "@/lib/push/receipts";

/**
 * Triggered on a schedule by Vercel Cron (see vercel.json's "crons" entry): reads
 * the delivery receipts of pushes sent at least 15 minutes ago and deletes the
 * push tokens they name as dead (TASK-0015 1I.6). Vercel signs cron requests
 * with a bearer token matching CRON_SECRET; anything else is refused, and with
 * no CRON_SECRET configured the route refuses every request, like the
 * subscription reminder cron. The receipts check does nothing when PUSH_ENABLED
 * is not "1". The same run deletes the cool-down rows (TASK-0015 1I.4) that are
 * over a day old.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await checkPushReceipts();
    const prunedCooldowns = await prunePushCooldowns();
    return NextResponse.json({
      success: true,
      data: { ...result, prunedCooldowns },
    });
  } catch (error) {
    console.error("push-receipts cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
