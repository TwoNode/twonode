import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { getNativeSessionAsLegacyUserData } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";
import { pickRevaPanelUser, type RevaPanelUser } from "./panelUser";

/**
 * The signed-in REVA user, read on the server, for the panel layouts.
 *
 * Same sources and order as `GET /api/v1/reva/session` (the legacy
 * multi-platform cookie, then the native JWT session), so the panel can draw
 * with the right role and menu on the first paint instead of waiting for the
 * browser to ask. proxy.ts remains the security boundary: this only removes
 * the wait. Returns null (the layouts then fall back to the browser check)
 * when there is no session or anything fails.
 */
export async function getInitialRevaPanelUser(): Promise<RevaPanelUser | null> {
  try {
    const data =
      (await getEncryptedUserData()) ??
      (await getNativeSessionAsLegacyUserData(Platform.REVA));
    return pickRevaPanelUser(data as Parameters<typeof pickRevaPanelUser>[0]);
  } catch {
    return null;
  }
}
