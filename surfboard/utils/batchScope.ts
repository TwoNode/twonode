import type { Prisma } from "@/prisma/generated";
import { planNumberSearchClauses } from "@/surfboard/utils/planNumber";

export type BatchScope = "active" | "history";

/**
 * The surveyor's batches for "Active" or "History", optionally searched. A batch
 * moves to history once every plan in it has reached LODGED (nothing further for
 * the surveyor to do on it); the `some: {}` guard stops an empty batch counting
 * as history (`every` is vacuously true on no plans). Active is the complement.
 * Shared by the website's "My Batches" list and the app's Records tab, so the
 * two cannot disagree about where a batch belongs.
 */
export function userBatchWhere(
  userId: string,
  scope: BatchScope,
  search?: string
): Prisma.CertificateOfDepositBatchWhereInput {
  const historyFilter = {
    plans: { some: {}, every: { status: "LODGED" as const } },
  };
  const activeFilter = {
    plans: { some: { status: { not: "LODGED" as const } } },
  };

  const where: Prisma.CertificateOfDepositBatchWhereInput = {
    submittedBy: userId,
    ...(scope === "history" ? historyFilter : activeFilter),
  };
  if (search) {
    where.OR = [
      { batchCode: { contains: search, mode: "insensitive" } },
      {
        plans: {
          some: {
            OR: planNumberSearchClauses(
              search
            ) as Prisma.SurfboardPlanWhereInput[],
          },
        },
      },
      {
        plans: {
          some: { surveyTitle: { contains: search, mode: "insensitive" } },
        },
      },
      {
        plans: {
          some: { facilitator: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }
  return where;
}
