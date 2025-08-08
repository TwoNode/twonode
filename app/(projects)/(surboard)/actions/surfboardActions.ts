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
import { getAuthenticatedSurfUser } from "@/utils/surfAuth";
import { SurfboardUser } from "@prisma/client";

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
export async function createSurfPlan(
  data: CreatePlanData,
  files: FileUploadData
): Promise<ApiResult<{ planId: string }>> {
  try {
    const user = await getAuthenticatedSurfUser();

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
export async function getAllSurfPlans(): Promise<ApiResult<Plan[]>> {
  try {
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plans = await prisma.surfboardPlan.findMany({
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        dateOnSurveyPlan: true,
        reasonForWithdrawalAndResubmission: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: plans };
  } catch (err) {
    console.error("getAllSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches all plans from the database.
 */
export async function getAllSharedSurfPlans(): Promise<ApiResult<Plan[]>> {
  try {
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        userId: user.id,
        sharedTo: {
          isEmpty: false,
        },
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        dateOnSurveyPlan: true,
        reasonForWithdrawalAndResubmission: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: plans };
  } catch (err) {
    console.error("getAllSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches all plans from the database.
 */
export async function getSharedWithMeSurfPlans(): Promise<ApiResult<Plan[]>> {
  try {
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        sharedTo: {
          has: user.id,
        },
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        dateOnSurveyPlan: true,
        reasonForWithdrawalAndResubmission: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: plans };
  } catch (err) {
    console.error("getAllSurfPlans error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches a single plan by ID.
 */
export async function getSurfPlanById(id: string): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: {
        id,
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
        pdfFilePath: true,
        cadFilePath: true,
        certificateFilePath: true,
        ward: true,
        lcda: true,
        lga: true,
        pillars: true,
        status: true,
        isLive: true,
        dateOnSurveyPlan: true,
        reasonForWithdrawalAndResubmission: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }
    return { success: true, data: plan };
  } catch (err) {
    console.error("getSurfPlanById error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a plan and its S3 files.
 */
export async function updateSurfPlanStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW"
): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "UNDER_REVIEW"];
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

    revalidatePath("/surfboard/dashboard/allplans");
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
    const user = await getAuthenticatedSurfUser();

    if (!user || !user.role) {
      return {
        success: false,
        error: "User not authenticated or role not found",
      };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id, userId: user.id },
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

    await prisma.surfboardPlan.delete({ where: { id, userId: user.id } });
    revalidatePath("/surfboard/dashboard/allplans");
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
    const authUser = await getAuthenticatedSurfUser();

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
    const authUser = await getAuthenticatedSurfUser();

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

    revalidatePath("/surfboard/dashboard/allplans");

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
    const authUser = await getAuthenticatedSurfUser();

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

    revalidatePath("/surfboard/dashboard/allplans");

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
    const user = await getAuthenticatedSurfUser();
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
    const user = await getAuthenticatedSurfUser();
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
    const user = await getAuthenticatedSurfUser();
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

export async function editSurfboardPlan(formData: FormData): Promise<ApiResult<Plan>> {
  try {
    const user = await getAuthenticatedSurfUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const planId = formData.get('id') as string;
    if (!planId) {
      return { success: false, error: 'Plan ID is required' };
    }

    // Get the existing plan to check creation time and current certificate
    const existingPlan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      return { success: false, error: 'Plan not found' };
    }

    // Check if the plan was created more than 24 hours ago
    const isWithin24Hours = existingPlan.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Prepare update data
    const updateData: any = {};
    
    // Only update these fields if within 24 hours
    if (isWithin24Hours) {
      if (formData.get('planNumber')) {
        updateData.planNumber = formData.get('planNumber') as string;
      }
      if (formData.get('surveyTitle')) {
        updateData.surveyTitle = formData.get('surveyTitle') as string;
      }
      if (formData.get('planType')) {
        updateData.planType = formData.get('planType') as string;
      }
      if (formData.get('referencePlanNumber')) {
        updateData.referencePlanNumber = formData.get('referencePlanNumber') as string;
      }
      if (formData.get('deededArea')) {
        updateData.deededArea = formData.get('deededArea') as string;
      }
      if (formData.get('facilitator')) {
        updateData.facilitator = formData.get('facilitator') as string;
      }
    }

    // Handle certificate file upload
    const certificateFile = formData.get('certificateFile') as File | null;
    let certificateFilePath = formData.get('certificateFilePath') as string | null;
    
    if (certificateFile && certificateFile.size > 0) {
      try {
        // Upload the new certificate file to S3
        const uploadResult = await uploadSurfboardFileToS3(
          certificateFile,
          "certificate",
          `surfboard/certificates/${planId}/${Date.now()}_${certificateFile.name}`
        ) ;
      
        if (!uploadResult.url) {
          return { success: false, error: 'Failed to upload certificate file' };
        }
      
        certificateFilePath = uploadResult.url;
      } catch (error) {
        console.error('Error uploading certificate file:', error);
        return { success: false, error: 'Failed to upload certificate file' };
      }

      // If there was a previous certificate file, delete it from S3
      if (existingPlan.certificateFilePath) {
        try {
          const filesToDelete = [
            { url: existingPlan.certificateFilePath },
          ];
          await deleteMultipleSurfboardFilesFromS3(filesToDelete);
        } catch (error) {
          console.error('Error deleting old certificate file:', error);
          // Continue even if deletion fails
        }
      }

      updateData.certificateFilePath = certificateFilePath;
    } else if (certificateFilePath) {
      // If no new file but path exists, keep the existing path
      updateData.certificateFilePath = certificateFilePath;
    }

    // Update the plan in the database
    const updatedPlan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: updateData,
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

    revalidatePath(`/surfboard/dashboard/plan/edit?planId=${planId}`);

    return { 
      success: true, 
      data: {
        ...updatedPlan,
        status: updatedPlan.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW',
      } 
    };
  } catch (error) {
    console.error('Error updating plan:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update plan' 
    };
  }
}
