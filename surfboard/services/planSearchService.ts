import prisma from "@/lib/prisma";

/**
 * Ids of the caller's own plans, or plans shared with them, that have a pillar
 * whose number contains `term`. Prisma's `Json` filters cannot say "any element's
 * field contains X", so this is raw SQL.
 *
 * It is limited to the caller's plans *inside* the query. planService's
 * `findPlanIdsByPillarNumber` searches every surveyor's plans and keeps the
 * first 500, so for a common term the caller's own match can be cut off before
 * the owner filter is applied. Like Prisma's `contains` (used for the other search
 * clauses), `%` and `_` in the term act as wildcards.
 */
export async function findPillarMatchIds(
  term: string,
  userId: string,
  scope: "mine" | "shared-with-me"
): Promise<string[]> {
  const pattern = `%${term}%`;
  const rows =
    scope === "mine"
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "SurfboardPlan"
          WHERE "userId" = ${userId}
            AND deleted = false
            AND jsonb_typeof(pillars) = 'array'
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(pillars) AS pillar
              WHERE pillar->>'pillarNumber' ILIKE ${pattern}
            )
          LIMIT 1000
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "SurfboardPlan"
          WHERE ${userId} = ANY("sharedTo")
            AND deleted = false
            AND jsonb_typeof(pillars) = 'array'
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(pillars) AS pillar
              WHERE pillar->>'pillarNumber' ILIKE ${pattern}
            )
          LIMIT 1000
        `;
  return rows.map((r) => r.id);
}
