/*
  Warnings:

  - The `status` column on the `OneTimeUserProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `OneTimeUserProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
DROP COLUMN "status",
ADD COLUMN     "status" TEXT,
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" TEXT;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
DROP COLUMN "status",
ADD COLUMN     "status" TEXT,
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" TEXT;

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PropertyStatus";
