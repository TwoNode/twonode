-- AlterTable
ALTER TABLE "OneTimeUserProperty" ADD COLUMN     "site_images" TEXT[],
ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "site_images" TEXT[],
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
