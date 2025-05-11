-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9));

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "paymentLink" TEXT,
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9));
