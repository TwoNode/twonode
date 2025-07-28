"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  Plan,
  ApiResult,
  CreatePlanData,
  FileUploadData,
} from "../types/surfboardTypes";
import {
  uploadSurfboardFileToS3,
  deleteMultipleSurfboardFilesFromS3,
} from "./awsActions";

// // Simple polygon area calculation (Haversine formula)
// function calculatePolygonArea(geometry: any): number {
//   if (
//     geometry.type !== "Polygon" ||
//     !geometry.coordinates ||
//     !geometry.coordinates[0]
//   ) {
//     return 0;
//   }

//   const coordinates = geometry.coordinates[0];
//   if (coordinates.length < 3) return 0;

//   let area = 0;
//   for (let i = 0; i < coordinates.length - 1; i++) {
//     const [lng1, lat1] = coordinates[i];
//     const [lng2, lat2] = coordinates[i + 1];

//     // Convert to radians
//     const lat1Rad = (lat1 * Math.PI) / 180;
//     const lat2Rad = (lat2 * Math.PI) / 180;
//     const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

//     // Haversine formula for area calculation
//     area += Math.atan2(
//       Math.sin(deltaLng) * Math.cos(lat2Rad),
//       Math.cos(lat1Rad) * Math.sin(lat2Rad) -
//         Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLng)
//     );
//   }

//   // Convert to square meters (approximate)
//   const earthRadius = 6371000; // meters
//   return Math.abs(area * earthRadius * earthRadius);
// }

/**
 * Creates a new surfboard plan:
 * - Stores geometry & pillars as JSONB
 * - Uploads files to S3
 */
export async function createSurfboardPlan(
  data: CreatePlanData,
  files: FileUploadData
): Promise<ApiResult<{ planId: string }>> {
  try {
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
    let pdfFilePath: string | undefined;
    let cadFilePath: string | undefined;
    let certificateFilePath: string | undefined;

    try {
      if (files.pdfFile) {
        pdfFilePath = (
          await uploadSurfboardFileToS3(files.pdfFile, "pdf", data.planNumber)
        ).url;
      }
      if (files.cadFile) {
        cadFilePath = (
          await uploadSurfboardFileToS3(files.cadFile, "cad", data.planNumber)
        ).url;
      }
      if (files.certificateFile) {
        certificateFilePath = (
          await uploadSurfboardFileToS3(
            files.certificateFile,
            "certificate",
            data.planNumber
          )
        ).url;
      }
    } catch (uploadErr) {
      // rollback any partial uploads
      await deleteMultipleSurfboardFilesFromS3(
        [pdfFilePath, cadFilePath, certificateFilePath]
          .filter((u): u is string => !!u)
          .map((url) => ({ url }))
      );
      throw uploadErr;
    }

    // 4) Insert the plan record
    const plan = await prisma.surfboardPlan.create({
      data: {
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
        pdfFilePath,
        cadFilePath,
        certificateFilePath,
      },
    });

    // 5) Revalidate cache and return
    revalidatePath("/surfboard/dashboard/allplans");
    return { success: true, data: { planId: plan.id } };
  } catch (err) {
    console.error("createSurfboardPlan error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetches all plans from the database.
 */
export async function getAllSurfboardPlans(): Promise<ApiResult<Plan[]>> {
  try {
    const plans = await prisma.surfboardPlan.findMany({
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: plans };
  } catch (err) {
    console.error("getAllSurfboardPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches a single plan by ID.
 */
export async function getSurfboardPlanById(
  id: string
): Promise<ApiResult<Plan>> {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id },
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }
    return { success: true, data: plan };
  } catch (err) {
    console.error("getSurfboardPlanById error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a plan and its S3 files.
 */
export async function updateSurfboardPlanStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW"
): Promise<ApiResult<Plan>> {
  try {
    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "UNDER_REVIEW"];
    if (!validStatuses.includes(status)) {
      return { 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
      };
    }

    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/surfboard/dashboard/allplans");
    return { success: true, data: updatedPlan };
  } catch (err) {
    console.error("updateSurfboardPlanStatus error:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Failed to update plan status" 
    };
  }
}

export async function deleteSurfboardPlan(
  id: string
): Promise<ApiResult<null>> {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id },
      select: {
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
      },
    });
    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const filesToDelete = [
      plan.pdfFilePath,
      plan.cadFilePath,
      plan.certificateFilePath,
    ]
      .filter((u): u is string => Boolean(u))
      .map((url) => ({ url }));

    if (filesToDelete.length) {
      await deleteMultipleSurfboardFilesFromS3(filesToDelete);
    }

    await prisma.surfboardPlan.delete({ where: { id } });
    revalidatePath("/surfboard/dashboard/allplans");
    return { success: true, data: null };
  } catch (err) {
    console.error("deleteSurfboardPlan error:", err);
    return { success: false, error: (err as Error).message };
  }
}
