import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { assertMobileClientAllowed } from "@/lib/api/mobileApp";
import {
  LEGAL_VERSION,
  SURFBOARD_PRIVACY_PATH,
  SURFBOARD_TERMS_PATH,
} from "@/lib/legal/surfboard";
import { getSiteUrl } from "@/lib/siteUrl";
import { mobileRequestContext } from "@/lib/observability/mobileTags";

/**
 * GET /api/v1/auth/mobile/legal: the version of the Terms of Use and Privacy Policy a new account
 * must agree to, and where to read them. The app shows the links beside its "I agree" box and
 * sends `version` back as `acceptedLegalVersion` when it starts a sign-up; the server refuses any
 * other version, so a person always agrees to the text that is current when they sign up.
 * No session is needed (nobody has an account yet).
 */
export async function GET(req: NextRequest) {
  try {
    await assertMobileClientAllowed(req);
    const site = getSiteUrl().replace(/\/+$/, "");
    return NextResponse.json({
      success: true,
      data: {
        version: LEGAL_VERSION,
        termsUrl: `${site}${SURFBOARD_TERMS_PATH}`,
        privacyUrl: `${site}${SURFBOARD_PRIVACY_PATH}`,
      },
    });
  } catch (err) {
    return handleApiError(err, mobileRequestContext(req));
  }
}
