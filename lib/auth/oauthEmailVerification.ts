import { Platform } from "@/utils/platform";
import { clearPasswordHash, markEmailVerified } from "@/lib/auth/userLookup";
import { revokeUserSession } from "@/lib/auth/session";

/**
 * Marks an account's email verified because the person just signed in through
 * the identity provider (Kinde, e.g. Google), which confirmed the address.
 *
 * If the account was NOT verified and has a password, that password was set by
 * whoever created the account, who was never shown to own the address (a
 * grandfathered account from before registration verified email first). The
 * identity provider's login proves the real owner, not the person who chose
 * the password, so linking the two would hand the owner's account to someone
 * who can still sign in with that password. The password is removed and every
 * refresh token revoked; the owner signs in with the provider and can set a
 * new password through the reset flow.
 *
 * Call before issuing the new session, since it revokes existing ones.
 */
export async function verifyEmailViaOAuth(
  platform: Platform,
  user: { id: string; emailVerified: boolean; passwordHash?: string | null }
): Promise<void> {
  if (user.emailVerified) return;

  if (user.passwordHash) {
    await clearPasswordHash(platform, user.id);
    await revokeUserSession(platform, user.id);
  }
  await markEmailVerified(platform, user.id, "OAUTH");
}
