/**
 * Cloudflare Turnstile, server side ("siteverify").
 *
 * A public form shows a Turnstile widget; the visitor's browser solves it and
 * gets a single-use token. The token means nothing until THIS check redeems it
 * with the secret key — never from the browser, always from our own route.
 *
 * Fails closed: if Cloudflare cannot be reached or answers anything odd, the
 * request is refused. A token is accepted only when siteverify says success,
 * the token was minted for the same form (`action`), and on a hostname we serve.
 *
 * Environment:
 * - `TURNSTILE_SECRET` (server only) and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (the
 *   public key the widget uses). Both set = the check is ON. Either missing =
 *   OFF (the other layers on the form still apply), so deploying this code
 *   before the keys are added changes nothing.
 * - `TURNSTILE_HOSTNAMES` (optional, comma separated): the exact hostnames the
 *   widget may have been solved on, e.g. `www.twonodetechnologies.com`. Without
 *   it the hostname of the request itself is expected, which is the same thing
 *   for a same-origin form. Never list `localhost` for production.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const TIMEOUT_MS = 10_000;

/** Why a token was refused. `unavailable` is Cloudflare or the network, not the visitor. */
export type TurnstileFailure =
  | "missing-token"
  | "rejected"
  | "wrong-action"
  | "wrong-hostname"
  | "unavailable";

export type TurnstileResult =
  { ok: true } | { ok: false; reason: TurnstileFailure; codes?: string[] };

/** True when both keys are present: the form must then carry a valid token. */
export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
}

function expectedHostnames(requestHost?: string | null): Set<string> {
  const configured = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) return new Set(configured);

  // The widget is solved on the page, and the page calls its own origin, so the
  // request's host (without a port) is the hostname siteverify will report.
  const host = requestHost
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  return host ? new Set([host]) : new Set();
}

export async function verifyTurnstile(input: {
  /** `turnstileToken` from the request body (untrusted: anything can arrive here). */
  token: unknown;
  /** The surface's own action, set as `action` on its widget, e.g. "contact". */
  action: string;
  remoteIp?: string;
  /** The `Host` of the request, used when `TURNSTILE_HOSTNAMES` is not set. */
  requestHost?: string | null;
}): Promise<TurnstileResult> {
  const { token, action, remoteIp, requestHost } = input;

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return { ok: false, reason: "missing-token" };
  }

  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return { ok: false, reason: "unavailable" };

  const hostnames = expectedHostnames(requestHost);
  if (hostnames.size === 0) return { ok: false, reason: "wrong-hostname" };

  let result: {
    success?: unknown;
    action?: unknown;
    hostname?: unknown;
    "error-codes"?: unknown;
  };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`siteverify answered ${res.status}`);
    result = await res.json();
  } catch (err) {
    // Network error, timeout, non-2xx or a body that is not JSON.
    console.error(
      "[turnstile] siteverify unavailable:",
      err instanceof Error ? err.message : "unknown error"
    );
    return { ok: false, reason: "unavailable" };
  }

  if (result?.success !== true) {
    const codes = Array.isArray(result?.["error-codes"])
      ? (result["error-codes"] as unknown[]).filter(
          (c): c is string => typeof c === "string"
        )
      : [];
    // A wrong or missing secret is OUR mistake and blocks every visitor: say so loudly.
    if (
      codes.includes("invalid-input-secret") ||
      codes.includes("missing-input-secret")
    ) {
      console.error(
        "[turnstile] the secret key was refused: check TURNSTILE_SECRET",
        codes
      );
    }
    // Cloudflare asks to try again; that is its trouble, not a bad visitor.
    if (codes.includes("internal-error")) {
      return { ok: false, reason: "unavailable", codes };
    }
    return { ok: false, reason: "rejected", codes };
  }

  if (result.action !== action) return { ok: false, reason: "wrong-action" };

  if (
    typeof result.hostname !== "string" ||
    !hostnames.has(result.hostname.toLowerCase())
  ) {
    return { ok: false, reason: "wrong-hostname" };
  }

  return { ok: true };
}
