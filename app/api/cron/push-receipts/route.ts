import { NextRequest, NextResponse } from "next/server";
import { checkPushReceipts } from "@/lib/push/receipts";

/**
 * Triggered on a schedule by Vercel Cron (see vercel.json's "crons" entry): reads
 * the delivery receipts of pushes sent at least 15 minutes ago and deletes the
 * push tokens they name as dead (TASK-0015 1I.6). Vercel signs cron requests
 * with a bearer token matching CRON_SECRET; anything else is refused, and with
 * no CRON_SECRET configured the route refuses every request, like the
 * subscription reminder cron. Does nothing when PUSH_ENABLED is not "1".
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
    return NextResponse.json({ success: true, data: result });
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
