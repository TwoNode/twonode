/*
  Warnings:

  - The `status` column on the `OneTimeUserProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `OneTimeUserProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('Available', 'Completed', 'Processing');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paid', 'Unpaid');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'PAYMENT', 'PROPERTY');

-- AlterTable
ALTER TABLE "OneTimeUserProperty" ADD COLUMN     "result" JSONB,
ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
DROP COLUMN "status",
ADD COLUMN     "status" "PropertyStatus",
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "result" JSONB,
ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
DROP COLUMN "status",
ADD COLUMN     "status" "PropertyStatus",
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus";

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
