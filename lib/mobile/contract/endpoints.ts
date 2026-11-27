import { z } from "zod/v4";
import type { ErrorCode } from "@/lib/mobile/contract/errorCodes";
import * as S from "@/lib/mobile/contract/schemas";
import { LEGAL_VERSION } from "@/lib/legal/surfboard";

/**
 * The mobile app's whole API surface, one entry per operation (TASK-0015 1C.1).
 * It is the input to `openapi.ts` and to the tests, and each entry names its
 * route file so a test can confirm the route exists and answers that method.
 *
 * Request parameters are described here by hand because the routes' own
 * validators are zod 3 and local to each route. They are kept honest by the
 * tests: every documented query parameter must change what the real parser
 * returns, and every documented body must be accepted by the real route
 * (and each `invalid` body refused) before the document is allowed to say so.
 */

/** How a call is let in. */
export type Access =
  /** No session needed. */
  | "public"
  /** A signed-in surveyor, held at the email verification gate while it is on. */
  | "surveyor"
  /** A signed-in surveyor who may be unverified (the verification screen's own calls). */
  | "surveyor-unverified"
  /** Any signed-in role, unverified allowed. */
  | "signed-in-unverified";

export type Param = {
  name: string;
  in: "query" | "path";
  required?: boolean;
  description: string;
  schema: z.ZodType;
  /** A plain value the tests send, never the default, so it must change the parsed result. */
  example: string;
};

export type Body = {
  schema: z.ZodType;
  /** Accepted by the real route (the test stops short of the database). */
  example: Record<string, unknown>;
  /** Each one must be refused by the real route with a 400 VALIDATION_ERROR. */
  invalid: Record<string, unknown>[];
};

export type Endpoint = {
  operationId: string;
  method: "get" | "post" | "patch" | "delete";
  /** Starts with `/api/v1`; `{name}` marks a path parameter. */
  path: string;
  tag:
    | "Session"
    | "Account"
    | "Plans"
    | "Records"
    | "Stats"
    | "Money"
    | "Files"
    | "Push"
    | "Diagnostics"
    | "Map";
  summary: string;
  description?: string;
  access: Access;
  /** Whether `X-App-Version` and `X-App-Platform` are checked on this call. */
  versionGate: boolean;
  params?: Param[];
  body?: Body;
  /** The `data` of a successful answer (`undefined` for `{}`). */
  data: z.ZodType;
  /** Failures the app is built for (besides those every call of this access can have). */
  errors?: ErrorCode[];
  /** The route file that answers it, relative to the repository root. */
  routeFile: string;
  /** Answered with `Cache-Control: no-store`. */
  noStore?: boolean;
};

const platform = z.literal("surfboard");
const deviceId = z
  .string()
  .min(8)
  .max(128)
  .describe("The id the app sends at sign-in.");
const planId = (description = "A plan's id (a uuid).") => ({
  name: "planId",
  in: "path" as const,
  required: true,
  description,
  schema: z.uuid(),
  example: "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c",
});
const page = [
  {
    name: "page",
    in: "query",
    description: "1-based page number.",
    schema: z.number().int().positive(),
    example: "2",
  },
  {
    name: "pageSize",
    in: "query",
    description: "Rows a page; capped at 100.",
    schema: z.number().int().positive().max(100),
    example: "7",
  },
] as const satisfies Param[];
const dateRange = [
  {
    name: "dateFrom",
    in: "query",
    description:
      "On the date printed on the survey plan, inclusive. `YYYY-MM-DD` is that whole day (UTC); a full date and time is used as given.",
    schema: z.string(),
    example: "2026-01-02",
  },
  {
    name: "dateTo",
    in: "query",
    description: "As `dateFrom`; a plain date is the end of that day.",
    schema: z.string(),
    example: "2026-09-30",
  },
] as const satisfies Param[];

const tokenBody = z.object({
  platform,
  refreshToken: z.string().min(16).max(256),
});

