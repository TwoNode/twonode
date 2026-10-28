import { z } from "zod/v4";
import type { ErrorCode } from "@/lib/mobile/contract/errorCodes";
import * as S from "@/lib/mobile/contract/schemas";

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
  method: "get" | "post" | "delete";
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
      "Single use: the refresh token in the request is spent and a new pair is returned. The access token's claims (`emailVerified`, `mustVerifyNow`) change here.",
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
    errors: ["NOT_FOUND", "FILE_NOT_VIEWABLE"],
    routeFile: "app/api/v1/surfboard/plans/[planId]/files/[n]/route.ts",
    noStore: true,
  },
  {
    operationId: "planMap",
    method: "get",
    path: "/api/v1/surfboard/plans/map",
    tag: "Map",
    summary: "The caller's own plans for the Home map",
    description:
      "At most 2,000 plans, most recently changed first. The outline is for drawing and nothing else: never measure from it.",
    access: "surveyor",
    versionGate: true,
    data: S.PlanMapData,
    routeFile: "app/api/v1/surfboard/plans/map/route.ts",
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
