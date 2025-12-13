-- AlterTable
ALTER TABLE "OneTimeUserProperty" ADD COLUMN     "isLive" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "isLive" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
