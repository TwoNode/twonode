/**
 * Certificate of Deposit Types
 * Types for the Certificate of Deposit batch submission and approval workflow
 */

import { ApprovalStatus, BatchPaymentStatus } from "@prisma/client";

// ============================================================================
// Batch Submission Types
// ============================================================================

export interface BatchSubmissionPlan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga: string;
  area: number; // Calculated from geometry
  facilitator: string;
}

export interface BatchFeeCalculation {
  planId: string;
  planNumber: string;
  lga: string;
  area: number;
  ratePerSqM: number;
  planFee: number;
}

export interface BatchSubmissionDTO {
  planIds: string[];
  // submittedBy: string;
}

export interface BatchSubmissionResult {
  success: boolean;
  batchId?: string;
  batchCode?: string;
  totalAmount?: number;
  paymentUrl?: string;
  error?: string;
}

// ============================================================================
// Batch Payment Types
// ============================================================================

export interface UserPaymentDTO {
  batchId: string;
  paymentRef: string;
  amount: number;
}

export interface LAsgReceiptUploadDTO {
  batchId: string;
  receiptFile: File;
  uploadedBy: string;
  paymentDate: Date;
}

// ============================================================================
// Approval Types
// ============================================================================

export interface ApprovalDTO {
  planId: string;
  approvedBy: string;
  comment?: string;
  status: "APPROVED" | "QUERIED";
}

export interface AccountsApprovalDTO {
  batchId: string;
  approvedBy: string;
  approved: boolean; // true = approved, false = disapproved
  comment?: string;
}

export interface ChartingApprovalDTO extends ApprovalDTO {
  possibleChartingRemarks?: string; // Can edit this field
}

export interface SurconApprovalDTO extends ApprovalDTO {
  // Confirms pillar numbers
}

export interface RecordsIApprovalDTO extends ApprovalDTO {
  // Confirms record copy
}

export interface RecordsIIApprovalDTO extends ApprovalDTO {
  // Verifies physical copy
}

// ============================================================================
// Dashboard View Types
// ============================================================================

export interface BatchWithPlans {
  id: string;
  batchCode: string;
  submittedBy: string;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  planCount: number;
  totalAmount: number;
  paymentStatus: BatchPaymentStatus;
  userPaymentDate?: Date | null;
  lasgReceiptUrl?: string | null;
  accountsApprovedAt?: Date | null;
  accountsDisapproved: boolean;
  createdAt: Date;
  plans: {
    id: string;
    planNumber: string;
    surveyTitle: string;
    accountsStatus?: ApprovalStatus | null;
    chartingStatus?: ApprovalStatus | null;
    surconStatus?: ApprovalStatus | null;
    recordsIStatus?: ApprovalStatus | null;
    recordsIIStatus?: ApprovalStatus | null;
  }[];
}

export interface PlanForApproval {
  id: string;
  planNumber: string;
  surveyTitle: string;
  planType: string;
  deededArea: string;
  facilitator: string;
  lga?: string | null;
  ward?: string | null;
  lcda?: string | null;
  locality?: string | null;
  possibleChartingRemarks?: string | null;
  pillars: any; // JSON
  redCopyFileUrl?: string | null;
  batchId?: string | null;
  batch?: {
    batchCode: string;
    paymentStatus: BatchPaymentStatus;
  } | null;

  // Approval statuses
  accountsStatus?: ApprovalStatus | null;
  accountsComment?: string | null;
  accountsApprovedAt?: Date | null;

  chartingStatus?: ApprovalStatus | null;
  chartingComment?: string | null;
  chartingApprovedAt?: Date | null;

  surconStatus?: ApprovalStatus | null;
  surconComment?: string | null;
  surconApprovedAt?: Date | null;

  recordsIStatus?: ApprovalStatus | null;
  recordsIComment?: string | null;
  recordsIApprovedAt?: Date | null;

  recordsIIStatus?: ApprovalStatus | null;
  recordsIIComment?: string | null;
  recordsIIApprovedAt?: Date | null;

  status: string;
  redCopyStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LGA Fee Configuration Types
// ============================================================================

export interface LGAFeeConfigDTO {
  lgaName: string;
  ratePerSqM: number;
  systemChargePercent?: number;
}

export interface LGAFeeConfig {
  id: string;
  lgaName: string;
  ratePerSqM: number;
  systemChargePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OSSG API Types
// ============================================================================

export interface OSSGCertificateData {
  planNumber: string;
  surveyTitle: string;
  parcelArea: string; // Size
  lga: string;
  ward?: string;
  lcda?: string;
  deededArea: string;
  pillarNumbers: string[]; // Extracted from pillars JSON
  pillarCoordinates: Array<{ number: string; x: number; y: number }>;
  locality?: string;
  possibleChartingRemarks?: string;
}

export interface OSSGSubmissionResult {
  success: boolean;
  planNumber: string;
  certificateUrl?: string;
  error?: string;
}

// ============================================================================
// Spatial Intersection Types
// ============================================================================

export interface ChartingIntersectionResult {
  planId: string;
  interpretation?: string | null;
  intersected: boolean;
}
