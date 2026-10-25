import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { parseAppVersion, resetMobileControlsCache } from "@/lib/api/mobileApp";
import {
  getMobileAppSettings,
  updateMobileAppSettings,
} from "@/surfboard/services/settingsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const ADMINS = [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];

/** "" (no minimum) or a version the gate can compare: "1", "1.2" or "1.2.3". */
const version = z
  .string()
  .trim()
  .refine((value) => value === "" || parseAppVersion(value) !== null, {
    message: 'Use a version such as "1.2.0", or "" for no minimum',
  });

/** "" (the update screen only says to update) or an https address. */
const storeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (value === "") return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: 'Use an https address, or "" for none' }
  );

/** Only the keys sent change; an empty body, or a key we do not know, is refused. */
const bodySchema = z
  .object({
    minimumAndroidVersion: version,
    minimumIosVersion: version,
    androidStoreUrl: storeUrl,
    iosStoreUrl: storeUrl,
    signInEnabled: z.boolean(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Send at least one setting to change",
  });

/**
 * The mobile app's controls (TASK-0015 1B and 1J.3): the lowest app version
 * the server still serves, per store, where the update screen sends people,
 * and the emergency switch for new sign-ins. Admins only. Other server
 * instances pick a change up within a minute (lib/api/mobileApp.ts).
 */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getMobileAppSettings();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: ADMINS }
);

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const patch = await validateBody(req, bodySchema);
    const data = await updateMobileAppSettings(ctx.session.sub, patch);
    resetMobileControlsCache();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: ADMINS }
);
