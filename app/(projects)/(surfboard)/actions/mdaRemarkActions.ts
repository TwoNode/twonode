"use server";

import prisma from "@/lib/prisma";
import { getUserData } from "./authActions";

export type ApiResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: any;
};

export async function getUniqueChartingRemarks(): Promise<ApiResult<string[]>> {
  try {
    const session = await getUserData();
    if (!session.success || !session.data) {
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

export async function getUniqueQueryReasons(): Promise<ApiResult<string[]>> {
  try {
    const session = await getUserData();
    if (!session.success || !session.data) {
      return { success: false, error: "Unauthorized" };
    }

    // Use Prisma's raw query to union the different comment fields
    // Ensure we exclude nulls and empty strings
    const results = await prisma.$queryRaw<{ reason: string }[]>`
      SELECT DISTINCT reason FROM (
        SELECT "accountsComment" as reason FROM "SurfboardPlan" WHERE "accountsComment" IS NOT NULL AND "accountsComment" != ''
        UNION
        SELECT "chartingComment" as reason FROM "SurfboardPlan" WHERE "chartingComment" IS NOT NULL AND "chartingComment" != ''
        UNION
        SELECT "surconComment" as reason FROM "SurfboardPlan" WHERE "surconComment" IS NOT NULL AND "surconComment" != ''
        UNION
        SELECT "recordsIComment" as reason FROM "SurfboardPlan" WHERE "recordsIComment" IS NOT NULL AND "recordsIComment" != ''
        UNION
        SELECT "intakeComment" as reason FROM "SurfboardPlan" WHERE "intakeComment" IS NOT NULL AND "intakeComment" != ''
        UNION
        SELECT "recordsIIComment" as reason FROM "SurfboardPlan" WHERE "recordsIIComment" IS NOT NULL AND "recordsIIComment" != ''
      ) as queries
      LIMIT 50
    `;

    return {
      success: true,
      data: results.map((r) => r.reason),
    };
  } catch (error) {
    console.error("Error fetching unique query reasons:", error);
    return {
      success: false,
      error: "Failed to fetch query reasons",
    };
  }
}
