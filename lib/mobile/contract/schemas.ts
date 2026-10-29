import { z } from "zod/v4";
import {
  DISPLAY_STATUS_CODES,
  STAGE_ORDER,
} from "@/surfboard/utils/planStatus";
import type {
  BatchDetail,
  BatchSummary,
} from "@/surfboard/services/batchSummaryService";
import type { PlanDetail } from "@/surfboard/services/planDetailService";
import type { PlanFileLink } from "@/surfboard/services/planFileLinkService";
import type { PlanMap } from "@/surfboard/services/planMapService";
import type {
  PlanCounts,
  PlanSummary,
} from "@/surfboard/services/planSummaryService";
import type { PlanStats } from "@/surfboard/services/planStatsService";
import type { ProfileSummary } from "@/surfboard/services/profileService";
import type { WalletSummary } from "@/surfboard/services/qrEarningsService";
import type { SubscriptionSummary } from "@/surfboard/services/subscriptionService";
import type { Paginated } from "@/lib/api/pagination";
import type { DeviceSession } from "@/lib/auth/deviceSessions";

/**
 * What the mobile app is promised in each successful answer (TASK-0015 1C).
 *
 * This file is the one place the shapes are written down. `openapi.ts` turns
 * it into the OpenAPI document, the tests check real answers against it, and
 * the last section below makes `tsc` fail when a service's own return type and
 * the schema here stop agreeing, so a field cannot be added, renamed or retyped
 * in the service without a decision about the contract.
 *
 * The schemas are written for zod 4 (`zod/v4`, shipped inside the zod 3.25
 * package already installed) because only it can produce JSON Schema. The
 * routes' own request validators stay on zod 3; see `endpoints.ts` for how
 * those are kept honest.
 *
 * Objects here are open on purpose in the published document: a newer server
 * may add a field and an older app must ignore it. The tests are the strict
 * side: they require that a real answer parses without losing a key, so a
 * field the schema does not know about (for example a leaked email) fails.
 */

// ---------------------------------------------------------------- shared

const iso = z.iso.datetime().describe("ISO 8601 date and time, UTC");
const count = z.number().int().nonnegative();
const nullableText = z.string().nullable();

/** An object with one entry for each of `keys`, all of the same kind. */
function keyed<K extends string, V extends z.ZodType>(
  keys: readonly K[],
  value: V
) {
  return z.object(
    Object.fromEntries(keys.map((key) => [key, value])) as Record<K, V>
  );
}

export const ApprovalState = z
  .enum(["PENDING", "APPROVED", "QUERIED"])
  .meta({ id: "ApprovalState" });

export const DisplayStatusCode = z
  .enum(DISPLAY_STATUS_CODES)
  .meta({ id: "DisplayStatusCode" });

export const DisplayStatus = z
  .object({
    code: DisplayStatusCode,
    label: z
      .string()
      .describe(
        "The words to show; a code the app does not know is shown with this label."
      ),
  })
  .meta({ id: "DisplayStatus" });

export const Stages = keyed(STAGE_ORDER, ApprovalState).meta({
  id: "Stages",
  description: "Each review's state. A review that has not acted is PENDING.",
});

export const Pagination = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: count,
    totalPages: z.number().int().positive(),
  })
  .meta({ id: "Pagination" });

const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: Pagination });

/** `{ success: true, data }`, the envelope of every successful answer. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });

/** `{ success: false, error, code?, details? }`, the envelope of every failure. */
export const ErrorBody = z
  .object({
    success: z.literal(false),
    error: z
      .string()
      .describe(
        "A sentence for a developer. The app words its own messages and does not show this."
      ),
    code: z
      .string()
      .optional()
      .describe(
        "A stable code (see the list of codes). Some older failures have none: use the status."
      ),
    details: z
      .unknown()
      .optional()
      .describe(
        "Extra facts for some codes (VALIDATION_ERROR, APP_UPDATE_REQUIRED)."
      ),
  })
  .meta({ id: "Error" });

export const Empty = z
  .object({})
  .meta({ id: "Empty", description: "Nothing to report; the call worked." });

// ------------------------------------------------------------------ auth

export const SessionUser = z
  .object({
    id: z.string(),
    email: z.string(),
    firstName: nullableText,
    lastName: nullableText,
    role: z.string().describe("Lower case, for example `user`."),
    emailVerified: z.boolean(),
    mustVerifyNow: z
      .boolean()
      .describe("True when the person is held at the verification screen."),
  })
  .meta({ id: "SessionUser" });

