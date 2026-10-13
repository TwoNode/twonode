/**
 * Fills SurfboardPlan.planNumberKey from planNumber with the shared normaliser.
 *
 *   npx tsx scripts/backfill-plan-number-key.ts                  # dry run: counts only, writes nothing
 *   npx tsx scripts/backfill-plan-number-key.ts --apply --expect N
 *
 * --apply runs one transaction that only touches rows whose key is still empty
 * and rolls back unless exactly N rows were updated (N is the number the dry
 * run printed). Run it against prod only after the migration is deployed.
 */
import { PrismaClient } from "../prisma/generated";
import { normalizePlanNumber } from "../surfboard/utils/planNumber";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const expectIdx = process.argv.indexOf("--expect");
  const expected = expectIdx > -1 ? Number(process.argv[expectIdx + 1]) : NaN;

  const rows = await prisma.surfboardPlan.findMany({
    where: { planNumberKey: null },
    select: { id: true, planNumber: true, deleted: true },
  });
  const updates = rows.map((r) => ({
    id: r.id,
    key: normalizePlanNumber(r.planNumber) || null,
    deleted: r.deleted,
  }));

  // Duplicates among plans that are not deleted block the unique index.
  const seen = new Map<string, number>();
  for (const u of updates) {
    if (u.key && !u.deleted) seen.set(u.key, (seen.get(u.key) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1);

  console.log(`rows with an empty key: ${rows.length}`);
  console.log(`rows whose plan number normalises to empty: ${updates.filter((u) => !u.key).length}`);
  console.log(`keys shared by more than one non-deleted plan: ${duplicates.length}`);
  for (const [key, n] of duplicates) console.log(`  ${key} x${n}`);

  if (!apply) {
    console.log("dry run: nothing written");
    return;
  }
  if (!Number.isInteger(expected) || expected !== rows.length) {
    throw new Error(`--expect ${expected} does not match the ${rows.length} rows found; nothing written`);
  }

  const ids = updates.map((u) => u.id);
  const keys = updates.map((u) => u.key);
  await prisma.$transaction(
    async (tx) => {
      // One statement; only rows whose key is still empty are touched.
      const done = await tx.$executeRaw`
        UPDATE "SurfboardPlan" p
           SET "planNumberKey" = v.key
          FROM unnest(${ids}::uuid[], ${keys}::text[]) AS v(id, key)
         WHERE p.id = v.id AND p."planNumberKey" IS NULL`;
      if (done !== expected) throw new Error(`updated ${done}, expected ${expected}; rolled back`);
      console.log(`updated ${done} rows`);
    },
    { timeout: 120_000 }
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
