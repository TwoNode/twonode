import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { autocompletePlaces } from "@/surfboard/services/googleMapsService";
import { parseAutocompleteQuery } from "@/surfboard/utils/mapGoogleInput";
import { spendMapAllowance } from "@/surfboard/utils/mapGoogleGuard";
import { MAP_AUTOCOMPLETE_LIMIT } from "@/surfboard/utils/mapGoogleLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/map/places/autocomplete?input=&sessionToken=&near=lat,lng — up to five places
 * in Nigeria that match what is being typed (streets, addresses, landmarks, businesses,
 * neighbourhoods), nearest to `near` (where the map is looking) first. `sessionToken` is one
 * random token per search, reused until a result is picked, because Google bills a session's
 * suggestions together. An account has MAP_AUTOCOMPLETE_LIMIT a day; nothing typed is logged or stored.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { input, sessionToken, near } = parseAutocompleteQuery(
      req.nextUrl.searchParams
    );
    await spendMapAllowance(
      "autocomplete",
      ctx.session.sub,
      MAP_AUTOCOMPLETE_LIMIT
    );
    const suggestions = await autocompletePlaces(input, sessionToken, near);
    return NextResponse.json({ success: true, data: { suggestions } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
