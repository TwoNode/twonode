import prisma from "@/lib/prisma";
import { ValidationError } from "@/lib/api/errors";
import { SurfboardRole } from "@/utils/platform";

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

/**
 * The reviewer role whose comment box each `?role=` of the query-reasons route
 * fills (I-056). Only that role, and the staff roles that may open any of the
 * review pages, are shown that box's earlier comments.
 */
export const REVIEWER_ROLE_BY_QUERY_ROLE: Record<string, SurfboardRole> = {
  accounts: SurfboardRole.ACCOUNTS,
  charting: SurfboardRole.CHARTING,
  surcon: SurfboardRole.SURCON,
  "records-i": SurfboardRole.RECORDS_I,
  "records-ii": SurfboardRole.RECORDS_II,
  intake: SurfboardRole.INTAKE,
};

const FIELD_BY_ROLE: Record<string, string> = {
  accounts: "accountsComment",
  charting: "chartingComment",
  surcon: "surconComment",
  "records-i": "recordsIComment",
  "records-ii": "recordsIIComment",
  intake: "intakeComment",
};

export async function getUniqueQueryReasons(
  role:
    "accounts" | "charting" | "surcon" | "records-i" | "records-ii" | "intake"
): Promise<string[]> {
  if (!Object.hasOwn(FIELD_BY_ROLE, role))
    throw new ValidationError({ role: "Invalid role" });
  const fieldName = FIELD_BY_ROLE[role];

  const remarks = await prisma.surfboardPlan.findMany({
    where: { [fieldName]: { not: "" }, NOT: { [fieldName]: null } },
    select: { [fieldName]: true },
    distinct: [fieldName as any],
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return remarks
    .map((r: any) => r[fieldName] as string)
    .filter((reason) => reason && reason.trim() !== "");
}
