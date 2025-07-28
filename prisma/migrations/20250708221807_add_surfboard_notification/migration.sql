-- CreateEnum
CREATE TYPE "SurfboardNotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'PLAN', 'SHARING');

-- CreateEnum
CREATE TYPE "SurfboardNotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- CreateTable
CREATE TABLE "SurfboardNotification" (
    "id" TEXT NOT NULL,
    "type" "SurfboardNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "SurfboardNotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurfboardNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurfboardNotification_createdAt_idx" ON "SurfboardNotification"("createdAt");

-- CreateIndex
CREATE INDEX "SurfboardNotification_audience_idx" ON "SurfboardNotification"("audience");
