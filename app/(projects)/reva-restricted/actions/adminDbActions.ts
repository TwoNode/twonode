"use server";

import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/utils/authUser";
import prisma from "@/lib/prisma";
import { uploadToS3FromServer } from "../../reva/actions/awsActions";
import { revalidatePath } from "next/cache";

export const getAllRequestsWithUser = async (limit: number | null = null) => {
  try {
    const properties = await prisma.property.findMany({
      take: limit !== null ? limit : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
    });

    return {
      success: true,
      data: properties?.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA; // Sort descending by date
      }),
    };
  } catch (error) {
    console.error("Error fetching properties:", error);
    return { success: false, error: "Failed to fetch properties" };
  }
};

export const getRequestByReference = async (reference: string) => {
  try {
    const request = await prisma.property.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
    });

    return { success: true, data: request };
  } catch (error) {
    console.error("Error fetching request:", error);
    return { success: false, error: "Failed to fetch request" };
  }
};

export const uploadDueDiligenceReport = async (formData: FormData) => {
  try {
    console.log(JSON.stringify(formData.get("prevImages")));
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: "User is not authenticated.", status: 401 };
    }

    const reference = formData.get("reference") as string;
    if (!reference) {
      return { error: "Missing property reference.", status: 400 };
    }

    const fileKeys = [
      "transactionFlowImg",
      "parcelCheck",
      "parcelChartingFree",
      "parcelChartingOffset",
      "landUseCheck",
    ];

    const filesMap: { key: string; file: File }[] = fileKeys
      .map((key) => {
        const file = formData.get(key);
        return file instanceof File ? { key, file } : null;
      })
      .filter(Boolean) as { key: string; file: File }[];

    const report: Record<string, any> = {
      titleStatus: formData.get("titleStatus"),
      titleNumber: formData.get("titleNumber"),
      rightToSellHolder: formData.get("rightToSellHolder"),
      transactionFlow: formData.get("transactionFlow"),
      parcelPositionMatch: formData.get("parcelPositionMatch"),
      parcelStatus: formData.get("parcelStatus"),
      surveyPlanNumber: formData.get("surveyPlanNumber"),
      surveyName: formData.get("surveyName"),
      historicalSurveys: formData.get("historicalSurveys"),
      zoning: formData.get("zoning"),
      hasBuildingPlanApproval:
        formData.get("hasBuildingPlanApproval") === "true",
      buildingPlanNo: formData.get("buildingPlanNo"),
      setbacksInfo: formData.get("setbacksInfo"),
      images: formData.get("prevImages")
        ? JSON.parse(formData.get("prevImages") as string)
        : {},
    };

    // filesMap.forEach((f, idx) => {
    //   report.images[f.key] = uploadedUrls[idx];
    // });

    console.log("report", report);

    await uploadFilesToS3(filesMap, report, reference);

    const result = await prisma.property.update({
      where: { reference },
      data: { report },
    });

    revalidatePath(
      `/reva-restricted/dashboard/viewdetails?reference=${reference}`
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error updating due diligence report:", error);
    return { error: error, success: false };
  }
};

async function uploadFilesToS3(
  filesMap: { key: string; file: File }[],
  report: Record<string, any>,
  reference: string
) {
  try {
    await Promise.all(
      filesMap.map(async (f) => {
        console.log(f.key, f.file);

        try {
          const uploadedUrl = await uploadToS3FromServer([f.file], reference);
          report.images[f.key] = uploadedUrl[0]; // Assuming uploadToS3FromServer returns an array of URLs
        } catch (error) {
          console.log(f.key, ": File was not uploaded");
        }
      })
    );

    console.log(`Successfully uploaded files for reference: ${reference}`);
  } catch (error) {
    console.error(
      `Error uploading files to S3 for reference: ${reference}`,
      error
    );
    // throw new Error("Failed to upload files to S3.");
  }
}
