import crypto from "crypto";
import { logger, type LogContext } from "@/lib/observability/logger";

/**
 * What a log line says about the mobile app that made the request (TASK-0015
 * 1J.1), so a spike in 401, 403 or 426 can be read per app version and store
 * instead of as one number. The app sends `X-App-Version` and `X-App-Platform`
 * on every call; a website request sends neither and gets no tags.
 *
 * Both values come from the client, so they are only ever shortened and
 * checked, never trusted: a value that does not look like a version is logged
 * as `"invalid"`, not as typed. No email, password, token or file link is ever
 * part of a tag or an auth event.
 */

type HeaderBag = { get(name: string): string | null };

export type MobileTags = {
  appPlatform?: "android" | "ios" | "unknown";
  appVersion?: string;
};

const VERSION_TEXT = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,31}$/;

export function mobileTags(req: { headers: HeaderBag }): MobileTags {
  const platform = req.headers.get("x-app-platform");
  const version = req.headers.get("x-app-version");
  const tags: MobileTags = {};
  if (platform !== null) {
    const store = platform.trim().toLowerCase();
    tags.appPlatform =
      store === "android" || store === "ios" ? store : "unknown";
  }
  if (version !== null) {
    const text = version.trim();
    tags.appVersion = VERSION_TEXT.test(text) ? text : "invalid";
  }
  return tags;
}

/** The context every mobile route hands to the shared error handler: where, and which build. */
export function mobileRequestContext(req: {
  method: string;
  nextUrl: { pathname: string };
  headers: HeaderBag;
}): LogContext {
  return {
    route: req.nextUrl.pathname,
    method: req.method,
    ...mobileTags(req),
  };
}

/**
 * A short stand-in for a device id: enough to tell one phone's events from
 * another's in the logs, and to find a phone's events from its id, without
 * writing the id itself (which is the key to its push token and its sessions).
 */
export function deviceHash(deviceId: string): string {
  return crypto
    .createHash("sha256")
    .update(deviceId)
    .digest("hex")
    .slice(0, 12);
}

export type MobileAuthEvent = "mobile.login" | "mobile.refresh";

/**
 * One line for a sign-in or refresh outcome. `ok` is `info`; every refusal is
 * `warn`, so a search for `event` and `outcome` finds the failures and a count
 * of `ok` against the rest gives the rate. Refresh is logged only when it
 * fails: it happens every few minutes per phone and the platform's request log
 * already counts the successes.
 */
export function logMobileAuthEvent(
  event: MobileAuthEvent,
  outcome: string,
  fields: LogContext
): void {
  const level = outcome === "ok" ? "info" : "warn";
  logger[level]("Mobile auth event", { event, outcome, ...fields });
}
