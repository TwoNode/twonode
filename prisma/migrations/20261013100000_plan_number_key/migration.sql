-- Canonical plan number (I-024). Nullable and not unique yet: it is filled by
-- scripts/backfill-plan-number-key.ts, and the unique index (non-deleted plans
-- only) comes in a later migration once the remaining duplicates are resolved.
ALTER TABLE "SurfboardPlan" ADD COLUMN IF NOT EXISTS "planNumberKey" TEXT;

CREATE INDEX IF NOT EXISTS "SurfboardPlan_planNumberKey_idx" ON "SurfboardPlan"("planNumberKey");