const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z
    .string()
    .describe("Single use: each refresh returns a new one."),
  accessExpiresIn: z.number().int().positive().describe("Seconds."),
  refreshExpiresAt: iso,
});

export const LoginData = TokenPair.extend({ user: SessionUser }).meta({
  id: "LoginResult",
});
export const RefreshData = TokenPair.meta({ id: "RefreshResult" });

export const MeData = z
  .object({
    id: z.string(),
    email: z.string(),
    firstName: nullableText,
    lastName: nullableText,
    role: z.string(),
    emailVerified: z.boolean(),
    emailVerifiedVia: z
      .enum(["OTP", "LINK", "OAUTH"])
      .nullable()
      .describe("How the address was verified; null while it is not."),
    mustVerifyNow: z
      .boolean()
      .describe("Read from the access token: current only after a refresh."),
    verificationMethod: z
      .enum(["OTP", "LINK"])
      .describe("How this platform verifies an address."),
    verificationGraceEndsAt: iso
      .nullable()
      .describe(
        "When an account that predates enforcement is held at the gate; null otherwise."
      ),
    verificationCodeSentAt: iso
      .nullable()
      .describe(
        "When a code the person can still enter was sent; null when none is live (never sent, used, expired or out of attempts) and for verified accounts and link platforms."
      ),
  })
  .meta({ id: "Me" });

export const DeviceSessionData = z
  .object({
    id: z
      .string()
      .describe("The sign-in's family id: the unit that is revoked."),
    deviceId: z.string(),
    deviceLabel: nullableText,
    appVersion: nullableText,
    lastUsedAt: iso.nullable(),
    signedInAt: iso,
  })
  .meta({ id: "DeviceSession" });

export const PasswordResetData = z.object({ message: z.string() });
export const VerifyEmailData = z.object({ verified: z.literal(true) });
export const ResendVerificationData = z
  .union([
    z.object({ sent: z.literal(true), method: z.enum(["OTP", "LINK"]) }),
    z.object({ sent: z.literal(false), alreadyVerified: z.literal(true) }),
  ])
  .meta({ id: "ResendVerificationResult" });

// -------------------------------------------------------------- the plans

export const PlanQuery = z
  .object({
    stage: z.enum(STAGE_ORDER),
    label: z.string(),
    comment: nullableText,
    at: iso.nullable(),
  })
  .meta({
    id: "PlanQuery",
    description: "Who queried the plan, why and when. Owner only.",
  });

export const PlanSummaryData = z
  .object({
    id: z.string(),
    planNumber: z.string(),
    surveyTitle: z.string(),
    planType: z.string(),
    facilitator: z.string(),
    displayStatus: DisplayStatus,
    stages: Stages,
    queries: z
      .array(PlanQuery)
      .describe(
        "Empty when nothing is queried, and always empty for a plan seen through a share."
      ),
    physicalCopySubmitted: z.boolean(),
    hasRecordCopy: z
      .boolean()
      .describe("Whether a record copy exists. The link is never sent."),
    lga: nullableText,
    ward: nullableText,
    lcda: nullableText,
    locality: nullableText,
    state: nullableText,
    dateOnSurveyPlan: iso.nullable(),
    dateLodged: iso.nullable(),
    createdAt: iso,
    updatedAt: iso,
    isOwner: z.boolean(),
    sharedCount: count.describe(
      "People the owner shared it with; 0 when seen through a share."
    ),
    ownerName: nullableText.describe(
      "Who shared it, for a plan seen through a share."
    ),
  })
  .meta({ id: "PlanSummary" });

export const PlanListData = paginated(PlanSummaryData).meta({ id: "PlanList" });

export const PlanCountsData = z
  .object({
    mine: count,
    sharedWithMe: count,
    queried: count.describe("Equals the total of the Queried list."),
    readyForPhysicalSubmission: count,
  })
  .meta({ id: "PlanCounts" });

