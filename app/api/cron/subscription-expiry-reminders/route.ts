import { NextRequest, NextResponse } from "next/server";
import { sendExpiringSubscriptionReminders } from "@/surfboard/services/subscriptionReminderService";

/**
 * Triggered daily by Vercel Cron (see vercel.json's "crons" entry). Vercel
 * signs cron requests with a bearer token matching CRON_SECRET — reject
 * anything else so this can't be hit by an outsider to spam every expiring
 * subscriber on demand. Fails closed: with no CRON_SECRET configured the
 * route refuses every request instead of running for anyone.
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
    const result = await sendExpiringSubscriptionReminders();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("subscription-expiry-reminders cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
