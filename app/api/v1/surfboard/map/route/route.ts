import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { computeRoute } from "@/surfboard/services/googleMapsService";
import { routeBodySchema } from "@/surfboard/utils/mapGoogleInput";
import { spendMapAllowance } from "@/surfboard/utils/mapGoogleGuard";
import { MAP_ROUTE_LIMIT } from "@/surfboard/utils/mapGoogleLimits";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * POST /api/v1/surfboard/map/route — a driving route from one place to another, for the app's
 * Navigate preview: `{ distanceMeters, durationSeconds, polyline }` (Google's encoded polyline).
 * Both places must be in Nigeria. Each call is billed to us by Google, so an account has
 * MAP_ROUTE_LIMIT a day; nothing about the places is logged or stored. 404 when there is no
 * route, 503 `MAP_SERVICE_UNAVAILABLE` when Google is not set up or does not answer.
 */
export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { origin, destination } = await validateBody(req, routeBodySchema);
    await spendMapAllowance("route", ctx.session.sub, MAP_ROUTE_LIMIT);
    const data = await computeRoute(origin, destination);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