export const PlanFile = z
  .object({
    kind: z.enum(["RECORD_COPY", "SURVEY_PLAN", "DRAWING", "CERTIFICATE"]),
    name: z
      .string()
      .describe(
        "The website's name: the plan number with `/` as `_`, then the extension."
      ),
    format: z
      .string()
      .describe("Lower-case extension; empty when the stored name has none."),
    viewable: z.boolean().describe("PDF and common images. Drawings are not."),
    ref: z
      .string()
      .describe("The stored reference. The app never shows or logs it."),
  })
  .meta({ id: "PlanFile" });

export const PlanDetailData = PlanSummaryData.extend({
  deededArea: z.string(),
  pillarType: z.string(),
  pillarCount: count,
  referencePlanNumber: nullableText,
  areaSqM: z
    .number()
    .nullable()
    .describe(
      "Square metres, worked out from the boundary; null if the boundary is unusable."
    ),
  centroid: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .describe("Stored, not corrected for display."),
  submittedAt: iso.nullable(),
  physicalCopySubmittedAt: iso.nullable(),
  archiveReceivedAt: iso.nullable(),
  stageDecidedAt: keyed(STAGE_ORDER, iso.nullable()).describe(
    "When each review last acted (a query counts); null while pending."
  ),
  files: z
    .array(PlanFile)
    .describe("The entry's place in this list is the `n` of the file route."),
  batch: z
    .object({ id: z.string(), batchCode: z.string() })
    .nullable()
    .describe("Owner only."),
}).meta({ id: "PlanDetail" });

export const PlanFileLinkData = z
  .object({
    url: z
      .string()
      .describe(
        "A signed address that works until `expiresAt`. Never store or show it."
      ),
    expiresAt: iso,
    name: z.string(),
    format: z.string(),
  })
  .meta({ id: "PlanFileLink" });

const Position = z.tuple([z.number(), z.number()]);
export const Outline = z
  .union([
    z.object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(Position)),
    }),
    z.object({
      type: z.literal("MultiPolygon"),
      coordinates: z.array(z.array(z.array(Position))),
    }),
  ])
  .meta({
    id: "Outline",
    description:
      "Longitude and latitude as stored, not corrected for display. For drawing only.",
  });

export const MapPlan = z
  .object({
    id: z.string(),
    planNumber: z.string(),
    surveyTitle: z.string(),
    displayStatus: DisplayStatus,
    state: nullableText,
    lga: nullableText,
    locality: nullableText,
    areaSqM: z.number().nullable(),
    centroid: z.object({ lat: z.number(), lng: z.number() }),
    simplifiedGeometry: Outline,
  })
  .meta({ id: "MapPlan" });

export const PlanMapData = z
  .object({
    plans: z.array(MapPlan),
    total: count.describe("Every live plan the caller has, drawn or not."),
    withoutOutline: count.describe(
      "Plans left out because their boundary cannot be drawn."
    ),
    truncated: z.boolean().describe("There are more plans than were read."),
  })
  .meta({ id: "PlanMap" });

export const Breakdown = z
  .object({
    rows: z
      .array(z.object({ key: z.string(), count }))
      .describe(
        "Biggest first; at most 100. `key` is the text to hand back as the list's filter."
      ),
    distinct: count,
    missing: count.describe("Plans with no value; they have no row."),
  })
  .meta({ id: "Breakdown" });

export const PlanStatsData = z
  .object({
    total: count.describe("Plans in scope that are not provisional."),
    provisional: count,
    undated: count,
    byStatus: keyed(DISPLAY_STATUS_CODES, count).describe(
      "One count for every status code, 0 included."
    ),
    pillars: z.object({ regular: count, special: count }),
    byMonth: z
      .array(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), count }))
      .describe("Oldest first; months with no plan are left out."),
    facilitators: Breakdown,
    lgas: Breakdown,
    wards: Breakdown,
    lcdas: Breakdown,
    activeBatches: count.describe("Not affected by the date range."),
  })
  .meta({ id: "PlanStats" });

// ------------------------------------------------------------ the records

export const BatchPaymentStatus = z
  .enum([
    "PENDING_USER_PAYMENT",
    "LASG_PAID",
    "ACCOUNTS_APPROVED",
    "ACCOUNTS_DISAPPROVED",
    "COMPLETED",
  ])
  .meta({ id: "BatchPaymentStatus" });

