import crypto from "crypto";
import { countAttempts } from "@/lib/auth/rateLimit";
import { logger } from "@/lib/observability/logger";
import { WEB_LOGIN_TURNSTILE_ACTION } from "@/lib/auth/loginChallenge";

export { WEB_LOGIN_TURNSTILE_ACTION };

/**
 * The web sign-in's account-wide guard (I-058).
 *
 * The per-client limit (lib/auth/rateLimit.ts: 5 per 5 minutes per IP and
 * email) never sees a script that rotates its exit address and stops at three
 * tries: every try arrives from a "new" client. This counts the FAILED tries
 * against one account from every address together, and answers three ways:
 *
 * - `ok`: nothing unusual.
 * - `challenge`: two failures in the window. When Cloudflare Turnstile is on,
 *   the next try must carry a solved challenge; the owner who mistyped twice
 *   solves it and goes on, a script cannot. (A challenge, not a lock-out: an
 *   attacker cannot use this to keep the real owner out, see I-013.)
 * - `blocked`: twenty failures in the window. No person fails twenty times in
 *   a quarter of an hour. This is the backstop for a script that solves
 *   challenges, and the only layer while Turnstile is off. The owner can
 *   still reset the password by email, and the lock ends by itself.
 *
 * The count is kept under the email whether or not the account exists, so the
 * answer never tells a stranger which addresses are registered.
 */
export const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
export const ACCOUNT_CHALLENGE_AFTER = 2;
export const ACCOUNT_FAILURE_CAP = 20;

export type AccountGuardState = {
  failures: number;
  state: "ok" | "challenge" | "blocked";
};

/** The LoginAttempt identifier the account's failures are kept under. */
export function accountFailureKey(email: string): string {
  return `web-login-fail:${email.trim().toLowerCase()}`;
}

export async function getAccountGuardState(
  email: string
): Promise<AccountGuardState> {
  const failures = await countAttempts(
    accountFailureKey(email),
    ACCOUNT_WINDOW_MS
  );
  const state =
    failures >= ACCOUNT_FAILURE_CAP
      ? "blocked"
      : failures >= ACCOUNT_CHALLENGE_AFTER
        ? "challenge"
        : "ok";
  return { failures, state };
}

/**
 * A short stand-in for an email address or an IP in a log line: enough to see
 * that one account is being hit from many addresses (or the reverse) and to
 * find an account's lines from its address, without writing the address. It is
 * keyed (HMAC) so a list of guessed addresses cannot be hashed and matched
 * against the logs by anyone who does not hold the server secret.
 */
export function logTag(kind: "account" | "client", value: string): string {
  const secret = process.env.JWT_SECRET ?? "login-log-tag";
  return crypto
    .createHmac("sha256", secret)
    .update(`web-login:${kind}:${value.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 12);
}

export type WebLoginOutcome =
  | "ok"
  | "invalid_credentials"
  | "inactive"
  | "rate_limited"
  | "account_limited"
  | "challenge_required"
  | "challenge_failed"
  | "challenge_unavailable";

/**
 * One line per sign-in outcome (the mobile route does the same, see
 * lib/observability/mobileTags.ts): `ok` is `info`, every refusal is `warn`,
 * so a search finds the refusals and a count of `ok` against the rest gives the
 * rate. Never the email, the password or the IP: only tags (`logTag`), the
 * platform and, for an account that exists, its id.
 */
export function logWebLogin(
  outcome: WebLoginOutcome,
  fields: {
    platform: string;
    email: string;
    clientIp: string;
    userId?: string;
    reason?: string;
  }
): void {
  const level = outcome === "ok" ? "info" : "warn";
  logger[level]("Web sign-in", {
    event: "web.login",
    outcome,
    platform: fields.platform,
    accountTag: logTag("account", fields.email),
    clientTag: logTag("client", fields.clientIp),
    ...(fields.userId && { userId: fields.userId }),
    ...(fields.reason && { reason: fields.reason }),
  });
}
