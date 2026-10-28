import { extractBearerToken } from "@/lib/auth/bearer";
import {
  AppUpdateRequiredError,
  MobileSignInDisabledError,
} from "@/lib/api/errors";
import { logger } from "@/lib/observability/logger";
import {
  DEFAULT_MOBILE_APP_SETTINGS,
  getMobileAppSettings,
  type MobileAppSettings,
} from "@/surfboard/services/settingsService";

/**
 * What the server asks of the mobile app: a lowest app version it still
 * serves (the version gate, TASK-0015 1B) and an emergency switch for new
 * sign-ins (1J.3). Both live in the Surfboard settings and change without a
 * deploy. With nothing set no request is refused, so shipping this changes
 * nothing until an admin sets a minimum.
 *
 * A "mobile request" is one with `Authorization: Bearer` (what the app sends
 * once signed in) or with an `X-App-Platform` header, plus the app's own
 * sign-in and refresh routes, which call the gate directly. Website traffic
 * (cookies, no such headers) never meets it.
 */

type HeaderBag = { get(name: string): string | null };
export type MobileRequest = { headers: HeaderBag };

/** Each server instance asks the database at most this often. */
export const MOBILE_CONTROLS_TTL_MS = 60_000;

let cached: { at: number; value: MobileAppSettings } | null = null;

/** Forgets the cached settings (after a change, and between tests). */
export function resetMobileControlsCache() {
  cached = null;
}

/**
 * The mobile controls, from a cache that is at most a minute old. It never
 * throws: when the settings cannot be read nothing is refused and sign-in
 * stays on, because a database hiccup must not turn into an app that nobody
 * can use.
 */
export async function getMobileControls(
  now: number = Date.now()
): Promise<MobileAppSettings> {
  if (cached && now - cached.at < MOBILE_CONTROLS_TTL_MS) return cached.value;
  try {
    const value = await getMobileAppSettings();
    cached = { at: now, value };
    for (const [store, raw] of [
      ["android", value.minimumAndroidVersion],
      ["ios", value.minimumIosVersion],
    ] as const) {
      if (raw && !parseAppVersion(raw)) {
        logger.warn("Ignoring a minimum app version that is not a version", {
          store,
          minimumVersion: raw,
        });
      }
    }
    return value;
  } catch (err) {
    logger.error("Could not read the mobile app controls", undefined, err);
    return DEFAULT_MOBILE_APP_SETTINGS;
  }
}

/**
 * "1.2.3", "1.2" or "1" as [major, minor, patch]; null for anything else (an
 * empty value, a suffix such as "-beta", more than three parts, a number too
 * long to be a version). The app sends the `version` of its app.json.
 */
export function parseAppVersion(
  raw: string | null | undefined
): [number, number, number] | null {
  if (!raw) return null;
  const match = /^(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?$/.exec(raw.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/** Negative when a is older than b, 0 when equal, positive when newer. */
export function compareAppVersions(
  a: readonly number[],
  b: readonly number[]
): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** True for the app's signed-in calls and anything that names its store. */
export function isMobileRequest(req: MobileRequest): boolean {
  return (
    extractBearerToken(req.headers) !== null ||
    req.headers.get("x-app-platform") !== null
  );
}

function storeOf(req: MobileRequest): "android" | "ios" | null {
  const value = req.headers.get("x-app-platform")?.trim().toLowerCase();
  return value === "android" || value === "ios" ? value : null;
}

/**
 * Throws AppUpdateRequiredError (426) when the app is older than the minimum
 * set for its store. With a minimum set anywhere, a request that does not say
 * which store and version it is (no, or an unreadable, `X-App-Platform` or
 * `X-App-Version`) is refused too: the app always sends both, so one that does
 * not is not one we can vouch for. A minimum that is not a version is ignored
 * (and logged when the settings are read), so a typo cannot lock everyone out.
 */
export async function assertMobileClientAllowed(
  req: MobileRequest
): Promise<void> {
  const controls = await getMobileControls();
  const minimums = {
    android: parseAppVersion(controls.minimumAndroidVersion),
    ios: parseAppVersion(controls.minimumIosVersion),
  };
  if (!minimums.android && !minimums.ios) return;

  const platform = storeOf(req);
  const rawVersion = req.headers.get("x-app-version");
  const version = parseAppVersion(rawVersion);

  const minimum = platform ? minimums[platform] : null;
  // A known store with no minimum of its own is not held back.
  if (platform && !minimum) return;

  const old =
    !platform || !version || compareAppVersions(version, minimum!) < 0;
  if (!old) return;

  const minimumVersion = platform
    ? platform === "android"
      ? controls.minimumAndroidVersion
      : controls.minimumIosVersion
    : controls.minimumAndroidVersion || controls.minimumIosVersion;
  const storeUrl =
    platform === "android"
      ? controls.androidStoreUrl
      : platform === "ios"
        ? controls.iosStoreUrl
        : "";
  logger.warn("Mobile client refused: an update is required", {
    platform,
    appVersion: rawVersion,
    minimumVersion,
  });
  throw new AppUpdateRequiredError({ platform, minimumVersion, storeUrl });
}

/** Throws MobileSignInDisabledError (503) while the emergency switch is off. */
export async function assertMobileSignInEnabled(): Promise<void> {
  const controls = await getMobileControls();
  if (controls.signInEnabled) return;
  logger.warn("Mobile sign-in refused: the emergency switch is off");
  throw new MobileSignInDisabledError();
}
