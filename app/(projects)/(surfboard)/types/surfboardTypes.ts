// app/(projects)/(surfboard)/types/surfboardTypes.ts
import type { Prisma } from "@prisma/client";

/**
 * A single survey pillar with its coordinates.
 */
export interface PillarData {
  easting: number;
  northing: number;
  pointIndex: number;
  pillarNumber: string;
}

/** GeoJSON Point */
export type GeoJSONPoint = {
  type: "Point";
  coordinates: [number, number];
};

/** GeoJSON Polygon */
export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: [[number, number][]];
};

/**
 * Payload to create a new plan.
 * - geometry is a GeoJSON Polygon object
 * - pillars is an array of simple pillar objects
 */
export interface CreatePlanData {
  planNumber: string;
  surveyTitle: string;
  planType: string;
  referencePlanNumber?: string;
  deededArea: string;
  facilitator: string;
  pillarType: string;
  ward?: string;
  lcda?: string;
  lga?: string;
  geometry:
    | GeoJSONPolygon
    | {
        type: "Polygon";
        coordinates: [[number, number][]];
      }
    | any;
  /** Array of simple pillar objects */
  pillars: PillarData[] | any;
  certificateReady?: boolean;
  dateOnSurveyPlan?: string | Date | null;
  reasonForWithdrawalAndResubmission?: string;
}

/** Files uploaded alongside the plan */
export interface FileUploadData {
  pdfFiles?: File;
  cadFiles?: File;
  certificateFiles?: File;
}

/**
 * A complete survey plan as returned by the API.
 * Matches the SurfboardPlan model in the Prisma schema.
 */
export interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  planType: string;
  referencePlanNumber: string | null;
  deededArea: string;
  facilitator: string;
  pillarType: string;
  geometry:
    | Prisma.JsonValue
    | GeoJSONPolygon
    | { type: "Polygon"; coordinates: [[number, number][]] }; // Using Prisma's JsonValue type
  pdfFilePaths: string[];
  cadFilePaths: string[];
  certificateFilePaths: string[];
  ward: string | null;
  lcda: string | null;
  lga: string | null;
  pillars: Prisma.JsonValue | PillarData[] | null; // Using Prisma's JsonValue type
  status: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW"; // Matches SurfboardPlanStatus enum
  isLive: boolean;
  dateOnSurveyPlan: Date | string | null;
  dateLodged: Date | string | null;
  reasonForWithdrawalAndResubmission: string | null;
  createdAt: Date;
  updatedAt: Date;
  sharedTo?: string[];
  areaSqM?: number | null;
  centroid?: [number, number] | null;
  userId?: string | null;
  user?: Prisma.SurfboardUserCreateInput | any;
  isOwner?: boolean;
}

/** Standard envelope for API results */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "pending";

export type SubscriptionPlan = {
  id: "monthly" | "quarterly" | "yearly";
  name: string;
  price: number;
  description: string;
  interval: string;
};

// Analytics Types
export interface FacilitatorStat {
  facilitator: string;
  count: number;
  totalArea: number;
}

export interface LGAStat {
  lga: string;
  count: number;
}

export interface PendingCertificate {
  id: string;
  planNumber: string;
  surveyTitle: string;
  status: string;
  facilitator: string;
  updatedAt: Date;
}

export interface PillarStat {
  type: string;
  count: number;
  isRegular: boolean;
}

export interface TimeTrendData {
  period: string;
  count: number;
  totalArea: number;
}

export interface AnalyticsData {
  facilitatorStats: FacilitatorStat[];
  lgaStats: LGAStat[];
  pendingCertificates: PendingCertificate[];
  pillarStats: PillarStat[];
  timeTrends: TimeTrendData[];
  provisionalPlansCount: number;
  totalPlansCount: number;
}

export type SurfboardRole = "USER" | "ADMIN" | "SUPERADMIN";

export const PLAN_TYPES = {
  APPROVED_LAYOUT: "APPROVED LAYOUT",
  DEED: "DEED",
  DEED_CHANGE_OF_TITLE: "DEED CHANGE OF TITLE",
  DEED_CHANGE_OF_TITLE_LAYOUT: "DEED CHANGE OF TITLE(LAYOUT)",
  PROVISIONAL: "PROVISIONAL",
  PROVISIONAL_LAYOUT: "PROVISIONAL LAYOUT",
  WITHDRAWAL_AND_RESUBMISSION: "WITHDRAWAL AND RE-SUBMISSION",
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];

export const REFERENCE_FILTERS: Record<
  PlanType,
  {
    allowFreeText: boolean;
    excludeTypes?: PlanType[];
    mustBeType?: PlanType[];
  }
> = {
  [PLAN_TYPES.APPROVED_LAYOUT]: {
    allowFreeText: true,
    mustBeType: [PLAN_TYPES.APPROVED_LAYOUT],
  },
  [PLAN_TYPES.DEED]: {
    allowFreeText: true,
  },
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE]: {
    allowFreeText: true,
    excludeTypes: [PLAN_TYPES.PROVISIONAL, PLAN_TYPES.PROVISIONAL_LAYOUT],
  },
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE_LAYOUT]: {
    allowFreeText: true,
    mustBeType: [PLAN_TYPES.APPROVED_LAYOUT],
  },
  [PLAN_TYPES.PROVISIONAL]: {
    allowFreeText: true,
  },
  [PLAN_TYPES.PROVISIONAL_LAYOUT]: {
    allowFreeText: true,
  },
  [PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION]: {
    allowFreeText: false,
    excludeTypes: [PLAN_TYPES.PROVISIONAL, PLAN_TYPES.PROVISIONAL_LAYOUT],
  },
};

export type GeoJSONGeometry = any; // replace with precise type if present in your codebase

export interface SurfboardPlanDTO {
  id?: string;
  userId?: string | null;
  planNumber: string;
  surveyTitle: string;
  planType: PlanType;
  referencePlanNumber?: string | null;
  deededArea: string;
  facilitator: string;
  pillarType: string;
  geometry: GeoJSONGeometry | null;
  pdfFilePaths: string[];
  cadFilePaths: string[];
  certificateFilePaths: string[];
  dateOnSurveyPlan: string; // ISO date string
  dateLodged?: string | null;
  ward?: string | null;
  lcda?: string | null;
  lga?: string | null;
  status?: string;
  isLive?: boolean;
  createdAt?: string | Date;
  pillars?: PillarData[] | any;
}

export const MAX_FILE_MB = 50;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
