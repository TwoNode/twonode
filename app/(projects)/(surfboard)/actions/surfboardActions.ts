"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type {
  Plan,
  ApiResult,
  CreatePlanData,
  FileUploadData,
  AnalyticsData,
} from "../types/surfboardTypes";
import {
  uploadSurfboardFileToS3,
  deleteMultipleSurfboardFilesFromS3,
  deleteMultipleSurfboardFilesFromSS3,
  uploadMultipleSurfboardFilesToS3,
  uploadSameTypeSurfboardFilesToS3,
} from "./awsActions";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import { computeGeometryDetails, type GeometryInput } from "../utils/dbUtils";

import QRCode from "qrcode";
import { headers } from "next/headers";

interface QRCodeOptions {
  darkColor?: string;
  lightColor?: string;
  /** Minimum alpha allowed for the light color. Prevents full transparency */
  minLightAlpha?: number; // 0..1
  margin?: number;
  scale?: number;
  width?: number;
  /** If true, generate JPEG (no alpha channel) for guaranteed opaque bg */
  forceOpaque?: boolean;
}

function isValidPlanId(planId: string): boolean {
  return (
    typeof planId === "string" &&
    planId.length >= 20 &&
    planId.length <= 100 &&
    /^[a-f0-9-]+$/i.test(planId)
  );
}

// --- Color helpers (keep QR readable & non-fully-transparent) ---
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGBA_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgba(
  hex: string
): { r: number; g: number; b: number; a: number } | null {
  if (!HEX_RE.test(hex)) return null;
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b, a: 1 };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16) / 255;
    return { r, g, b, a };
  }
  return null;
}

function parseColorToRgba(
  color: string
): { r: number; g: number; b: number; a: number } | null {
  if (!color) return null;
  if (color.toLowerCase() === "transparent")
    return { r: 255, g: 255, b: 255, a: 0 };
  const hex = hexToRgba(color);
  if (hex) return hex;
  const m = color.match(RGBA_RE);
  if (m) {
    const r = clamp(parseInt(m[1], 10), 0, 255);
    const g = clamp(parseInt(m[2], 10), 0, 255);
    const b = clamp(parseInt(m[3], 10), 0, 255);
    const a = m[4] !== undefined ? clamp(parseFloat(m[4]), 0, 1) : 1;
    return { r, g, b, a };
  }
  return null;
}

function rgbaToHex({
  r,
  g,
  b,
  a,
}: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  // qrcode package expects HEX (#RRGGBB or #RRGGBBAA). No rgba() strings.
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  const aa = clamp(Math.round(a * 255), 0, 255)
    .toString(16)
    .padStart(2, "0");
  return aa.toUpperCase() === "FF"
    ? `#${rr}${gg}${bb}`.toUpperCase()
    : `#${rr}${gg}${bb}${aa}`.toUpperCase();
}

function withMinAlpha(
  color: string,
  minAlpha: number,
  fallback = "#ffffff"
): string {
  // Ensures background never fully transparent; scanners need contrast & quiet zone.
  const parsed = parseColorToRgba(color) || parseColorToRgba(fallback);
  if (!parsed) return fallback.toUpperCase();
  const a = Math.max(parsed.a, clamp(minAlpha, 0, 1));
  return rgbaToHex({ ...parsed, a });
}

/**
 * Generates a QR code URL for a surfboard plan with safe colors & quiet zone
 */
export async function generatePlanQRCode(
  planId: string,
  options: QRCodeOptions = {}
): Promise<ApiResult<{ qrCodeDataUrl: string }>> {
  try {
    if (!isValidPlanId(planId)) {
      return { success: false, error: "Invalid plan ID format" };
    }

    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId, userId: user.id }, // if this is not a composite unique, switch to findFirst
      select: { id: true, planNumber: true },
    });

    if (!plan) {
      return { success: false, error: "Plan not found or access denied" };
    }

    const baseUrl = await getBaseUrl();

    const publicUrl = `${baseUrl}/surfboardplan/${planId}`;

    // --- Normalize QR options ---
    const minLightAlpha = options.minLightAlpha ?? 0.3; // >= 30% opaque
    const lightColor = withMinAlpha(
      options.lightColor ?? "#ffffff",
      minLightAlpha,
      "#ffffff"
    );
    const darkColor = options.darkColor ?? "#000000";

    // Quiet zone: scanners expect >= 4 modules
    const margin = Math.max(options.margin ?? 4, 4);

    // width and scale are mutually exclusive in qrcode API – prefer width
    const width = options.width;
    const scale = width ? undefined : options.scale ?? 8;

    const type = options.forceOpaque
      ? ("image/jpeg" as const)
      : ("image/png" as const);

    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: "H",
      margin,
      ...(width ? { width } : { scale }),
      color: {
        dark: darkColor,
        light: lightColor,
      },
      type,
      rendererOpts: type === "image/jpeg" ? { quality: 0.92 } : undefined,
    } as QRCode.QRCodeToDataURLOptions;

    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, qrOptions);

    return { success: true, data: { qrCodeDataUrl } };
  } catch (error) {
    console.error("Error generating QR code:", error);
    return { success: false, error: "Failed to generate QR code" };
  }
}

