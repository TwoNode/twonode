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

export interface SubscriptionPlan {
  id: string | "monthly" | "quarterly" | "yearly";
  name: string;
  description: string;
  maxPlans?: number;
  price: number;
  billingCycle?: "monthly" | "yearly";
  interval?: string;
  features?: string[];
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

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

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date | string;
  endDate: Date | string;
  autoRenew: boolean;
  usedPlans: number;
  maxPlans: number;
  billingCycle: "monthly" | "yearly";
  lastBillingDate?: Date | string | null;
  nextBillingDate?: Date | string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  plan?: SubscriptionPlan;
}

export interface User {
  id: string;
  kindleId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  companyName?: string;
  surconRegNumber?: string;
  surconRegName?: string;
  lastLogin?: Date | string | null;
  loginCount: number;
  isOnline: boolean;
  subscription?: Subscription;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// User Management Types
export type UserRole = "USER" | "ADMIN" | "SUPERADMIN";

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

export const PLAN_TYPES_2 = {
  DEED_CHANGE_OF_TITLE: "DEED CHANGE OF TITLE",
  DEED_CHANGE_OF_TITLE_LAYOUT: "DEED CHANGE OF TITLE(LAYOUT)",
  WITHDRAWAL_AND_RESUBMISSION: "WITHDRAWAL AND RE-SUBMISSION",
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];
export type PlanType2 = (typeof PLAN_TYPES_2)[keyof typeof PLAN_TYPES_2];

export const REFERENCE_FILTERS: Record<
  PlanType,
  {
    allowFreeText: boolean;
    excludeTypes?: PlanType[];
    mustBeType?: PlanType[];
    showField: boolean;
    required: boolean;
  }
> = {
  [PLAN_TYPES.APPROVED_LAYOUT]: {
    allowFreeText: true,
    mustBeType: [PLAN_TYPES.APPROVED_LAYOUT],
    showField: false,
    required: false,
  },
  [PLAN_TYPES.DEED]: {
    allowFreeText: true,
    showField: false,
    required: false,
  },
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE]: {
    allowFreeText: true,
    excludeTypes: [PLAN_TYPES.PROVISIONAL, PLAN_TYPES.PROVISIONAL_LAYOUT],
    showField: true,
    required: true,
  },
  [PLAN_TYPES.DEED_CHANGE_OF_TITLE_LAYOUT]: {
    allowFreeText: true,
    mustBeType: [PLAN_TYPES.APPROVED_LAYOUT],
    showField: true,
    required: true,
  },
  [PLAN_TYPES.PROVISIONAL]: {
    allowFreeText: true,
    showField: false,
    required: false,
  },
  [PLAN_TYPES.PROVISIONAL_LAYOUT]: {
    allowFreeText: true,
    showField: false,
    required: false,
  },
  [PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION]: {
    allowFreeText: false,
    excludeTypes: [PLAN_TYPES.PROVISIONAL, PLAN_TYPES.PROVISIONAL_LAYOUT],
    showField: true,
    required: true,
  },
};

export type GeoJSONGeometry = any; // replace with precise type if present in your codebase

export interface SurfboardPlanDTO {
  id?: string;
  userId?: string | null;
  planNumber: string;
  surveyTitle: string;
  planType: PlanType | PlanType2;
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
  state: string | null;
  status?: string;
  isLive?: boolean;
  createdAt?: string | Date;
  pillars?: PillarData[] | any;
}

export const MAX_FILE_MB = 50;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyName?: string;
  surconRegNumber?: string;
  surconRegName?: string;
  password?: string; // Only for local users, not for SSO
}

export interface UpdateUserInput {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  companyName?: string | null;
  surconRegNumber?: string | null;
  surconRegName?: string | null;
  isActive?: boolean;
}

export interface UpdateSubscriptionInput {
  userId: string;
  planId: string;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
  usedPlans?: number;
  maxPlans?: number;
  billingCycle?: "monthly" | "yearly";
}

export interface UserFilters {
  search?: string;
  role?: UserRole[];
  status?: ("active" | "inactive" | "suspended")[];
  hasSubscription?: boolean;
  subscriptionStatus?: SubscriptionStatus[];
}

export interface UserSort {
  field:
    | "firstName"
    | "lastName"
    | "email"
    | "role"
    | "createdAt"
    | "lastLogin";
  order: "asc" | "desc";
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  filters?: UserFilters;
  sort?: UserSort;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type UserWithSubscription = User & {
  subscription?: Subscription & {
    plan?: SubscriptionPlan;
  };
};

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersWithSubscription: number;
  usersByRole: Array<{ role: UserRole; count: number }>;
  recentSignups: User[];
  activeSubscriptions: number;
  expiringSubscriptions: number;
}
