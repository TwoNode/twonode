/**
 * Every failure the mobile app is built to react to (TASK-0015 1C.4): the HTTP
 * status, the `code` in `{ success: false, error, code?, details? }`, and what
 * the app does about it. The tests tie this list to the error classes in
 * `lib/api/errors.ts` and to the codes written in the mobile routes, so a code
 * cannot be added or changed without this list (and so the published document)
 * being updated.
 *
 * A few older failures carry no `code` (a wrong password, an over-the-limit
 * sign-in, a blocked cross-origin call). The app reads those by status. They
 * are listed under `UNCODED` so the document says so instead of hiding it.
 */
export type ErrorEntry = {
  status: number;
  /** What it means, in the server's words. */
  meaning: string;
  /** What the app does. The app words every message itself and never shows the server's `error`. */
  appDoes: string;
};

export const ERROR_CODES = {
  VALIDATION_ERROR: {
    status: 400,
    meaning:
      "A parameter or body field is missing or not valid. `details` names the fields.",
    appDoes:
      "Shows its own message; for a list it asks the person to narrow the search.",
  },
  UNAUTHENTICATED: {
    status: 401,
    meaning:
      "No valid access token (missing, expired or for another platform).",
    appDoes:
      "Refreshes once and repeats the call; a second 401 ends the session.",
  },
  SESSION_INVALID: {
    status: 401,
    meaning:
      "The refresh token is not valid, was already used, or its sign-in was revoked.",
    appDoes: "Ends the session and returns to the sign-in screen.",
  },
  FORBIDDEN: {
    status: 403,
    meaning: "The signed-in role may not use this route.",
    appDoes: "Treats it as the end of the session (ADR-0002).",
  },
  EMAIL_VERIFICATION_REQUIRED: {
    status: 403,
    meaning: "Enforcement is on and this account must verify its email first.",
    appDoes: "Reloads the profile once, which opens the verification screen.",
  },
  SUBSCRIPTION_REQUIRED: {
    status: 403,
    meaning:
      "An action that needs an active subscription. Reads never return this.",
    appDoes: "Explains that managing a subscription is on the website.",
  },
  ACCOUNT_TYPE_NOT_SUPPORTED: {
    status: 403,
    meaning: "The account is not a surveyor, so it cannot use the app.",
    appDoes: "Says the account type cannot sign in to the app.",
  },
  ACCOUNT_INACTIVE: {
    status: 403,
    meaning: "The account has been switched off.",
    appDoes: "Ends the session.",
  },
  NOT_FOUND: {
    status: 404,
    meaning:
      "Unknown, deleted or someone else's record (these look the same on purpose).",
    appDoes: 'Shows "This isn\'t available".',
  },
  REFRESH_CONFLICT: {
    status: 409,
    meaning: "Two refreshes of the same token raced.",
    appDoes: "Tries once more.",
  },
  FILE_NOT_VIEWABLE: {
    status: 422,
    meaning: "The file is a drawing or another format a phone cannot open.",
    appDoes: "Says the file cannot be opened on a phone.",
  },
  RATE_LIMITED: {
    status: 429,
    meaning: "Too many tries.",
    appDoes:
      "Asks the person to wait, without a countdown the server did not promise.",
  },
  APP_UPDATE_REQUIRED: {
    status: 426,
    meaning:
      "This build is below the minimum for its store. `details` is `{ platform, minimumVersion, storeUrl }`.",
    appDoes: "Covers the app with the update screen. Never ends the session.",
  },
  MOBILE_SIGN_IN_DISABLED: {
    status: 503,
    meaning:
      "New sign-ins are paused (an emergency switch). Open sessions carry on.",
    appDoes: "Says signing in is paused for a short while.",
  },
  VERIFICATION_CODE_INVALID: {
    status: 400,
    meaning: "The code is not six digits.",
    appDoes: "Asks for six digits.",
  },
  VERIFICATION_CODE_INCORRECT: {
    status: 400,
    meaning: "The code is wrong.",
    appDoes: "Says it did not match and lets the person try again.",
  },
  VERIFICATION_CODE_EXPIRED: {
    status: 400,
    meaning:
      "No live code: it lapsed after 10 minutes, was used, or was replaced.",
    appDoes: "Offers to send a new one.",
  },
  VERIFICATION_CODE_LOCKED: {
    status: 400,
    meaning: "Five wrong tries on that code.",
    appDoes: "Offers to send a new one.",
  },
} as const satisfies Record<string, ErrorEntry>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Failures with no `code`, read by status alone. */
export const UNCODED = [
  {
    status: 401,
    route: "POST /auth/mobile/login",
    meaning: "Wrong email or password.",
  },
  {
    status: 403,
    route: "POST /auth/mobile/login",
    meaning: "The account is inactive.",
  },
  {
    status: 429,
    route: "POST /auth/mobile/login, POST /auth/mobile/refresh",
    meaning: "Too many attempts.",
  },
  {
    status: 403,
    route: "routes that check the request's origin",
    meaning: "A cross-origin call was blocked.",
  },
  {
    status: 400,
    route: "GET /auth/me",
    meaning: "The `platform` parameter is missing or not valid.",
  },
] as const;
