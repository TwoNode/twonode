/*
  Warnings:

  - You are about to drop the column `result` on the `OneTimeUserProperty` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OneTimeUserProperty" DROP COLUMN "result",
ADD COLUMN     "report" JSONB,
ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "result",
ADD COLUMN     "report" JSONB,
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
