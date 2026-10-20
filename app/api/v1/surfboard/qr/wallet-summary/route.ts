import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getWalletSummary } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/qr/wallet-summary — the wallet as the mobile app shows
 * it (TASK-0015 1F.4): balances, this month's earnings and the ten latest
 * earnings as plan number, service, amount and date. No bank account, payer
 * details or access token, and it never creates the wallet
 * (`earnings-overview` does both).
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getWalletSummary(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
