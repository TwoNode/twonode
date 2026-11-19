import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlaceDetails } from "@/surfboard/services/googleMapsService";
import { parsePlaceDetailsRequest } from "@/surfboard/utils/mapGoogleInput";
import { spendMapAllowance } from "@/surfboard/utils/mapGoogleGuard";
import { MAP_PLACE_DETAILS_LIMIT } from "@/surfboard/utils/mapGoogleLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ placeId: string }> };

/**
 * GET /api/v1/surfboard/map/places/{placeId}?sessionToken= — where one of the suggested places is:
 * `{ placeId, address, location: { lat, lng } }`. It ends the search's session (pass the token the
 * suggestions were asked with). An account has MAP_PLACE_DETAILS_LIMIT a day. 404 for a place
 * Google does not know.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { placeId } = await routeCtx.params;
    const request = parsePlaceDetailsRequest(placeId, req.nextUrl.searchParams);
    await spendMapAllowance("place", ctx.session.sub, MAP_PLACE_DETAILS_LIMIT);
    const data = await getPlaceDetails(request.placeId, request.sessionToken);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