export const BatchSummaryData = z
  .object({
    id: z.string(),
    batchCode: z.string(),
    createdAt: iso,
    paymentStatus: BatchPaymentStatus,
    paymentLabel: z.string(),
    planCount: count,
    readyCount: count.describe(
      "Plans that can be marked physical copy submitted now."
    ),
    statusCounts: z
      .array(z.object({ code: DisplayStatusCode, label: z.string(), count }))
      .describe(
        "One entry per distinct status, queried and ready first. Show as given."
      ),
  })
  .meta({ id: "BatchSummary" });

export const BatchListData = paginated(BatchSummaryData).meta({
  id: "BatchList",
});

export const BatchDetailData = BatchSummaryData.extend({
  plans: z.array(
    z.object({
      id: z.string(),
      planNumber: z.string(),
      surveyTitle: z.string(),
      facilitator: z.string(),
      displayStatus: DisplayStatus,
      ready: z
        .boolean()
        .describe("True exactly when the status code is READY_FOR_PHYSICAL."),
      queries: z.array(PlanQuery),
      physicalCopySubmittedAt: iso.nullable(),
    })
  ),
}).meta({ id: "BatchDetail" });

// ------------------------------------------------------ profile and money

export const ProfileSummaryData = z
  .object({
    firstName: nullableText,
    lastName: nullableText,
    prefix: nullableText,
    suffix: nullableText,
    companyName: nullableText,
    surconRegNumber: nullableText,
    surconRegName: nullableText,
    residenceState: nullableText,
    isKycValidated: z.boolean(),
  })
  .meta({
    id: "ProfileSummary",
    description:
      "A field left blank on the website may arrive as an empty string.",
  });

export const SubscriptionSummaryData = z
  .object({
    state: z.enum(["NONE", "ACTIVE", "ENDING", "GRACE", "ENDED"]),
    planName: nullableText,
    interval: nullableText,
    validUntil: iso.nullable(),
  })
  .meta({
    id: "SubscriptionSummary",
    description: "Status only: no price, card or payment.",
  });

export const WalletSummaryData = z
  .object({
    currency: z.literal("NGN"),
    availableBalance: z.number(),
    pendingWithdrawal: z.number(),
    totalWithdrawn: z.number(),
    totalEarned: z.number(),
    earnedThisMonth: z.number(),
    recent: z
      .array(
        z.object({
          planNumber: z.string(),
          service: z.enum(["LOCATION_AUTHENTICITY", "CERTIFICATE_OF_DEPOSIT"]),
          amount: z.number(),
          at: iso,
        })
      )
      .describe("The ten latest earnings, newest first."),
  })
  .meta({ id: "WalletSummary", description: "Amounts are naira." });

export const CoordinateShiftsData = z
  .record(
    z.string(),
    z.object({ eastingShift: z.number(), northingShift: z.number() })
  )
  .meta({
    id: "CoordinateShifts",
    description:
      "Metres, keyed by the state's lower-case name. Empty when no state has a correction.",
  });

// ------------------------------------------- the types and the schemas agree

/** A value as JSON carries it: dates are text. */
type Json<T> = T extends Date
  ? string
  : T extends readonly (infer U)[]
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Must<T extends true> = T;

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ContractMatchesServices = [
  Must<Same<z.infer<typeof PlanSummaryData>, PlanSummary>>,
  Must<Same<z.infer<typeof PlanListData>, Paginated<PlanSummary>>>,
  Must<Same<z.infer<typeof PlanCountsData>, PlanCounts>>,
  Must<Same<z.infer<typeof PlanDetailData>, PlanDetail>>,
  Must<Same<z.infer<typeof PlanFileLinkData>, PlanFileLink>>,
  Must<Same<z.infer<typeof PlanMapData>, PlanMap>>,
  Must<Same<z.infer<typeof PlanStatsData>, PlanStats>>,
  Must<Same<z.infer<typeof BatchSummaryData>, BatchSummary>>,
  Must<Same<z.infer<typeof BatchDetailData>, BatchDetail>>,
  Must<Same<z.infer<typeof BatchListData>, Paginated<BatchSummary>>>,
  Must<Same<z.infer<typeof ProfileSummaryData>, ProfileSummary>>,
  Must<Same<z.infer<typeof SubscriptionSummaryData>, SubscriptionSummary>>,
  Must<Same<z.infer<typeof WalletSummaryData>, WalletSummary>>,
  Must<Same<z.infer<typeof DeviceSessionData>, Json<DeviceSession>>>,
];
/* eslint-enable @typescript-eslint/no-unused-vars */
