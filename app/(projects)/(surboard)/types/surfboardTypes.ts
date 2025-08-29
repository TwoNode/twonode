// app/(projects)/(surboard)/types/surfboardTypes.ts
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
  geometry: GeoJSONPolygon | any;
  /** Array of simple pillar objects */
  pillars: PillarData[] | any;
  certificateReady?: boolean;
  dateOnSurveyPlan?: string | Date;
  reasonForWithdrawalAndResubmission?: string;
}

/** Files uploaded alongside the plan */
export interface FileUploadData {
  pdfFile?: File;
  cadFile?: File;
  certificateFile?: File;
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
  geometry: Prisma.JsonValue | GeoJSONPolygon; // Using Prisma's JsonValue type
  pdfFilePath: string | null;
  cadFilePath: string | null;
  certificateFilePath: string | null;
  ward: string | null;
  lcda: string | null;
  lga: string | null;
  pillars: Prisma.JsonValue | PillarData[] | null; // Using Prisma's JsonValue type
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW"; // Matches SurfboardPlanStatus enum
  isLive: boolean;
  dateOnSurveyPlan: Date | null;
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
