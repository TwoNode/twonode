"use server";

import prisma from "@/lib/prisma";
import { getEncryptedUserData } from "@/utils/encryptedCookies";

export type ApiResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: any;
};

export async function getUniqueChartingRemarks(): Promise<ApiResult<string[]>> {
  try {
    const session = await getEncryptedUserData();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const remarks = await prisma.surfboardPlan.findMany({
      where: {
        chartingRemarks: {
          not: "",
        },
        NOT: {
          chartingRemarks: null,
        }
      },
      select: {
        chartingRemarks: true,
      },
      distinct: ["chartingRemarks"],
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return {
      success: true,
      data: remarks.map((r) => r.chartingRemarks as string),
    };
  } catch (error) {
    console.error("Error fetching unique charting remarks:", error);
    return {
      success: false,
      error: "Failed to fetch remarks",
    };
  }
}

export async function getUniqueQueryReasons(role: "accounts" | "charting" | "surcon" | "records-i" | "records-ii" | "intake"): Promise<ApiResult<string[]>> {
  try {
    const session = await getEncryptedUserData();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    let fieldName: string;
    switch (role) {
      case "accounts":
        fieldName = "accountsComment";
        break;
      case "charting":
        fieldName = "chartingComment";
        break;
      case "surcon":
        fieldName = "surconComment";
        break;
      case "records-i":
        fieldName = "recordsIComment";
        break;
      case "records-ii":
        fieldName = "recordsIIComment";
        break;
      case "intake":
        fieldName = "intakeComment";
        break;
      default:
        return { success: false, error: "Invalid role" };
    }

    const remarks = await prisma.surfboardPlan.findMany({
      where: {
        [fieldName]: {
          not: "",
        },
        NOT: {
          [fieldName]: null,
        }
      },
      select: {
        [fieldName]: true,
      },
      distinct: [fieldName as any],
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const reasons = remarks
      .map((r: any) => r[fieldName] as string)
      .filter((reason) => reason && reason.trim() !== "");

    return {
      success: true,
      data: reasons,
    };
  } catch (error) {
    console.error(`Error fetching unique query reasons for ${role}:`, error);
    return {
      success: false,
      error: "Failed to fetch query reasons",
    };
  }
}
