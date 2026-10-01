import prisma from "@/lib/prisma";
import { ValidationError } from "@/lib/api/errors";

/** Migrated from app/(projects)/(surfboard)/actions/mdaRemarkActions.ts. */

export async function getUniqueChartingRemarks(): Promise<string[]> {
  const remarks = await prisma.surfboardPlan.findMany({
    where: { chartingRemarks: { not: "" }, NOT: { chartingRemarks: null } },
    select: { chartingRemarks: true },
    distinct: ["chartingRemarks"],
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return remarks.map((r) => r.chartingRemarks as string);
}

const FIELD_BY_ROLE: Record<string, string> = {
  accounts: "accountsComment",
  charting: "chartingComment",
  surcon: "surconComment",
  "records-i": "recordsIComment",
  "records-ii": "recordsIIComment",
  intake: "intakeComment",
};

export async function getUniqueQueryReasons(
  role: "accounts" | "charting" | "surcon" | "records-i" | "records-ii" | "intake"
): Promise<string[]> {
  const fieldName = FIELD_BY_ROLE[role];
  if (!fieldName) throw new ValidationError({ role: "Invalid role" });

  const remarks = await prisma.surfboardPlan.findMany({
    where: { [fieldName]: { not: "" }, NOT: { [fieldName]: null } },
    select: { [fieldName]: true },
    distinct: [fieldName as any],
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return remarks.map((r: any) => r[fieldName] as string).filter((reason) => reason && reason.trim() !== "");
}