export const ENDPOINTS: Endpoint[] = [
  // ---------------------------------------------------------- session
  {
    operationId: "login",
    method: "post",
    path: "/api/v1/auth/mobile/login",
    tag: "Session",
    summary: "Sign in",
    description:
      "Starts a device session. Rate limited per email and device. The answer does not say how to verify an address: that comes from `GET /auth/me`.",
    access: "public",
    versionGate: true,
    body: {
      schema: z.object({
        platform,
        email: z.email(),
        password: z.string().min(1),
        deviceId,
        deviceLabel: z.string().max(80).optional(),
        appVersion: z.string().max(32).optional(),
      }),
      example: {
        platform: "surfboard",
        email: "ada@example.com",
        password: "pw",
        deviceId: "device-12345678",
      },
      invalid: [
        {
          platform: "surfboard",
          email: "not-an-email",
          password: "pw",
          deviceId: "device-12345678",
        },
        {
          platform: "surfboard",
          email: "ada@example.com",
          password: "pw",
          deviceId: "short",
        },
        {
          platform: "reva",
          email: "ada@example.com",
          password: "pw",
          deviceId: "device-12345678",
        },
      ],
    },
    data: S.LoginData,
    errors: [
      "VALIDATION_ERROR",
      "ACCOUNT_TYPE_NOT_SUPPORTED",
      "MOBILE_SIGN_IN_DISABLED",
      "APP_UPDATE_REQUIRED",
    ],
    routeFile: "app/api/v1/auth/mobile/login/route.ts",
    noStore: true,
  },
  {
    operationId: "refresh",
    method: "post",
    path: "/api/v1/auth/mobile/refresh",
    tag: "Session",
    summary: "Replace the access token",
    description:
      "Single use: the refresh token in the request is spent and a new pair is returned. A token presented again within 30 seconds is re-issued, so a lost answer does not end the sign-in; presented later, a spent token ends the whole sign-in. The access token's claims (`emailVerified`, `mustVerifyNow`) change here.",
    access: "public",
    versionGate: true,
    body: {
      schema: tokenBody,
      example: { platform: "surfboard", refreshToken: "0123456789abcdef0123" },
      invalid: [
        { platform: "surfboard", refreshToken: "short" },
        { platform: "surfboard" },
      ],
    },
    data: S.RefreshData,
    errors: [
      "VALIDATION_ERROR",
      "SESSION_INVALID",
      "ACCOUNT_INACTIVE",
      "ACCOUNT_TYPE_NOT_SUPPORTED",
      "REFRESH_CONFLICT",
      "RATE_LIMITED",
      "APP_UPDATE_REQUIRED",
    ],
    routeFile: "app/api/v1/auth/mobile/refresh/route.ts",
    noStore: true,
  },
  {
    operationId: "logout",
    method: "post",
    path: "/api/v1/auth/mobile/logout",
    tag: "Session",
    summary: "Sign out this device",
    description:
      "Revokes the device session the refresh token belongs to. Succeeds whether or not it was still live, and is exempt from the version gate so an old app can always sign out.",
    access: "public",
    versionGate: false,
    body: {
      schema: tokenBody,
      example: { platform: "surfboard", refreshToken: "0123456789abcdef0123" },
      invalid: [{ platform: "surfboard", refreshToken: "short" }],
    },
    data: S.Empty,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/auth/mobile/logout/route.ts",
  },
  {
    operationId: "requestPasswordReset",
    method: "post",
    path: "/api/v1/auth/mobile/request-password-reset",
    tag: "Session",
    summary: "Email a password reset link",
    description:
      "Always answers 200 with the same words, whether or not the email has an account, the account is a surveyor, or the caller was rate limited. The emailed link opens the website's reset page. Exempt from the version gate.",
    access: "public",
    versionGate: false,
    body: {
      schema: z.object({ platform, email: z.email(), deviceId }),
      example: {
        platform: "surfboard",
        email: "ada@example.com",
        deviceId: "device-12345678",
      },
      invalid: [
        { platform: "surfboard", email: "nope", deviceId: "device-12345678" },
        { platform: "surfboard", email: "ada@example.com", deviceId: "x" },
      ],
    },
    data: S.PasswordResetData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/auth/mobile/request-password-reset/route.ts",
    noStore: true,
  },
  {
    operationId: "legalVersion",
    method: "get",
    path: "/api/v1/auth/mobile/legal",
    tag: "Session",
    summary: "The current Terms and Privacy Policy",
    description:
      "The version a new account must agree to, and where to read both texts. Ask for it when the sign-up screen opens and send `version` back when starting the sign-up: the server refuses any other.",
    access: "public",
    versionGate: true,
    data: S.LegalVersionData,
    errors: ["APP_UPDATE_REQUIRED"],
    routeFile: "app/api/v1/auth/mobile/legal/route.ts",
  },
  {
    operationId: "registerStart",
    method: "post",
    path: "/api/v1/auth/mobile/register/start",
    tag: "Session",
    summary: "Start creating an account",
    description:
      "Step 1 of 2. Nothing is created yet: the details are held and a six-digit code is emailed (always a code, never a link). Rate limited per email and per device. An address that already has an account is `EMAIL_ALREADY_REGISTERED`, including one made through Google on the website (such a person signs in after choosing Forgot password). `acceptedLegalVersion` must be the `version` from `legalVersion`: a missing or old one is a `VALIDATION_ERROR` with `details.legal`.",
    access: "public",
    versionGate: true,
    body: {
      schema: z.object({
        platform,
        email: z.email(),
        password: z.string().min(8).max(72),
        firstName: z.string().min(1).max(60),
        lastName: z.string().min(1).max(60),
        acceptedLegalVersion: z.string().max(32),
        deviceId,
      }),
      example: {
        platform: "surfboard",
        email: "ada@example.com",
        password: "a-long-password",
        firstName: "Ada",
        lastName: "Obi",
        acceptedLegalVersion: LEGAL_VERSION,
        deviceId: "device-12345678",
      },
      invalid: [
        {
          platform: "surfboard",
          email: "not-an-email",
          password: "a-long-password",
          firstName: "Ada",
          lastName: "Obi",
          acceptedLegalVersion: LEGAL_VERSION,
          deviceId: "device-12345678",
        },
        {
          platform: "surfboard",
          email: "ada@example.com",
          password: "short",
          firstName: "Ada",
          lastName: "Obi",
          acceptedLegalVersion: LEGAL_VERSION,
          deviceId: "device-12345678",
        },
        {
          platform: "surfboard",
          email: "ada@example.com",
          password: "a-long-password",
          firstName: "",
          lastName: "Obi",
          acceptedLegalVersion: LEGAL_VERSION,
          deviceId: "device-12345678",
        },
      ],
    },
    data: S.RegisterStartData,
    errors: [
      "VALIDATION_ERROR",
      "EMAIL_ALREADY_REGISTERED",
      "RATE_LIMITED",
      "MOBILE_SIGN_IN_DISABLED",
      "APP_UPDATE_REQUIRED",
    ],
    routeFile: "app/api/v1/auth/mobile/register/start/route.ts",
    noStore: true,
  },
  {
    operationId: "registerVerify",
    method: "post",
    path: "/api/v1/auth/mobile/register/verify",
    tag: "Session",
    summary: "Enter the code and finish creating the account",
    description:
      "Step 2 of 2. Creates the verified account and signs the person in on this phone: the answer is the same as `login`. `password` must be the one the sign-up was started with. Five wrong codes lock the registration (`VERIFICATION_CODE_LOCKED`): ask for a new code. A registration that lapsed, was used, or never existed is `VERIFICATION_CODE_EXPIRED`: if a new code does not help, start over.",
    access: "public",
    versionGate: true,
    body: {
      schema: z.object({
        platform,
        pendingRegistrationId: z.string().min(1).max(64),
        code: z.string().length(6),
        password: z.string().min(1).max(72),
        deviceId,
        deviceLabel: z.string().max(80).optional(),
        appVersion: z.string().max(32).optional(),
      }),
      example: {
        platform: "surfboard",
        pendingRegistrationId: "pending-1",
        code: "123456",
        password: "a-long-password",
        deviceId: "device-12345678",
      },
      invalid: [
        {
          platform: "surfboard",
          pendingRegistrationId: "pending-1",
          code: "12345",
          password: "a-long-password",
          deviceId: "device-12345678",
        },
        {
          platform: "surfboard",
          pendingRegistrationId: "",
          code: "123456",
          password: "a-long-password",
          deviceId: "device-12345678",
        },
        {
          platform: "surfboard",
          pendingRegistrationId: "pending-1",
          code: "123456",
          password: "a-long-password",
          deviceId: "short",
        },
      ],
    },
    data: S.LoginData,
    errors: [
      "VALIDATION_ERROR",
      "VERIFICATION_CODE_INVALID",
      "VERIFICATION_CODE_INCORRECT",
      "VERIFICATION_CODE_EXPIRED",
      "VERIFICATION_CODE_LOCKED",
      "ACCOUNT_TYPE_NOT_SUPPORTED",
      "RATE_LIMITED",
      "MOBILE_SIGN_IN_DISABLED",
      "APP_UPDATE_REQUIRED",
    ],
    routeFile: "app/api/v1/auth/mobile/register/verify/route.ts",
    noStore: true,
  },
  {
    operationId: "registerResend",
    method: "post",
    path: "/api/v1/auth/mobile/register/resend",
    tag: "Session",
    summary: "Email a new code for a sign-up",
    description:
      "The old code stops working. Always answers 200 with the same words, whether or not the registration exists or is still open. Five per hour per registration and ten per hour per device.",
    access: "public",
    versionGate: true,
    body: {
      schema: z.object({
        platform,
        pendingRegistrationId: z.string().min(1).max(64),
        deviceId,
      }),
      example: {
        platform: "surfboard",
        pendingRegistrationId: "pending-1",
        deviceId: "device-12345678",
      },
      invalid: [
        {
          platform: "surfboard",
          pendingRegistrationId: "",
          deviceId: "device-12345678",
        },
        { platform: "surfboard", pendingRegistrationId: "pending-1" },
      ],
    },
    data: S.Empty,
    errors: ["VALIDATION_ERROR", "RATE_LIMITED", "APP_UPDATE_REQUIRED"],
    routeFile: "app/api/v1/auth/mobile/register/resend/route.ts",
    noStore: true,
  },
  {
    operationId: "deleteAccount",
    method: "post",
    path: "/api/v1/auth/mobile/delete-account",
    tag: "Account",
    summary: "Close the account",
    description:
      "Closes the signed-in surveyor's whole account (the website's side too): the name, email, password, phone, address, company, logo, signature, bank details, sign-ins, devices and push settings are erased, the paid subscription is cancelled first, and the address can be used again for a new account. Survey plans (even those never submitted), batches, payments, withdrawals and audit entries are kept without the person's details. Refused with `ACCOUNT_CLOSURE_BLOCKED` (`details.reasons`: `WALLET_BALANCE`, `PENDING_WITHDRAWAL`) while there is money in the wallet or an unpaid withdrawal, and with `SUBSCRIPTION_CANCEL_FAILED` when the card could not be stopped (the account stays open). A wrong password is a `VALIDATION_ERROR` with `details.password`. Five tries an hour per account. After a success the app discards its session and everything it stored.",
    access: "surveyor-unverified",
    versionGate: true,
    body: {
      schema: z.object({ platform, password: z.string().min(1).max(72) }),
      example: { platform: "surfboard", password: "a-long-password" },
      invalid: [
        { platform: "surfboard", password: "" },
        { platform: "surfboard" },
      ],
    },
    data: S.AccountClosedData,
    errors: [
      "VALIDATION_ERROR",
      "ACCOUNT_CLOSURE_BLOCKED",
      "SUBSCRIPTION_CANCEL_FAILED",
      "RATE_LIMITED",
    ],
    routeFile: "app/api/v1/auth/mobile/delete-account/route.ts",
    noStore: true,
  },
  {
    operationId: "me",
    method: "get",
    path: "/api/v1/auth/me",
    tag: "Account",
    summary: "The signed-in person and how to verify",
    description:
      "Read from the access token plus the account row. Version-gated for mobile requests only.",
    access: "signed-in-unverified",
    versionGate: true,
    params: [
      {
        name: "platform",
        in: "query",
        required: true,
        description: "Always `surfboard` for the app.",
        schema: z.literal("surfboard"),
        example: "surfboard",
      },
    ],
    data: S.MeData,
    errors: ["APP_UPDATE_REQUIRED"],
    routeFile: "app/api/v1/auth/me/route.ts",
  },
  {
    operationId: "listDevices",
    method: "get",
    path: "/api/v1/auth/mobile/devices",
    tag: "Account",
    summary: "Devices signed in to the account",
    description: "One entry per live sign-in, most recently used first.",
    access: "signed-in-unverified",
    versionGate: true,
    data: z.array(S.DeviceSessionData),
    routeFile: "app/api/v1/auth/mobile/devices/route.ts",
  },
  {
    operationId: "revokeDevice",
    method: "delete",
    path: "/api/v1/auth/mobile/devices/{familyId}",
    tag: "Account",
    summary: "Sign a device out",
    description:
      "Ends that device's session. Its push address is removed with it.",
    access: "signed-in-unverified",
    versionGate: true,
    params: [
      {
        name: "familyId",
        in: "path",
        required: true,
        description: "A device's `id` from the list.",
        schema: z.string(),
        example: "fam-1",
      },
    ],
    data: S.Empty,
    errors: ["NOT_FOUND"],
    routeFile: "app/api/v1/auth/mobile/devices/[familyId]/route.ts",
  },
  {
    operationId: "verifyEmail",
    method: "post",
    path: "/api/v1/auth/mobile/verify-email",
    tag: "Account",
    summary: "Enter the emailed code",
    description:
      "Only records the verification: call `refresh` afterwards, because the token's claims change when a new one is issued. Also answers `{ verified: true }` for an account already verified, so a lost answer can be retried. Five tries per five minutes per account.",
    access: "surveyor-unverified",
    versionGate: true,
    body: {
      schema: z.object({ platform, code: z.string().length(6) }),
      example: { platform: "surfboard", code: "123456" },
      invalid: [
        { platform: "surfboard", code: "12345" },
        { platform: "surfboard", code: "1234567" },
      ],
    },
    data: S.VerifyEmailData,
    errors: [
      "VALIDATION_ERROR",
      "VERIFICATION_CODE_INVALID",
      "VERIFICATION_CODE_INCORRECT",
      "VERIFICATION_CODE_EXPIRED",
      "VERIFICATION_CODE_LOCKED",
      "RATE_LIMITED",
    ],
    routeFile: "app/api/v1/auth/mobile/verify-email/route.ts",
    noStore: true,
  },
  {
    operationId: "verifyEmailLink",
    method: "post",
    path: "/api/v1/auth/mobile/verify-email-link",
    tag: "Account",
    summary: "Use the emailed link",
    description:
      "For when the emailed link opened the app: send the link's `token` query value. Only records the verification: call `refresh` afterwards. The token must have been sent to the signed-in account; any other token answers `VERIFICATION_LINK_INVALID`. Also answers `{ verified: true }` for an account already verified. Five tries per five minutes per account.",
    access: "surveyor-unverified",
    versionGate: true,
    body: {
      schema: z.object({ platform, token: z.string().min(1).max(256) }),
      example: { platform: "surfboard", token: "3f9c0d2a7b41e8" },
      invalid: [
        { platform: "surfboard", token: "" },
        { platform: "surfboard" },
      ],
    },
    data: S.VerifyEmailData,
    errors: ["VALIDATION_ERROR", "VERIFICATION_LINK_INVALID", "RATE_LIMITED"],
    routeFile: "app/api/v1/auth/mobile/verify-email-link/route.ts",
    noStore: true,
  },
  {
    operationId: "resendVerification",
    method: "post",
    path: "/api/v1/auth/mobile/resend-verification",
    tag: "Account",
    summary: "Send a new code or link",
    description:
      "Goes to the address on the account; a new code replaces the old. Five per 15 minutes per account. No body.",
    access: "surveyor-unverified",
    versionGate: true,
    data: S.ResendVerificationData,
    errors: ["RATE_LIMITED"],
    routeFile: "app/api/v1/auth/mobile/resend-verification/route.ts",
    noStore: true,
  },

  // ------------------------------------------------------------ push
  {
    operationId: "registerPushToken",
    method: "post",
    path: "/api/v1/auth/mobile/push-token",
    tag: "Push",
    summary: "Keep this phone's push address",
    description:
      "Kept only for a `deviceId` that is a live device session of the caller; a token another person had is moved to the caller. The address is never read back. Off unless the server has push switched on.",
    access: "surveyor",
    versionGate: true,
    body: {
      schema: z.object({
        deviceId,
        token: z
          .string()
          .regex(/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/),
        os: z.enum(["android", "ios"]),
        appVersion: z.string().max(32).optional(),
      }),
      example: {
        deviceId: "device-12345678",
        token: "ExponentPushToken[abc123def456]",
        os: "android",
      },
      invalid: [
        { deviceId: "device-12345678", token: "not-a-token", os: "android" },
        {
          deviceId: "device-12345678",
          token: "ExponentPushToken[abc123def456]",
          os: "windows",
        },
        {
          deviceId: "device-12345678",
          token: "ExponentPushToken[short]",
          os: "android",
        },
      ],
    },
    data: S.Empty,
    errors: ["VALIDATION_ERROR", "NOT_FOUND"],
    routeFile: "app/api/v1/auth/mobile/push-token/route.ts",
  },
  {
    operationId: "removePushToken",
    method: "delete",
    path: "/api/v1/auth/mobile/push-token",
    tag: "Push",
    summary: "Forget this phone's push address",
    description:
      "Succeeds whether or not there was one. Also works while email verification is outstanding.",
    access: "surveyor-unverified",
    versionGate: true,
    body: {
      schema: z.object({ deviceId }),
      example: { deviceId: "device-12345678" },
      invalid: [{ deviceId: "x" }, {}],
    },
    data: S.Empty,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/auth/mobile/push-token/route.ts",
  },
  {
    operationId: "getPushPreferences",
    method: "get",
    path: "/api/v1/surfboard/push/preferences",
    tag: "Push",
    summary: "What this account wants pushed",
    description:
      "The account's choice, the same on every phone. A person who never changed anything gets the defaults: everything on, quiet hours off, 22:00 to 07:00 in Africa/Lagos.",
    access: "surveyor",
    versionGate: true,
    data: S.PushPreferencesData,
    routeFile: "app/api/v1/surfboard/push/preferences/route.ts",
  },
  {
    operationId: "changePushPreferences",
    method: "patch",
    path: "/api/v1/surfboard/push/preferences",
    tag: "Push",
    summary: "Change what this account wants pushed",
    description:
      "Only what is sent changes, so two phones changing two switches do not undo each other, and the answer is everything as it now stands. At least one field must be sent; an unknown key is refused. Quiet hours that start and end at the same time are refused (400), and the time zone must be an IANA name. A push inside quiet hours is dropped, not delayed.",
    access: "surveyor",
    versionGate: true,
    body: {
      schema: S.PushPreferencesPatch,
      example: {
        categories: { PLAN_LODGED: false },
        quietHours: { enabled: true, start: "22:30", end: "07:00" },
      },
      invalid: [
        {},
        { categories: {} },
        { categories: { PLAN_QUERIED: true } },
        { quietHours: { start: "25:00" } },
        { quietHours: { end: "7:00" } },
        { enabled: true },
      ],
    },
    data: S.PushPreferencesData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/surfboard/push/preferences/route.ts",
  },

  // ----------------------------------------------------- diagnostics
  {
    operationId: "postCrashReport",
    method: "post",
    path: "/api/v1/surfboard/diagnostics/reports",
    tag: "Diagnostics",
    summary: "Post one crash report",
    description:
      "Sent after the app closed unexpectedly (with the person's say; automatically only in test builds). Words and counts only: the app and the server both scrub the text, and the report is NOT linked to the account (the sign-in only authorises the post and counts against 10 reports an hour). An unknown key is refused. A body over 8 KB is a 413. Answers `{}`; nothing is echoed. Off unless the server has reports switched on: then a 404, and the app stops sending for that run. Also open to an unverified account.",
    access: "surveyor-unverified",
    versionGate: true,
    body: {
      schema: z.strictObject({
        v: z.literal(1),
        kind: z.enum(["unexpected-close", "caught-error"]),
        appVersion: z.string().max(32),
        platform: z.enum(["ios", "android"]),
        osVersion: z.string().max(16).optional(),
        screen: z.string().max(60),
        at: z.iso.datetime({ offset: true }),
        aliveAt: z.iso.datetime({ offset: true }).optional(),
        memoryWarnings: z.number().int().min(0).max(1000).optional(),
        error: z
          .strictObject({
            name: z.string().max(60),
            message: z.string().max(200),
            fatal: z.boolean(),
          })
          .optional(),
        trail: z.array(z.string().max(90)).max(24),
      }),
      example: {
        v: 1,
        kind: "unexpected-close",
        appVersion: "1.0.0",
        platform: "ios",
        osVersion: "18.3",
        screen: "Home",
        at: "2026-11-26T13:51:54.000Z",
        aliveAt: "2026-11-26T13:51:50.000Z",
        memoryWarnings: 0,
        trail: [
          "13:51:54.100 map tap, zoom 18",
          "13:51:54.140 map tap found 5 plans",
        ],
      },
      invalid: [
        {},
        { v: 2 },
        {
          v: 1,
          kind: "unexpected-close",
          appVersion: "1.0.0",
          platform: "ios",
          screen: "Home",
          at: "2026-11-26T13:51:54.000Z",
          trail: [],
          accountId: "not allowed",
        },
        {
          v: 1,
          kind: "crash",
          appVersion: "1.0.0",
          platform: "ios",
          screen: "Home",
          at: "2026-11-26T13:51:54.000Z",
          trail: [],
        },
        {
          v: 1,
          kind: "caught-error",
          appVersion: "1.0.0",
          platform: "windows",
          screen: "Home",
          at: "2026-11-26T13:51:54.000Z",
          trail: [],
        },
        {
          v: 1,
          kind: "caught-error",
          appVersion: "1.0.0",
          platform: "android",
          screen: "Home",
          at: "yesterday",
          trail: [],
        },
        {
          v: 1,
          kind: "caught-error",
          appVersion: "1.0.0",
          platform: "android",
          screen: "Home",
          at: "2026-11-26T13:51:54.000Z",
          trail: Array.from({ length: 25 }, () => "step"),
        },
        {
          v: 1,
          kind: "caught-error",
          appVersion: "1.0.0",
          platform: "android",
          screen: "Home",
          at: "2026-11-26T13:51:54.000Z",
          trail: ["x".repeat(91)],
        },
      ],
    },
    data: S.Empty,
    errors: [
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "PAYLOAD_TOO_LARGE",
      "RATE_LIMITED",
    ],
    routeFile: "app/api/v1/surfboard/diagnostics/reports/route.ts",
  },

  // ----------------------------------------------------------- plans
  {
    operationId: "listPlanSummaries",
    method: "get",
    path: "/api/v1/surfboard/plans/summary",
    tag: "Plans",
    summary: "The Plans list",
    description:
      "A lean row per plan: one `displayStatus`, no geometry, pillars or file links. Order is the chosen column, then the plan id, so a page never repeats or skips a plan. A `displayStatus` filter is worked out on the server, so a request over 5,000 plans is a 400 (narrow the search). Reads are not subscription-gated.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "scope",
        in: "query",
        description:
          "Whose plans: the caller's own (default) or those shared with the caller.",
        schema: z.enum(["mine", "shared-with-me"]),
        example: "shared-with-me",
      },
      ...page,
      {
        name: "search",
        in: "query",
        description:
          "Plan number, title, facilitator, LGA, ward, LCDA, locality or pillar number; at most 100 characters. `%` and `_` act as wildcards.",
        schema: z.string().max(100),
        example: "ajah",
      },
      {
        name: "displayStatus",
        in: "query",
        description: "Comma list of status codes.",
        schema: z.string(),
        example: "QUERIED,LODGED",
      },
      {
        name: "planType",
        in: "query",
        description: "Comma list of plan types.",
        schema: z.string(),
        example: "APPROVED LAYOUT",
      },
      {
        name: "facilitator",
        in: "query",
        description:
          "The whole value, ignoring capitals and surrounding spaces.",
        schema: z.string().max(200),
        example: "Adeyemi & Partners",
      },
      {
        name: "lga",
        in: "query",
        description: "As `facilitator`.",
        schema: z.string().max(200),
        example: "Eti-Osa",
      },
      {
        name: "ward",
        in: "query",
        description: "As `facilitator`.",
        schema: z.string().max(200),
        example: "Ajah",
      },
      {
        name: "lcda",
        in: "query",
        description: "As `facilitator`.",
        schema: z.string().max(200),
        example: "Ibeju",
      },
      {
        name: "state",
        in: "query",
        description: "As `facilitator`. Added in contract 1.4.0.",
        schema: z.string().max(200),
        example: "Lagos",
      },
      {
        name: "provisional",
        in: "query",
        description:
          "Whether provisional plan types are in the list; `exclude` matches the Stats Total plans figure.",
        schema: z.enum(["include", "exclude", "only"]),
        example: "exclude",
      },
      ...dateRange,
      {
        name: "sortField",
        in: "query",
        description:
          "The column to order by; plans with no survey date come last.",
        schema: z.enum([
          "createdAt",
          "updatedAt",
          "dateOnSurveyPlan",
          "planNumber",
          "surveyTitle",
        ]),
        example: "planNumber",
      },
      {
        name: "sortOrder",
        in: "query",
        description: "Default `desc`.",
        schema: z.enum(["asc", "desc"]),
        example: "asc",
      },
    ],
    data: S.PlanListData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/surfboard/plans/summary/route.ts",
  },
  {
    operationId: "planCounts",
    method: "get",
    path: "/api/v1/surfboard/plans/counts",
    tag: "Plans",
    summary: "The numbers on the Plans segments and badges",
    description:
      "Counted by the same rules as the lists, so the Queried badge equals the Queried list's total.",
    access: "surveyor",
    versionGate: true,
    data: S.PlanCountsData,
    routeFile: "app/api/v1/surfboard/plans/counts/route.ts",
  },
  {
    operationId: "planDetail",
    method: "get",
    path: "/api/v1/surfboard/plans/{planId}/summary",
    tag: "Plans",
    summary: "One plan",
    description:
      "The owner gets everything; someone a plan is shared with gets no reviewer comments, no batch, no record copy and nobody else's details. An unknown, deleted, malformed or someone else's plan is a 404.",
    access: "surveyor",
    versionGate: true,
    params: [planId()],
    data: S.PlanDetailData,
    errors: ["NOT_FOUND"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/summary/route.ts",
  },
  {
    operationId: "planFileLink",
    method: "get",
    path: "/api/v1/surfboard/plans/{planId}/files/{n}",
    tag: "Files",
    summary: "A short-lived address for one file of a plan",
    description:
      "`n` is the file's place (from 0) in the plan's `files` list. The address works for five minutes; fetch it on each tap and never store it.",
    access: "surveyor",
    versionGate: true,
    params: [
      planId(),
      {
        name: "n",
        in: "path",
        required: true,
        description: "Place in the plan's `files` list, from 0.",
        schema: z.number().int().nonnegative(),
        example: "0",
      },
    ],
    data: S.PlanFileLinkData,
    errors: ["NOT_FOUND", "FILE_NOT_VIEWABLE", "FILE_PROTECTED"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/files/[n]/route.ts",
    noStore: true,
  },
  {
    operationId: "planFilePages",
    method: "get",
    path: "/api/v1/surfboard/plans/{planId}/files/{n}/pages",
    tag: "Files",
    summary:
      "How many pages a protected file of a plan shared with the caller has",
    description:
      "For the files marked `protected` in the plan's `files` list (the survey plan(s) and the Certificate of a plan shared with the caller). `n` is the file's place (from 0) in that list. Each page is then a watermarked JPEG at `GET /api/v1/surfboard/plans/{planId}/files/{n}/pages/{p}` (`p` from 1; `Content-Type: image/jpeg`, `Cache-Control: no-store`; the sharing surveyor's `Draft_{SURCON No}` is part of the picture; an account may ask for a limited number of pages an hour, 429 `RATE_LIMITED`). The original file is never sent; a plan the caller owns, or any other file, is a 404.",
    access: "surveyor",
    versionGate: true,
    params: [
      planId(),
      {
        name: "n",
        in: "path",
        required: true,
        description: "Place in the plan's `files` list, from 0.",
        schema: z.number().int().nonnegative(),
        example: "0",
      },
    ],
    data: S.PlanFilePagesData,
    errors: ["NOT_FOUND", "FILE_NOT_VIEWABLE", "RATE_LIMITED"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/files/[n]/pages/route.ts",
    noStore: true,
  },
  {
    operationId: "planMap",
    method: "get",
    path: "/api/v1/surfboard/plans/map",
    tag: "Map",
    summary: "The caller's plans, and those shared with them, for the Home map",
    description:
      "At most 2,000 plans, most recently changed first: the caller's own and the ones other surveyors shared with them (`isOwner: false`, with the owner's name in `ownerName`; its status is worked out without the owner's batch). The outline is for drawing and nothing else: never measure from it.",
    access: "surveyor",
    versionGate: true,
    data: S.PlanMapData,
    routeFile: "app/api/v1/surfboard/plans/map/route.ts",
  },
  {
    operationId: "planMapPillars",
    method: "get",
    path: "/api/v1/surfboard/plans/map/pillars",
    tag: "Map",
    summary: "The pillars of some of the caller's plans, for a zoomed-in map",
    description:
      "Up to 60 plan ids a call. `plans/map` leaves pillars out so its answer stays small; the app asks for the plans in view once the map is zoomed in far enough to number them (about 1:5,000). Coordinates are as stored: the map applies the state's display correction.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "ids",
        in: "query",
        required: true,
        description:
          "Plan ids, comma separated, 1 to 60. A plan that is neither the caller's nor shared with them, or is deleted, is left out of the answer.",
        schema: z.string(),
        example:
          "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c,0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      },
    ],
    data: S.MapPillarsData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/surfboard/plans/map/pillars/route.ts",
  },
  {
    operationId: "mapRoute",
    method: "post",
    path: "/api/v1/surfboard/map/route",
    tag: "Map",
    summary: "A driving route between two places, for Navigate's preview",
    description:
      "Both places must be in Nigeria (a point outside is a 400). Without live traffic, so the time is a normal-speed estimate. Google bills each call, so an account has 60 a day (429 RATE_LIMITED after that); no place is logged or stored. 404 when Google finds no route; 503 MAP_SERVICE_UNAVAILABLE when Google is not set up or does not answer.",
    access: "surveyor",
    versionGate: true,
    body: {
      schema: z.object({
        origin: z.object({
          lat: z.number().min(4).max(14),
          lng: z.number().min(2.5).max(15),
        }),
        destination: z.object({
          lat: z.number().min(4).max(14),
          lng: z.number().min(2.5).max(15),
        }),
      }),
      example: {
        origin: { lat: 6.4474, lng: 3.4739 },
        destination: { lat: 6.5682, lng: 3.3768 },
      },
      invalid: [
        {},
        { origin: { lat: 6.4474, lng: 3.4739 } },
        {
          origin: { lat: 51.5, lng: -0.12 },
          destination: { lat: 6.5, lng: 3.4 },
        },
        {
          origin: { lat: "6.4", lng: 3.4 },
          destination: { lat: 6.5, lng: 3.4 },
        },
      ],
    },
    data: S.MapRouteData,
    errors: [
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "RATE_LIMITED",
      "MAP_SERVICE_UNAVAILABLE",
    ],
    routeFile: "app/api/v1/surfboard/map/route/route.ts",
  },
  {
    operationId: "mapPlaceSuggestions",
    method: "get",
    path: "/api/v1/surfboard/map/places/autocomplete",
    tag: "Map",
    summary: "Places in Nigeria that match what is being typed",
    description:
      "Up to five streets, addresses, landmarks, businesses or neighbourhoods, nearest to `near` (where the map is looking) first. One `sessionToken` per search, kept until a result is picked, because Google bills a session's suggestions together. The app waits for 3 characters and about 300 ms of no typing. An account has 400 a day; nothing typed is logged or stored.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "input",
        in: "query",
        required: true,
        description: "What the person typed, 3 to 100 characters.",
        schema: z.string().min(3).max(100),
        example: "Mende Maryland",
      },
      {
        name: "sessionToken",
        in: "query",
        required: true,
        description:
          "A random token (16 to 64 letters, digits, `-` or `_`) made by the app for one search.",
        schema: z.string(),
        example: "0b1f6c2e-7a54-4f0e-9d21-3c5a8e7b6d10",
      },
      {
        name: "near",
        in: "query",
        description:
          "Where the map is looking, as `lat,lng` inside Nigeria: suggestions near it come first. Left out, they are not biased.",
        schema: z.string(),
        example: "6.5,3.4",
      },
    ],
    data: S.PlaceSuggestionsData,
    errors: ["VALIDATION_ERROR", "RATE_LIMITED", "MAP_SERVICE_UNAVAILABLE"],
    routeFile: "app/api/v1/surfboard/map/places/autocomplete/route.ts",
  },
  {
    operationId: "mapPlaceDetails",
    method: "get",
    path: "/api/v1/surfboard/map/places/{placeId}",
    tag: "Map",
    summary: "Where one of the suggested places is",
    description:
      "The position and address of a place from the suggestions; it ends the search's session (send the same `sessionToken`). An account has 100 a day. 404 for a place Google does not know.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "placeId",
        in: "path",
        required: true,
        description: "A suggestion's `placeId`.",
        schema: z.string(),
        example: "ChIJq6qqqt2LOxARvZkbJk1dKUY",
      },
      {
        name: "sessionToken",
        in: "query",
        required: true,
        description: "The token the suggestions were asked with.",
        schema: z.string(),
        example: "0b1f6c2e-7a54-4f0e-9d21-3c5a8e7b6d10",
      },
    ],
    data: S.PlaceDetailsData,
    errors: [
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "RATE_LIMITED",
      "MAP_SERVICE_UNAVAILABLE",
    ],
    routeFile: "app/api/v1/surfboard/map/places/[placeId]/route.ts",
  },
  {
    operationId: "mapReverseGeocode",
    method: "get",
    path: "/api/v1/surfboard/map/reverse-geocode",
    tag: "Map",
    summary: "The address and nearest named place under a point",
    description:
      "For a tap on the map that lands on no plan. `address` and `name` are each null where Google knows nothing: that is an answer, not an error (the app shows the coordinates). An account has 300 a day; nothing about the point is logged or stored.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "lat",
        in: "query",
        required: true,
        description: "Latitude in degrees, inside Nigeria.",
        schema: z.number(),
        example: "6.4474",
      },
      {
        name: "lng",
        in: "query",
        required: true,
        description: "Longitude in degrees, inside Nigeria.",
        schema: z.number(),
        example: "3.4739",
      },
    ],
    data: S.ReverseGeocodeData,
    errors: ["VALIDATION_ERROR", "RATE_LIMITED", "MAP_SERVICE_UNAVAILABLE"],
    routeFile: "app/api/v1/surfboard/map/reverse-geocode/route.ts",
  },
  {
    operationId: "coordinateShifts",
    method: "get",
    path: "/api/v1/surfboard/settings/coordinate-shifts",
    tag: "Map",
    summary: "The per-state map display correction",
    description: "Public. The map applies it when it draws (ADR-0004).",
    access: "public",
    versionGate: false,
    data: S.CoordinateShiftsData,
    routeFile: "app/api/v1/surfboard/settings/coordinate-shifts/route.ts",
  },

  // --------------------------------------------------------- records
  {
    operationId: "listBatchSummaries",
    method: "get",
    path: "/api/v1/surfboard/cod/batches/summary",
    tag: "Records",
    summary: "The Records list",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "scope",
        in: "query",
        description:
          "`active` (default): a plan still to be lodged. `history`: every plan lodged.",
        schema: z.enum(["active", "history"]),
        example: "history",
      },
      {
        name: "search",
        in: "query",
        description:
          "Batch code, plan number, title or facilitator; at most 100 characters.",
        schema: z.string().max(100),
        example: "SurfCoD",
      },
      ...page,
    ],
    data: S.BatchListData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/surfboard/cod/batches/summary/route.ts",
  },
  {
    operationId: "batchDetail",
    method: "get",
    path: "/api/v1/surfboard/cod/batches/{batchId}/summary",
    tag: "Records",
    summary: "One batch and its plans",
    description: "Someone else's batch, or an unknown id, is a 404.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "batchId",
        in: "path",
        required: true,
        description: "A batch's id.",
        schema: z.string(),
        example: "b1",
      },
    ],
    data: S.BatchDetailData,
    errors: ["NOT_FOUND"],
    routeFile: "app/api/v1/surfboard/cod/batches/[batchId]/summary/route.ts",
  },

  // ----------------------------------------------------------- sharing
  {
    operationId: "searchSurveyors",
    method: "get",
    path: "/api/v1/surfboard/users/search",
    tag: "Plans",
    summary: "Find a surveyor to share plans with",
    description:
      "By any part of an email address or SURCON number, capitals ignored; at most 10, and never the caller. Any surveyor's email and SURCON number can be found this way (the website does the same), so the app waits for 3 characters before it asks.",
    access: "surveyor",
    versionGate: true,
    params: [
      {
        name: "query",
        in: "query",
        required: true,
        description: "Part of an email address or SURCON number.",
        schema: z.string(),
        example: "ada@",
      },
    ],
    data: S.SurveyorSearchData,
    routeFile: "app/api/v1/surfboard/users/search/route.ts",
  },
  {
    operationId: "sharePlan",
    method: "post",
    path: "/api/v1/surfboard/plans/{planId}/share",
    tag: "Plans",
    summary:
      "Share one of the caller's plans with a surveyor who has an account",
    description:
      "Needs an active subscription (a 403 SUBSCRIPTION_REQUIRED stops every plan after it). Access is immediate, with no accept step, and the person is told by push and email. Sharing again is harmless. Only the owner can share: a plan that is someone else's, deleted or unknown is a 404. Sharing several plans is one call each.",
    access: "surveyor",
    versionGate: true,
    params: [planId("The plan to share (a uuid).")],
    body: {
      schema: z.object({ userId: z.string().min(1) }),
      example: { userId: "9c1f0e52-6b7a-4d3e-8f21-5a4b3c2d1e0f" },
      invalid: [{}, { userId: "" }],
    },
    data: S.PlanShareData,
    errors: ["VALIDATION_ERROR", "SUBSCRIPTION_REQUIRED", "NOT_FOUND"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/share/route.ts",
  },
  {
    operationId: "invitePlanShare",
    method: "post",
    path: "/api/v1/surfboard/plans/{planId}/share/invite",
    tag: "Plans",
    summary: "Share one of the caller's plans by email, account or not",
    description:
      "As `sharePlan`, for an email address. If it has a Surfboard account the plan is shared at once; if not, an invitation is emailed (valid for 7 days, replacing an earlier open one for the same plan and address) and access follows when that person signs up.",
    access: "surveyor",
    versionGate: true,
    params: [planId("The plan to share (a uuid).")],
    body: {
      schema: z.object({ email: z.email() }),
      example: { email: "ada@example.com" },
      invalid: [{}, { email: "not-an-email" }],
    },
    data: S.PlanShareInviteData,
    errors: ["VALIDATION_ERROR", "SUBSCRIPTION_REQUIRED", "NOT_FOUND"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/share/invite/route.ts",
  },

  // ----------------------------------------------------------- stats
  {
    operationId: "planStats",
    method: "get",
    path: "/api/v1/surfboard/plans/stats",
    tag: "Stats",
    summary: "The Stats tab",
    description:
      "Every figure is counted by the rules of the list it opens, so the number and the list agree. A surveyor with more than 5,000 plans in scope gets a 400.",
    access: "surveyor",
    versionGate: true,
    params: [...dateRange],
    data: S.PlanStatsData,
    errors: ["VALIDATION_ERROR"],
    routeFile: "app/api/v1/surfboard/plans/stats/route.ts",
  },

  // ----------------------------------------------- profile and money
  {
    operationId: "profileSummary",
    method: "get",
    path: "/api/v1/surfboard/profile/summary",
    tag: "Account",
    summary: "The firm on the Profile tab",
    description:
      "Never sends the logo or signature links, payer id, phone, address or preferences.",
    access: "surveyor",
    versionGate: true,
    data: S.ProfileSummaryData,
    routeFile: "app/api/v1/surfboard/profile/summary/route.ts",
  },
  {
    operationId: "subscriptionSummary",
    method: "get",
    path: "/api/v1/surfboard/subscription/summary",
    tag: "Account",
    summary: "The subscription, as status only",
    description:
      "Unlike the website's call it also reports a subscription that has ended. A state the app does not know is shown neutrally.",
    access: "surveyor",
    versionGate: true,
    data: S.SubscriptionSummaryData,
    routeFile: "app/api/v1/surfboard/subscription/summary/route.ts",
  },
  {
    operationId: "walletSummary",
    method: "get",
    path: "/api/v1/surfboard/qr/wallet-summary",
    tag: "Money",
    summary: "The wallet, read only",
    description:
      "A read never creates the wallet (none reads as zeros). Never sends the bank account, the payer's name or email, or an access token.",
    access: "surveyor",
    versionGate: true,
    data: S.WalletSummaryData,
    routeFile: "app/api/v1/surfboard/qr/wallet-summary/route.ts",
  },
];
