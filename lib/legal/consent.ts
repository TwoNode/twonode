import { Platform } from "@/utils/platform";
import { LEGAL_VERSION } from "@/lib/legal/surfboard";

/**
 * The version of a product's Terms of Use and Privacy Policy that a new account must agree to, or
 * null for a product that has no such text yet (REVA and GBC today). Registration for a product
 * with a version is refused unless the request carries exactly this version, so the agreement is
 * enforced by the server, not only by the checkbox on the page.
 */
export function currentLegalVersion(platform: Platform): string | null {
  return platform === Platform.SURFBOARD ? LEGAL_VERSION : null;
}