export async function getPlanPublicUrl(planId: string): Promise<string> {
  if (!isValidPlanId(planId)) {
    throw new Error("Invalid plan ID format");
  }
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/surfboardplan/${planId}`;
}

/**
 * Gets the base URL for the current environment.
 * - In production: Uses the BASE_URL environment variable or defaults to twonodetechnologies.com
 * - In development: Uses the request headers to determine the current host and port
 * @returns The base URL as a string (e.g., 'https://www.twonodetechnologies.com' or 'http://localhost:3000')
 */
export async function getBaseUrl(): Promise<string> {
  // If BASE_URL is explicitly set, use it
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // In production, default to the main domain
  if (process.env.NODE_ENV === "production") {
    return "https://www.twonodetechnologies.com";
  }

  try {
    // In development, get the current host from headers
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";

    // If we have a host, use it (supports custom ports in development)
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    console.error("Error determining base URL from headers:", error);
  }

  // Fallback to default development URL
  return "http://localhost:3000";
}

// Type guard to check if a value is a valid GeometryInput
function isGeometryInput(value: any): value is GeometryInput {
  console.log("\n\n\n\nGeometry value", value, typeof value);
  if (typeof value === "string") return true;
  if (!value || typeof value !== "object") return false;
  if (value?.type === "Polygon" || value?.type === "MultiPolygon") {
    return true;
  }
  return false;
}

/**
 * Creates a new surfboard plan:
 * - Stores geometry & pillars as JSONB
 * - Uploads files to S3
 */
export async function _createSurfPlan(
  data: CreatePlanData,
  files: FileUploadData
): Promise<ApiResult<{ planId: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    // 1) Validate required fields and ≥3 pillars
    if (
      !data.planNumber ||
      !data.surveyTitle ||
      !data.planType ||
      !data.deededArea ||
      !data.facilitator ||
      !data.pillarType ||
      !data.geometry ||
      !Array.isArray(data.pillars) ||
      data.pillars.length < 3
    ) {
      throw new Error(
        "All fields are required and at least 3 pillars must be provided"
      );
    }

    // 2) Ensure unique planNumber
    if (
      await prisma.surfboardPlan.findUnique({
        where: { planNumber: data.planNumber },
      })
    ) {
      throw new Error("Plan number already exists");
    }

    // 3) Upload files to S3
    let pdfFilePaths: string | undefined;
    let cadFilePaths: string | undefined;
    let certificateFilePaths: string | undefined;

    try {
      if (files.pdfFiles) {
        pdfFilePaths = (
          await uploadSurfboardFileToS3(files.pdfFiles, "pdf", data.planNumber)
        ).url;
      }
      if (files.cadFiles) {
        cadFilePaths = (
          await uploadSurfboardFileToS3(files.cadFiles, "cad", data.planNumber)
        ).url;
      }
      if (files.certificateFiles) {
        certificateFilePaths = (
          await uploadSurfboardFileToS3(
            files.certificateFiles,
            "certificate",
            data.planNumber
          )
        ).url;
      }

      console.log("\n\n\n\nPDF file path", pdfFilePaths);
      console.log("\n\n\n\nCAD file path", cadFilePaths);
      console.log("\n\n\n\nCertificate file path", certificateFilePaths);
      console.log("\n\n\n\nGeometry", data.geometry);
      console.log("\n\n\n\nPillars", data.pillars);
    } catch (uploadErr) {
      // rollback any partial uploads
      await deleteMultipleSurfboardFilesFromS3(
        [pdfFilePaths, cadFilePaths, certificateFilePaths]
          .filter((u): u is string => !!u)
          .map((url) => ({ url }))
      );

      console.log("\n\n\n\nError uploading files", uploadErr);
      throw uploadErr;
    }

    // 4) Insert the plan record
    const plan = await prisma.surfboardPlan.create({
      data: {
        userId: user.id,
        planNumber: data.planNumber,
        surveyTitle: data.surveyTitle,
        planType: data.planType,
        referencePlanNumber: data.referencePlanNumber,
        deededArea: data.deededArea,
        facilitator: data.facilitator,
        pillarType: data.pillarType,
        ward: data.ward,
        lcda: data.lcda,
        lga: data.lga,
        geometry: data.geometry, // JSONB
        pillars: data.pillars, // JSONB
        pdfFilePaths: pdfFilePaths ? [pdfFilePaths] : undefined,
        cadFilePaths: cadFilePaths ? [cadFilePaths] : undefined,
        certificateFilePaths: certificateFilePaths
          ? [certificateFilePaths]
          : undefined,
      },
    });

    // 5) Revalidate cache and return
    revalidatePath("/surfboard/dashboard/plans");
    return { success: true, data: { planId: plan.id } };
  } catch (err) {
    console.error("createSurfboardPlan error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// /**
//  * Creates a new surfboard plan:
//  * - Stores geometry & pillars as JSONB
//  * - Uploads files to S3 with the specified path format
//  */
// export async function createSurfPlan(
//   data: CreatePlanData,
//   files: FileUploadData
// ): Promise<ApiResult<{ planId: string }>> {
//   try {
//     const user = await getAuthenticatedSurfUserFromCookie();

//     if (!user || !user.role) {
//       return {
//         success: false,
//         error: "User not authenticated or role not found",
//       };
//     }

//     // 1) Validate required fields and ≥3 pillars
//     if (
//       !data.planNumber ||
//       !data.surveyTitle ||
//       !data.planType ||
//       !data.deededArea ||
//       !data.facilitator ||
//       !data.pillarType ||
//       !data.geometry ||
//       !Array.isArray(data.pillars) ||
//       data.pillars.length < 3
//     ) {
//       throw new Error(
//         "All fields are required and at least 3 pillars must be provided"
//       );
//     }

//     // 2) Ensure unique planNumber
//     if (
//       await prisma.surfboardPlan.findUnique({
//         where: { planNumber: data.planNumber },
//       })
//     ) {
//       throw new Error("Plan number already exists");
//     }

//     // 3) Upload files to S3 with the new path format
//     const uploadPromises: Promise<string[]>[] = [];
//     const uploadedFiles: string[] = [];

//     const cadFiles = files.cadFiles?.length ? files.cadFiles : [];
//     const pdfFiles = files.pdfFiles?.length ? files.pdfFiles : [];
//     const certificateFiles = files.certificateFiles?.length
//       ? files.certificateFiles
//       : [];

//     // Prepare file uploads
//     const fileUploads = [
//       { type: "pdf" as const, files: pdfFiles },
//       { type: "cad" as const, files: cadFiles },
//       { type: "certificate" as const, files: certificateFiles },
//     ];

//     // Process each file type
//     for (const { type, files: fileList } of fileUploads) {
//       if (fileList?.length) {
//         uploadPromises.push(
//           uploadMultipleSurfboardFilesToS3(
//             fileList.map((file) => ({ file, type })),
//             data.planNumber,
//             user.id
//           ).then((results) => results.map((r) => r.url))
//         );
//       }
//     }

//     // Wait for all uploads to complete
//     const uploadResults = await Promise.allSettled(uploadPromises);

//     // Process upload results
//     const fileUrls: Record<string, string[]> = {
//       pdfFilePaths: [],
//       cadFilePaths: [],
//       certificateFilePaths: [],
//     };

//     uploadResults.forEach((result, index) => {
//       if (result.status === "fulfilled" && result.value) {
//         const fileType = fileUploads[index].type;
//         const fieldName = `${fileType}FilePaths` as keyof typeof fileUrls;
//         fileUrls[fieldName] = result.value;
//         uploadedFiles.push(...result.value);
//       } else if (result.status === "rejected") {
//         console.error(
//           `Error uploading ${fileUploads[index].type} files:`,
//           result.reason
//         );
//       }
//     });

//     // Check for any upload failures
//     const hasUploadFailures = uploadResults.some(
//       (result) => result.status === "rejected"
//     );

//     if (hasUploadFailures) {
//       // Clean up any successfully uploaded files
//       await deleteMultipleSurfboardFilesFromSS3(
//         uploadedFiles.map((url) => ({ url }))
//       );
//       throw new Error("Failed to upload one or more files. Please try again.");
//     }

//     // 4) Insert the plan record
//     const plan = await prisma.surfboardPlan.create({
//       data: {
//         userId: user.id,
//         planNumber: data.planNumber,
//         surveyTitle: data.surveyTitle,
//         planType: data.planType,
//         referencePlanNumber: data.referencePlanNumber ?? null,
//         deededArea: data.deededArea,
//         facilitator: data.facilitator,
//         pillarType: data.pillarType,
//         ward: data.ward,
//         lcda: data.lcda,
//         lga: data.lga,
//         geometry: data.geometry, // JSONB
//         pillars: data.pillars, // JSONB
//         pdfFilePaths: fileUrls.pdfFilePaths,
//         cadFilePaths: fileUrls.cadFilePaths,
//         certificateFilePaths: fileUrls.certificateFilePaths,
//         status: "PENDING",
//         isLive: true,
//         dateOnSurveyPlan: data.dateOnSurveyPlan || null,
//         reasonForWithdrawalAndResubmission:
//           data.reasonForWithdrawalAndResubmission || null,
//       },
//     });

//     revalidatePath("/surfboard/dashboard/plan");
//     revalidatePath(`/surfboard/dashboard/plan/${plan.id}`);

//     return {
//       success: true,
//       data: { planId: plan.id },
//     };
//   } catch (error) {
//     console.error("Error creating plan:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error
//           ? error.message
//           : "An unknown error occurred while creating the plan",
//     };
//   }
// }

// export async function _editSurfboardPlan(
//   formData: FormData
// ): Promise<ApiResult<Plan>> {
//   try {
//     const user = await getAuthenticatedSurfUserFromCookie();
//     if (!user) {
//       return { success: false, error: "Unauthorized" };
//     }

//     const planId = formData.get("id") as string;
//     if (!planId) {
//       return { success: false, error: "Plan ID is required" };
//     }

//     // Get the existing plan to check creation time and current certificate
//     const existingPlan = await prisma.surfboardPlan.findUnique({
//       where: { id: planId },
//     });

//     if (!existingPlan) {
//       return { success: false, error: "Plan not found" };
//     }

//     // Check if the plan was created more than 24 hours ago
//     const isWithin24Hours =
//       existingPlan.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000);

//     // Prepare update data
//     const updateData: any = {};

//     // Only update these fields if within 24 hours
//     if (isWithin24Hours) {
//       if (formData.get("planNumber")) {
//         updateData.planNumber = formData.get("planNumber") as string;
//       }
//       if (formData.get("surveyTitle")) {
//         updateData.surveyTitle = formData.get("surveyTitle") as string;
//       }
//       if (formData.get("planType")) {
//         updateData.planType = formData.get("planType") as string;
//       }
//       if (formData.get("referencePlanNumber")) {
//         updateData.referencePlanNumber = formData.get(
//           "referencePlanNumber"
//         ) as string;
//       }
//       if (formData.get("deededArea")) {
//         updateData.deededArea = formData.get("deededArea") as string;
//       }
//       if (formData.get("facilitator")) {
//         updateData.facilitator = formData.get("facilitator") as string;
//       }
//     }

//     // Handle certificate file upload
//     const certificateFile = formData.get("certificateFile") as File | null;
//     let certificateFilePath = formData.get("certificateFilePath") as
//       | string
//       | null;

//     console.log("\n\n\n\n\n\n\n\ncertificateFile", certificateFile);
//     console.log("certificateFilePath", certificateFilePath);
//     if (certificateFile && certificateFile.size > 0) {
//       try {
//         // Upload the new certificate file to S3
//         const uploadResult = await uploadSurfboardFileToS3(
//           certificateFile,
//           "certificate",
//           `${planId}`
//         );

//         console.log("uploadResult", uploadResult);

//         if (!uploadResult.url) {
//           return { success: false, error: "Failed to upload certificate file" };
//         }

//         certificateFilePath = uploadResult.url;
//         updateData.status = "LODGED"; // Update status to LODGED when a certificate is uploaded
//       } catch (error) {
//         console.error("Error uploading certificate file:", error);
//         return { success: false, error: "Failed to upload certificate file" };
//       }

//       // If there was a previous certificate file, delete it from S3
//       if (existingPlan.certificateFilePaths) {
//         try {
//           const filesToDelete = existingPlan.certificateFilePaths.map(
//             (url) => ({ url })
//           );
//           await deleteMultipleSurfboardFilesFromS3(filesToDelete);
//         } catch (error) {
//           console.error("Error deleting old certificate file:", error);
//           // Continue even if deletion fails
//         }
//       }

//       updateData.certificateFilePath = certificateFilePath;
//     } else if (certificateFilePath) {
//       // If no new file but path exists, keep the existing path
//       updateData.certificateFilePath = certificateFilePath;
//     }

//     // Update the plan in the database
//     const updatedPlan = await prisma.surfboardPlan.update({
//       where: { id: planId },
//       data: updateData,
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     revalidatePath(`/surfboard/dashboard/plan/edit?planId=${planId}`);

//     return {
//       success: true,
//       data: {
//         ...updatedPlan,
//         status: updatedPlan.status as
//           | "PENDING"
//           | "LODGED"
//           | "QUERIED"
//           | "UNDER_REVIEW",
//       },
//     };
//   } catch (error) {
//     console.error("Error updating plan:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Failed to update plan",
//     };
//   }
// }

// export async function editSurfboardPlan(
//   formData: FormData
// ): Promise<ApiResult<Plan>> {
//   try {
//     const user = await getAuthenticatedSurfUserFromCookie();
//     if (!user) {
//       return { success: false, error: "Unauthorized" };
//     }

//     const planId = formData.get("id") as string;
//     if (!planId) {
//       return { success: false, error: "Plan ID is required" };
//     }

//     // Get the existing plan
//     const existingPlan = await prisma.surfboardPlan.findUnique({
//       where: { id: planId },
//     });

//     if (!existingPlan) {
//       return { success: false, error: "Plan not found" };
//     }

//     // Check if the plan was created more than 24 hours ago
//     const isWithin24Hours =
//       Date.now() - existingPlan.createdAt.getTime() < 24 * 60 * 60 * 1000;

//     // Only allow editing certificate files after 24 hours
//     if (!isWithin24Hours) {
//       const certificateFiles = formData.getAll("certificateFiles") as File[];
//       if (certificateFiles.length === 0) {
//         return {
//           success: false,
//           error: "Only certificate files can be edited after 24 hours",
//         };
//       }
//     }

//     // Prepare update data
//     const updateData: any = {};

//     // Only update these fields if within 24 hours
//     if (isWithin24Hours) {
//       if (formData.get("planNumber")) {
//         updateData.planNumber = formData.get("planNumber") as string;
//       }
//       if (formData.get("surveyTitle")) {
//         updateData.surveyTitle = formData.get("surveyTitle") as string;
//       }
//       if (formData.get("planType")) {
//         updateData.planType = formData.get("planType") as string;
//       }
//       if (formData.get("referencePlanNumber")) {
//         updateData.referencePlanNumber = formData.get(
//           "referencePlanNumber"
//         ) as string;
//       }
//       if (formData.get("deededArea")) {
//         updateData.deededArea = formData.get("deededArea") as string;
//       }
//       if (formData.get("facilitator")) {
//         updateData.facilitator = formData.get("facilitator") as string;
//       }
//     }

//     // Handle file uploads
//     const fileTypes = ["pdf", "cad", "certificate"] as const;
//     const uploadedFileUrls: Record<string, string[]> = {
//       pdfFilePaths: [],
//       cadFilePaths: [],
//       certificateFilePaths: [],
//     };

//     // Process each file type
//     for (const fileType of fileTypes) {
//       const files = formData.getAll(`${fileType}Files`) as File[];
//       const existingFiles = formData.getAll(
//         `existing${fileType.charAt(0).toUpperCase() + fileType.slice(1)}Files`
//       ) as string[];

//       if (files.length > 0 && files[0].size > 0) {
//         try {
//           // Upload new files
//           const uploadResults = await uploadSameTypeSurfboardFilesToS3(
//             files.map((file) => ({ file })),
//             user.id,
//             fileType,
//             existingPlan.planNumber
//           ).then((results) => results.map((r) => r.url));

//           uploadedFileUrls[`${fileType}FilePaths`] = [
//             ...(existingFiles || []),
//             ...uploadResults,
//           ];

//           // If this is a certificate upload, update status to LODGED
//           if (fileType === "certificate" && files.length > 0) {
//             updateData.status = "LODGED";
//             updateData.dateLodged = new Date();
//           }
//         } catch (error) {
//           console.error(`Error uploading ${fileType} files:`, error);
//           throw new Error(`Failed to upload ${fileType} files`);
//         }
//       } else {
//         // Keep existing files if no new ones uploaded
//         uploadedFileUrls[`${fileType}FilePaths`] = existingFiles || [];
//       }
//     }

//     // Update the plan with new file paths
//     updateData.pdfFilePaths = uploadedFileUrls.pdfFilePaths;
//     updateData.cadFilePaths = uploadedFileUrls.cadFilePaths;
//     updateData.certificateFilePaths = uploadedFileUrls.certificateFilePaths;

//     // Update the plan in the database
//     const updatedPlan = await prisma.surfboardPlan.update({
//       where: { id: planId },
//       data: updateData,
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     revalidatePath(`/surfboard/dashboard/plan/${planId}`);
//     revalidatePath(`/surfboard/dashboard/plan/edit?planId=${planId}`);

//     return {
//       success: true,
//       data: {
//         ...updatedPlan,
//         status: updatedPlan.status as
//           | "PENDING"
//           | "LODGED"
//           | "QUERIED"
//           | "UNDER_REVIEW",
//       },
//     };
//   } catch (error) {
//     console.error("Error updating plan:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Failed to update plan",
//     };
//   }
// }

// =============================================
// File: surfboardActions.ts
// =============================================
import {
  PlanType,
  REFERENCE_FILTERS,
  SurfboardPlanDTO,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import {
  createPlanSchema,
  editPlanSchema,
} from "@/app/(projects)/(surfboard)/utils/validation";

function cutoffMs(createdAt?: Date | string) {
  if (!createdAt) return 0;
  const t =
    typeof createdAt === "string"
      ? new Date(createdAt).getTime()
      : createdAt.getTime();
  return t + 24 * 60 * 60 * 1000;
}

// export async function searchReferencePlanNumbers(
//   planType: PlanType
// ): Promise<string[]> {
//   const conf = (referenceFilters as any)[planType];
//   const where: any = {};
//   if (conf?.where) {
//     const plans = await prisma.surfboardPlan.findMany({
//       select: { planNumber: true, planType: true },
//     });
//     return plans.filter(conf.where).map((p) => p.planNumber);
//   }
//   const plans = await prisma.surfboardPlan.findMany({
//     select: { planNumber: true },
//   });
//   return plans.map((p) => p.planNumber);
// }

// export async function searchReferencePlanNumbers(
//   planType: PlanType
// ): Promise<string[]> {
//   const conf = REFERENCE_FILTERS[planType];
//   const where: any = {};
//   if (conf?.excludeTypes)
//     where.NOT = conf.excludeTypes.map((t) => ({ planType: t }));
//   if (conf?.mustBeType) where.planType = { in: conf.mustBeType };
//   const rows = await prisma.surfboardPlan.findMany({
//     select: { planNumber: true },
//     where,
//     orderBy: { createdAt: "desc" },
//     take: 100,
//   });
//   return rows.map((r) => r.planNumber);
// }

export async function searchReferencePlanNumbers(
  planType: PlanType
): Promise<string[]> {
  const user = await getAuthenticatedSurfUserFromCookie();
  const conf = REFERENCE_FILTERS[planType];
  const where: any = { userId: user.id };

  // Apply filters based on configuration
  if (conf?.excludeTypes) {
    where.NOT = conf.excludeTypes.map((t) => ({ planType: t }));
  }
  if (conf?.mustBeType) {
    where.planType = { in: conf.mustBeType };
  }

  const rows = await prisma.surfboardPlan.findMany({
    select: { planNumber: true },
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map((r) => r.planNumber);
}

// export async function _searchReferencePlanNumbers(planType: PlanType): Promise<string[]> {
//   const conf = referenceFilters[planType]
//   const where: any = {}
//   if (conf?.excludeTypes) where.NOT = conf.excludeTypes.map((t) => ({ planType: t }))
//   if (conf?.mustBeType) where.planType = { in: conf.mustBeType }
//   const rows = await prisma.surfboardPlan.findMany({ select: { planNumber: true }, where, orderBy: { createdAt: 'desc' }, take: 100 })
//   return rows.map((r) => r.planNumber)
// }

export async function _getAllSurfPlans() {
  const rows = await prisma.surfboardPlan.findMany({
    select: {
      id: true,
      planNumber: true,
      surveyTitle: true,
      planType: true,
      geometry: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows;
}

export async function _createPlan(dto: SurfboardPlanDTO) {
  // Required checks
  if (
    !dto.planNumber ||
    !dto.surveyTitle ||
    !dto.deededArea ||
    !dto.facilitator ||
    !dto.pillarType ||
    !dto.dateOnSurveyPlan
  ) {
    throw new Error("Missing required fields");
  }
  if ((dto.cadFilePaths?.length || 0) < 1)
    throw new Error("At least one CAD file is required");
  if ((dto.pdfFilePaths?.length || 0) < 1)
    throw new Error("At least one PDF file is required");
  if (dto.certificateFilePaths?.length && !dto.dateLodged)
    throw new Error(
      "dateLodged is required when certificate files are present"
    );

  const rec = await prisma.surfboardPlan.create({
    data: {
      planNumber: dto.planNumber,
      surveyTitle: dto.surveyTitle,
      planType: dto.planType,
      referencePlanNumber: dto.referencePlanNumber || null,
      deededArea: dto.deededArea,
      facilitator: dto.facilitator,
      pillarType: dto.pillarType,
      geometry: dto.geometry,
      pillars: dto.pillars || null,
      pdfFilePaths: dto.pdfFilePaths,
      cadFilePaths: dto.cadFilePaths,
      certificateFilePaths: dto.certificateFilePaths,
      dateOnSurveyPlan: new Date(dto.dateOnSurveyPlan),
      dateLodged: dto.dateLodged ? new Date(dto.dateLodged) : null,
      ward: dto.ward || null,
      lcda: dto.lcda || null,
      lga: dto.lga || null,
      isLive: dto.isLive ?? false,
      status: dto.certificateFilePaths?.length ? "LODGED" : "PENDING",
      userId: dto.userId,
    },
    select: { id: true },
  });
  revalidatePath("/surfboard/dashboard/plans");
  return { success: true, id: rec.id };
}

export async function _updatePlan(
  dto: SurfboardPlanDTO & { canBypassLock?: boolean }
) {
  if (!dto.id) throw new Error("Missing id");
  const existing = await prisma.surfboardPlan.findUnique({
    where: { id: dto.id },
  });
  if (!existing) throw new Error("Plan not found");

  const now = Date.now();
  const locked = now > cutoffMs(existing.createdAt);
  const enforceLock = locked && !dto.canBypassLock;

  // Only certificate fields editable when locked
  const data: any = {};
  if (!enforceLock) {
    if (dto.planNumber) data.planNumber = dto.planNumber;
    if (dto.surveyTitle) data.surveyTitle = dto.surveyTitle;
    if (dto.planType) data.planType = dto.planType;
    data.referencePlanNumber = dto.referencePlanNumber ?? null;
    if (dto.deededArea) data.deededArea = dto.deededArea;
    if (dto.facilitator) data.facilitator = dto.facilitator;
    if (dto.pillarType) data.pillarType = dto.pillarType;
    if (dto.geometry) data.geometry = dto.geometry;
    data.ward = dto.ward ?? null;
    data.lcda = dto.lcda ?? null;
    data.lga = dto.lga ?? null;
    if (dto.dateOnSurveyPlan)
      data.dateOnSurveyPlan = new Date(dto.dateOnSurveyPlan);
  }
  // cert-related always allowed
  if (dto.pdfFilePaths) data.pdfFilePaths = dto.pdfFilePaths;
  if (dto.cadFilePaths) data.cadFilePaths = dto.cadFilePaths;
  if (dto.certificateFilePaths)
    data.certificateFilePaths = dto.certificateFilePaths;
  if (dto.dateLodged !== undefined)
    data.dateLodged = dto.dateLodged ? new Date(dto.dateLodged) : null;

  // Status flip
  const hasCert =
    (dto.certificateFilePaths?.length ?? existing.certificateFilePaths.length) >
    0;
  if (hasCert) data.status = "LODGED";

  if (enforceLock) {
    // Validate we didn't try to modify locked fields
    const triedToChangeLocked =
      (dto.planNumber && dto.planNumber !== existing.planNumber) ||
      (dto.surveyTitle && dto.surveyTitle !== existing.surveyTitle) ||
      (dto.planType && dto.planType !== existing.planType) ||
      (dto.referencePlanNumber !== undefined &&
        dto.referencePlanNumber !== existing.referencePlanNumber) ||
      (dto.deededArea && dto.deededArea !== existing.deededArea) ||
      (dto.facilitator && dto.facilitator !== existing.facilitator) ||
      (dto.pillarType && dto.pillarType !== existing.pillarType) ||
      (dto.geometry &&
        JSON.stringify(dto.geometry) !== JSON.stringify(existing.geometry)) ||
      (dto.ward && dto.ward !== existing.ward) ||
      (dto.lcda && dto.lcda !== existing.lcda) ||
      (dto.lga && dto.lga !== existing.lga) ||
      (dto.dateOnSurveyPlan &&
        new Date(dto.dateOnSurveyPlan).toISOString() !==
          new Date(existing.dateOnSurveyPlan ?? "").toISOString());
    if (triedToChangeLocked)
      throw new Error("Locked after 24h; only certificate updates allowed");
  }

  await prisma.surfboardPlan.update({ where: { id: dto.id }, data });
  revalidatePath(`/surfboard/dashboard/plans/${dto.id}`);
  return { success: true };
}

// export async function createPlan(data: SurfboardPlanDTO) {
//   // Server-side validation
//   createPlanSchema.parse(data);

//   // Persist
//   const created = await prisma.surfboardPlan.create({
//     data: {
//       planNumber: data.planNumber,
//       surveyTitle: data.surveyTitle,
//       planType: data.planType,
//       referencePlanNumber: data.referencePlanNumber ?? null,
//       deededArea: data.deededArea,
//       facilitator: data.facilitator,
//       pillarType: data.pillarType,
//       geometry: data.geometry,
//       pdfFilePaths: data.pdfFilePaths,
//       cadFilePaths: data.cadFilePaths,
//       certificateFilePaths: data.certificateFilePaths || [],
//       dateOnSurveyPlan: new Date(data.dateOnSurveyPlan),
//       dateLodged: data.dateLodged ? new Date(data.dateLodged) : null,
//       ward: data.ward ?? null,
//       lcda: data.lcda ?? null,
//       lga: data.lga ?? null,
//       isLive: data.isLive ?? false,
//     },
//   });
//   return { id: created.id };
// }

// export async function updatePlan(
//   data: SurfboardPlanDTO & { userRole?: "USER" | "ADMIN" | "SUPERADMIN" }
// ) {
//   editPlanSchema.parse(data);
//   const plan = await prisma.surfboardPlan.findUnique({
//     where: { id: data.id! },
//   });
//   if (!plan) throw new Error("Plan not found");

//   const createdAt = plan.createdAt?.getTime?.() ?? 0;
//   const locked = Date.now() - createdAt > 24 * 60 * 60 * 1000;
//   const canBypass = data.userRole === "SUPERADMIN";

//   const updateData: any = {};
//   if (!locked || canBypass) {
//     Object.assign(updateData, {
//       planNumber: data.planNumber,
//       surveyTitle: data.surveyTitle,
//       planType: data.planType,
//       referencePlanNumber: data.referencePlanNumber ?? null,
//       deededArea: data.deededArea,
//       facilitator: data.facilitator,
//       pillarType: data.pillarType,
//       geometry: data.geometry,
//       pdfFilePaths: data.pdfFilePaths,
//       cadFilePaths: data.cadFilePaths,
//       dateOnSurveyPlan: new Date(data.dateOnSurveyPlan),
//       ward: data.ward ?? null,
//       lcda: data.lcda ?? null,
//       lga: data.lga ?? null,
//       isLive: data.isLive ?? false,
//     });
//   }

//   // Certificate area always editable
//   if (data.certificateFilePaths)
//     updateData.certificateFilePaths = data.certificateFilePaths;
//   if (data.dateLodged !== undefined)
//     updateData.dateLodged = data.dateLodged ? new Date(data.dateLodged) : null;

//   // If certificate uploaded, mark status LODGED
//   if ((data.certificateFilePaths?.length || 0) > 0) {
//     updateData.status = "LODGED";
//   }

//   await prisma.surfboardPlan.update({
//     where: { id: data.id! },
//     data: updateData,
//   });
//   return { ok: true };
// }

export async function createPlan(dto: SurfboardPlanDTO) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) throw new Error("User not authenticated");

    if (
      !dto.planNumber ||
      !dto.surveyTitle ||
      !dto.deededArea ||
      !dto.facilitator ||
      !dto.pillarType ||
      !dto.dateOnSurveyPlan
    ) {
      throw new Error("Missing required fields");
    }
    if ((dto.cadFilePaths?.length || 0) < 1)
      throw new Error("At least one CAD file is required");
    if ((dto.pdfFilePaths?.length || 0) < 1)
      throw new Error("At least one PDF file is required");
    if (dto.certificateFilePaths?.length && !dto.dateLodged)
      throw new Error(
        "dateLodged is required when certificate files are present"
      );

    const rec = await prisma.surfboardPlan.create({
      data: {
        planNumber: dto.planNumber || "",
        surveyTitle: dto.surveyTitle,
        planType: dto.planType,
        referencePlanNumber: dto.referencePlanNumber || null,
        deededArea: dto.deededArea,
        facilitator: dto.facilitator,
        pillarType: dto.pillarType,
        geometry: dto.geometry,
        pillars: dto.pillars || null,
        pdfFilePaths: dto.pdfFilePaths,
        cadFilePaths: dto.cadFilePaths,
        certificateFilePaths: dto.certificateFilePaths,
        dateOnSurveyPlan: new Date(dto.dateOnSurveyPlan),
        dateLodged: dto.dateLodged ? new Date(dto.dateLodged) : null,
        ward: dto.ward || null,
        lcda: dto.lcda || null,
        lga: dto.lga || null,
        isLive: dto.isLive ?? false,
        status: dto.certificateFilePaths?.length ? "LODGED" : "PENDING",
        userId: user.id,
      },
      select: { id: true, planNumber: true },
    });
    revalidatePath("/surfboard/dashboard/plans");
    return { success: true, data: { id: rec.id, planNumber: rec.planNumber } };
  } catch (error: any) {
    console.error("Error creating plan:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Plan number already exists",
        };
      } else if (error.code === "P2003") {
        return {
          success: false,
          error: "Plan not found",
        };
      }
    }

    return {
      success: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}

export async function updatePlan(
  dto: SurfboardPlanDTO & { canBypassLock?: boolean }
) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) throw new Error("User not authenticated");

    if (!dto.id) throw new Error("Missing id");
    const existing = await prisma.surfboardPlan.findUnique({
      where: { id: dto.id },
    });
    if (!existing) throw new Error("Plan not found");

    const now = Date.now();
    const locked = now > cutoffMs(existing.createdAt);
    const enforceLock = locked && !dto.canBypassLock;

    // Only certificate fields editable when locked
    const data: any = {};
    if (!enforceLock) {
      if (dto.planNumber) data.planNumber = dto.planNumber;
      if (dto.surveyTitle) data.surveyTitle = dto.surveyTitle;
      if (dto.planType) data.planType = dto.planType;
      data.referencePlanNumber = dto.referencePlanNumber ?? null;
      if (dto.deededArea) data.deededArea = dto.deededArea;
      if (dto.facilitator) data.facilitator = dto.facilitator;
      if (dto.pillarType) data.pillarType = dto.pillarType;
      if (dto.geometry) data.geometry = dto.geometry;
      data.ward = dto.ward ?? null;
      data.lcda = dto.lcda ?? null;
      data.lga = dto.lga ?? null;
      if (dto.dateOnSurveyPlan)
        data.dateOnSurveyPlan = new Date(dto.dateOnSurveyPlan);
    }
    // cert-related always allowed
    if (dto.pdfFilePaths) data.pdfFilePaths = dto.pdfFilePaths;
    if (dto.cadFilePaths) data.cadFilePaths = dto.cadFilePaths;
    if (dto.certificateFilePaths)
      data.certificateFilePaths = dto.certificateFilePaths;
    if (dto.dateLodged !== undefined)
      data.dateLodged = dto.dateLodged ? new Date(dto.dateLodged) : null;

    // Status flip
    const hasCert =
      (dto.certificateFilePaths?.length ??
        existing.certificateFilePaths.length) > 0;
    if (hasCert) data.status = "LODGED";

    if (enforceLock) {
      // Validate we didn't try to modify locked fields
      const triedToChangeLocked =
        (dto.planNumber && dto.planNumber !== existing.planNumber) ||
        (dto.surveyTitle && dto.surveyTitle !== existing.surveyTitle) ||
        (dto.planType && dto.planType !== existing.planType) ||
        (dto.referencePlanNumber !== undefined &&
          dto.referencePlanNumber !== existing.referencePlanNumber) ||
        (dto.deededArea && dto.deededArea !== existing.deededArea) ||
        (dto.facilitator && dto.facilitator !== existing.facilitator) ||
        (dto.pillarType && dto.pillarType !== existing.pillarType) ||
        (dto.geometry &&
          JSON.stringify(dto.geometry) !== JSON.stringify(existing.geometry)) ||
        (dto.ward && dto.ward !== existing.ward) ||
        (dto.lcda && dto.lcda !== existing.lcda) ||
        (dto.lga && dto.lga !== existing.lga) ||
        (dto.dateOnSurveyPlan &&
          new Date(dto.dateOnSurveyPlan).toISOString() !==
            new Date(existing.dateOnSurveyPlan ?? "").toISOString());
      if (triedToChangeLocked)
        throw new Error("Locked after 24h; only certificate updates allowed");
    }

    await prisma.surfboardPlan.update({
      where: { id: dto.id, userId: user.id },
      data,
    });
    revalidatePath(`/surfboard/dashboard/plans/${dto.id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Something went wrong" };
  }
}

// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------
// ---------------------

/**
 * Fetches all plans from the database.
 */
export async function __getAllSurfPlans(
  page: number = 1,
  pageSize: number = 10
): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const skip = (page - 1) * pageSize;

    const [plans, total] = await Promise.all([
      prisma.surfboardPlan.findMany({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          planNumber: true,
          surveyTitle: true,
          planType: true,
          referencePlanNumber: true,
          deededArea: true,
          facilitator: true,
          pillarType: true,
          geometry: true,
          pdfFilePaths: true,
          cadFilePaths: true,
          certificateFilePaths: true,
          ward: true,
          lcda: true,
          lga: true,
          pillars: true,
          status: true,
          isLive: true,
          dateOnSurveyPlan: true,
          dateLodged: true,
          reasonForWithdrawalAndResubmission: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.surfboardPlan.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Add area and centroid to each plan
    const plansWithGeometry = plans.map((plan) => {
      if (!plan.geometry || !isGeometryInput(plan.geometry)) {
        return { ...plan, areaSqM: 0, centroid: null };
      }

      try {
        const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
          plan.geometry
        );
        return {
          ...plan,
          areaSqM,
          centroid: centroidCoords,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        return { ...plan, areaSqM: 0, centroid: null };
      }
    });

    return {
      success: true,
      data: {
        plans: plansWithGeometry,
        total,
        totalPages,
      },
    };
  } catch (err) {
    console.error("getAllSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

// In surfboardActions.ts
export interface PlanFilters {
  search?: string;
  status?: string[];
  planType?: string[];
  facilitator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PlanSort {
  field: "createdAt" | "updatedAt" | "surveyTitle" | "planNumber" | "status";
  order: "asc" | "desc";
}

export async function getAllSurfPlans(
  page: number = 1,
  pageSize: number = 10,
  filters?: PlanFilters,
  sort?: PlanSort
): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = { userId: user.id };

    if (filters) {
      if (filters.search) {
        where.OR = [
          { planNumber: { contains: filters.search, mode: "insensitive" } },
          { surveyTitle: { contains: filters.search, mode: "insensitive" } },
          { facilitator: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.planType?.length) {
        where.planType = { in: filters.planType };
      }

      if (filters.facilitator) {
        where.facilitator = {
          contains: filters.facilitator,
          mode: "insensitive",
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) {
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }
    }

    // Build orderBy
    const orderBy = sort
      ? ({
          [String(sort.field)]: sort.order,
        } as Prisma.SurfboardPlanOrderByWithRelationInput)
      : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

    const [plans, total] = await Promise.all([
      prisma.surfboardPlan.findMany({
        where,
        select: {
          id: true,
          planNumber: true,
          surveyTitle: true,
          planType: true,
          referencePlanNumber: true,
          deededArea: true,
          facilitator: true,
          pillarType: true,
          geometry: true,
          pdfFilePaths: true,
          cadFilePaths: true,
          certificateFilePaths: true,
          ward: true,
          lcda: true,
          lga: true,
          pillars: true,
          status: true,
          isLive: true,
          dateOnSurveyPlan: true,
          dateLodged: true,
          reasonForWithdrawalAndResubmission: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.surfboardPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Add area and centroid to each plan
    const plansWithGeometry = plans.map((plan) => {
      if (!plan.geometry || !isGeometryInput(plan.geometry)) {
        return { ...plan, areaSqM: 0, centroid: null };
      }

      try {
        const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
          plan.geometry
        );
        return {
          ...plan,
          areaSqM,
          centroid: centroidCoords,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        return { ...plan, areaSqM: 0, centroid: null };
      }
    });

    return {
      success: true,
      data: {
        plans: plansWithGeometry,
        total,
        totalPages,
      },
    };
  } catch (err) {
    console.error("getAllSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

// export async function getAllSharedSurfPlans(
//   page: number = 1,
//   pageSize: number = 10
// ): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
//   try {
//     const user = await getAuthenticatedSurfUserFromCookie();

//     if (!user || !user.role) {
//       return {
//         success: false,
//         error: "User not authenticated or role not found",
//       };
//     }

//     const skip = (page - 1) * pageSize;

//     const [plans, total] = await Promise.all([
//       prisma.surfboardPlan.findMany({
//         where: {
//           userId: user.id,
//           sharedTo: {
//             isEmpty: false,
//           },
//         },
//         select: {
//           id: true,
//           planNumber: true,
//           surveyTitle: true,
//           planType: true,
//           referencePlanNumber: true,
//           deededArea: true,
//           facilitator: true,
//           pillarType: true,
//           geometry: true,
//           pdfFilePaths: true,
//           cadFilePaths: true,
//           certificateFilePaths: true,
//           ward: true,
//           lcda: true,
//           lga: true,
//           pillars: true,
//           status: true,
//           isLive: true,
//           dateOnSurveyPlan: true,
//           dateLodged: true,
//           reasonForWithdrawalAndResubmission: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//         skip,
//         take: pageSize,
//         orderBy: { createdAt: "desc" },
//       }),
//       prisma.surfboardPlan.count({
//         where: {
//           userId: user.id,
//           sharedTo: {
//             isEmpty: false,
//           },
//         },
//       }),
//     ]);

//     const totalPages = Math.ceil(total / pageSize);

//     // Add area and centroid to each plan
//     const plansWithGeometry = plans.map((plan) => {
//       if (!plan.geometry || !isGeometryInput(plan.geometry)) {
//         return { ...plan, areaSqM: 0, centroid: null };
//       }

//       try {
//         const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
//           plan.geometry
//         );
//         return {
//           ...plan,
//           areaSqM,
//           centroid: centroidCoords,
//         };
//       } catch (error) {
//         console.error(`Error calculating geometry for plan ${plan.id}:`, error);
//         return { ...plan, areaSqM: 0, centroid: null };
//       }
//     });

//     return {
//       success: true,
//       data: {
//         plans: plansWithGeometry,
//         total,
//         totalPages,
//       },
//     };
//   } catch (err) {
//     console.error("getAllSharedSurfPlans error:", err);
//     return { success: false, error: (err as Error).message };
//   }
// }

// export async function getSharedWithMeSurfPlans(
//   page: number = 1,
//   pageSize: number = 10
// ): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
//   try {
//     const user = await getAuthenticatedSurfUserFromCookie();

//     if (!user || !user.role) {
//       return {
//         success: false,
//         error: "User not authenticated or role not found",
//       };
//     }

//     const skip = (page - 1) * pageSize;

//     const [plans, total] = await Promise.all([
//       prisma.surfboardPlan.findMany({
//         where: {
//           sharedTo: {
//             has: user.id,
//           },
//         },
//         select: {
//           id: true,
//           planNumber: true,
//           surveyTitle: true,
//           planType: true,
//           referencePlanNumber: true,
//           deededArea: true,
//           facilitator: true,
//           pillarType: true,
//           geometry: true,
//           pdfFilePaths: true,
//           cadFilePaths: true,
//           certificateFilePaths: true,
//           ward: true,
//           lcda: true,
//           lga: true,
//           pillars: true,
//           status: true,
//           isLive: true,
//           dateOnSurveyPlan: true,
//           dateLodged: true,
//           reasonForWithdrawalAndResubmission: true,
//           createdAt: true,
//           updatedAt: true,
//           user: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true,
//               companyName: true,
//             },
//           },
//         },
//         skip,
//         take: pageSize,
//         orderBy: { createdAt: "desc" },
//       }),
//       prisma.surfboardPlan.count({
//         where: {
//           sharedTo: {
//             has: user.id,
//           },
//         },
//       }),
//     ]);

//     const totalPages = Math.ceil(total / pageSize);

//     // Add area and centroid to each plan
//     const plansWithGeometry = plans.map((plan) => {
//       if (!plan.geometry || !isGeometryInput(plan.geometry)) {
//         return { ...plan, areaSqM: 0, centroid: null };
//       }

//       try {
//         const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
//           plan.geometry
//         );
//         return {
//           ...plan,
//           areaSqM,
//           centroid: centroidCoords,
//         };
//       } catch (error) {
//         console.error(`Error calculating geometry for plan ${plan.id}:`, error);
//         return { ...plan, areaSqM: 0, centroid: null };
//       }
//     });

//     return {
//       success: true,
//       data: {
//         plans: plansWithGeometry,
//         total,
//         totalPages,
//       },
//     };
//   } catch (err) {
//     console.error("getSharedWithMeSurfPlans error:", err);
//     return { success: false, error: (err as Error).message };
//   }
// }

// In surfboardActions.ts
export async function getAllSharedSurfPlans(
  page: number = 1,
  pageSize: number = 10,
  filters?: PlanFilters,
  sort?: PlanSort
): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      userId: user.id,
      sharedTo: {
        isEmpty: false,
      },
    };

    if (filters) {
      if (filters.search) {
        where.OR = [
          { planNumber: { contains: filters.search, mode: "insensitive" } },
          { surveyTitle: { contains: filters.search, mode: "insensitive" } },
          { facilitator: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.planType?.length) {
        where.planType = { in: filters.planType };
      }

      if (filters.facilitator) {
        where.facilitator = {
          contains: filters.facilitator,
          mode: "insensitive",
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) {
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }
    }

    // Build orderBy
    const orderBy = sort
      ? ({
          [sort.field]: sort.order,
        } as Prisma.SurfboardPlanOrderByWithRelationInput)
      : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

    const [plans, total] = await Promise.all([
      prisma.surfboardPlan.findMany({
        where,
        select: {
          id: true,
          planNumber: true,
          surveyTitle: true,
          planType: true,
          referencePlanNumber: true,
          deededArea: true,
          facilitator: true,
          pillarType: true,
          geometry: true,
          pdfFilePaths: true,
          cadFilePaths: true,
          certificateFilePaths: true,
          ward: true,
          lcda: true,
          lga: true,
          pillars: true,
          status: true,
          isLive: true,
          dateOnSurveyPlan: true,
          dateLodged: true,
          reasonForWithdrawalAndResubmission: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.surfboardPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Add area and centroid to each plan
    const plansWithGeometry = plans.map((plan) => {
      if (!plan.geometry || !isGeometryInput(plan.geometry)) {
        return { ...plan, areaSqM: 0, centroid: null };
      }

      try {
        const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
          plan.geometry
        );
        return {
          ...plan,
          areaSqM,
          centroid: centroidCoords,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        return { ...plan, areaSqM: 0, centroid: null };
      }
    });

    return {
      success: true,
      data: {
        plans: plansWithGeometry,
        total,
        totalPages,
      },
    };
  } catch (err) {
    console.error("getAllSharedSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function getSharedWithMeSurfPlans(
  page: number = 1,
  pageSize: number = 10,
  filters?: PlanFilters,
  sort?: PlanSort
): Promise<ApiResult<{ plans: Plan[]; total: number; totalPages: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      sharedTo: {
        has: user.id,
      },
    };

    if (filters) {
      if (filters.search) {
        where.OR = [
          { planNumber: { contains: filters.search, mode: "insensitive" } },
          { surveyTitle: { contains: filters.search, mode: "insensitive" } },
          { facilitator: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.planType?.length) {
        where.planType = { in: filters.planType };
      }

      if (filters.facilitator) {
        where.facilitator = {
          contains: filters.facilitator,
          mode: "insensitive",
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) {
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }
    }

    // Build orderBy
    const orderBy = sort
      ? ({
          [sort.field]: sort.order,
        } as Prisma.SurfboardPlanOrderByWithRelationInput)
      : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

    const [plans, total] = await Promise.all([
      prisma.surfboardPlan.findMany({
        where,
        select: {
          id: true,
          planNumber: true,
          surveyTitle: true,
          planType: true,
          referencePlanNumber: true,
          deededArea: true,
          facilitator: true,
          pillarType: true,
          geometry: true,
          pdfFilePaths: true,
          cadFilePaths: true,
          certificateFilePaths: true,
          ward: true,
          lcda: true,
          lga: true,
          pillars: true,
          status: true,
          isLive: true,
          dateOnSurveyPlan: true,
          dateLodged: true,
          reasonForWithdrawalAndResubmission: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.surfboardPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Add area and centroid to each plan
    const plansWithGeometry = plans.map((plan) => {
      if (!plan.geometry || !isGeometryInput(plan.geometry)) {
        return { ...plan, areaSqM: 0, centroid: null };
      }

      try {
        const { areaSqM, centroid: centroidCoords } = computeGeometryDetails(
          plan.geometry
        );
        return {
          ...plan,
          areaSqM,
          centroid: centroidCoords,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        return { ...plan, areaSqM: 0, centroid: null };
      }
    });

    return {
      success: true,
      data: {
        plans: plansWithGeometry,
        total,
        totalPages,
      },
    };
  } catch (err) {
    console.error("getSharedWithMeSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}
/**
 * Fetches a single plan by ID.
 */
export async function getSurfPlanById(
  id: string,
  options?: {
    forEdit?: boolean;
  }
): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const ORArray = [
      { userId: user.id }, // Owner
      !options?.forEdit ? { sharedTo: { has: user.id } } : {}, // Shared with user
    ].filter(Boolean);

    const plan = await prisma.surfboardPlan.findUnique({
      where: {
        id,
        OR: ORArray,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found or access denied" };
    }

    // Add area and centroid to the plan
    let planWithGeometry: Plan = { ...plan, isOwner: plan.userId === user.id };

    console.log(
      "\n\n\n\nGeometry is valid",
      plan.geometry,
      isGeometryInput(plan.geometry)
    );

    if (plan.geometry && isGeometryInput(plan.geometry)) {
      try {
        const { areaSqM, centroid } = computeGeometryDetails(plan.geometry);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM,
          centroid,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM: 0,
          centroid: null,
        };
      }
    } else {
      planWithGeometry = {
        ...planWithGeometry,
        areaSqM: 0,
        centroid: null,
      };
    }

    return { success: true, data: planWithGeometry };
  } catch (err) {
    console.error("getSurfPlanById error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches a single plan by ID.
 */
export async function getSurfPlanByIdWithSurveyor(
  id: string
): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const ORArray = [
      { userId: user.id }, // Owner
    ].filter(Boolean);

    const plan = await prisma.surfboardPlan.findUnique({
      where: {
        id,
        OR: ORArray,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            surconRegNumber: true,
            surconRegName: true,
            companyName: true,
          },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found or access denied" };
    }

    // Add area and centroid to the plan
    let planWithGeometry: Plan = { ...plan, isOwner: plan.userId === user.id };

    console.log(
      "\n\n\n\nGeometry is valid",
      plan.geometry,
      isGeometryInput(plan.geometry)
    );
    if (plan.geometry && isGeometryInput(plan.geometry)) {
      try {
        const { areaSqM, centroid } = computeGeometryDetails(plan.geometry);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM,
          centroid,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM: 0,
          centroid: null,
        };
      }
    } else {
      planWithGeometry = {
        ...planWithGeometry,
        areaSqM: 0,
        centroid: null,
      };
    }

    return { success: true, data: planWithGeometry };
  } catch (err) {
    console.error("getSurfPlanById error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches a single plan by ID.
 */
export async function getPublicSurfPlanByIdWithSurveyor(
  id: string
): Promise<ApiResult<Plan>> {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            surconRegNumber: true,
            surconRegName: true,
            companyName: true,
          },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found or access denied" };
    }

    // Add area and centroid to the plan
    let planWithGeometry: Plan = { ...plan };

    console.log(
      "\n\n\n\nGeometry is valid",
      plan.geometry,
      isGeometryInput(plan.geometry)
    );
    if (plan.geometry && isGeometryInput(plan.geometry)) {
      try {
        const { areaSqM, centroid } = computeGeometryDetails(plan.geometry);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM,
          centroid,
        };
      } catch (error) {
        console.error(`Error calculating geometry for plan ${plan.id}:`, error);
        planWithGeometry = {
          ...planWithGeometry,
          areaSqM: 0,
          centroid: null,
        };
      }
    } else {
      planWithGeometry = {
        ...planWithGeometry,
        areaSqM: 0,
        centroid: null,
      };
    }

    return { success: true, data: planWithGeometry };
  } catch (err) {
    console.error("getSurfPlanById error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates a plan's status.
 */
export async function updateSurfPlanStatus(
  id: string,
  status: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW"
): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    // Validate status
    const validStatuses = ["PENDING", "LODGED", "QUERIED", "UNDER_REVIEW"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }

    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id, userId: user.id },
      data: { status },
    });

    revalidatePath("/surfboard/dashboard/plans");
    return { success: true, data: updatedPlan };
  } catch (err) {
    console.error("updateSurfboardPlanStatus error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update plan status",
    };
  }
}

export async function deleteSurfPlan(id: string): Promise<ApiResult<null>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id, userId: user.id },
      select: {
        pdfFilePaths: true,
        cadFilePaths: true,
        certificateFilePaths: true,
      },
    });
    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const filesToDelete = [
      ...plan.pdfFilePaths,
      ...plan.cadFilePaths,
      ...plan.certificateFilePaths,
    ]
      .filter((u): u is string => Boolean(u))
      .map((url) => ({ url }));

    if (filesToDelete.length) {
      await deleteMultipleSurfboardFilesFromS3(filesToDelete);
    }

    await prisma.surfboardPlan.delete({ where: { id, userId: user.id } });
    revalidatePath("/surfboard/dashboard/plans");
    return { success: true, data: null };
  } catch (err) {
    console.error("deleteSurfboardPlan error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function searchSurfUserByEmailOrSurconRegNumber(
  email: string,
  surconRegNumber: string
) {
  try {
    const authUser = await getAuthenticatedSurfUserFromCookie();

    if (!authUser || !authUser.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const user = await prisma.surfboardUser.findUnique({
      where: { email, surconRegNumber },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: user };
  } catch (err) {
    console.error("searchSurfUserByEmailOrSurconRegNumber error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function addSurfUserToSharedSurfPlan(
  userId: string,
  planId: string
) {
  try {
    const authUser = await getAuthenticatedSurfUserFromCookie();

    if (!authUser || !authUser.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const user = await prisma.surfboardUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        sharedTo: {
          set: [...(plan.sharedTo || []), userId].filter(
            (v, i, a) => a.indexOf(v) === i
          ),
        },
      },
    });

    revalidatePath("/surfboard/dashboard/plans");

    return { success: true, data: updatedPlan };
  } catch (err) {
    console.error("searchSurfUserByEmailOrSurconRegNumber error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function removeSurfUserFromSharedSurfPlan(
  userId: string,
  planId: string
) {
  try {
    const authUser = await getAuthenticatedSurfUserFromCookie();

    if (!authUser || !authUser.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        sharedTo: {
          set: plan.sharedTo.filter((id) => id !== userId),
        },
      },
    });

    revalidatePath("/surfboard/dashboard/plans");

    return { success: true, data: updatedPlan };
  } catch (err) {
    console.error("Error removing user from shared plan:", err);
    return { success: false, error: (err as Error).message };
  }
}

type SearchUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
};

export async function searchUsers(
  query: string
): Promise<ApiResult<SearchUser[]>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!query.trim()) {
      return { success: true, data: [] };
    }

    const users = await prisma.surfboardUser.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { surconRegNumber: { contains: query, mode: "insensitive" } },
        ],
        // Don't return the current user
        email: { not: user.email },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        surconRegNumber: true,
      },
      take: 10, // Limit results
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("Error searching users:", error);
    return { success: false, error: "Failed to search users" };
  }
}

export async function sharePlanWithUser(
  planId: string,
  userId: string
): Promise<ApiResult<{ id: string; sharedTo: string[] }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the plan exists and belongs to the current user
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId, userId: user.id },
      select: { sharedTo: true },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Verify the target user exists
    const targetUser = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Add user to sharedTo array if not already present
    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        sharedTo: {
          set: [...new Set([...(plan.sharedTo || []), userId])],
        },
      },
      select: {
        id: true,
        sharedTo: true,
      },
    });

    revalidatePath(`/surfboard/dashboard/plan/${planId}`);
    return { success: true, data: updatedPlan };
  } catch (error) {
    console.error("Error sharing plan:", error);
    return { success: false, error: "Failed to share plan" };
  }
}

export async function unsharePlanWithUser(
  planId: string,
  userId: string
): Promise<ApiResult<{ id: string; sharedTo: string[] }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the plan exists and belongs to the current user
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId, userId: user.id },
      select: { sharedTo: true },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Remove user from sharedTo array
    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        sharedTo: {
          set: (plan.sharedTo || []).filter((id: string) => id !== userId),
        },
      },
      select: {
        id: true,
        sharedTo: true,
      },
    });

    revalidatePath(`/surfboard/dashboard/plan/${planId}`);
    return { success: true, data: updatedPlan };
  } catch (error) {
    console.error("Error unsharing plan:", error);
    return { success: false, error: "Failed to unshare plan" };
  }
}

/**
 * Fetches all unique facilitators and plan numbers from existing plans
 * @returns Object containing arrays of unique facilitator names and plan numbers
 */
export async function getAllFacilitatorsAndPlanNumbers(): Promise<
  ApiResult<{ facilitators: string[]; planNumbers: string[] }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    // Get all plans with facilitators and plan numbers
    const plans = await prisma.surfboardPlan.findMany({
      select: {
        facilitator: true,
        planNumber: true,
      },
      where: {
        userId: user.id,
        OR: [
          {
            AND: [
              { facilitator: { not: undefined } },
              { facilitator: { not: "" } },
            ],
          },
          {
            AND: [
              { planNumber: { not: undefined } },
              { planNumber: { not: "" } },
            ],
          },
        ],
      },
    });

    // Extract and clean up facilitator names
    const facilitators = Array.from(
      new Set(
        plans
          .map((plan) => plan.facilitator?.trim())
          .filter((f): f is string => Boolean(f))
      )
    ).sort((a, b) => a.localeCompare(b));

    // Extract and clean up plan numbers
    const planNumbers = Array.from(
      new Set(
        plans
          .map((plan) => plan.planNumber?.trim())
          .filter((p): p is string => Boolean(p))
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      data: {
        facilitators,
        planNumbers,
      },
    };
  } catch (error) {
    console.error("Error fetching Facilitator and planN data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

/**
 * Fetches all unique facilitators from existing plans
 * @returns Array of unique facilitator names
 */
export async function getAllFacilitators(): Promise<ApiResult<string[]>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    // Get all plans and extract unique facilitators
    const plans = await prisma.surfboardPlan.findMany({
      select: {
        facilitator: true,
      },
      distinct: ["facilitator"],
      where: {
        userId: user.id,
        AND: [
          { facilitator: { not: undefined } },
          { facilitator: { not: "" } },
        ],
      },
      orderBy: {
        facilitator: "asc",
      },
    });

    // Extract and clean up facilitator names
    const facilitators = plans
      .map((plan) => plan.facilitator?.trim())
      .filter((facilitator): facilitator is string => Boolean(facilitator))
      // Remove duplicates (case insensitive)
      .filter(
        (facilitator, index, self) =>
          index ===
          self.findIndex((f) => f.toLowerCase() === facilitator.toLowerCase())
      );

    return { success: true, data: facilitators };
  } catch (error) {
    console.error("Error fetching facilitators:", error);
    return {
      success: false,
      error: "Failed to fetch facilitators",
    };
  }
}

// Dashboard Analytics
export async function getDashboardAnalytics(): Promise<
  ApiResult<AnalyticsData>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all plans for the current user
    const plansResult = await getAllSurfPlans();
    if (!plansResult.success) {
      return { success: false, error: plansResult.error };
    }

    const allPlans = plansResult?.data ? plansResult.data.plans : [];

    // Calculate total plans count (excluding provisional)
    const totalPlansCount = allPlans?.filter(
      (plan) => !["PROVISIONAL", "PROVISIONAL_LAYOUT"].includes(plan.planType)
    ).length;

    // Get provisional plans count
    const provisionalPlansCount = allPlans?.filter((plan) =>
      ["PROVISIONAL", "PROVISIONAL_LAYOUT"].includes(plan.planType)
    ).length;

    // Get facilitator stats (excluding provisional plans)
    const facilitatorStats = await prisma.surfboardPlan.groupBy({
      by: ["facilitator"],
      where: {
        userId: user.id,
        planType: {
          notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"],
        },
        facilitator: {
          not: "",
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get all plans to calculate deededArea sum
    const plansWithDeededArea = await prisma.surfboardPlan.findMany({
      where: {
        userId: user.id,
        planType: {
          notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"],
        },
        facilitator: {
          not: "",
        },
        deededArea: {
          not: "",
        },
      },
      select: {
        facilitator: true,
        deededArea: true,
      },
    });

    // Process facilitator stats to include sum of deededArea
    const processedFacilitatorStats = facilitatorStats.map((stat) => {
      const facilitatorPlans = plansWithDeededArea.filter(
        (plan) => plan.facilitator === stat.facilitator
      );

      // Parse deededArea strings to numbers and calculate sum
      const totalDeededArea = facilitatorPlans.reduce((sum, plan) => {
        // Remove any non-numeric characters except decimal point and parse to float
        const areaValue = parseFloat(plan.deededArea.replace(/[^0-9.]/g, ""));
        return sum + (isNaN(areaValue) ? 0 : areaValue);
      }, 0);

      return {
        ...stat,
        _sum: {
          deededArea: totalDeededArea,
        },
      };
    });

    // Get LGA stats (excluding provisional plans)
    const lgaStats = await prisma.surfboardPlan.groupBy({
      by: ["lga"],
      where: {
        userId: user.id,
        planType: {
          notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"],
        },
        lga: {
          not: "",
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get pending certificates (excluding provisional plans)
    const pendingCertificates = await prisma.surfboardPlan.findMany({
      where: {
        userId: user.id,
        status: "PENDING",
        planType: {
          notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"],
        },
        surveyTitle: {
          not: "",
        },
      },
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        facilitator: true,
        updatedAt: true,
        planType: true,
        status: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    // Get pillar stats (excluding provisional plans)
    const pillarStats = await prisma.surfboardPlan.groupBy({
      by: ["pillarType"],
      where: {
        userId: user.id,
        planType: {
          notIn: ["PROVISIONAL", "PROVISIONAL_LAYOUT"],
        },
        pillarType: {
          not: "",
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Format pillar stats for the frontend
    const formattedPillarStats = pillarStats.map((stat) => ({
      type: stat.pillarType || "UNKNOWN",
      count: stat._count.id,
    }));

    // Get time trends (last 12 months, excluding provisional plans)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const timeTrends = await prisma.$queryRaw`
      SELECT  
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        COUNT(*)::integer as count
      FROM "SurfboardPlan"
      WHERE 
        "userId" = ${user.id}
        AND "planType" NOT IN ('PROVISIONAL', 'PROVISIONAL_LAYOUT')
        AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Format time trends data
    const formattedTimeTrends = Array.isArray(timeTrends)
      ? timeTrends.map((item: any) => ({
          period: item.month,
          count: item.count,
        }))
      : [];

    return {
      success: true,
      data: {
        totalPlansCount,
        provisionalPlansCount,
        facilitatorStats: processedFacilitatorStats.map((stat: any) => ({
          facilitator: stat.facilitator || "Unknown",
          count: stat._count.id,
          totalArea: stat._sum.deededArea
            ? parseFloat(stat._sum.deededArea)
            : 0,
        })),
        lgaStats: lgaStats.map((stat: any) => ({
          lga: stat.lga || "Unknown",
          count: stat._count.id,
        })),
        pendingCertificates: pendingCertificates.map((cert) => ({
          id: cert.id,
          planNumber: cert.planNumber,
          surveyTitle: cert.surveyTitle || "Untitled Survey",
          facilitator: cert.facilitator || "Unknown",
          updatedAt: cert.updatedAt,
          planType: cert.planType,
          status: cert.status,
        })),
        pillarStats: formattedPillarStats as any,
        timeTrends: formattedTimeTrends as any,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return {
      success: false,
      error: "Failed to fetch dashboard analytics",
    };
  }
}

export async function submitRedCopy(
  planId: string,
  file: File
): Promise<ApiResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !user.role) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the plan to validate
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId, userId: user.id },
      select: {
        id: true,
        planNumber: true,
        planType: true,
        status: true,
        certificateFilePaths: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Validate plan can be submitted for Red Copy
    if (
      plan.status !== "PENDING" ||
      ["PROVISIONAL", "PROVISIONAL LAYOUT"].includes(plan.planType) ||
      plan.certificateFilePaths?.length === 0
    ) {
      return {
        success: false,
        error: "This plan is not eligible for Red Copy submission",
      };
    }

    // Upload the Red Copy file to S3
    const uploadResult = await uploadSurfboardFileToS3(
      file,
      "redcopy",
      `${plan.planNumber}-${Date.now()}`
    );

    if (!uploadResult.url) {
      return { success: false, error: "Failed to upload Red Copy file" };
    }

    // Call the Red Copy API
    const response = await fetch("https://api.redcopy.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any required API keys here
        // 'Authorization': `Bearer ${process.env.REDCOPY_API_KEY}`,
      },
      body: JSON.stringify({
        planNumber: plan.planNumber,
        // Add other required fields for the Red Copy API
        fileUrl: uploadResult.url,
        // Add webhook URL for status updates
        webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/redcopy`,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.message || "Failed to submit to Red Copy",
      };
    }

    // Update the plan status to AWAITING
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        status: "UNDER_REVIEW",
        redCopyStatus: "SUBMITTED",
        redCopySubmittedAt: new Date(),
        redCopyFileUrl: uploadResult.url,
      },
    });

    revalidatePath(`/surfboard/dashboard/plan/${planId}`);
    revalidatePath("/surfboard/dashboard/plans");

    return { success: true, data: { id: planId } };
  } catch (error) {
    console.error("Error submitting Red Copy:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit Red Copy",
    };
  }
}

export async function importDbDataFromCsv(file: File) {
  try {
    const csvFile = file;

    const csv = await csvFile.text();
    const rows = csv.split("\n");
  } catch (error) {
    console.error("Error importing DB data from CSV:", error);
    return {
      success: false,
      error: "Failed to import DB data from CSV",
    };
  }
}

export async function checkPlanNumberExists(
  planNumber: string,
  excludeId?: string
): Promise<boolean> {
  const user = await getAuthenticatedSurfUserFromCookie();
  if (!user || !user.role) {
    return false;
  }

  if (!planNumber.trim()) return false;

  const count = await prisma.surfboardPlan.count({
    where: {
      planNumber: planNumber.trim(),
      ...(excludeId && { id: { not: excludeId } }),
      userId: user.id,
    },
  });

  return count > 0;
}

export async function __handleIntersect(geometry: any) {
  try {
    const geometryString =
      typeof geometry === "string" ? geometry : JSON.stringify(geometry);

    // If nigeria_ward_admin_boundaries.geom is already SRID=4326, this is good.
    // If not, transform: ST_Intersects(ST_Transform(geom,4326), ST_SetSRID(...,4326))
    const result = await prisma.$queryRaw<
      Array<{
        wardname: string;
        lcdaname: string;
        lganame: string;
        statename: string;
      }>
    >`
      SELECT wardname, lcdaname, lganame, statename
      FROM nigeria_ward_admin_boundaries
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryString}::json), 4326)
      )
      LIMIT 1;
    `;

    console.log("result:  -- ", result);

    if (result?.length) return { success: true, data: result[0] };
    return { success: false, message: "No intersection found" };
  } catch (err) {
    console.error("Intersection error:", err);
    return { success: false, message: "Internal server error" };
  }
}

// Define the expected return type for better type safety
type AdminBoundaryResult = {
  wardname: string;
  lcdaname: string;
  lganame: string;
  statename: string;
};

/**
 * Finds the administrative boundaries that intersect with a given GeoJSON polygon.
 * @param geometry - A GeoJSON geometry object for the polygon.
 * @returns An object with administrative boundary names or null if no intersection is found.
 */
export async function getAdminBoundaries(geometry: object) {
  if (!geometry) {
    console.error("getAdminBoundaries called with invalid geometry");
    return null;
  }

  // Convert the geometry object to a JSON string for the query
  const geoJsonString = JSON.stringify(geometry);

  try {
    const result = await prisma.$queryRaw<AdminBoundaryResult[]>`
      SELECT wardname, lcdaname, lganame, statename
      FROM "nigeria_ward_admin_boundaries"
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonString}), 4326)
      )
      LIMIT 1;
    `;

    if (result?.length) return { success: true, data: result[0] };
    console.log("No intersecting administrative boundary found.");
    return { success: false, message: "No intersection found" };
  } catch (error) {
    console.error("Error querying for admin boundaries:", error);
    // You might want to throw the error or return a specific error state
    // depending on how you want to handle it on the client side.
    return { success: false, message: "Internal server error" };
  }
}
