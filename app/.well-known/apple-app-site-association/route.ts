import { NextResponse } from "next/server";

/**
 * Tells iOS which links on this site the Surfboard app may open instead of Safari (universal
 * links, TASK-0015 1H). Apple fetches it from the live site only, over https with no redirect,
 * when the app is installed. Only the email verification link opens the app: the reset link
 * stays on the website (TASK-0002 P3-D1) and invitations are for administrators on the web.
 * `2VU8V89255` is the Apple team that owns the app.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: ["2VU8V89255.com.twonode.surfboard"],
            components: [
              { "/": "/surfboard/verify-email", "?": { token: "?*" } },
            ],
          },
        ],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
