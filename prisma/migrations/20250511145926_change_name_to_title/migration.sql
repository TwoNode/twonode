/*
  Warnings:

  - You are about to drop the column `name` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9));

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "name",
ADD COLUMN     "title" TEXT,
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9));
