// =============================================
// File: validation.ts
// =============================================
import { z } from "zod";
import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  PLAN_TYPES,
  PlanType,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";

export const createPlanSchema = z.object({
  planNumber: z.string().min(1),
  surveyTitle: z.string().min(1),
  planType: z.custom<PlanType>(
    (v) => typeof v === "string" && Object.values(PLAN_TYPES).includes(v as any)
  ),
  referencePlanNumber: z.string().optional().nullable(),
  deededArea: z.string().min(1),
  facilitator: z.string().min(1),
  pillarType: z.string().min(1),
  geometry: z.any().nullable(),
  pillars: z
    .array(
      z.object({
        pillarNumber: z.union([z.string(), z.number()]),
        easting: z.number(),
        northing: z.number(),
      })
    )
    .optional(),
  pdfFilePaths: z.array(z.string()).min(1, "At least one PDF is required"),
  cadFilePaths: z.array(z.string()).min(1, "At least one CAD is required"),
  certificateFilePaths: z.array(z.string()).optional().default([]),
  dateOnSurveyPlan: z.string().min(1),
  dateLodged: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  lcda: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
});

export const editPlanSchema = createPlanSchema.extend({
  id: z.string().min(1),
});

export function bytesToMb(bytes: number) {
  return bytes / (1024 * 1024);
}

export function validateFileSize(bytes: number) {
  return bytesToMb(bytes) <= MAX_FILE_MB;
}

export function _validateFileSize(size: number) {
  return size <= MAX_FILE_BYTES;
}

const PlanTypeEnum = z.enum([
  PLAN_TYPES.APPROVED_LAYOUT,
  PLAN_TYPES.DEED,
  PLAN_TYPES.DEED_CHANGE_OF_TITLE,
  PLAN_TYPES.DEED_CHANGE_OF_TITLE_LAYOUT,
  PLAN_TYPES.PROVISIONAL,
  PLAN_TYPES.PROVISIONAL_LAYOUT,
  PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION,
] as [string, ...string[]]);

const BasePlanSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  planNumber: z.string().min(1, "Required"),
  surveyTitle: z.string().min(1, "Required"),
  planType: PlanTypeEnum,
  referencePlanNumber: z.string().optional().nullable(),
  deededArea: z.string().min(1, "Required"),
  facilitator: z.string().min(1, "Required"),
  pillarType: z.string().min(1, "Required"),
  geometry: z.any().nullable(),
  pdfFilePaths: z.array(z.string()),
  cadFilePaths: z.array(z.string()),
  certificateFilePaths: z.array(z.string()),
  dateOnSurveyPlan: z.string().min(1, "Required"),
  dateLodged: z.string().nullable().optional(),
  ward: z.string().nullable().optional(),
  lcda: z.string().nullable().optional(),
  lga: z.string().nullable().optional(),
  status: z.string().optional(),
  isLive: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});

export const surfboardCreateSchema = BasePlanSchema.superRefine((val, ctx) => {
  if ((val.cadFilePaths?.length ?? 0) < 1)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one CAD file is required",
      path: ["cadFilePaths"],
    });
  if ((val.pdfFilePaths?.length ?? 0) < 1)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one PDF file is required",
      path: ["pdfFilePaths"],
    });
  if ((val.certificateFilePaths?.length ?? 0) > 0 && !val.dateLodged)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "dateLodged is required when certificate files are provided",
      path: ["dateLodged"],
    });
});

export const surfboardUpdateSchema = surfboardCreateSchema;
