import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";

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

/** The text columns a drill-down can match exactly. A fixed list: the name goes into the SQL, so it is never taken from the caller. */
export const MATCH_COLUMNS = ["facilitator", "lga", "ward", "lcda"] as const;
export type MatchColumn = (typeof MATCH_COLUMNS)[number];

/**
 * Ids of the caller's own plans, or plans shared with them, whose `column` is
 * `value` once capitals and surrounding spaces are ignored. The Stats tab groups
 * plans the same way (trimmed, lower case), so a row's count and the list it
 * opens cannot differ because someone typed "Ikeja" once and "IKEJA " another
 * time. Prisma's `equals` cannot trim, and its insensitive mode treats `%` and
 * `_` as wildcards, hence raw SQL with a bound value.
 */
export async function findColumnMatchIds(
  column: MatchColumn,
  value: string,
  userId: string,
  scope: "mine" | "shared-with-me"
): Promise<string[]> {
  if (!(MATCH_COLUMNS as readonly string[]).includes(column)) {
    throw new Error(`Cannot match on ${column}`);
  }
  const col = Prisma.raw(`"${column}"`);
  const rows =
    scope === "mine"
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "SurfboardPlan"
          WHERE "userId" = ${userId}
            AND deleted = false
            AND lower(btrim(${col})) = lower(btrim(${value}))
          LIMIT 5000
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "SurfboardPlan"
          WHERE ${userId} = ANY("sharedTo")
            AND deleted = false
            AND lower(btrim(${col})) = lower(btrim(${value}))
          LIMIT 5000
        `;
  return rows.map((r) => r.id);
}
