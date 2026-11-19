import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { reverseGeocode } from "@/surfboard/services/googleMapsService";
import { parseReverseGeocodeQuery } from "@/surfboard/utils/mapGoogleInput";
import { spendMapAllowance } from "@/surfboard/utils/mapGoogleGuard";
import { MAP_REVERSE_GEOCODE_LIMIT } from "@/surfboard/utils/mapGoogleLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/map/reverse-geocode?lat=&lng= — the address and nearest named place under a
 * point the person tapped on the map: `{ address, name }`, either null when Google knows nothing
 * there (that is an answer, not an error: the app shows the coordinates). An account has
 * MAP_REVERSE_GEOCODE_LIMIT a day; nothing about the point is logged or stored.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const at = parseReverseGeocodeQuery(req.nextUrl.searchParams);
    await spendMapAllowance(
      "reverse",
      ctx.session.sub,
      MAP_REVERSE_GEOCODE_LIMIT
    );
    const data = await reverseGeocode(at);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
